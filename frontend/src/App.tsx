import { useEffect, useState } from "react";
import EmployeeForm from "./components/EmployeeForm";
import EmployeeTable from "./components/EmployeeTable";
import Pagination from "./components/Pagination";
import {
  addEmployee,
  deleteEmployee,
  getEmployees,
  getErrorMessage,
  updateEmployee,
} from "./api/employees";
import type { Employee, EmployeeInput } from "./types";
import "./App.css";

const PAGE_SIZE = 5;

type Message = { type: "success" | "error"; text: string } | null;

function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let ignore = false;

    getEmployees(debouncedSearch, page, PAGE_SIZE)
      .then((data) => {
        if (ignore) return;
        // if the last item on a page was deleted, go back one page
        if (data.employees.length === 0 && page > 1) {
          setPage(page - 1);
          return;
        }
        setEmployees(data.employees);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      })
      .catch((err) => {
        if (!ignore) setMessage({ type: "error", text: getErrorMessage(err) });
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [debouncedSearch, page, reloadKey]);

  const refresh = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleSubmit = async (data: EmployeeInput) => {
    try {
      if (editing) {
        await updateEmployee(editing.id, data);
        setMessage({ type: "success", text: "Employee updated" });
        setEditing(null);
      } else {
        await addEmployee(data);
        setMessage({ type: "success", text: "Employee added" });
        setPage(1);
      }
      refresh();
      return true;
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
      return false;
    }
  };

  const handleDelete = async (employee: Employee) => {
    if (!window.confirm(`Delete ${employee.name}?`)) return;

    try {
      await deleteEmployee(employee.id);
      if (editing?.id === employee.id) setEditing(null);
      setMessage({ type: "success", text: "Employee deleted" });
      refresh();
    } catch (err) {
      setMessage({ type: "error", text: getErrorMessage(err) });
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditing(employee);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="container">
      <header className="header">
        <h1>Employee Directory</h1>
        <p>Add, update and manage your team members in one place.</p>
      </header>

      {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}

      <div className="layout">

        <EmployeeForm
          key={editing?.id ?? "new"}
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />

        <section className="card list">
          <div className="list-header">
            <h2>
              Employees <span className="count">{total}</span>
            </h2>
            <input type="search" className="search" placeholder="Search by name..." value={search} onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <EmployeeTable employees={employees} loading={loading} editingId={editing?.id} onEdit={handleEdit} onDelete={handleDelete}
          />

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </section>
      </div>
    </div>
  );
}

export default App;
