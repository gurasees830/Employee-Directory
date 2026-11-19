import { useEffect, useRef } from "react";
import type { Employee, SortKey, SortOrder } from "../types";
import { formatDate, isNewHire, tenure } from "../utils/format";
import Avatar from "./Avatar";
import { NewBadge, StatusBadge, TypeBadge } from "./Badges";
import Highlight from "./Highlight";
import { ArrowDownIcon, ArrowUpIcon, EditIcon, EyeIcon, SortIcon, TrashIcon } from "./Icons";
import RowMenu from "./RowMenu";

interface Props {
  employees: Employee[];
  search: string;
  sortBy: SortKey;
  sortOrder: SortOrder;
  selected: Set<number>;
  onSort: (key: SortKey) => void;
  onToggleSelect: (id: number) => void;
  onToggleAll: () => void;
  onOpen: (id: number) => void;
  onEdit: (employee: Employee) => void;
  onDelete: (employee: Employee) => void;
}

const COLUMNS: { key: SortKey | null; label: string; className?: string }[] = [
  { key: "name", label: "Employee" },
  { key: "role", label: "Role & team" },
  { key: null, label: "Phone" },
  { key: null, label: "Type" },
  { key: null, label: "Status" },
  { key: "joiningDate", label: "Joined · time here" },
];

function EmployeeTable(props: Props) {
  const { employees, search, sortBy, sortOrder, selected, onSort, onToggleSelect, onToggleAll, onOpen, onEdit, onDelete } =
    props;

  const allSelected = employees.length > 0 && employees.every((e) => selected.has(e.id));
  const someSelected = !allSelected && employees.some((e) => selected.has(e.id));
  const headerCheckbox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckbox.current) headerCheckbox.current.indeterminate = someSelected;
  }, [someSelected]);

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="col-check">
              <input
                ref={headerCheckbox}
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label={allSelected ? "Deselect all on this page" : "Select all on this page"}
              />
            </th>
            {COLUMNS.map((col) => {
              const sorted = col.key === sortBy;
              return (
                <th
                  key={col.label}
                  className={col.className}
                  aria-sort={sorted ? (sortOrder === "asc" ? "ascending" : "descending") : undefined}
                >
                  {col.key ? (
                    <button type="button" className={`th-sort ${sorted ? "is-sorted" : ""}`} onClick={() => onSort(col.key!)}>
                      {col.label}
                      {sorted ? (
                        sortOrder === "asc" ? (
                          <ArrowUpIcon size={13} />
                        ) : (
                          <ArrowDownIcon size={13} />
                        )
                      ) : (
                        <SortIcon size={13} className="sort-hint" />
                      )}
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
            <th className="col-actions">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((emp) => {
            const isSelected = selected.has(emp.id);
            return (
              <tr
                key={emp.id}
                className={isSelected ? "is-selected" : ""}
                onClick={(e) => {
                  // the whole row opens the profile, except clicks on its own controls
                  if (!(e.target as HTMLElement).closest("button, a, input, label")) onOpen(emp.id);
                }}
              >
                <td className="col-check">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(emp.id)}
                    aria-label={`Select ${emp.name}`}
                  />
                </td>
                <td data-label="Employee">
                  <div className="person">
                    <Avatar name={emp.name} status={emp.status} />
                    <div className="person-text">
                      <button type="button" className="person-name" onClick={() => onOpen(emp.id)}>
                        <Highlight text={emp.name} query={search} />
                      </button>
                      <span className="person-email">
                        <Highlight text={emp.email} query={search} />
                      </span>
                    </div>
                  </div>
                </td>
                <td data-label="Role">
                  <div className="cell-stack">
                    <span>
                      <Highlight text={emp.role} query={search} />
                    </span>
                    <span className="cell-sub">
                      {emp.department} · {emp.level}
                      {emp.reportCount > 0 && ` · leads ${emp.reportCount}`}
                    </span>
                  </div>
                </td>
                <td data-label="Phone" className="tabular nowrap">
                  {emp.phone || "—"}
                </td>
                <td data-label="Type">
                  <TypeBadge type={emp.employmentType} />
                </td>
                <td data-label="Status">
                  <StatusBadge status={emp.status} />
                </td>
                <td data-label="Joined">
                  <div className="cell-stack">
                    <span className="nowrap">
                      {formatDate(emp.joiningDate)} {isNewHire(emp.joiningDate) && <NewBadge />}
                    </span>
                    <span className="cell-sub">{tenure(emp.joiningDate)}</span>
                  </div>
                </td>
                <td className="col-actions">
                  <RowMenu
                    label={`Actions for ${emp.name}`}
                    items={[
                      { label: "Details", icon: <EyeIcon size={15} />, onSelect: () => onOpen(emp.id) },
                      { label: "Edit", icon: <EditIcon size={15} />, onSelect: () => onEdit(emp) },
                      { label: "Delete", icon: <TrashIcon size={15} />, danger: true, onSelect: () => onDelete(emp) },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default EmployeeTable;
