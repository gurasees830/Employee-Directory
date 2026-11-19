import { useEffect, useState } from "react";
import { getEmployees, getStats } from "../api/employees";
import type { Employee, Filters, Person, Stats } from "../types";
import { formatDate, tenure } from "../utils/format";
import { DEFAULT_FILTERS, DEFAULT_QUERY } from "../utils/query";
import Avatar from "./Avatar";
import { ChevronRightIcon } from "./Icons";
import StatsBar from "./StatsBar";

interface Props {
  people: Person[];
  reloadKey: number;
  onOpen: (id: number) => void;
  onShowEmployees: (patch: Partial<Filters>) => void;
}

function Dashboard({ people, reloadKey, onOpen, onShowEmployees }: Props) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recent, setRecent] = useState<Employee[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getStats(DEFAULT_FILTERS, controller.signal)
      .then(setStats)
      .catch(() => {});
    getEmployees({ ...DEFAULT_QUERY, sortBy: "joiningDate", sortOrder: "desc", limit: 6 }, controller.signal)
      .then((data) => setRecent(data.employees))
      .catch(() => {});
    return () => controller.abort();
  }, [reloadKey]);

  const biggestTeams = [...people]
    .filter((p) => p.reportCount > 0)
    .sort((a, b) => b.reportCount - a.reportCount || a.name.localeCompare(b.name))
    .slice(0, 6);

  return (
    <>
      <StatsBar
        stats={stats}
        selectedDepartments={[]}
        selectedLevels={[]}
        onToggleDepartment={(department) => onShowEmployees({ department: [department] })}
        onToggleLevel={(level) => onShowEmployees({ level: [level] })}
      />

      <div className="dash-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Newest joiners</h2>
            <button type="button" className="link-btn" onClick={() => onShowEmployees({})}>
              See everyone
            </button>
          </div>
          {!recent ? (
            <div className="skeleton-line" />
          ) : (
            <ul className="people-list">
              {recent.map((e) => (
                <li key={e.id}>
                  <button type="button" className="person-row" onClick={() => onOpen(e.id)}>
                    <Avatar name={e.name} size="sm" status={e.status} />
                    <span className="grow">
                      {e.name}
                      <span className="person-sub">
                        {e.role} · {e.department}
                      </span>
                    </span>
                    <span className="person-meta">
                      {formatDate(e.joiningDate)}
                      <span className="person-sub">{tenure(e.joiningDate)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Largest teams</h2>
            <span className="muted small">by direct reports</span>
          </div>
          <ul className="people-list">
            {biggestTeams.map((p) => (
              <li key={p.id}>
                <button type="button" className="person-row" onClick={() => onShowEmployees({ managerId: p.id })}>
                  <Avatar name={p.name} size="sm" status={p.status} />
                  <span className="grow">
                    {p.name}
                    <span className="person-sub">{p.role}</span>
                  </span>
                  <span className="team-count">{p.reportCount}</span>
                  <ChevronRightIcon size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

export default Dashboard;
