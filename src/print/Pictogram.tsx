/*
 * File:        src/print/Pictogram.tsx
 * Role:        Category pictogram in a black diamond, as on the fighter scrolls
 *              and cards: crown (Leader), shield and sword (Champion), helmet
 *              (Henchman), club (Brute), claws (Beast). Original simple shapes.
 * Author:      Adrien Duclaud
 * Created:     2026-10-12
 * License:     MIT
 */

const SHAPES: Record<string, string> = {
  leader: "M-9 5 L-9 -4 L-4.5 0 L0 -7 L4.5 0 L9 -4 L9 5 Z",
  champion: "M-7 -6 L7 -6 L7 1 Q7 6 0 9 Q-7 6 -7 1 Z M-1 -9 L1 -9 L1 4 L-1 4 Z",
  henchman: "M-8 4 Q-8 -8 0 -8 Q8 -8 8 4 L3 4 L3 0 L-3 0 L-3 4 Z",
  brute: "M-2 9 L-2 -2 L-5 -5 L-3 -9 L3 -9 L5 -5 L2 -2 L2 9 Z",
  beast: "M-7 6 L-5 -7 L-3 6 Z M-1 6 L1 -8 L3 6 Z M5 6 L7 -6 L8 6 Z",
};

export function Pictogram({
  category,
  size = 28,
  label,
}: {
  category: string;
  size?: number;
  label: string;
}) {
  const shape = SHAPES[category] ?? SHAPES["henchman"];
  return (
    <svg
      width={size}
      height={size}
      viewBox="-16 -16 32 32"
      role="img"
      aria-label={label}
      className="shrink-0"
    >
      <rect x="-11" y="-11" width="22" height="22" transform="rotate(45)" fill="var(--color-ink)" />
      <path d={shape} fill="var(--color-white)" />
    </svg>
  );
}
