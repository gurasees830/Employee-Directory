import type { Filters, Person } from "../types";
import { getFilterChips } from "../utils/query";
import { CloseIcon } from "./Icons";

interface Props {
  filters: Filters;
  people: Person[];
  onChange: (filters: Filters) => void;
  onClear: () => void;
}

function ActiveFilters({ filters, people, onChange, onClear }: Props) {
  const chips = getFilterChips(filters, people);
  if (chips.length === 0) return null;

  return (
    <div className="active-filters" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className="active-chip"
          onClick={() => onChange(chip.remove(filters))}
          aria-label={`Remove filter ${chip.label}`}
        >
          {chip.label}
          <CloseIcon size={12} />
        </button>
      ))}
      {chips.length > 1 && (
        <button type="button" className="link-btn" onClick={onClear}>
          Clear all
        </button>
      )}
    </div>
  );
}

export default ActiveFilters;
