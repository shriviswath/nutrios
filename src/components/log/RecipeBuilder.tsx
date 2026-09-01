"use client";

import { useMemo, useState } from "react";
import { Banner, Button, Field, Sheet } from "@/components/ui/primitives";
import { useFoods, useUsage } from "@/lib/hooks";
import { rankFoods } from "@/lib/search";
import { saveRecipe } from "@/lib/db/repo";
import { scaleMacros, sumMacros } from "@/lib/nutrition/scaling";
import type { Recipe, RecipeIngredient } from "@/lib/types";
import { uid } from "@/lib/utils/id";
import { grams, kcal } from "@/lib/utils/format";

/**
 * Recipes are stored as ingredient lists and mirrored into the food table per 100 g.
 * Cooked weight matters: a curry loses water, so 900 g of ingredients might yield 750 g on the
 * plate and everything logged from it would otherwise be under-counted by 20%.
 */
export function RecipeBuilder({
  open,
  onClose,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  existing?: Recipe;
}) {
  const foods = useFoods();
  const usage = useUsage();
  const [name, setName] = useState(existing?.name ?? "");
  const [servings, setServings] = useState(String(existing?.servings ?? 4));
  const [cookedWeight, setCookedWeight] = useState(existing?.cookedWeightG ? String(existing.cookedWeightG) : "");
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(existing?.ingredients ?? []);
  const [query, setQuery] = useState("");

  const results = useMemo(() => (query ? rankFoods(foods, query, usage, 6) : []), [foods, usage, query]);

  const totals = useMemo(() => {
    return sumMacros(
      ingredients.map((ing) => {
        const food = foods.find((f) => f.id === ing.foodId);
        return food ? scaleMacros(food.per100, ing.quantity) : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
      }),
    );
  }, [ingredients, foods]);

  const rawWeight = ingredients.reduce((a, i) => a + i.quantity, 0);
  const finalWeight = Number(cookedWeight) > 0 ? Number(cookedWeight) : rawWeight;
  const per100 = finalWeight > 0 ? Math.round((totals.kcal / finalWeight) * 100) : 0;
  const perServing = Number(servings) > 0 ? Math.round(totals.kcal / Number(servings)) : 0;

  const save = async () => {
    if (!name.trim() || ingredients.length === 0) return;
    const recipe: Recipe = {
      id: existing?.id ?? uid("rec"),
      name: name.trim(),
      servings: Math.max(1, Number(servings) || 1),
      cookedWeightG: Number(cookedWeight) > 0 ? Number(cookedWeight) : undefined,
      ingredients,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    await saveRecipe(recipe);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} title={existing ? "Edit recipe" : "New recipe"}>
      <div className="space-y-3">
        <Field label="Recipe name">
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Chicken curry" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Servings">
            <input className="field num" inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
          </Field>
          <Field label="Cooked weight (g)" hint={rawWeight ? `Raw total ${Math.round(rawWeight)} g` : "Optional"}>
            <input className="field num" inputMode="numeric" value={cookedWeight} onChange={(e) => setCookedWeight(e.target.value)} />
          </Field>
        </div>

        <div>
          <p className="mb-1 text-[13px] font-medium text-muted">Add an ingredient</p>
          <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chicken, oil, onion…" />
          {results.length > 0 && (
            <ul className="mt-1 divide-y divide-line rounded-lg border border-line">
              {results.map(({ food }) => (
                <li key={food.id}>
                  <button
                    type="button"
                    className="tap w-full px-3 py-2 text-left text-[14px]"
                    onClick={() => {
                      setIngredients((list) => [
                        ...list,
                        { foodId: food.id, name: food.name, quantity: food.portions[0]?.amount ?? 100, unit: food.unit },
                      ]);
                      setQuery("");
                    }}
                  >
                    {food.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {ingredients.length > 0 && (
          <ul className="divide-y divide-line rounded-lg border border-line">
            {ingredients.map((ing, i) => (
              <li key={`${ing.foodId}-${i}`} className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1 truncate text-[14px]">{ing.name}</span>
                <input
                  className="field num w-20 py-1"
                  inputMode="decimal"
                  value={ing.quantity}
                  aria-label={`Quantity of ${ing.name}`}
                  onChange={(e) =>
                    setIngredients((list) =>
                      list.map((item, idx) => (idx === i ? { ...item, quantity: Number(e.target.value) || 0 } : item)),
                    )
                  }
                />
                <span className="text-[12px] text-muted">{ing.unit}</span>
                <button
                  type="button"
                  className="tap px-1 text-[12px] text-muted"
                  onClick={() => setIngredients((list) => list.filter((_, idx) => idx !== i))}
                  aria-label={`Remove ${ing.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {ingredients.length > 0 && (
          <div className="rounded-lg border border-line bg-sunken px-3 py-2.5 text-[13px]">
            <p className="num text-[20px] font-medium">{kcal(totals.kcal)} kcal total</p>
            <p className="text-muted">
              {per100} kcal per 100 g · {perServing} kcal per serving · P {grams(totals.protein)} / C{" "}
              {grams(totals.carbs)} / F {grams(totals.fat)}
            </p>
          </div>
        )}

        <Banner>
          Oil left in the pan and water cooked off are the two big errors here. Weighing the finished dish and entering
          it above fixes both.
        </Banner>

        <Button variant="solid" className="w-full" onClick={save} disabled={!name.trim() || ingredients.length === 0}>
          Save recipe
        </Button>
      </div>
    </Sheet>
  );
}
