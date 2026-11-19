import type { RefObject } from "react";
import { SORT_OPTIONS } from "../constants";
import type { SortKey, SortOrder } from "../types";
import { CloseIcon, DownloadIcon, FilterIcon, SearchIcon } from "./Icons";

interface Props {
  searchRef: RefObject<HTMLInputElement | null>;
  search: string;
  onSearchChange: (value: string) => void;
  filterCount: number;
  onOpenFilters: () => void;
  sortBy: SortKey;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortKey, sortOrder: SortOrder) => void;
  onExport: () => void;
  exporting: boolean;
}

const SORT_NAMES: Record<SortKey, string> = {
  name: "Name",
  role: "Role",
  department: "Department",
  level: "Level",
  joiningDate: "Joining date",
  createdAt: "Date added",
};

function Toolbar(props: Props) {
  const { searchRef, search, onSearchChange, filterCount, onOpenFilters } = props;
  const { sortBy, sortOrder, onSortChange, onExport, exporting } = props;

  const current = `${sortBy}:${sortOrder}`;
  const isPreset = SORT_OPTIONS.some((o) => `${o.sortBy}:${o.sortOrder}` === current);

  return (
    <div className="toolbar">
      <label className="search">
        <SearchIcon size={17} />
        <input
          ref={searchRef}
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by name, email, role, team or skill"
          aria-label="Search employees"
          maxLength={100}
        />
        {search ? (
          <button type="button" className="icon-btn" onClick={() => onSearchChange("")} aria-label="Clear search">
            <CloseIcon size={14} />
          </button>
        ) : (
          <kbd title="Press / to search">/</kbd>
        )}
      </label>

      <div className="toolbar-actions">
        <label className="select-wrap">
          <span className="sr-only">Sort by</span>
          <select
            value={current}
            onChange={(e) => {
              const [key, order] = e.target.value.split(":") as [SortKey, SortOrder];
              onSortChange(key, order);
            }}
          >
            {!isPreset && (
              <option value={current}>
                {SORT_NAMES[sortBy]} ({sortOrder === "asc" ? "ascending" : "descending"})
              </option>
            )}
            {SORT_OPTIONS.map((o) => (
              <option key={o.label} value={`${o.sortBy}:${o.sortOrder}`}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="btn" onClick={onExport} disabled={exporting} title="Download this list as a CSV file">
          <DownloadIcon size={16} />
          <span className="hide-sm">{exporting ? "Exporting…" : "Export"}</span>
        </button>

        <button type="button" className={`btn ${filterCount > 0 ? "is-pressed" : ""}`} onClick={onOpenFilters}>
          <FilterIcon size={16} />
          Filter
          {filterCount > 0 && <span className="count-pill">{filterCount}</span>}
        </button>
      </div>
    </div>
  );
}

export default Toolbar;
