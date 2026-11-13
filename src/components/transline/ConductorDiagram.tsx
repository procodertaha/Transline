import { useRef } from "react";
import type { Vec2 } from "@/lib/transline/types";

const PHASE_VARS = [
  "var(--phase-a)",
  "var(--phase-b)",
  "var(--phase-c)",
];

const VBW = 420;
const VBH = 320;

interface FrozenBounds {
  minX: number;
  minY: number;
  scale: number;
  ox: number;
  oy: number;
  rect: DOMRect;
}

export function ConductorDiagram({
  coords,
  labels,
  groups,
  showGround = true,
  className = "",
  editable = false,
  onMove,
  showPairDistances = false,
}: {
  coords: Vec2[];
  labels: string[];
  groups: number[][];
  showGround?: boolean;
  className?: string;
  /** Allow dragging the conductor dots to reposition them. */
  editable?: boolean;
  /** Called with the conductor index and its new position in metres. */
  onMove?: (i: number, x: number, y: number) => void;
  /** Show measured pair distances in metres for a three-phase single circuit. */
  showPairDistances?: boolean;
}) {
  const dragIndex = useRef<number | null>(null);
  const frozen = useRef<FrozenBounds | null>(null);

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
  const scale = Math.min(VBW / w, VBH / h);
  const ox = (VBW - w * scale) / 2;
  const oy = (VBH - h * scale) / 2;
  const px = (p: Vec2) => ox + (p.x - minX) * scale;
  const py = (p: Vec2) => VBH - (oy + (p.y - minY) * scale);
  const dotR = Math.max(5, Math.min(12, scale * 0.18));

  /** Convert a pointer event position to metres, using bounds frozen at drag start. */
  const pointerToData = (clientX: number, clientY: number) => {
    const f = frozen.current!;
    const vbX = (clientX - f.rect.left) * (VBW / f.rect.width);
    const vbY = (clientY - f.rect.top) * (VBH / f.rect.height);
    return {
      x: f.minX + (vbX - f.ox) / f.scale,
      y: f.minY + (VBH - vbY - f.oy) / f.scale,
    };
  };

  const groupOf = new Map<number, number>();
  groups.forEach((g, gi) => g.forEach((i) => groupOf.set(i, gi)));

  return (
    <svg
      viewBox={`0 0 ${VBW} ${VBH}`}
      className={`w-full rounded-xl border border-border bg-card ${className}`}
      role="img"
      aria-label="Line configuration diagram"
      onPointerMove={(e) => {
        if (dragIndex.current === null || !onMove) return;
        const { x, y } = pointerToData(e.clientX, e.clientY);
        onMove(dragIndex.current, Math.round(x * 1000) / 1000, Math.max(0, Math.round(y * 1000) / 1000));
      }}
      onPointerUp={() => {
        dragIndex.current = null;
        frozen.current = null;
      }}
      onPointerLeave={() => {
        dragIndex.current = null;
        frozen.current = null;
      }}
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
            x1={px(coords[g[0]!]!)}
            y1={py(coords[g[0]!]!)}
            x2={px(coords[g[1]!]!)}
            y2={py(coords[g[1]!]!)}
            stroke={PHASE_VARS[gi % 3]}
            strokeWidth={1.5}
            strokeDasharray="6 5"
            className="animate-dash"
            opacity={0.7}
          />
        ))}
      {showPairDistances && coords.length === 3 && (
        <g aria-hidden="true">
          {([[0, 1], [1, 2], [2, 0]] as const).map(([i, j]) => {
            const a = coords[i];
            const b = coords[j];
            if (!a || !b) return null;
            const ax = px(a);
            const ay = py(a);
            const bx = px(b);
            const by = py(b);
            const dx = bx - ax;
            const dy = by - ay;
            const length = Math.hypot(dx, dy) || 1;
            const offset = 12;
            const mx = (ax + bx) / 2 + (dy / length) * offset;
            const my = (ay + by) / 2 - (dx / length) * offset;
            const metres = Math.hypot(a.x - b.x, a.y - b.y);
            return (
              <text
                key={`${i}-${j}`}
                x={mx}
                y={my}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground pointer-events-none"
                fontSize={11}
                fontFamily="var(--font-mono)"
                stroke="var(--color-card)"
                strokeWidth={4}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {metres.toPrecision(3)} m
              </text>
            );
          })}
        </g>
      )}
      {coords.map((p, i) => {
        const gi = groupOf.get(i) ?? 0;
        return (
          <g key={i}>
            <line
              x1={px(p)}
              y1={py(p)}
              x2={px(p)}
              y2={showGround ? py({ x: 0, y: 0 }) : py(p)}
              className="stroke-border"
              strokeWidth={1}
              strokeDasharray="2 4"
              opacity={0.5}
            />
            {editable && (
              <circle
                cx={px(p)}
                cy={py(p)}
                r={dotR + 8}
                fill="transparent"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.preventDefault();
                  dragIndex.current = i;
                  frozen.current = {
                    minX,
                    minY,
                    scale,
                    ox,
                    oy,
                    rect: e.currentTarget.closest("svg")!.getBoundingClientRect(),
                  };
                }}
              />
            )}
            <circle
              cx={px(p)}
              cy={py(p)}
              r={dotR}
              fill={PHASE_VARS[gi % 3]}
              opacity={0.9}
              className={editable ? "pointer-events-none" : undefined}
            />
            <circle
              cx={px(p)}
              cy={py(p)}
              r={dotR}
              fill="none"
              stroke="var(--color-foreground)"
              strokeWidth={1}
              opacity={0.35}
              className="pointer-events-none"
            />
            <text
              x={px(p) + dotR + 6}
              y={py(p) - dotR - 2}
              className="fill-foreground pointer-events-none"
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
