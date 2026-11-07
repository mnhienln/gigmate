/** Decorative record graphic for audio posts. Pure SVG, no image weight. */
export function Vinyl({ size = 148 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      width={size}
      height={size}
      viewBox="0 0 148 148"
      className="shrink-0"
    >
      <circle cx="74" cy="74" r="74" fill="#2f1a0e" />
      {[64, 56, 48, 40, 32].map((r) => (
        <circle
          key={r}
          cx="74"
          cy="74"
          r={r}
          fill="none"
          stroke="#5a3a26"
          strokeWidth="1"
        />
      ))}
      <circle cx="74" cy="74" r="24" fill="#e4a52a" />
      <circle cx="74" cy="74" r="3" fill="#2f1a0e" />
    </svg>
  );
}
