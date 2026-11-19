import type { Employee } from "../types";
import { formatDate, isNewHire, tenure } from "../utils/format";
import Avatar from "./Avatar";
import { StatusBadge, TypeBadge } from "./Badges";
import Highlight from "./Highlight";
import { EditIcon, EyeIcon, TrashIcon } from "./Icons";
import RowMenu from "./RowMenu";

interface Props {
  employees: Employee[];
  search: string;
  onOpen: (id: number) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

function EmployeeGrid({ employees, search, onOpen, onEdit, onDelete }: Props) {
  return (
    <ul className="card-grid">
      {employees.map((emp) => (
        <li key={emp.id} className="person-card">
          <div className="person-card-top">
            <StatusBadge status={emp.status} />
            <RowMenu
              label={`Actions for ${emp.name}`}
              items={[
                { label: "Details", icon: <EyeIcon size={15} />, onSelect: () => onOpen(emp.id) },
                { label: "Edit", icon: <EditIcon size={15} />, onSelect: () => onEdit(emp) },
                { label: "Delete", icon: <TrashIcon size={15} />, danger: true, onSelect: () => onDelete(emp) },
              ]}
            />
          </div>

          <button type="button" className="person-card-main" onClick={() => onOpen(emp.id)}>
            <Avatar name={emp.name} size="xl" status={emp.status} />
            <span className="person-card-name">
              <Highlight text={emp.name} query={search} />
              {isNewHire(emp.joiningDate) && <span className="badge new">New</span>}
            </span>
            <span className="person-card-role">
              <Highlight text={emp.role} query={search} />
              <span className="sep" aria-hidden="true">
                |
              </span>
              {emp.department}
            </span>
          </button>
          <TypeBadge type={emp.employmentType} />

          <dl className="person-card-facts">
            <div>
              <dt>Joined</dt>
              <dd>
                {formatDate(emp.joiningDate)}
                <span className="muted"> · {tenure(emp.joiningDate)}</span>
              </dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>
                {emp.level}
                {emp.reportCount > 0 && <span className="muted"> · leads {emp.reportCount}</span>}
              </dd>
            </div>
            <div>
              <dt>Phone number</dt>
              <dd className="tabular">{emp.phone || "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${emp.email}`} className="truncate" title={emp.email}>
                  <Highlight text={emp.email} query={search} />
                </a>
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}

export default EmployeeGrid;
