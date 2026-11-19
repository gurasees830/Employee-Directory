import { useId } from "react";

/** Ágaetis mark: a gradient "A" peak with diagonal cut lines. Transparent background. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const gradient = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={gradient} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1f5fd0" />
          <stop offset="0.55" stopColor="#3d8fe6" />
          <stop offset="1" stopColor="#9fdcf6" />
        </linearGradient>
      </defs>
      <path d="M30 4 L60 60 H4 Z" fill={`url(#${gradient})`} />
      {/* the three white strokes that give the mark its folded look */}
      <path d="M30 4 L22 60 M37 17 L31 60 M44 30 L40 60" stroke="#fff" strokeWidth="3.2" fill="none" />
    </svg>
  );
}

/** Full lockup: mark + wordmark. `compact` shows the mark only. */
function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="logo" aria-label="Ágaetis Technologies">
      <LogoMark size={compact ? 30 : 34} />
      {!compact && (
        <span className="logo-text" aria-hidden="true">
          <span className="logo-name">Ágaetis</span>
          <span className="logo-tag">Technologies</span>
        </span>
      )}
    </span>
  );
}

export default Logo;
