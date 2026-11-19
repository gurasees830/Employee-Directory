import { useEffect, useState } from "react";
import { getEmployee, getErrorMessage } from "../api/employees";
import type { Employee, EmployeeDetail, Filters } from "../types";
import { formatDate, isNewHire, tenure } from "../utils/format";
import Avatar from "./Avatar";
import { LevelBadge, NewBadge, StatusBadge } from "./Badges";
import Drawer from "./Drawer";
import { ChevronRightIcon, CopyIcon, EditIcon, MailIcon, OrgIcon, PhoneIcon, TrashIcon } from "./Icons";

interface Props {
  employeeId: number;
  reloadKey: number;
  onClose: () => void;
  onOpen: (id: number) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
  onApplyFilter: (patch: Partial<Filters>) => void;
  notify: (type: "success" | "error", text: string) => void;
}

function EmployeeProfile({ employeeId, reloadKey, onClose, onOpen, onEdit, onDelete, onApplyFilter, notify }: Props) {
  const [data, setData] = useState<{ id: number; employee: EmployeeDetail } | null>(null);
  const [error, setError] = useState<{ id: number; message: string } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getEmployee(employeeId, controller.signal)
      .then((employee) => {
        setData({ id: employeeId, employee });
        setError(null);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError({ id: employeeId, message: getErrorMessage(err) });
      });
    return () => controller.abort();
  }, [employeeId, reloadKey, retry]);

  // Only show data that belongs to the requested id (avoids flashing the previous person).
  const emp = data?.id === employeeId ? data.employee : null;
  const failed = error?.id === employeeId ? error.message : null;

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      notify("success", "Email copied to clipboard");
    } catch {
      notify("error", "Couldn't copy — your browser blocked clipboard access");
    }
  };

  const footer = emp && (
    <>
      <button type="button" className="btn btn-ghost-danger" onClick={() => onDelete(emp)}>
        <TrashIcon size={16} /> Delete
      </button>
      <button type="button" className="btn btn-primary" onClick={() => onEdit(emp)}>
        <EditIcon size={16} /> Edit profile
      </button>
    </>
  );

  return (
    <Drawer title="Employee profile" onClose={onClose} footer={footer}>
      {failed && !emp && (
        <div className="empty small">
          <p>{failed}</p>
          <button type="button" className="btn" onClick={() => setRetry((r) => r + 1)}>
            Try again
          </button>
        </div>
      )}

      {!emp && !failed && (
        <div className="profile" aria-busy="true">
          <div className="profile-hero">
            <span className="avatar avatar-lg skeleton-block" />
            <div className="grow">
              <div className="skeleton-line w-60" />
              <div className="skeleton-line w-40" />
            </div>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton-line" />
          ))}
        </div>
      )}

      {emp && (
        <div className="profile">
          <div className="profile-hero">
            <Avatar name={emp.name} size="lg" />
            <div className="grow">
              <h3 className="profile-name">{emp.name}</h3>
              <p className="profile-role">{emp.role}</p>
              <div className="badge-row">
                <StatusBadge status={emp.status} />
                <LevelBadge level={emp.level} />
                {isNewHire(emp.joiningDate) && <NewBadge />}
              </div>
            </div>
          </div>

          <div className="contact-row">
            <a className="btn btn-sm" href={`mailto:${emp.email}`}>
              <MailIcon size={15} /> Email
            </a>
            <button type="button" className="btn btn-sm" onClick={() => copyEmail(emp.email)}>
              <CopyIcon size={15} /> Copy email
            </button>
            {emp.phone && (
              <a className="btn btn-sm" href={`tel:${emp.phone.replace(/[^\d+]/g, "")}`}>
                <PhoneIcon size={15} /> Call
              </a>
            )}
          </div>

          <dl className="details">
            <div>
              <dt>Email</dt>
              <dd className="break">{emp.email}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd className="mono">{emp.phone || "—"}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{emp.department}</dd>
            </div>
            <div>
              <dt>At Ágaetis</dt>
              <dd>{tenure(emp.joiningDate)}</dd>
            </div>
            <div>
              <dt>Employment</dt>
              <dd>{emp.employmentType}</dd>
            </div>
            <div>
              <dt>Level</dt>
              <dd>{emp.level}</dd>
            </div>
            <div>
              <dt>Joined</dt>
              <dd>
                {formatDate(emp.joiningDate)}
              </dd>
            </div>
            <div>
              <dt>Employee ID</dt>
              <dd className="mono">EMP-{String(emp.id).padStart(4, "0")}</dd>
            </div>
          </dl>

          <section className="profile-section">
            <h4>Skills</h4>
            {emp.skills.length === 0 ? (
              <p className="muted small">No skills added yet.</p>
            ) : (
              <div className="skill-list">
                {emp.skills.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="skill skill-btn"
                    title={`Show everyone with ${s}`}
                    onClick={() => onApplyFilter({ skill: [s], skillsMatch: "any" })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="profile-section">
            <h4>Reports to</h4>
            {emp.managerId ? (
              <button type="button" className="person-row" onClick={() => onOpen(emp.managerId!)}>
                <Avatar name={emp.managerName ?? "?"} size="sm" />
                <span className="grow">{emp.managerName}</span>
                <ChevronRightIcon size={16} />
              </button>
            ) : (
              <p className="muted small">No manager — top of the reporting line.</p>
            )}
          </section>

          <section className="profile-section">
            <div className="section-head">
              <h4>Direct reports · {emp.directReports.length}</h4>
              {emp.directReports.length > 0 && (
                <button type="button" className="link-btn" onClick={() => onApplyFilter({ managerId: emp.id })}>
                  <OrgIcon size={14} /> View team
                </button>
              )}
            </div>
            {emp.directReports.length === 0 ? (
              <p className="muted small">Individual contributor.</p>
            ) : (
              <ul className="people-list">
                {emp.directReports.map((r) => (
                  <li key={r.id}>
                    <button type="button" className="person-row" onClick={() => onOpen(r.id)}>
                      <Avatar name={r.name} size="sm" />
                      <span className="grow">
                        {r.name}
                        <span className="person-sub">{r.role}</span>
                      </span>
                      <ChevronRightIcon size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Drawer>
  );
}

export default EmployeeProfile;
