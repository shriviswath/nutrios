"use client";

import Link from "next/link";
import { useState } from "react";
import { EnergyPanel } from "@/components/home/EnergyPanel";
import { MealSection } from "@/components/home/MealSection";
import { AddFoodSheet } from "@/components/log/AddFoodSheet";
import { ExerciseSheet } from "@/components/log/ExerciseSheet";
import { Button } from "@/components/ui/primitives";
import { useAnalytics, useDay, useExercises, useLatestWeight, useProfile, useSettings } from "@/lib/hooks";
import { copyDay, deleteExercise } from "@/lib/db/repo";
import { MEAL_SLOTS, type MealSlot } from "@/lib/types";
import { dateKey, formatDay, isToday, shiftKey } from "@/lib/utils/date";
import { kcal } from "@/lib/utils/format";

export default function HomePage() {
  const [date, setDate] = useState(dateKey());
  const [addTo, setAddTo] = useState<MealSlot | null>(null);
  const [exerciseOpen, setExerciseOpen] = useState(false);

  const profile = useProfile();
  const settings = useSettings();
  const day = useDay(date);
  const exercises = useExercises(date);
  const latestWeight = useLatestWeight();
  const analytics = useAnalytics();

  if (!profile || !settings || !day) {
    return <p className="py-10 text-center text-[13px] text-muted">Loading today…</p>;
  }

  const weight = latestWeight?.weightKg ?? profile.startWeightKg;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">{formatDay(date)}</h1>
          <p className="text-[13px] text-muted">
            {profile.name}
            {analytics?.estimate.ready ? ` · maintenance ≈ ${kcal(analytics.estimate.value)} kcal` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button className="tap px-2 text-muted" onClick={() => setDate(shiftKey(date, -1))} aria-label="Previous day">
            ‹
          </button>
          <button
            className="tap px-2 text-muted disabled:opacity-30"
            onClick={() => setDate(shiftKey(date, 1))}
            disabled={isToday(date)}
            aria-label="Next day"
          >
            ›
          </button>
        </div>
      </header>

      <EnergyPanel totals={day.totals} settings={settings} exerciseKcal={day.exerciseKcal} />

      {analytics?.recommendation.action === "increase" || analytics?.recommendation.action === "decrease" ? (
        <Link href="/insights" className="block rounded-lg border-l-2 border-energy bg-surface px-3 py-2.5 text-[13px]">
          <p className="font-semibold text-energy">Your target may need a change</p>
          <p className="text-ink/80">{analytics.recommendation.reasoning}</p>
        </Link>
      ) : null}

      {MEAL_SLOTS.map((meal) => (
        <MealSection key={meal} meal={meal} entries={day.byMeal[meal]} date={date} onAdd={setAddTo} />
      ))}

      <section className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Training</h3>
          <Button size="sm" onClick={() => setExerciseOpen(true)}>
            Log session
          </Button>
        </div>
        {exercises.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">Nothing logged. Sessions are tracked separately and never added back to your food target.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {exercises.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-[14px]">{e.activity}</p>
                  <p className="text-[12px] text-muted">{e.minutes} min</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="num text-[13px]">{kcal(e.kcal)}</span>
                  <button className="tap px-1 text-[12px] text-muted" onClick={() => e.id && deleteExercise(e.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-4">
        <h3 className="font-semibold">Energy balance</h3>
        <dl className="mt-2 space-y-1.5 text-[13px]">
          <Row label="Food logged" value={`${kcal(day.totals.kcal)} kcal`} />
          <Row label="Training (estimated)" value={`${kcal(day.exerciseKcal)} kcal`} />
          <Row
            label={analytics?.estimate.ready ? "Estimated expenditure" : "Estimated expenditure (formula)"}
            value={`${kcal(analytics?.estimate.value)} kcal`}
          />
          <Row
            label="Balance"
            value={`${kcal(day.totals.kcal - (analytics?.estimate.value ?? 0))} kcal`}
            emphasis
          />
        </dl>
        <p className="mt-2 text-[12px] text-muted">
          Expenditure already includes normal daily movement. A negative balance is a deficit for the day.
        </p>
      </section>

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={async () => {
            const copied = await copyDay(shiftKey(date, -1), date);
            if (!copied) alert("Nothing was logged yesterday.");
          }}
        >
          Copy the whole of yesterday
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setAddTo(guessMeal())}
        className="fixed bottom-[76px] right-4 z-30 rounded-full bg-ink px-5 py-3.5 text-[14px] font-medium text-bg shadow-lg"
      >
        + Add food
      </button>

      <AddFoodSheet open={addTo !== null} onClose={() => setAddTo(null)} date={date} meal={addTo ?? "breakfast"} />
      <ExerciseSheet open={exerciseOpen} onClose={() => setExerciseOpen(false)} date={date} weightKg={weight} />
    </div>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`num ${emphasis ? "font-medium" : ""}`}>{value}</dd>
    </div>
  );
}

/** Opens the sheet on the meal you are most likely logging right now. */
function guessMeal(): MealSlot {
  const hour = new Date().getHours();
  if (hour < 10) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 18) return "snacks";
  return "dinner";
}
