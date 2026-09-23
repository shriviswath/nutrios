"use client";

import { useMemo, useState } from "react";
import { Button, Chip, Segmented } from "@/components/ui/primitives";
import { QualityDot, QualityPill } from "@/components/ui/Quality";
import { addFoodLog, toggleFavorite } from "@/lib/db/repo";
import { useFoods } from "@/lib/hooks";
import { MEAL_LABELS } from "@/lib/meals";
import { amountPresets, COUNT_STEPS, formatAmount } from "@/lib/nutrition/presets";
import { healthierSwaps, rateFood } from "@/lib/nutrition/quality";
import { scaleMacros } from "@/lib/nutrition/scaling";
import { MEAL_SLOTS, type Food, type MealSlot } from "@/lib/types";
import { grams, kcal, signed } from "@/lib/utils/format";

export function PortionEditor({
  food,
  date,
  meal,
  onDone,
  onSwap,
}: {
  food: Food;
  date: string;
  meal: MealSlot;
  onDone: () => void;
  /** Called when the user picks a healthier alternative; omitted where swapping makes no sense. */
  onSwap?: (food: Food) => void;
}) {
  const foods = useFoods();
  const [slot, setSlot] = useState<MealSlot>(meal);
  const [portionIndex, setPortionIndex] = useState(food.defaultPortionIndex ?? 0);
  const [count, setCount] = useState("1");
  const [byWeight, setByWeight] = useState(false);
  const [weight, setWeight] = useState(String(food.portions[food.defaultPortionIndex ?? 0]?.amount ?? 100));
  const [favorite, setFavorite] = useState(Boolean(food.favorite));

  const amount = useMemo(() => {
    if (byWeight) return Math.max(0, Number(weight) || 0);
    const portion = food.portions[portionIndex];
    return (portion?.amount ?? 100) * (Number(count) || 0);
  }, [byWeight, weight, food.portions, portionIndex, count]);

  const macros = useMemo(() => scaleMacros(food.per100, amount), [food.per100, amount]);
  const quality = useMemo(() => rateFood(food), [food]);
  const swaps = useMemo(() => (onSwap ? healthierSwaps(food, foods) : []), [food, foods, onSwap]);
  const presets = amountPresets(food.unit);

  const add = async () => {
    if (amount <= 0) return;
    await addFoodLog({ date, meal: slot, food, quantity: amount });
    onDone();
  };

  const stepCount = (delta: number) => setCount((c) => String(Math.max(0.5, (Number(c) || 0) + delta)));

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{food.name}</p>
          <p className="text-[12px] text-muted">
            {food.brand ? `${food.brand} · ` : ""}
            {food.category} · {food.per100.kcal} kcal per 100 {food.unit}
          </p>
        </div>
        <button
          type="button"
          className={`tap px-2 text-[18px] ${favorite ? "text-energy" : "text-muted"}`}
          aria-label={favorite ? "Remove from favourites" : "Save to favourites"}
          onClick={async () => {
            setFavorite((v) => !v);
            await toggleFavorite(food.id);
          }}
        >
          {favorite ? "★" : "☆"}
        </button>
      </div>

      <QualityPill quality={quality} />

      <Segmented
        value={byWeight ? "weight" : "portion"}
        onChange={(v) => setByWeight(v === "weight")}
        options={[
          { value: "portion", label: "Portions" },
          { value: "weight", label: food.unit === "ml" ? "By volume (ml)" : "By weight (g)" },
        ]}
      />

      {byWeight ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              className="field num"
              inputMode="decimal"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              aria-label={`Amount in ${food.unit}`}
            />
            <span className="text-[13px] text-muted">{food.unit}</span>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick amounts">
            {presets.map((p) => (
              <Chip key={p.amount} active={Number(weight) === p.amount} onClick={() => setWeight(String(p.amount))}>
                {p.label}
              </Chip>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Portion">
            {food.portions.map((p, i) => (
              <Chip key={`${p.label}-${i}`} active={portionIndex === i} onClick={() => setPortionIndex(i)}>
                {p.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <button type="button" className="tap w-11 rounded-lg border border-line text-[18px]" onClick={() => stepCount(-0.5)} aria-label="Less">
                −
              </button>
              <input
                className="field num text-center"
                style={{ width: 72 }}
                inputMode="decimal"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                aria-label="How many"
              />
              <button type="button" className="tap w-11 rounded-lg border border-line text-[18px]" onClick={() => stepCount(0.5)} aria-label="More">
                +
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COUNT_STEPS.map((n) => (
                <Chip key={n} active={Number(count) === n} onClick={() => setCount(String(n))}>
                  ×{n === 0.5 ? "½" : n === 1.5 ? "1½" : n}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="num text-[26px] font-medium text-energy">{kcal(macros.kcal)}</span>
          <span className="text-[12px] text-muted">kcal for {formatAmount(amount, food.unit)}</span>
        </div>
        <dl className="mt-1.5 grid grid-cols-4 gap-2 text-[12px]">
          <Readout label="Protein" value={`${grams(macros.protein, 1)} g`} />
          <Readout label="Carbs" value={`${grams(macros.carbs, 1)} g`} />
          <Readout label="Fat" value={`${grams(macros.fat, 1)} g`} />
          <Readout label="Fibre" value={macros.fiber === undefined ? "—" : `${grams(macros.fiber, 1)} g`} />
        </dl>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Meal">
        {MEAL_SLOTS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSlot(m)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] ${
              slot === m ? "border-ink bg-ink text-bg" : "border-line text-muted"
            }`}
          >
            {MEAL_LABELS[m]}
          </button>
        ))}
      </div>

      <Button variant="solid" onClick={add} className="w-full" disabled={amount <= 0}>
        Add to {MEAL_LABELS[slot].toLowerCase()}
      </Button>

      {swaps.length > 0 && onSwap && (
        <section className="rounded-lg border border-line px-3 py-2.5">
          <p className="text-[13px] font-medium">Healthier swaps</p>
          <ul className="mt-1 divide-y divide-line">
            {swaps.map(({ food: alt, quality: q, kcalDelta }) => (
              <li key={alt.id}>
                <button type="button" onClick={() => onSwap(alt)} className="tap flex w-full items-center justify-between gap-3 py-1.5 text-left">
                  <span className="flex min-w-0 items-center gap-2">
                    <QualityDot grade={q.grade} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px]">{alt.name}</span>
                      <span className="block truncate text-[12px] text-muted">{alt.portions[alt.defaultPortionIndex ?? 0]?.label}</span>
                    </span>
                  </span>
                  <span className={`num shrink-0 text-[12px] ${kcalDelta <= 0 ? "text-ok" : "text-muted"}`}>
                    {kcalDelta === 0 ? "same kcal" : `${signed(kcalDelta)} kcal`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {food.source !== "database" && (
        <p className="text-[12px] text-muted">
          {food.source === "estimated" ? "Calculated from a recipe — treat as an estimate." : "Your own entry."}
        </p>
      )}
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}
