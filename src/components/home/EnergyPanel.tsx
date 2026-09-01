"use client";

import { Bar } from "@/components/ui/primitives";
import type { Macros, Settings } from "@/lib/types";
import { grams, kcal } from "@/lib/utils/format";

/**
 * The signature element: a ticked capacity gauge rather than the usual ring.
 * Overshoot is drawn in the warning colour on top of the fill instead of resetting the bar,
 * so going over is visible at a glance rather than hidden behind a wrapped percentage.
 */
export function EnergyPanel({
  totals,
  settings,
  exerciseKcal,
}: {
  totals: Macros;
  settings: Settings;
  exerciseKcal: number;
}) {
  const target = settings.calorieTarget;
  const consumed = Math.round(totals.kcal);
  const remaining = target - consumed;
  const fillPct = Math.min(100, (consumed / target) * 100);
  const overPct = consumed > target ? Math.min(100, ((consumed - target) / target) * 100) : 0;

  return (
    <section className="card p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="num text-[34px] leading-none font-medium">
            {kcal(consumed)}
            <span className="text-[15px] text-muted"> / {kcal(target)} kcal</span>
          </p>
          <p className={`mt-1 text-[13px] ${remaining < 0 ? "text-warn" : "text-muted"}`}>
            {remaining >= 0 ? `${kcal(remaining)} kcal left today` : `${kcal(-remaining)} kcal over target`}
          </p>
        </div>
        {exerciseKcal > 0 && (
          <div className="text-right">
            <p className="num text-[15px]">{kcal(exerciseKcal)}</p>
            <p className="text-[12px] text-muted">burned in training</p>
          </div>
        )}
      </div>

      <div className="gauge mt-3" role="img" aria-label={`${consumed} of ${target} kcal`}>
        <div className="gauge-fill" style={{ width: `${fillPct}%` }} />
        {overPct > 0 && <div className="gauge-over" style={{ width: `${overPct}%`, opacity: 0.9 }} />}
        <div className="gauge-ticks" />
      </div>

      <dl className="mt-4 space-y-2.5">
        <MacroRow label="Protein" value={totals.protein} target={settings.proteinTarget} color="var(--color-protein)" />
        <MacroRow label="Carbohydrate" value={totals.carbs} target={settings.carbTarget} color="var(--color-carb)" />
        <MacroRow label="Fat" value={totals.fat} target={settings.fatTarget} color="var(--color-fat)" />
        <MacroRow label="Fibre" value={totals.fiber ?? 0} target={settings.fiberTarget} color="var(--color-muted)" />
      </dl>
    </section>
  );
}

function MacroRow({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-[13px]">
        <dt>{label}</dt>
        <dd className="num text-muted">
          <span className="text-ink">{grams(value)}</span> / {grams(target)} g
        </dd>
      </div>
      <Bar value={value} max={target} color={color} />
    </div>
  );
}
