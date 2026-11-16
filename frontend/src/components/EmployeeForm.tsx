import { useState } from "react";
import type { Employee, EmployeeInput } from "../types";

interface Props {
  editing: Employee | null;
  onSubmit: (data: EmployeeInput) => Promise<boolean>;
  onCancel: () => void;
}

const emptyForm: EmployeeInput = { name: "", email: "", role: "" };

function EmployeeForm({ editing, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState<EmployeeInput>(
    editing ? { name: editing.name, email: editing.email, role: editing.role } : emptyForm
  );
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const ok = await onSubmit(form);
    setSaving(false);
    if (ok && !editing) setForm(emptyForm);
  };

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>{editing ? "Edit employee" : "Add new employee"}</h2>

      <label>
        Name
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Rahul Sharma"
          maxLength={100}
          required
        />
      </label>

      <label>
        Email
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="e.g. rahul@company.com"
          required
        />
      </label>

      <label>
        Role
        <input
          name="role"
          value={form.role}
          onChange={handleChange}
          placeholder="e.g. Backend Developer"
          maxLength={100}
          required
        />
      </label>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving..." : editing ? "Update" : "Add Employee"}
        </button>
        {editing && (
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export default EmployeeForm;
