"use client";

import { MICRO_DEFS, microTarget } from "@/lib/nutrition/micros";
import type { FoodLog, Micros, Sex } from "@/lib/types";
import { Bar } from "@/components/ui/primitives";

/**
 * Micronutrients are only as good as the database behind them, and most cooked-dish entries
 * carry none. Rather than silently summing to a number that looks like a deficiency, each row
 * reports how much of the day's energy came from foods that actually have data for it.
 */
export function MicroPanel({ logs, totals, sex }: { logs: FoodLog[]; totals: Micros; sex: Sex }) {
  const dayKcal = logs.reduce((a, l) => a + l.macros.kcal, 0);

  if (logs.length === 0) {
    return <p className="text-[13px] text-muted">Log some food to see micronutrients.</p>;
  }

  return (
    <div className="space-y-4">
      {(["vitamin", "mineral"] as const).map((group) => (
        <div key={group}>
          <h4 className="mb-2 text-[13px] font-semibold">{group === "vitamin" ? "Vitamins" : "Minerals"}</h4>
          <ul className="space-y-2.5">
            {MICRO_DEFS.filter((d) => d.group === group).map((def) => {
              const value = totals[def.key];
              const target = microTarget(def, sex);
              const covered = logs.filter((l) => l.micros?.[def.key] !== undefined).reduce((a, l) => a + l.macros.kcal, 0);
              const coverage = dayKcal > 0 ? covered / dayKcal : 0;
              const pct = value !== undefined ? Math.round((value / target) * 100) : 0;
              return (
                <li key={def.key}>
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span>{def.label}</span>
                    <span className="num text-muted">
                      {value === undefined ? "no data" : `${round(value)} / ${target} ${def.unit}`}
                      {value !== undefined && ` · ${pct}%`}
                    </span>
                  </div>
                  <Bar value={value ?? 0} max={target} color={pct >= 100 ? "var(--color-ok)" : "var(--color-muted)"} />
                  {coverage < 0.6 && (
                    <p className="mt-0.5 text-[11px] text-muted">
                      Only {Math.round(coverage * 100)}% of today's calories come from foods with a value for this — the
                      real intake is higher than shown.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      <p className="text-[12px] text-muted">
        Reference values are population intakes for adults (ICMR-NIN 2020 where available, otherwise US DRI). They are
        not a personal requirement and this is not a diagnosis.
      </p>
    </div>
  );
}

function round(v: number): string {
  return v >= 10 ? String(Math.round(v)) : v.toFixed(1);
}
