"use client";

import { useState } from "react";
import { Button, Chip } from "@/components/ui/primitives";
import { QualityDot } from "@/components/ui/Quality";
import { copyMeal, deleteLog, saveMealFromDay, updateLogQuantity } from "@/lib/db/repo";
import { MEAL_LABELS, mealRange } from "@/lib/meals";
import { amountPresets, formatAmount } from "@/lib/nutrition/presets";
import { rateLogged } from "@/lib/nutrition/quality";
import type { Food, FoodLog, MealSlot } from "@/lib/types";
import { shiftKey } from "@/lib/utils/date";
import { grams, kcal } from "@/lib/utils/format";

export function MealSection({
  meal,
  entries,
  date,
  dailyTarget,
  foodsById,
  onAdd,
}: {
  meal: MealSlot;
  entries: FoodLog[];
  date: string;
  dailyTarget: number;
  foodsById: Map<string, Food>;
  onAdd: (meal: MealSlot) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const total = entries.reduce((a, e) => a + e.macros.kcal, 0);
  const [low, high] = mealRange(meal, dailyTarget);
  const label = MEAL_LABELS[meal];
  const over = total > high;

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="min-w-0">
          <h3 className="font-semibold">{label}</h3>
          <p className="text-[12px] text-muted">
            Recommended <span className="num">{kcal(low)}–{kcal(high)}</span> kcal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`num text-[14px] ${over ? "text-warn" : total > 0 ? "text-ink" : "text-muted"}`}>{kcal(total)} kcal</span>
          <button
            type="button"
            className="tap px-1 text-muted"
            aria-label={`More actions for ${label}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            ⋯
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="flex flex-wrap gap-2 border-b border-line bg-sunken px-4 py-2.5">
          <Button
            size="sm"
            onClick={async () => {
              const copied = await copyMeal(shiftKey(date, -1), date, meal);
              setMenuOpen(false);
              if (!copied) alert(`Nothing was logged for ${label.toLowerCase()} yesterday.`);
            }}
          >
            Copy yesterday
          </Button>
          <Button
            size="sm"
            disabled={entries.length === 0}
            onClick={async () => {
              const name = prompt("Name this meal", `My ${label.toLowerCase()}`);
              if (!name) return;
              await saveMealFromDay(name, date, meal);
              setMenuOpen(false);
            }}
          >
            Save as meal
          </Button>
        </div>
      )}

      <ul className="divide-y divide-line">
        {entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} food={foodsById.get(entry.foodId)} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onAdd(meal)}
        className="tap flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] text-muted hover:text-ink"
      >
        <span className="text-[16px] leading-none">+</span> Add {label.toLowerCase()}
      </button>
    </section>
  );
}

function EntryRow({ entry, food }: { entry: FoodLog; food?: Food }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(entry.quantity));
  const grade = rateLogged(entry.macros, entry.quantity, food).grade;
  const presets = amountPresets(entry.unit);

  const save = async (next: number) => {
    if (next > 0 && entry.id) await updateLogQuantity(entry.id, next);
    setEditing(false);
  };

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
          onClick={() => {
            setAmount(String(entry.quantity));
            setEditing((v) => !v);
          }}
        >
          <QualityDot grade={grade} className="mt-2" />
          <span className="min-w-0">
            <span className="block truncate text-[14px]">{entry.name}</span>
            <span className="block text-[12px] text-muted">
              {formatAmount(entry.quantity, entry.unit)} · P {grams(entry.macros.protein)} · C {grams(entry.macros.carbs)} · F{" "}
              {grams(entry.macros.fat)}
            </span>
          </span>
        </button>
        <span className="num shrink-0 text-[14px]">{kcal(entry.macros.kcal)}</span>
      </div>

      {editing && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <input
              className="field num w-24"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Amount"
            />
            <span className="text-[13px] text-muted">{entry.unit}</span>
            <Button size="sm" onClick={() => save(Number(amount))}>
              Update
            </Button>
            <Button size="sm" variant="danger" onClick={() => entry.id && deleteLog(entry.id)}>
              Remove
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick amounts">
            {presets.map((p) => (
              <Chip key={p.amount} active={Number(amount) === p.amount} onClick={() => save(p.amount)}>
                {p.label}
              </Chip>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
