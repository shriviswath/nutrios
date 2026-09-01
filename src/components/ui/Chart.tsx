"use client";

import { formatShort } from "@/lib/utils/date";

export interface ChartPoint {
  date: string;
  value?: number;
}

export interface Series {
  points: ChartPoint[];
  color: string;
  kind?: "line" | "bar" | "dots";
  dashed?: boolean;
  label?: string;
}

const W = 320;
const H = 120;
const PAD_L = 30;
const PAD_R = 6;
const PAD_T = 8;
const PAD_B = 16;

/**
 * A small hand-rolled chart. A charting library would add ~120 kB to a local-first app for
 * four line plots and a bar row; this is 100 lines and matches the rest of the type system.
 */
export function Chart({
  series,
  referenceLine,
  referenceLabel,
  yMin,
  yMax,
  height = 140,
}: {
  series: Series[];
  referenceLine?: number;
  referenceLabel?: string;
  yMin?: number;
  yMax?: number;
  height?: number;
}) {
  const all = series.flatMap((s) => s.points.map((p) => p.value).filter((v): v is number => v !== undefined && !Number.isNaN(v)));
  if (referenceLine !== undefined) all.push(referenceLine);
  if (all.length === 0) {
    return <p className="py-6 text-center text-[13px] text-muted">Nothing to plot yet.</p>;
  }

  const rawMin = yMin ?? Math.min(...all);
  const rawMax = yMax ?? Math.max(...all);
  const span = rawMax - rawMin || Math.max(1, rawMax * 0.1);
  const lo = yMin ?? rawMin - span * 0.12;
  const hi = yMax ?? rawMax + span * 0.12;

  const length = Math.max(...series.map((s) => s.points.length));
  const x = (i: number) => PAD_L + (i / Math.max(1, length - 1)) * (W - PAD_L - PAD_R);
  const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * (H - PAD_T - PAD_B);

  const dates = series[0]?.points.map((p) => p.date) ?? [];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} role="img" className="overflow-visible">
      {[hi, (hi + lo) / 2, lo].map((v, i) => (
        <g key={i}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth={0.5} />
          <text x={PAD_L - 4} y={y(v) + 3} textAnchor="end" fontSize={7} fill="var(--color-muted)" className="num">
            {formatTick(v)}
          </text>
        </g>
      ))}

      {referenceLine !== undefined && (
        <>
          <line
            x1={PAD_L}
            x2={W - PAD_R}
            y1={y(referenceLine)}
            y2={y(referenceLine)}
            stroke="var(--color-muted)"
            strokeWidth={0.8}
            strokeDasharray="3 3"
          />
          {referenceLabel && (
            <text x={W - PAD_R} y={y(referenceLine) - 3} textAnchor="end" fontSize={7} fill="var(--color-muted)">
              {referenceLabel}
            </text>
          )}
        </>
      )}

      {series.map((s, si) => {
        if (s.kind === "bar") {
          const barW = Math.max(1.5, (W - PAD_L - PAD_R) / Math.max(1, length) - 2);
          return (
            <g key={si}>
              {s.points.map((p, i) =>
                p.value === undefined || p.value <= 0 ? null : (
                  <rect
                    key={p.date}
                    x={x(i) - barW / 2}
                    y={y(p.value)}
                    width={barW}
                    height={Math.max(0, y(lo) - y(p.value))}
                    fill={s.color}
                    opacity={0.85}
                    rx={1}
                  />
                ),
              )}
            </g>
          );
        }
        if (s.kind === "dots") {
          return (
            <g key={si}>
              {s.points.map((p, i) =>
                p.value === undefined ? null : <circle key={p.date} cx={x(i)} cy={y(p.value)} r={1.6} fill={s.color} opacity={0.7} />,
              )}
            </g>
          );
        }
        return (
          <g key={si}>
            {segments(s.points).map((seg, i) => (
              <polyline
                key={i}
                fill="none"
                stroke={s.color}
                strokeWidth={1.6}
                strokeDasharray={s.dashed ? "4 3" : undefined}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={seg.map(({ index, value }) => `${x(index)},${y(value)}`).join(" ")}
              />
            ))}
          </g>
        );
      })}

      {dates.length > 1 && (
        <>
          <text x={PAD_L} y={H - 4} fontSize={7} fill="var(--color-muted)">
            {formatShort(dates[0])}
          </text>
          <text x={W - PAD_R} y={H - 4} fontSize={7} textAnchor="end" fill="var(--color-muted)">
            {formatShort(dates[dates.length - 1])}
          </text>
        </>
      )}
    </svg>
  );
}

/** Split on gaps so missing days leave a break rather than a straight line through them. */
function segments(points: ChartPoint[]) {
  const out: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];
  points.forEach((p, index) => {
    if (p.value === undefined || Number.isNaN(p.value)) {
      if (current.length) out.push(current);
      current = [];
    } else {
      current.push({ index, value: p.value });
    }
  });
  if (current.length) out.push(current);
  return out.filter((s) => s.length > 1);
}

function formatTick(v: number): string {
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`;
  return String(Math.round(v * 10) / 10);
}
