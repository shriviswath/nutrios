"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import { copyMeal, deleteLog, saveMealFromDay, updateLogQuantity } from "@/lib/db/repo";
import type { FoodLog, MealSlot } from "@/lib/types";
import { shiftKey } from "@/lib/utils/date";
import { grams, kcal } from "@/lib/utils/format";

const LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  snacks: "Snacks",
  dinner: "Dinner",
};

export function MealSection({
  meal,
  entries,
  date,
  onAdd,
}: {
  meal: MealSlot;
  entries: FoodLog[];
  date: string;
  onAdd: (meal: MealSlot) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const total = entries.reduce((a, e) => a + e.macros.kcal, 0);

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h3 className="font-semibold">{LABELS[meal]}</h3>
        <div className="flex items-center gap-2">
          <span className="num text-[13px] text-muted">{kcal(total)} kcal</span>
          <button
            type="button"
            className="tap px-1 text-muted"
            aria-label={`More actions for ${LABELS[meal]}`}
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
              if (!copied) alert(`Nothing was logged for ${LABELS[meal].toLowerCase()} yesterday.`);
            }}
          >
            Copy yesterday
          </Button>
          <Button
            size="sm"
            disabled={entries.length === 0}
            onClick={async () => {
              const name = prompt("Name this meal", `My ${LABELS[meal].toLowerCase()}`);
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
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onAdd(meal)}
        className="tap flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] text-muted hover:text-ink"
      >
        <span className="text-[16px] leading-none">+</span> Add food
      </button>
    </section>
  );
}

function EntryRow({ entry }: { entry: FoodLog }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(String(entry.quantity));

  return (
    <li className="px-4 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing((v) => !v)}>
          <span className="block truncate text-[14px]">{entry.name}</span>
          <span className="block text-[12px] text-muted">
            {grams(entry.quantity)} {entry.unit} · P {grams(entry.macros.protein)} · C {grams(entry.macros.carbs)} · F{" "}
            {grams(entry.macros.fat)}
          </span>
        </button>
        <span className="num shrink-0 text-[14px]">{kcal(entry.macros.kcal)}</span>
      </div>

      {editing && (
        <div className="mt-2 flex items-center gap-2">
          <input
            className="field num w-24"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-label="Amount"
          />
          <span className="text-[13px] text-muted">{entry.unit}</span>
          <Button
            size="sm"
            onClick={async () => {
              const next = Number(amount);
              if (next > 0 && entry.id) await updateLogQuantity(entry.id, next);
              setEditing(false);
            }}
          >
            Update
          </Button>
          <Button size="sm" variant="danger" onClick={() => entry.id && deleteLog(entry.id)}>
            Remove
          </Button>
        </div>
      )}
    </li>
  );
}
