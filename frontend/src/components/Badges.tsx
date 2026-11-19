const STATUS_CLASS: Record<string, string> = {
  Active: "status-active",
  "On Leave": "status-leave",
  Inactive: "status-inactive",
};

const TYPE_CLASS: Record<string, string> = {
  "Full-time": "type-full",
  "Part-time": "type-part",
  Contract: "type-contract",
  Internship: "type-intern",
};

/** Status always shows its text label — colour is never the only signal. */
export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge status ${STATUS_CLASS[status] ?? ""}`}>
      <span className="status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  return <span className={`badge type ${TYPE_CLASS[type] ?? ""}`}>{type}</span>;
}

export function LevelBadge({ level }: { level: string }) {
  return <span className="badge level">{level}</span>;
}

export function NewBadge() {
  return <span className="badge new">New</span>;
}
