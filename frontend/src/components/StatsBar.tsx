import type { CSSProperties, ReactNode } from "react";
import { LEVELS } from "../constants";
import type { Stats } from "../types";
import { CheckCircleIcon, ClockIcon, SparkIcon, UsersIcon } from "./Icons";

interface Props {
  stats: Stats | null;
  selectedDepartments: string[];
  selectedLevels: string[];
  onToggleDepartment: (department: string) => void;
  onToggleLevel: (level: string) => void;
}

const SHORT_LEVEL: Record<string, string> = {
  "Mid-Level": "Mid",
  Manager: "Mgr",
  Director: "Dir",
  Executive: "Exec",
};

const MAX_DEPARTMENT_BARS = 8;

function Kpi({ icon, label, value, hint }: { icon: ReactNode; label: string; value: ReactNode; hint: ReactNode }) {
  return (
    <div className="kpi">
      <div className="kpi-icon">{icon}</div>
      <div>
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-hint">{hint}</div>
      </div>
    </div>
  );
}

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function StatsBar({ stats, selectedDepartments, selectedLevels, onToggleDepartment, onToggleLevel }: Props) {
  if (!stats) {
    return (
      <section className="insights" aria-busy="true" aria-label="Loading insights">
        <div className="kpis">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kpi skeleton-block" />
          ))}
        </div>
      </section>
    );
  }

  const { total } = stats;

  // Top departments get their own bar; the long tail folds into "Other".
  const topDepartments = stats.byDepartment.slice(0, MAX_DEPARTMENT_BARS);
  const rest = stats.byDepartment.slice(MAX_DEPARTMENT_BARS);
  const otherCount = rest.reduce((sum, d) => sum + d.count, 0);
  // one scale for every bar, including "Other", so lengths can be compared honestly
  const maxDepartment = Math.max(1, otherCount, ...topDepartments.map((d) => d.count));

  const levelCounts = new Map(stats.byLevel.map((l) => [l.value, l.count]));
  const levels = LEVELS.map((value) => ({ value, count: levelCounts.get(value) ?? 0 }));
  const maxLevel = Math.max(1, ...levels.map((l) => l.count));

  return (
    <section className="insights" aria-label="Insights">
      <div className="kpis">
        <Kpi
          icon={<UsersIcon />}
          label="Employees"
          value={total}
          hint={`across ${stats.departments} ${stats.departments === 1 ? "department" : "departments"}`}
        />
        <Kpi
          icon={<CheckCircleIcon />}
          label="Active"
          value={stats.active}
          hint={`${pct(stats.active, total)}% · ${stats.onLeave} on leave`}
        />
        <Kpi icon={<ClockIcon />} label="Avg. experience" value={`${stats.avgTenure} yrs`} hint="at Ágaetis, founded 2018" />
        <Kpi icon={<SparkIcon />} label="New hires" value={stats.newHires} hint="joined in the last 90 days" />
      </div>

      {total > 0 && (
        <div className="charts">
          <div className="chart-card">
            <h3 className="chart-title">Headcount by department</h3>
            <ul className="hbars">
              {topDepartments.map((d) => {
                const active = selectedDepartments.includes(d.value);
                return (
                  <li key={d.value}>
                    <button
                      type="button"
                      className={`hbar ${active ? "is-active" : ""}`}
                      onClick={() => onToggleDepartment(d.value)}
                      aria-pressed={active}
                      aria-label={`${d.value}: ${d.count} employees, ${pct(d.count, total)}%. ${active ? "Remove" : "Apply"} department filter`}
                    >
                      <span className="hbar-label">{d.value}</span>
                      <span className="hbar-track">
                        <span className="hbar-fill" style={{ width: `${(d.count / maxDepartment) * 100}%` }} />
                      </span>
                      <span className="hbar-value">{d.count}</span>
                      <span className="tip" role="presentation">
                        <strong>{d.value}</strong>
                        {d.count} people · {pct(d.count, total)}%
                      </span>
                    </button>
                  </li>
                );
              })}
              {otherCount > 0 && (
                <li>
                  <div className="hbar is-static" tabIndex={0} aria-label={`Other departments: ${otherCount} employees`}>
                    <span className="hbar-label">Other ({rest.length})</span>
                    <span className="hbar-track">
                      <span className="hbar-fill is-muted" style={{ width: `${(otherCount / maxDepartment) * 100}%` }} />
                    </span>
                    <span className="hbar-value">{otherCount}</span>
                    <span className="tip" role="presentation">
                      <strong>Other departments</strong>
                      {rest.map((d) => `${d.value} ${d.count}`).join(" · ")}
                    </span>
                  </div>
                </li>
              )}
            </ul>
          </div>

          <div className="chart-card">
            <h3 className="chart-title">Seniority mix</h3>
            <div className="columns" role="list">
              {levels.map((l) => {
                const active = selectedLevels.includes(l.value);
                return (
                  <div key={l.value} className="column-cell" role="listitem">
                    <button
                      type="button"
                      className={`column ${active ? "is-active" : ""}`}
                      onClick={() => onToggleLevel(l.value)}
                      aria-pressed={active}
                      aria-label={`${l.value}: ${l.count} employees. ${active ? "Remove" : "Apply"} level filter`}
                      disabled={l.count === 0 && !active}
                    >
                      <span className="column-value">{l.count}</span>
                      <span className="column-track">
                        <span
                          className="column-fill"
                          style={{ "--h": `${(l.count / maxLevel) * 100}%` } as CSSProperties}
                        />
                      </span>
                      <span className="column-label">{SHORT_LEVEL[l.value] ?? l.value}</span>
                      <span className="tip" role="presentation">
                        <strong>{l.value}</strong>
                        {l.count} people · {pct(l.count, total)}%
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default StatsBar;
