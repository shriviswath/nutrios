"use client";

import { useState } from "react";
import { Banner, Button, Field, Segmented } from "@/components/ui/primitives";
import { upsertFood } from "@/lib/db/repo";
import { macroConsistencyGap } from "@/lib/nutrition/scaling";
import type { Food, Macros, Unit } from "@/lib/types";
import { uid } from "@/lib/utils/id";

/**
 * Values are entered per 100 g/ml — the same basis as everything else in the database —
 * plus one named portion so the food can be logged by piece as well as by weight.
 */
export function CustomFoodForm({ initialName = "", onCreated }: { initialName?: string; onCreated: (food: Food) => void }) {
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState("My foods");
  const [unit, setUnit] = useState<Unit>("g");
  const [values, setValues] = useState({ kcal: "", protein: "", carbs: "", fat: "", fiber: "" });
  const [portionLabel, setPortionLabel] = useState("");
  const [portionAmount, setPortionAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const per100: Macros = {
    kcal: Number(values.kcal) || 0,
    protein: Number(values.protein) || 0,
    carbs: Number(values.carbs) || 0,
    fat: Number(values.fat) || 0,
    fiber: values.fiber === "" ? undefined : Number(values.fiber),
  };
  const gap = macroConsistencyGap(per100);

  const submit = async () => {
    if (!name.trim()) return setError("Give the food a name.");
    if (!per100.kcal) return setError("Calories per 100 " + unit + " are required.");
    const portions = [];
    if (portionLabel.trim() && Number(portionAmount) > 0) {
      portions.push({ label: portionLabel.trim(), amount: Number(portionAmount) });
    }
    portions.push({ label: `100 ${unit}`, amount: 100 });

    const food: Food = {
      id: uid("food"),
      name: name.trim(),
      category: category.trim() || "My foods",
      unit,
      per100,
      portions,
      defaultPortionIndex: 0,
      source: "user",
      createdAt: Date.now(),
    };
    await upsertFood(food);
    onCreated(food);
  };

  return (
    <div className="space-y-3">
      <Field label="Name">
        <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Amma's chicken curry" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <input className="field" value={category} onChange={(e) => setCategory(e.target.value)} />
        </Field>
        <Field label="Measured in">
          <Segmented
            value={unit}
            onChange={(v) => setUnit(v)}
            options={[
              { value: "g", label: "Grams" },
              { value: "ml", label: "Millilitres" },
            ]}
          />
        </Field>
      </div>

      <p className="text-[13px] font-medium">Per 100 {unit}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories (kcal)">
          <input className="field num" inputMode="decimal" value={values.kcal} onChange={set("kcal")} />
        </Field>
        <Field label="Protein (g)">
          <input className="field num" inputMode="decimal" value={values.protein} onChange={set("protein")} />
        </Field>
        <Field label="Carbohydrate (g)">
          <input className="field num" inputMode="decimal" value={values.carbs} onChange={set("carbs")} />
        </Field>
        <Field label="Fat (g)">
          <input className="field num" inputMode="decimal" value={values.fat} onChange={set("fat")} />
        </Field>
        <Field label="Fibre (g)" hint="Leave blank if unknown">
          <input className="field num" inputMode="decimal" value={values.fiber} onChange={set("fiber")} />
        </Field>
      </div>

      <p className="text-[13px] font-medium">A portion you actually use</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Label">
          <input className="field" value={portionLabel} onChange={(e) => setPortionLabel(e.target.value)} placeholder="1 bowl" />
        </Field>
        <Field label={`Weight (${unit})`}>
          <input className="field num" inputMode="decimal" value={portionAmount} onChange={(e) => setPortionAmount(e.target.value)} placeholder="180" />
        </Field>
      </div>

      {Math.abs(gap) > 0.15 && per100.kcal > 0 && (
        <Banner tone="warn" title="Numbers do not add up">
          The macros imply {Math.round(per100.protein * 4 + per100.carbs * 4 + per100.fat * 9)} kcal but you entered{" "}
          {per100.kcal}. Check the label — one of them is probably a typo.
        </Banner>
      )}
      {error && <Banner tone="warn">{error}</Banner>}

      <Button variant="solid" className="w-full" onClick={submit}>
        Save food
      </Button>
    </div>
  );
}
