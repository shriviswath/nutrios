"use client";

import { Bar } from "@/components/ui/primitives";
import { QualityBar } from "@/components/ui/Quality";
import type { Grade } from "@/lib/nutrition/quality";
import type { Macros, Settings } from "@/lib/types";
import { grams, kcal } from "@/lib/utils/format";

/**
 * Daily summary: a ticked calorie ring with eaten / left / burned, macro bars and the day's food
 * quality mix. Overshoot is drawn as a second lap in the warning colour rather than wrapping the
 * ring silently, so going over is visible at a glance.
 */
export function EnergyPanel({
  totals,
  settings,
  exerciseKcal,
  quality,
}: {
  totals: Macros;
  settings: Settings;
  exerciseKcal: number;
  quality: Record<Grade, number>;
}) {
  const target = settings.calorieTarget;
  const eaten = Math.round(totals.kcal);
  const left = target - eaten;
  const over = left < 0;

  return (
    <section className="card p-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <Side label="Eaten" value={eaten} />
        <Ring eaten={eaten} target={target} />
        <Side label="Burned" value={Math.round(exerciseKcal)} hint="training" align="right" />
      </div>
      <p className={`mt-1 text-center text-[12px] ${over ? "text-warn" : "text-muted"}`}>
        {over ? `${kcal(-left)} kcal over your ${kcal(target)} kcal target` : `of ${kcal(target)} kcal target`}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Macro label="Protein" value={totals.protein} target={settings.proteinTarget} color="var(--color-protein)" />
        <Macro label="Carbs" value={totals.carbs} target={settings.carbTarget} color="var(--color-carb)" />
        <Macro label="Fat" value={totals.fat} target={settings.fatTarget} color="var(--color-fat)" />
        <Macro label="Fibre" value={totals.fiber ?? 0} target={settings.fiberTarget} color="var(--color-muted)" />
      </dl>

      {eaten > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-1.5 text-[12px] font-medium text-muted">Food quality today</p>
          <QualityBar share={quality} />
        </div>
      )}
    </section>
  );
}

const SIZE = 168;
const STROKE = 12;
const R = (SIZE - STROKE) / 2 - 6;
const C = 2 * Math.PI * R;
const TICKS = 40;

function Ring({ eaten, target }: { eaten: number; target: number }) {
  const frac = target > 0 ? eaten / target : 0;
  const main = Math.min(1, frac);
  const overLap = Math.min(1, Math.max(0, frac - 1));
  const left = target - eaten;

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }} role="img" aria-label={`${eaten} of ${target} kcal eaten`}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        {Array.from({ length: TICKS }, (_, i) => {
          const a = (i / TICKS) * 2 * Math.PI;
          const r1 = R + STROKE / 2 + 2;
          const r2 = r1 + (i % 5 === 0 ? 5 : 3);
          const c = SIZE / 2;
          return (
            <line
              key={i}
              x1={c + r1 * Math.cos(a)}
              y1={c + r1 * Math.sin(a)}
              x2={c + r2 * Math.cos(a)}
              y2={c + r2 * Math.sin(a)}
              stroke="var(--color-line)"
              strokeWidth={1}
            />
          );
        })}
        <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--color-sunken)" strokeWidth={STROKE} />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="var(--color-energy)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${main * C} ${C}`}
          style={{ transition: "stroke-dasharray 300ms ease-out" }}
        />
        {overLap > 0 && (
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            stroke="var(--color-warn)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${overLap * C} ${C}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`num text-[30px] font-medium leading-none ${left < 0 ? "text-warn" : ""}`}>{kcal(Math.abs(left))}</span>
        <span className="mt-1 text-[12px] text-muted">{left < 0 ? "kcal over" : "kcal left"}</span>
      </div>
    </div>
  );
}

function Side({ label, value, hint, align = "left" }: { label: string; value: number; hint?: string; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <p className="num text-[20px] font-medium leading-none">{kcal(value)}</p>
      <p className="mt-1 text-[12px] text-muted">
        {label}
        {hint ? <span className="block">{hint}</span> : null}
      </p>
    </div>
  );
}

function Macro({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const left = Math.max(0, Math.round(target - value));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[12px]">
        <dt className="font-medium">{label}</dt>
        <dd className="num text-muted">
          <span className="text-ink">{grams(value)}</span>/{grams(target)} g
        </dd>
      </div>
      <Bar value={value} max={target} color={color} />
      <p className="mt-0.5 text-[11px] text-muted">{left > 0 ? `${left} g left` : "Target reached"}</p>
    </div>
  );
}
