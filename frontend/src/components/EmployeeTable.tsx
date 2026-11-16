import type { Employee } from "../types";

interface Props {
  employees: Employee[];
  loading: boolean;
  editingId?: number;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function EmployeeTable({ employees, loading, editingId, onEdit, onDelete }: Props) {
  if (loading) return <p className="info">Loading employees...</p>;
  if (employees.length === 0) return <p className="info">No employees found.</p>;

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Added on</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => (
            <tr key={emp.id} className={emp.id === editingId ? "row-editing" : ""}>
              <td data-label="Name">{emp.name}</td>
              <td data-label="Email">{emp.email}</td>
              <td data-label="Role">
                <span className="role">{emp.role}</span>
              </td>
              <td data-label="Added on" className="date">{formatDate(emp.created_at)}</td>
              <td className="actions">
                <button className="btn btn-small" onClick={() => onEdit(emp)}>
                  Edit
                </button>
                <button className="btn btn-small btn-danger" onClick={() => onDelete(emp)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeTable;
