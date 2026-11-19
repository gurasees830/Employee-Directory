import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { COMPANY_FOUNDED, DEPARTMENTS, EMPLOYMENT_TYPES, LEVELS, STATUSES } from "../constants";
import type { Employee, EmployeeInput, Facets, FieldErrors } from "../types";
import { tenure, todayISO } from "../utils/format";
import {
  FIELD_ORDER,
  MAX_SKILL_LENGTH,
  MAX_SKILLS,
  REQUIRED_FIELDS,
  validateEmployee,
  validateField,
} from "../utils/validation";
import { AlertIcon, CloseIcon } from "./Icons";

export type SubmitResult = { ok: true } | { ok: false; errors: FieldErrors };

interface Props {
  formId: string;
  employee: Employee | null;
  facets: Facets | null;
  onSubmit: (data: EmployeeInput) => Promise<SubmitResult>;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

type FormState = EmployeeInput;
type Field = keyof EmployeeInput;

const FIELD_LABELS: Record<Field, string> = {
  name: "Full name",
  email: "Work email",
  phone: "Phone",
  role: "Job title",
  department: "Department",
  level: "Seniority level",
  managerId: "Reports to",
  employmentType: "Employment type",
  status: "Status",
  joiningDate: "Joining date",
  skills: "Skills",
};

function initialState(employee: Employee | null): FormState {
  if (!employee) {
    return {
      name: "",
      email: "",
      phone: "",
      role: "",
      department: "",
      level: "",
      employmentType: "Full-time",
      status: "Active",
      joiningDate: todayISO(),
      managerId: null,
      skills: [],
    };
  }
  return {
    name: employee.name,
    email: employee.email,
    phone: employee.phone ?? "",
    role: employee.role,
    department: employee.department,
    level: employee.level,
    employmentType: employee.employmentType,
    status: employee.status,
    joiningDate: employee.joiningDate,
    managerId: employee.managerId,
    skills: employee.skills,
  };
}

function toInput(s: FormState): EmployeeInput {
  return {
    ...s,
    name: s.name.trim().replace(/\s+/g, " "),
    email: s.email.trim().toLowerCase(),
    phone: s.phone.trim(),
    role: s.role.trim(),
  };
}

const isRequired = (field: Field) => REQUIRED_FIELDS.includes(field);

// Field wrapper
function FieldBox({
  field,
  error,
  hint,
  children,
  className = "",
}: {
  field: Field;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${error ? "has-error" : ""} ${className}`}>
      <label htmlFor={`f-${field}`} className="field-label">
        {FIELD_LABELS[field]}
        {isRequired(field) ? (
          <span className="req" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="optional">optional</span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`f-${field}-error`} className="field-error">
          <AlertIcon size={13} />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`f-${field}-hint`} className="field-hint">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

// Skills tag input (ARIA combobox)
function SkillsInput({
  value,
  onChange,
  suggestions,
  invalid,
  describedBy,
  onBlur,
}: {
  value: string[];
  onChange: (skills: string[]) => void;
  suggestions: string[];
  invalid: boolean;
  describedBy?: string;
  onBlur: () => void;
}) {
  const [text, setText] = useState("");
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const listId = useId();
  const full = value.length >= MAX_SKILLS;

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    const taken = new Set(value.map((v) => v.toLowerCase()));
    const pool = suggestions.filter((s) => !taken.has(s.toLowerCase()));
    const starts = pool.filter((s) => s.toLowerCase().startsWith(q));
    const contains = pool.filter((s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q));
    return [...starts, ...contains].slice(0, 6);
  }, [text, value, suggestions]);

  const add = (raw: string) => {
    const skill = raw.trim().replace(/\s+/g, " ");
    if (!skill) return;
    if (skill.length > MAX_SKILL_LENGTH) {
      setNote(`Skills must be ${MAX_SKILL_LENGTH} characters or fewer`);
      return;
    }
    if (value.some((v) => v.toLowerCase() === skill.toLowerCase())) {
      setNote(`“${skill}” is already added`);
      setText("");
      return;
    }
    if (full) {
      setNote(`You can add up to ${MAX_SKILLS} skills`);
      return;
    }
    onChange([...value, skill]);
    setText("");
    setNote("");
    setActive(0);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const showing = open && matches.length > 0;
    if (e.key === "ArrowDown" && showing) {
      e.preventDefault();
      setActive((a) => (a + 1) % matches.length);
    } else if (e.key === "ArrowUp" && showing) {
      e.preventDefault();
      setActive((a) => (a - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter" || e.key === ",") {
      if (!text.trim()) {
        if (e.key === ",") e.preventDefault();
        return; // let Enter submit the form when the box is empty
      }
      e.preventDefault();
      add(showing ? matches[active] : text);
    } else if (e.key === "Escape" && showing) {
      e.stopPropagation(); // close the suggestions, not the drawer
      setOpen(false);
    } else if (e.key === "Backspace" && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const showList = open && matches.length > 0;

  return (
    <div className={`tag-input ${invalid ? "is-invalid" : ""}`}>
      <ul className="tags" aria-label="Selected skills">
        {value.map((skill) => (
          <li key={skill} className="tag">
            {skill}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== skill))}
              aria-label={`Remove ${skill}`}
            >
              <CloseIcon size={12} />
            </button>
          </li>
        ))}
        <li className="tag-entry">
          <input
            id="f-skills"
            type="text"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={showList ? `${listId}-${active}` : undefined}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            value={text}
            maxLength={MAX_SKILL_LENGTH + 10}
            disabled={full}
            placeholder={full ? "Skill limit reached" : value.length ? "Add another…" : "Type a skill and press Enter"}
            onChange={(e) => {
              setText(e.target.value);
              setOpen(true);
              setActive(0);
              setNote("");
            }}
            onKeyDown={onKeyDown}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              setOpen(false);
              if (text.trim()) add(text);
              onBlur();
            }}
          />
        </li>
      </ul>
      {showList && (
        <ul id={listId} role="listbox" className="suggestions">
          {matches.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? "is-active" : ""}
              onMouseDown={(e) => {
                e.preventDefault(); // keep focus in the input
                add(s);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
      {note && <p className="field-hint warn">{note}</p>}
    </div>
  );
}

// Form
function EmployeeForm({ formId, employee, facets, onSubmit, onDirtyChange, onSavingChange }: Props) {
  const initial = useMemo(() => initialState(employee), [employee]);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const selfId = employee?.id;

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  // braces matter: an effect must not return a value, or React treats it as a cleanup function
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const visibleError = (field: Field) => (touched[field] || submitted ? errors[field] : undefined);

  const revalidate = (field: Field, next: FormState) => {
    const message = validateField(field, toInput(next), selfId);
    setErrors((prev) => {
      const copy = { ...prev };
      if (message) copy[field] = message;
      else delete copy[field];
      return copy;
    });
  };

  const set = <K extends Field>(field: K, value: FormState[K]) => {
    const next = { ...form, [field]: value };
    setForm(next);
    // re-check live once the user has interacted with the field (or tried to submit)
    if (touched[field] || submitted || errors[field]) revalidate(field, next);
  };

  const blur = (field: Field) => {
    setTouched((t) => ({ ...t, [field]: true }));
    revalidate(field, form);
  };

  /** Accessibility wiring shared by every control. */
  const a11y = (field: Field) => {
    const err = visibleError(field);
    return {
      id: `f-${field}`,
      name: field,
      "aria-invalid": Boolean(err),
      "aria-required": isRequired(field) || undefined,
      "aria-describedby": err ? `f-${field}-error` : `f-${field}-hint`,
      onBlur: () => blur(field),
    };
  };

  const focusField = (field: Field) => {
    const el = document.getElementById(`f-${field}`);
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const input = toInput(form);
    const clientErrors = validateEmployee(input, selfId);
    setErrors(clientErrors);
    const firstInvalid = FIELD_ORDER.find((f) => clientErrors[f]);
    if (firstInvalid) {
      summaryRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      focusField(firstInvalid);
      return;
    }

    onSavingChange(true);
    const result = await onSubmit(input);
    onSavingChange(false);
    if (!result.ok) {
      setErrors(result.errors);
      const first = FIELD_ORDER.find((f) => result.errors[f]);
      if (first) focusField(first);
    }
  };

  const errorFields = FIELD_ORDER.filter((f) => errors[f]);
  const managerOptions = (facets?.people ?? []).filter((p) => p.id !== selfId);
  // Time at the company comes from the joining date, so show it as they pick one.
  const joiningHint = (() => {
    if (!form.joiningDate || validateField("joiningDate", toInput(form), selfId)) return "Ágaetis was founded on 3 Dec 2018";
    const t = tenure(form.joiningDate);
    return /\d/.test(t) ? `${t} at Ágaetis so far` : t; // "New joiner" / "Joining soon" read fine alone
  })();

  return (
    <form id={formId} className="employee-form" onSubmit={handleSubmit} noValidate>
      <p className="form-note">
        Fields marked <span className="req">*</span> are required.
      </p>

      <div ref={summaryRef} aria-live="assertive">
        {submitted && errorFields.length > 0 && (
          <div className="error-summary" role="alert">
            <strong>
              Please fix {errorFields.length} {errorFields.length === 1 ? "field" : "fields"} before saving
            </strong>
            <ul>
              {errorFields.map((f) => (
                <li key={f}>
                  <button type="button" className="link-btn" onClick={() => focusField(f)}>
                    {FIELD_LABELS[f]}
                  </button>
                  : {errors[f]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <fieldset className="form-section">
        <legend>Personal details</legend>
        <FieldBox field="name" error={visibleError("name")}>
          <input
            {...a11y("name")}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Priya Nair"
            maxLength={100}
            autoComplete="off"
          />
        </FieldBox>
        <div className="grid-2">
          <FieldBox field="email" error={visibleError("email")}>
            <input
              {...a11y("email")}
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="name@company.com"
              maxLength={150}
              autoComplete="off"
            />
          </FieldBox>
          <FieldBox field="phone" error={visibleError("phone")} hint="Include the country code, e.g. +91">
            <input
              {...a11y("phone")}
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98765 43210"
              maxLength={20}
              autoComplete="off"
            />
          </FieldBox>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Role &amp; team</legend>
        <FieldBox field="role" error={visibleError("role")} hint="Pick an existing title or type a new one">
          <input
            {...a11y("role")}
            list="role-options"
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            placeholder="e.g. Backend Developer"
            maxLength={100}
            autoComplete="off"
          />
          <datalist id="role-options">
            {facets?.roles.map((r) => <option key={r.value} value={r.value} />)}
          </datalist>
        </FieldBox>
        <div className="grid-2">
          <FieldBox field="department" error={visibleError("department")}>
            <select {...a11y("department")} value={form.department} onChange={(e) => set("department", e.target.value)}>
              <option value="" disabled>
                Select department
              </option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </FieldBox>
          <FieldBox field="level" error={visibleError("level")}>
            <select {...a11y("level")} value={form.level} onChange={(e) => set("level", e.target.value)}>
              <option value="" disabled>
                Select level
              </option>
              {LEVELS.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </FieldBox>
        </div>
        <div className="grid-2">
          <FieldBox field="managerId" error={visibleError("managerId")} hint="Leave empty for top-level roles">
            <select
              {...a11y("managerId")}
              value={form.managerId ?? ""}
              onChange={(e) => set("managerId", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">No manager</option>
              {managerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.role}
                </option>
              ))}
            </select>
          </FieldBox>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Employment</legend>
        <div className="grid-2">
          <FieldBox field="joiningDate" error={visibleError("joiningDate")} hint={joiningHint}>
            <input
              {...a11y("joiningDate")}
              type="date"
              value={form.joiningDate}
              min={COMPANY_FOUNDED}
              onChange={(e) => set("joiningDate", e.target.value)}
            />
          </FieldBox>
          <FieldBox field="employmentType" error={visibleError("employmentType")}>
            <select
              {...a11y("employmentType")}
              value={form.employmentType}
              onChange={(e) => set("employmentType", e.target.value)}
            >
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </FieldBox>
        </div>
        <div className="grid-2">
          <FieldBox field="status" error={visibleError("status")}>
            <select {...a11y("status")} value={form.status} onChange={(e) => set("status", e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FieldBox>
        </div>
      </fieldset>

      <fieldset className="form-section">
        <legend>Skills</legend>
        <FieldBox
          field="skills"
          error={visibleError("skills")}
          hint={`Press Enter or comma to add · ${form.skills.length}/${MAX_SKILLS}`}
        >
          <SkillsInput
            value={form.skills}
            onChange={(skills) => set("skills", skills)}
            suggestions={facets?.skills.map((s) => s.value) ?? []}
            invalid={Boolean(visibleError("skills"))}
            describedBy={visibleError("skills") ? "f-skills-error" : "f-skills-hint"}
            onBlur={() => blur("skills")}
          />
        </FieldBox>
      </fieldset>
    </form>
  );
}

export default EmployeeForm;
