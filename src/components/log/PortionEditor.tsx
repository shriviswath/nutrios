"use client";

import { useMemo, useState } from "react";
import { Button, Segmented } from "@/components/ui/primitives";
import { addFoodLog, toggleFavorite } from "@/lib/db/repo";
import { scaleMacros } from "@/lib/nutrition/scaling";
import { MEAL_SLOTS, type Food, type MealSlot } from "@/lib/types";
import { grams, kcal } from "@/lib/utils/format";

export function PortionEditor({
  food,
  date,
  meal,
  onDone,
}: {
  food: Food;
  date: string;
  meal: MealSlot;
  onDone: () => void;
}) {
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

  const add = async () => {
    if (amount <= 0) return;
    await addFoodLog({ date, meal: slot, food, quantity: amount });
    onDone();
  };

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

      <Segmented
        value={byWeight ? "weight" : "portion"}
        onChange={(v) => setByWeight(v === "weight")}
        options={[
          { value: "portion", label: "Portions" },
          { value: "weight", label: `By ${food.unit === "g" ? "weight" : "volume"}` },
        ]}
      />

      {byWeight ? (
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
      ) : (
        <div className="flex items-center gap-2">
          <input
            className="field num w-20"
            inputMode="decimal"
            value={count}
            onChange={(e) => setCount(e.target.value)}
            aria-label="How many"
          />
          <select
            className="field"
            value={portionIndex}
            onChange={(e) => setPortionIndex(Number(e.target.value))}
            aria-label="Portion"
          >
            {food.portions.map((p, i) => (
              <option key={p.label} value={i}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="rounded-lg border border-line bg-sunken px-3 py-2.5">
        <div className="flex items-baseline justify-between">
          <span className="num text-[26px] font-medium text-energy">{kcal(macros.kcal)}</span>
          <span className="text-[12px] text-muted">
            kcal for {grams(amount)} {food.unit}
          </span>
        </div>
        <dl className="mt-1.5 grid grid-cols-4 gap-2 text-[12px]">
          <Readout label="Protein" value={`${grams(macros.protein, 1)} g`} />
          <Readout label="Carbs" value={`${grams(macros.carbs, 1)} g`} />
          <Readout label="Fat" value={`${grams(macros.fat, 1)} g`} />
          <Readout label="Fibre" value={macros.fiber === undefined ? "—" : `${grams(macros.fiber, 1)} g`} />
        </dl>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {MEAL_SLOTS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setSlot(m)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[13px] capitalize ${
              slot === m ? "border-ink bg-ink text-bg" : "border-line text-muted"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      <Button variant="solid" onClick={add} className="w-full" disabled={amount <= 0}>
        Add to {slot}
      </Button>
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
