"use client";

import { useMemo, useState } from "react";
import { Button, Chip, EmptyState, Sheet } from "@/components/ui/primitives";
import { PortionEditor } from "@/components/log/PortionEditor";
import { QuickTextPanel } from "@/components/log/QuickTextPanel";
import { BarcodePanel } from "@/components/log/BarcodePanel";
import { CustomFoodForm } from "@/components/log/CustomFoodForm";
import { useFoods, useSavedMeals, useUsage } from "@/lib/hooks";
import { applySavedMeal } from "@/lib/db/repo";
import { rankFoods } from "@/lib/search";
import type { Food, MealSlot } from "@/lib/types";

type Mode = "search" | "text" | "barcode" | "custom";
type Filter = "all" | "recent" | "favorites" | "meals";

export function AddFoodSheet({
  open,
  onClose,
  date,
  meal,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  meal: MealSlot;
}) {
  const foods = useFoods();
  const usage = useUsage();
  const savedMeals = useSavedMeals();
  const [mode, setMode] = useState<Mode>("search");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);

  const results = useMemo(() => {
    let pool = foods;
    if (filter === "favorites") pool = foods.filter((f) => f.favorite);
    if (filter === "recent") pool = foods.filter((f) => usage.has(f.id));
    return rankFoods(pool, query, usage, 60);
  }, [foods, usage, query, filter]);

  const close = () => {
    setSelected(null);
    setQuery("");
    setMode("search");
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title={selected ? "Add food" : `Add to ${meal}`}>
      {selected ? (
        <div className="space-y-3">
          <button type="button" onClick={() => setSelected(null)} className="text-[13px] text-muted">
            ← Back to search
          </button>
          <PortionEditor food={selected} date={date} meal={meal} onDone={close} />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <Chip active={mode === "search"} onClick={() => setMode("search")}>
              Search
            </Chip>
            <Chip active={mode === "text"} onClick={() => setMode("text")}>
              Speak or type a meal
            </Chip>
            <Chip active={mode === "barcode"} onClick={() => setMode("barcode")}>
              Barcode
            </Chip>
            <Chip active={mode === "custom"} onClick={() => setMode("custom")}>
              New food
            </Chip>
          </div>

          {mode === "search" && (
            <>
              <input
                autoFocus
                className="field"
                placeholder="Search foods — idli, chicken biryani, curd rice…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search foods"
              />
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {(["all", "recent", "favorites", "meals"] as Filter[]).map((f) => (
                  <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
                    {f === "all" ? "All foods" : f === "meals" ? "Saved meals" : f === "recent" ? "Recent" : "Favourites"}
                  </Chip>
                ))}
              </div>

              {filter === "meals" ? (
                savedMeals.length === 0 ? (
                  <EmptyState title="No saved meals yet">
                    Log a meal you eat often, then use “Save as meal” on the diary to add the whole thing in one tap.
                  </EmptyState>
                ) : (
                  <ul className="divide-y divide-line">
                    {savedMeals.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                          <p className="font-medium">{m.name}</p>
                          <p className="text-[12px] text-muted">{m.items.map((i) => i.name).join(", ")}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={async () => {
                            await applySavedMeal(m.id, date, meal);
                            close();
                          }}
                        >
                          Add
                        </Button>
                      </li>
                    ))}
                  </ul>
                )
              ) : results.length === 0 ? (
                <EmptyState title="No matches">
                  Nothing in your food list matches “{query}”. Create it once as a new food and it will be one tap from now on.
                  <span className="mt-3 block">
                    <Button size="sm" onClick={() => setMode("custom")}>
                      Add “{query || "a new food"}”
                    </Button>
                  </span>
                </EmptyState>
              ) : (
                <ul className="divide-y divide-line">
                  {results.map(({ food, reason }) => (
                    <li key={food.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(food)}
                        className="tap flex w-full items-center justify-between gap-3 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{food.name}</span>
                          <span className="block truncate text-[12px] text-muted">
                            {food.portions[0]?.label} · {food.category}
                            {reason === "recent" ? " · recent" : reason === "frequent" ? " · often eaten" : ""}
                          </span>
                        </span>
                        <span className="num shrink-0 text-[13px] text-muted">
                          {Math.round((food.per100.kcal * (food.portions[0]?.amount ?? 100)) / 100)} kcal
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {mode === "text" && <QuickTextPanel date={date} meal={meal} onDone={close} />}
          {mode === "barcode" && <BarcodePanel onPicked={(food) => setSelected(food)} />}
          {mode === "custom" && <CustomFoodForm initialName={query} onCreated={(food) => setSelected(food)} />}
        </div>
      )}
    </Sheet>
  );
}
