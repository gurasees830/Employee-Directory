import { PAGE_SIZES } from "../constants";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

/** 1 … 4 5 [6] 7 8 … 20 — always shows first, last and two pages either side. */
function pageWindow(page: number, totalPages: number): (number | "gap")[] {
  const pages = new Set([1, totalPages]);
  for (let p = page - 2; p <= page + 2; p++) if (p >= 1 && p <= totalPages) pages.add(p);
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(p - sorted[i - 1] === 2 ? p - 1 : "gap");
    out.push(p);
  });
  return out;
}

function Pagination({ page, totalPages, total, limit, onPageChange, onLimitChange }: Props) {
  if (total === 0) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <nav className="pagination" aria-label="Pagination">
      <p className="pagination-info">
        <span className="mono">
          {from}–{to}
        </span>{" "}
        of <span className="mono">{total}</span>
      </p>

      {totalPages > 1 && (
        <div className="pages">
          <button
            type="button"
            className="page-btn"
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeftIcon size={16} />
          </button>
          {pageWindow(page, totalPages).map((p, i) =>
            p === "gap" ? (
              <span key={`gap-${i}`} className="page-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                className={`page-btn ${p === page ? "is-current" : ""}`}
                aria-current={p === page ? "page" : undefined}
                onClick={() => onPageChange(p)}
              >
                {p}
              </button>
            )
          )}
          <button
            type="button"
            className="page-btn"
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      )}

      <label className="page-size">
        Rows
        <select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}>
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}

export default Pagination;
