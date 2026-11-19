import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { TENURE_PRESETS, TENURE_SLIDER_MAX } from "../constants";
import type { FacetOption, Facets, Filters } from "../types";
import { todayISO } from "../utils/format";
import { countActiveFilters, yearsLabel } from "../utils/query";
import { ChevronDownIcon, SearchIcon } from "./Icons";

interface Props {
  filters: Filters;
  facets: Facets | null;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

const toggle = (list: string[], value: string) =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

// Section
function Section({
  title,
  count = 0,
  onClear,
  defaultOpen = true,
  children,
}: {
  title: string;
  count?: number;
  onClear?: () => void;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || count > 0);
  const bodyId = useId();
  return (
    <section className="fsection">
      <div className="fsection-head">
        <button
          type="button"
          className="fsection-toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen((o) => !o)}
        >
          <ChevronDownIcon size={15} className={`chev ${open ? "" : "is-closed"}`} />
          <span>{title}</span>
          {count > 0 && <span className="fsection-count">{count}</span>}
        </button>
        {count > 0 && onClear && (
          <button type="button" className="link-btn" onClick={onClear}>
            Clear
          </button>
        )}
      </div>
      {open && (
        <div id={bodyId} className="fsection-body">
          {children}
        </div>
      )}
    </section>
  );
}

// Toggle chips (small fixed lists)
function ChipGroup({
  options,
  selected,
  onToggle,
  label,
}: {
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string) => void;
  label: string;
}) {
  return (
    <div className="chip-group" role="group" aria-label={label}>
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            className={`fchip ${on ? "is-on" : ""}`}
            aria-pressed={on}
            onClick={() => onToggle(o.value)}
            disabled={o.count === 0 && !on}
          >
            {o.value}
            <span className="fchip-count">{o.count}</span>
          </button>
        );
      })}
    </div>
  );
}

// Searchable checklist (long lists: roles, skills)
function Checklist({
  options,
  selected,
  onChange,
  placeholder,
  initialVisible = 6,
}: {
  options: FacetOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  initialVisible?: number;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const items = useMemo(() => {
    // values selected via a shared URL may no longer exist — keep them visible so they can be removed
    const known = new Set(options.map((o) => o.value));
    const all = [...selected.filter((v) => !known.has(v)).map((value) => ({ value, count: 0 })), ...options];
    const q = query.trim().toLowerCase();
    const matches = q ? all.filter((o) => o.value.toLowerCase().includes(q)) : all;
    // selected first, then by popularity (server order)
    return [...matches.filter((o) => selected.includes(o.value)), ...matches.filter((o) => !selected.includes(o.value))];
  }, [options, selected, query]);

  const limit = Math.max(initialVisible, selected.length);
  const visible = expanded || query ? items : items.slice(0, limit);
  const hidden = items.length - visible.length;

  return (
    <div className="checklist">
      {options.length > initialVisible && (
        <label className="mini-search">
          <SearchIcon size={14} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
          />
        </label>
      )}
      <ul>
        {visible.map((o) => (
          <li key={o.value}>
            <label className="check-row">
              <input
                type="checkbox"
                checked={selected.includes(o.value)}
                onChange={() => onChange(toggle(selected, o.value))}
              />
              <span className="check-label">{o.value}</span>
              <span className="check-count">{o.count}</span>
            </label>
          </li>
        ))}
        {visible.length === 0 && <li className="muted small pad-y">No matches</li>}
      </ul>
      {!query && (hidden > 0 || expanded) && items.length > limit && (
        <button type="button" className="link-btn" onClick={() => setExpanded((e) => !e)}>
          {expanded ? "Show less" : `Show ${hidden} more`}
        </button>
      )}
    </div>
  );
}

// Years at Ágaetis: presets + dual-thumb slider (0 to 8 — the company started in Dec 2018)
function YearsRange({
  min,
  max,
  longest,
  onChange,
}: {
  min: number | null;
  max: number | null;
  longest: number;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const TOP = TENURE_SLIDER_MAX;
  const clamp = (n: number) => Math.min(Math.max(n, 0), TOP);
  const fromProps = (): [number, number] => [clamp(min ?? 0), max === null ? TOP : clamp(max)];

  // Local state while dragging; committed to the filters after a short pause.
  const [range, setRange] = useState<[number, number]>(fromProps);
  const [synced, setSynced] = useState({ min, max });
  if (synced.min !== min || synced.max !== max) {
    setSynced({ min, max });
    setRange(fromProps());
  }

  const commitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(commitTimer.current), []);

  const update = (lo: number, hi: number) => {
    const next: [number, number] = [Math.min(lo, hi), Math.max(lo, hi)];
    setRange(next);
    clearTimeout(commitTimer.current);
    commitTimer.current = setTimeout(() => {
      onChange(next[0] === 0 ? null : next[0], next[1] === TOP ? null : next[1]);
    }, 300);
  };

  const [lo, hi] = range;
  const style = { "--lo": `${(lo / TOP) * 100}%`, "--hi": `${(hi / TOP) * 100}%` } as CSSProperties;
  const activePreset = TENURE_PRESETS.find((p) => p.min === min && p.max === max);

  return (
    <div className="exp">
      <div className="chip-group" role="group" aria-label="Years at Ágaetis presets">
        {TENURE_PRESETS.map((p) => {
          const on = activePreset === p;
          return (
            <button
              key={p.label}
              type="button"
              className={`fchip ${on ? "is-on" : ""}`}
              aria-pressed={on}
              onClick={() => (on ? onChange(null, null) : onChange(p.min === 0 ? null : p.min, p.max))}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div className="range" style={style}>
        <div className="range-track" aria-hidden="true">
          <div className="range-fill" />
        </div>
        <input
          type="range"
          min={0}
          max={TOP}
          step={0.5}
          value={lo}
          onChange={(e) => update(Math.min(Number(e.target.value), hi), hi)}
          aria-label="Minimum years at Ágaetis"
          aria-valuetext={`${lo} years`}
          style={{ zIndex: lo > TOP - 2 ? 3 : 2 }}
        />
        <input
          type="range"
          min={0}
          max={TOP}
          step={0.5}
          value={hi}
          onChange={(e) => update(lo, Math.max(Number(e.target.value), lo))}
          aria-label="Maximum years at Ágaetis"
          aria-valuetext={hi === TOP ? `up to ${TOP} years` : `${hi} years`}
        />
      </div>
      <div className="range-scale" aria-hidden="true">
        <span>0</span>
        <span className="range-current">{yearsLabel(lo === 0 ? null : lo, hi === TOP ? null : hi)}</span>
        <span>{TOP} yrs</span>
      </div>
      {longest > 0 && (
        <p className="field-hint">Founded Dec 2018 · longest anyone has been here is {longest} yrs</p>
      )}
    </div>
  );
}

// Joining date
function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function JoinedRange({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  const today = todayISO();
  const presets = [
    { label: "Last 30 days", from: daysAgo(30), to: "" },
    { label: "Last 90 days", from: daysAgo(90), to: "" },
    { label: "This year", from: `${today.slice(0, 4)}-01-01`, to: "" },
    { label: "3+ years ago", from: "", to: daysAgo(365 * 3) },
  ];
  return (
    <div className="joined">
      <div className="chip-group" role="group" aria-label="Joining date presets">
        {presets.map((p) => {
          const on = from === p.from && to === p.to;
          return (
            <button
              key={p.label}
              type="button"
              className={`fchip ${on ? "is-on" : ""}`}
              aria-pressed={on}
              onClick={() => (on ? onChange("", "") : onChange(p.from, p.to))}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="date-pair">
        <label>
          <span>From</span>
          <input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} />
        </label>
        <label>
          <span>To</span>
          <input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} />
        </label>
      </div>
    </div>
  );
}

// Panel
function FilterPanel({ filters: f, facets, onChange, onReset }: Props) {
  const active = countActiveFilters(f);
  const managers = useMemo(
    () => (facets?.people ?? []).filter((p) => p.reportCount > 0 || p.id === f.managerId),
    [facets, f.managerId]
  );

  if (!facets) {
    return (
      <div className="filters" aria-busy="true">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-line" />
        ))}
      </div>
    );
  }

  return (
    <div className="filters">
      <div className="filters-head">
        <h2>Filters</h2>
        {active > 0 && (
          <button type="button" className="link-btn" onClick={onReset}>
            Reset all
          </button>
        )}
      </div>

      <Section title="Department" count={f.department.length} onClear={() => onChange({ department: [] })}>
        <Checklist
          options={facets.departments.filter((d) => d.count > 0 || f.department.includes(d.value))}
          selected={f.department}
          onChange={(department) => onChange({ department })}
          placeholder="Find a department"
        />
      </Section>

      <Section title="Seniority level" count={f.level.length} onClear={() => onChange({ level: [] })}>
        <ChipGroup
          label="Seniority level"
          options={facets.levels}
          selected={f.level}
          onToggle={(v) => onChange({ level: toggle(f.level, v) })}
        />
      </Section>

      <Section
        title="Years at Ágaetis"
        count={f.minYears !== null || f.maxYears !== null ? 1 : 0}
        onClear={() => onChange({ minYears: null, maxYears: null })}
      >
        <YearsRange
          min={f.minYears}
          max={f.maxYears}
          longest={facets.tenure.max}
          onChange={(minYears, maxYears) => onChange({ minYears, maxYears })}
        />
      </Section>

      <Section title="Role" count={f.role.length} onClear={() => onChange({ role: [] })}>
        <Checklist
          options={facets.roles}
          selected={f.role}
          onChange={(role) => onChange({ role })}
          placeholder="Search roles"
          initialVisible={5}
        />
      </Section>

      <Section title="Skills" count={f.skill.length} onClear={() => onChange({ skill: [], skillsMatch: "any" })}>
        {f.skill.length > 1 && (
          <div className="segmented small" role="radiogroup" aria-label="Skill matching">
            {(["any", "all"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={f.skillsMatch === mode}
                className={f.skillsMatch === mode ? "is-on" : ""}
                onClick={() => onChange({ skillsMatch: mode })}
              >
                {mode === "any" ? "Has any of these" : "Has all of these"}
              </button>
            ))}
          </div>
        )}
        <Checklist
          options={facets.skills}
          selected={f.skill}
          onChange={(skill) => onChange({ skill })}
          placeholder="Search skills"
          initialVisible={6}
        />
      </Section>

      <Section title="Reporting line" count={(f.managerId !== null ? 1 : 0) + (f.isManager ? 1 : 0)} onClear={() => onChange({ managerId: null, isManager: "" })}>
        <div className="segmented small" role="radiogroup" aria-label="Team role">
          {([
            ["", "Everyone"],
            ["yes", "Managers"],
            ["no", "Individual contributors"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={f.isManager === value}
              className={f.isManager === value ? "is-on" : ""}
              onClick={() => onChange({ isManager: value })}
            >
              {label}
            </button>
          ))}
        </div>
        <label className="field-inline">
          <span>Reports to</span>
          <select
            value={f.managerId ?? ""}
            onChange={(e) => onChange({ managerId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Anyone</option>
            {managers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.role} ({p.reportCount})
              </option>
            ))}
          </select>
        </label>
      </Section>

      <Section
        title="Employment type"
        count={f.employmentType.length}
        onClear={() => onChange({ employmentType: [] })}
        defaultOpen={false}
      >
        <ChipGroup
          label="Employment type"
          options={facets.employmentTypes}
          selected={f.employmentType}
          onToggle={(v) => onChange({ employmentType: toggle(f.employmentType, v) })}
        />
      </Section>

      <Section title="Status" count={f.status.length} onClear={() => onChange({ status: [] })} defaultOpen={false}>
        <ChipGroup
          label="Status"
          options={facets.statuses}
          selected={f.status}
          onToggle={(v) => onChange({ status: toggle(f.status, v) })}
        />
      </Section>

      <Section
        title="Joining date"
        count={f.joinedFrom || f.joinedTo ? 1 : 0}
        onClear={() => onChange({ joinedFrom: "", joinedTo: "" })}
        defaultOpen={false}
      >
        <JoinedRange
          from={f.joinedFrom}
          to={f.joinedTo}
          onChange={(joinedFrom, joinedTo) => onChange({ joinedFrom, joinedTo })}
        />
      </Section>
    </div>
  );
}

export default FilterPanel;
