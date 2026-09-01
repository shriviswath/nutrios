"use client";

import { useMemo, useState } from "react";
import { AddFoodSheet } from "@/components/log/AddFoodSheet";
import { RecipeBuilder } from "@/components/log/RecipeBuilder";
import { Button, EmptyState, Segmented, Sheet } from "@/components/ui/primitives";
import { PortionEditor } from "@/components/log/PortionEditor";
import { useFoods, useRecipes, useSavedMeals, useUsage } from "@/lib/hooks";
import { deleteFood, deleteRecipe, deleteSavedMeal } from "@/lib/db/repo";
import { rankFoods } from "@/lib/search";
import type { Food, Recipe } from "@/lib/types";
import { dateKey } from "@/lib/utils/date";

type Tab = "foods" | "recipes" | "meals";

export default function LogPage() {
  const [tab, setTab] = useState<Tab>("foods");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [recipeOpen, setRecipeOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [quickFood, setQuickFood] = useState<Food | null>(null);

  const foods = useFoods();
  const usage = useUsage();
  const recipes = useRecipes();
  const savedMeals = useSavedMeals();
  const today = dateKey();

  const results = useMemo(() => rankFoods(foods, query, usage, 60), [foods, query, usage]);
  const mine = results.filter((r) => r.food.source === "user" || r.food.source === "estimated");

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[20px] font-semibold tracking-tight">Food library</h1>
        <p className="text-[13px] text-muted">
          {foods.length} foods on this device. Everything you add stays here and works offline.
        </p>
      </header>

      <Button variant="solid" className="w-full" onClick={() => setAdding(true)}>
        Add food to today
      </Button>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "foods", label: "Foods" },
          { value: "recipes", label: "Recipes" },
          { value: "meals", label: "Saved meals" },
        ]}
      />

      {tab === "foods" && (
        <>
          <input
            className="field"
            placeholder="Search the food list"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search food library"
          />
          {query && mine.length > 0 && (
            <p className="text-[12px] text-muted">{mine.length} of these are yours — tap and hold the row to delete.</p>
          )}
          <ul className="card divide-y divide-line">
            {results.map(({ food }) => (
              <li key={food.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setQuickFood(food)}>
                  <span className="block truncate text-[14px]">
                    {food.favorite ? "★ " : ""}
                    {food.name}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {food.category} · {food.per100.kcal} kcal / 100 {food.unit}
                    {food.source === "user" ? " · yours" : food.source === "estimated" ? " · from recipe" : ""}
                  </span>
                </button>
                {(food.source === "user" || food.source === "estimated") && !food.recipeId && (
                  <button
                    className="tap px-1 text-[12px] text-muted"
                    onClick={() => confirm(`Delete ${food.name}? Past diary entries keep their values.`) && deleteFood(food.id)}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {tab === "recipes" && (
        <>
          <Button
            className="w-full"
            onClick={() => {
              setEditingRecipe(undefined);
              setRecipeOpen(true);
            }}
          >
            New recipe
          </Button>
          {recipes.length === 0 ? (
            <EmptyState title="No recipes yet">
              Build a dish once from its ingredients and log it by weight afterwards. Useful for anything cooked at home
              where the portion changes every time.
            </EmptyState>
          ) : (
            <ul className="card divide-y divide-line">
              {recipes.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      setEditingRecipe(r);
                      setRecipeOpen(true);
                    }}
                  >
                    <span className="block truncate text-[14px]">{r.name}</span>
                    <span className="block text-[12px] text-muted">
                      {r.ingredients.length} ingredients · {r.servings} servings
                    </span>
                  </button>
                  <button className="tap px-1 text-[12px] text-muted" onClick={() => confirm(`Delete ${r.name}?`) && deleteRecipe(r.id)}>
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "meals" && (
        savedMeals.length === 0 ? (
          <EmptyState title="No saved meals yet">
            On the diary, open the ⋯ menu on any meal and choose “Save as meal”. The whole combination becomes one tap.
          </EmptyState>
        ) : (
          <ul className="card divide-y divide-line">
            {savedMeals.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[14px]">{m.name}</p>
                  <p className="truncate text-[12px] text-muted">{m.items.map((i) => i.name).join(", ")}</p>
                </div>
                <button className="tap px-1 text-[12px] text-muted" onClick={() => deleteSavedMeal(m.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      <AddFoodSheet open={adding} onClose={() => setAdding(false)} date={today} meal="lunch" />
      <RecipeBuilder open={recipeOpen} onClose={() => setRecipeOpen(false)} existing={editingRecipe} />
      <Sheet open={quickFood !== null} onClose={() => setQuickFood(null)} title="Log this food">
        {quickFood && <PortionEditor food={quickFood} date={today} meal="lunch" onDone={() => setQuickFood(null)} />}
      </Sheet>
    </div>
  );
}
