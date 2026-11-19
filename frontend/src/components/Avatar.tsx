import type { CSSProperties } from "react";
import { avatarHue, initials } from "../utils/format";

interface Props {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  /** Shows a small presence dot. The status is always also written out next to it. */
  status?: string;
}

const PRESENCE: Record<string, string> = {
  Active: "is-active",
  "On Leave": "is-leave",
  Inactive: "is-inactive",
};

/** Initials avatar; the colour is derived from the name so it stays stable. Decorative only. */
function Avatar({ name, size = "md", status }: Props) {
  const style = { "--hue": avatarHue(name) } as CSSProperties;
  return (
    <span className={`avatar avatar-${size}`} style={style} aria-hidden="true">
      {initials(name)}
      {status && <span className={`presence ${PRESENCE[status] ?? ""}`} />}
    </span>
  );
}

export default Avatar;
