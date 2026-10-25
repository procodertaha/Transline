import type { Vec2 } from "@/lib/transline/types";

const PHASE_VARS = [
  "var(--phase-a)",
  "var(--phase-b)",
  "var(--phase-c)",
];

export function ConductorDiagram({
  coords,
  labels,
  groups,
  showGround = true,
  className = "",
}: {
  coords: Vec2[];
  labels: string[];
  groups: number[][];
  showGround?: boolean;
  className?: string;
}) {
  if (coords.length === 0) return null;
  const pad = 1.2;
  const xs = coords.map((p) => p.x);
  const ys = coords.map((p) => p.y);
  const minX = Math.min(...xs) - pad;
  const maxX = Math.max(...xs) + pad;
  const minY = showGround ? 0 : Math.min(...ys) - pad;
  const maxY = Math.max(...ys) + pad;
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const VBW = 420;
  const VBH = 320;
  const scale = Math.min(VBW / w, VBH / h);
  const ox = (VBW - w * scale) / 2;
  const oy = (VBH - h * scale) / 2;
  const px = (p: Vec2) => ox + (p.x - minX) * scale;
  const py = (p: Vec2) => VBH - (oy + (p.y - minY) * scale);
  const dotR = Math.max(5, Math.min(12, scale * 0.18));

  const groupOf = new Map<number, number>();
  groups.forEach((g, gi) => g.forEach((i) => groupOf.set(i, gi)));

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      className={`w-full rounded-xl border border-border bg-card ${className}`}
      role="img"
      aria-label="Line configuration diagram"
    >
      {showGround && (
        <g>
          <line
            x1={10}
            y1={py({ x: 0, y: 0 })}
            x2={VBW - 10}
            y2={py({ x: 0, y: 0 })}
            className="stroke-border"
            strokeWidth={2}
          />
          {Array.from({ length: 16 }, (_, i) => {
            const gx = 14 + (i * (VBW - 28)) / 15;
            const gy = py({ x: 0, y: 0 });
            return (
              <line
                key={i}
                x1={gx}
                y1={gy}
                x2={gx - 7}
                y2={gy + 8}
                className="stroke-border"
                strokeWidth={1.5}
              />
            );
          })}
          <text
            x={VBW - 14}
            y={py({ x: 0, y: 0 }) - 6}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={11}
          >
            ground
          </text>
        </g>
      )}
      {/* dashed links inside each phase group */}
      {groups
        .filter((g) => g.length > 1)
        .map((g, gi) => (
          <line
            key={gi}
            x1={px(coords[g[0]!])}
            y1={py(coords[g[0]!])}
            x2={px(coords[g[1]!])}
            y2={py(coords[g[1]!])}
            stroke={PHASE_VARS[gi % 3]}
            strokeWidth={1.5}
            strokeDasharray="6 5"
            className="animate-dash"
            opacity={0.7}
          />
        ))}
      {coords.map((p, i) => {
        const gi = groupOf.get(i) ?? 0;
        return (
          <g key={i}>
            <circle
              cx={px(p)}
              cy={py(p)}
              r={dotR}
              fill={PHASE_VARS[gi % 3]}
              opacity={0.9}
            />
            <circle
              cx={px(p)}
              cy={py(p)}
              r={dotR}
              fill="none"
              stroke="var(--color-foreground)"
              strokeWidth={1}
              opacity={0.35}
            />
            <text
              x={px(p) + dotR + 6}
              y={py(p) - dotR - 2}
              className="fill-foreground"
              fontSize={13}
              fontWeight={600}
              fontFamily="var(--font-mono)"
            >
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
