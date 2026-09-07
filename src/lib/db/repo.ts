import { db } from "@/lib/db/db";
import { scaleFood, scaleMacros, sumMacros } from "@/lib/nutrition/scaling";
import { computeCalorieTarget, computeMacroTargets, fiberTarget } from "@/lib/nutrition/energy";
import { dateKey, rangeKeys, shiftKey } from "@/lib/utils/date";
import { uid } from "@/lib/utils/id";
import type {
  ExerciseLog,
  Food,
  FoodLog,
  MealSlot,
  Profile,
  Recipe,
  SavedMeal,
  Settings,
  WeightLog,
} from "@/lib/types";

/* ------------------------------------------------------------------ profile */

export async function getProfile(): Promise<Profile | undefined> {
  return db.profile.get("me");
}

export async function getSettings(): Promise<Settings | undefined> {
  return db.settings.get("settings");
}

/** Writes the profile and recomputes targets from it in the same transaction. */
export async function saveProfile(profile: Profile, currentWeightKg?: number, maintenance?: number): Promise<Settings> {
  const weight = currentWeightKg ?? (await latestWeight())?.weightKg ?? profile.startWeightKg;
  const target = computeCalorieTarget(profile, weight, maintenance);
  const calories = profile.calorieOverride ?? target.calorieTarget;
  const macros = computeMacroTargets(profile, calories, weight);
  const existing = await getSettings();

  const settings: Settings = {
    id: "settings",
    calorieTarget: calories,
    proteinTarget: macros.protein,
    carbTarget: macros.carbs,
    fatTarget: macros.fat,
    fiberTarget: fiberTarget(calories),
    showMicros: existing?.showMicros ?? true,
    theme: existing?.theme ?? "system",
    lastAdaptedAt: existing?.lastAdaptedAt,
    updatedAt: Date.now(),
  };

  await db.transaction("rw", db.profile, db.settings, async () => {
    await db.profile.put(profile);
    await db.settings.put(settings);
  });
  return settings;
}

export async function applyAdaptedTarget(newTarget: number, profile: Profile, weightKg: number): Promise<void> {
  const macros = computeMacroTargets(profile, newTarget, weightKg);
  const current = await getSettings();
  if (!current) return;
  await db.settings.put({
    ...current,
    calorieTarget: newTarget,
    proteinTarget: macros.protein,
    carbTarget: macros.carbs,
    fatTarget: macros.fat,
    fiberTarget: fiberTarget(newTarget),
    lastAdaptedAt: dateKey(),
    updatedAt: Date.now(),
  });
}

/* -------------------------------------------------------------------- foods */

export async function allFoods(): Promise<Food[]> {
  return db.foods.toArray();
}

export async function getFood(id: string): Promise<Food | undefined> {
  return db.foods.get(id);
}

export async function upsertFood(food: Food): Promise<string> {
  await db.foods.put(food);
  return food.id;
}

export async function deleteFood(id: string): Promise<void> {
  await db.foods.delete(id);
}

export async function toggleFavorite(id: string): Promise<void> {
  const food = await db.foods.get(id);
  if (!food) return;
  await db.foods.update(id, { favorite: !food.favorite });
}

/* --------------------------------------------------------------- food logs */

export async function logsForDate(date: string): Promise<FoodLog[]> {
  return db.logs.where("date").equals(date).toArray();
}

export async function logsForRange(start: string, end: string): Promise<FoodLog[]> {
  return db.logs.where("date").between(start, end, true, true).toArray();
}

export interface LogInput {
  date: string;
  meal: MealSlot;
  food: Food;
  quantity: number;
}

export async function addFoodLog({ date, meal, food, quantity }: LogInput): Promise<number> {
  const { macros, micros } = scaleFood(food, quantity);
  const entry: FoodLog = {
    date,
    meal,
    foodId: food.id,
    name: food.name,
    quantity,
    unit: food.unit,
    macros,
    micros,
    source: food.source,
    createdAt: Date.now(),
  };
  const id = await db.logs.add(entry);
  await bumpUsage(food.id);
  return id as number;
}

export async function updateLogQuantity(id: number, quantity: number): Promise<void> {
  const entry = await db.logs.get(id);
  if (!entry) return;
  const food = await db.foods.get(entry.foodId);
  if (!food) return;
  const { macros, micros } = scaleFood(food, quantity);
  await db.logs.update(id, { quantity, macros, micros });
}

export async function deleteLog(id: number): Promise<void> {
  await db.logs.delete(id);
}

export async function copyMeal(from: string, to: string, meal: MealSlot): Promise<number> {
  const entries = await db.logs.where("[date+meal]").equals([from, meal]).toArray();
  if (!entries.length) return 0;
  await db.logs.bulkAdd(
    entries.map(({ id: _id, ...rest }) => ({ ...rest, date: to, createdAt: Date.now() })),
  );
  return entries.length;
}

export async function copyDay(from: string, to: string): Promise<number> {
  const entries = await logsForDate(from);
  if (!entries.length) return 0;
  await db.logs.bulkAdd(entries.map(({ id: _id, ...rest }) => ({ ...rest, date: to, createdAt: Date.now() })));
  return entries.length;
}

async function bumpUsage(foodId: string): Promise<void> {
  const current = await db.usage.get(foodId);
  await db.usage.put({
    foodId,
    count: (current?.count ?? 0) + 1,
    lastUsed: Date.now(),
  });
}

export async function usageMap(): Promise<Map<string, { count: number; lastUsed: number }>> {
  const rows = await db.usage.toArray();
  return new Map(rows.map((r) => [r.foodId, { count: r.count, lastUsed: r.lastUsed }]));
}

/* ------------------------------------------------------------------ weight */

export async function latestWeight(): Promise<WeightLog | undefined> {
  const all = await db.weights.orderBy("date").reverse().limit(1).toArray();
  return all[0];
}

export async function allWeights(): Promise<WeightLog[]> {
  return db.weights.orderBy("date").toArray();
}

export async function saveWeight(date: string, weightKg: number, note?: string): Promise<void> {
  const existing = await db.weights.where("date").equals(date).first();
  if (existing?.id) {
    await db.weights.update(existing.id, { weightKg, note });
  } else {
    await db.weights.add({ date, weightKg, note, createdAt: Date.now() });
  }
}

export async function deleteWeight(id: number): Promise<void> {
  await db.weights.delete(id);
}

/* ---------------------------------------------------------------- exercise */

export async function exercisesForDate(date: string): Promise<ExerciseLog[]> {
  return db.exercises.where("date").equals(date).toArray();
}

export async function addExercise(entry: Omit<ExerciseLog, "id" | "createdAt">): Promise<void> {
  await db.exercises.add({ ...entry, createdAt: Date.now() });
}

export async function deleteExercise(id: number): Promise<void> {
  await db.exercises.delete(id);
}

/* ----------------------------------------------------------------- recipes */

export async function allRecipes(): Promise<Recipe[]> {
  return db.recipes.toArray();
}

/**
 * Saves a recipe and mirrors it into the food table as a per-100 g food, so a cooked dish
 * can be logged by weight exactly like anything else.
 */
export async function saveRecipe(recipe: Recipe): Promise<Food> {
  const foods = await db.foods.bulkGet(recipe.ingredients.map((i) => i.foodId));
  const macros = sumMacros(
    recipe.ingredients.map((ing, idx) => {
      const food = foods[idx];
      return food ? scaleMacros(food.per100, ing.quantity) : { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    }),
  );
  const rawWeight = recipe.ingredients.reduce((a, i) => a + i.quantity, 0);
  const finalWeight = recipe.cookedWeightG && recipe.cookedWeightG > 0 ? recipe.cookedWeightG : rawWeight;
  const factor = finalWeight > 0 ? 100 / finalWeight : 0;

  const food: Food = {
    id: `recipe_${recipe.id}`,
    name: recipe.name,
    category: "My recipes",
    unit: "g",
    per100: {
      kcal: Math.round(macros.kcal * factor),
      protein: Number((macros.protein * factor).toFixed(1)),
      carbs: Number((macros.carbs * factor).toFixed(1)),
      fat: Number((macros.fat * factor).toFixed(1)),
      fiber: macros.fiber !== undefined ? Number((macros.fiber * factor).toFixed(1)) : undefined,
      sugar: macros.sugar !== undefined ? Number((macros.sugar * factor).toFixed(1)) : undefined,
      sodium: macros.sodium !== undefined ? Number((macros.sodium * factor).toFixed(1)) : undefined,
    },
    portions: [
      { label: `1 serving (${Math.round(finalWeight / Math.max(1, recipe.servings))} g)`, amount: Math.round(finalWeight / Math.max(1, recipe.servings)) },
      { label: "100 g", amount: 100 },
      { label: `Whole recipe (${Math.round(finalWeight)} g)`, amount: Math.round(finalWeight) },
    ],
    defaultPortionIndex: 0,
    source: "estimated",
    recipeId: recipe.id,
    createdAt: Date.now(),
    notes: "Calculated from ingredients. Oil absorbed during cooking and water loss are approximations.",
  };

  await db.transaction("rw", db.recipes, db.foods, async () => {
    await db.recipes.put(recipe);
    await db.foods.put(food);
  });
  return food;
}

export async function deleteRecipe(id: string): Promise<void> {
  await db.transaction("rw", db.recipes, db.foods, async () => {
    await db.recipes.delete(id);
    await db.foods.delete(`recipe_${id}`);
  });
}

/* -------------------------------------------------------------- saved meals */

export async function allSavedMeals(): Promise<SavedMeal[]> {
  return db.savedMeals.toArray();
}

export async function saveMealFromDay(name: string, date: string, meal: MealSlot): Promise<SavedMeal | null> {
  const entries = await db.logs.where("[date+meal]").equals([date, meal]).toArray();
  if (!entries.length) return null;
  const saved: SavedMeal = {
    id: uid("meal"),
    name,
    slot: meal,
    items: entries.map((e) => ({ foodId: e.foodId, name: e.name, quantity: e.quantity, unit: e.unit })),
    createdAt: Date.now(),
  };
  await db.savedMeals.put(saved);
  return saved;
}

export async function applySavedMeal(mealId: string, date: string, slot: MealSlot): Promise<number> {
  const saved = await db.savedMeals.get(mealId);
  if (!saved) return 0;
  let added = 0;
  for (const item of saved.items) {
    const food = await db.foods.get(item.foodId);
    if (!food) continue;
    await addFoodLog({ date, meal: slot, food, quantity: item.quantity });
    added++;
  }
  return added;
}

export async function deleteSavedMeal(id: string): Promise<void> {
  await db.savedMeals.delete(id);
}

/* ------------------------------------------------------------- aggregation */

export interface DailyIntake {
  date: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  entries: number;
}

export async function dailyIntakeSeries(endDate: string, days: number): Promise<DailyIntake[]> {
  const start = shiftKey(endDate, -(days - 1));
  const logs = await logsForRange(start, endDate);
  const byDate = new Map<string, DailyIntake>();
  for (const key of rangeKeys(endDate, days)) {
    byDate.set(key, { date: key, kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, entries: 0 });
  }
  for (const log of logs) {
    const row = byDate.get(log.date);
    if (!row) continue;
    row.kcal += log.macros.kcal;
    row.protein += log.macros.protein;
    row.carbs += log.macros.carbs;
    row.fat += log.macros.fat;
    row.fiber += log.macros.fiber ?? 0;
    row.entries += 1;
  }
  return Array.from(byDate.values()).map((r) => ({
    ...r,
    kcal: Math.round(r.kcal),
    protein: Math.round(r.protein),
    carbs: Math.round(r.carbs),
    fat: Math.round(r.fat),
    fiber: Math.round(r.fiber),
  }));
}
