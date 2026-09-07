import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import test from "node:test";
import { liveQuery } from "dexie";
import { db, seedOnce } from "../src/lib/db/db";
import {
  addFoodLog,
  allFoods,
  allRecipes,
  allSavedMeals,
  allWeights,
  applySavedMeal,
  copyDay,
  dailyIntakeSeries,
  exercisesForDate,
  getFood,
  getProfile,
  getSettings,
  latestWeight,
  logsForDate,
  saveMealFromDay,
  saveProfile,
  saveRecipe,
  saveWeight,
  usageMap,
} from "../src/lib/db/repo";
import type { Profile } from "../src/lib/types";
import { dateKey, shiftKey } from "../src/lib/utils/date";
import { uid } from "../src/lib/utils/id";

const today = dateKey();

const profile: Profile = {
  id: "me",
  name: "Test",
  age: 21,
  sex: "male",
  heightCm: 175,
  startWeightKg: 78,
  targetWeightKg: 70,
  goal: "lose",
  activityLevel: "light",
  rateKgPerWeek: 0.4,
  units: "metric",
  macroMode: "auto",
  autoAdapt: true,
  calorieOverride: null,
  createdAt: Date.now(),
};

test("seeding is idempotent and never runs twice", async () => {
  await seedOnce();
  const first = await db.foods.count();
  await seedOnce();
  assert.equal(await db.foods.count(), first);
  assert.ok(first > 100);
});

/**
 * Regression guard for the bug that took the first deployment down: Dexie runs live-query
 * queriers in a read-only zone and throws ReadOnlyError on any write, which React surfaces as a
 * blank "client-side exception" page. Every function used inside useLiveQuery must be read-only.
 */
test("every live query used by the UI is read-only", async () => {
  const queriers: [string, () => Promise<unknown>][] = [
    ["allFoods", allFoods],
    ["getProfile", async () => (await getProfile()) ?? null],
    ["getSettings", async () => (await getSettings()) ?? null],
    ["allWeights", allWeights],
    ["latestWeight", latestWeight],
    ["logsForDate", () => logsForDate(today)],
    ["exercisesForDate", () => exercisesForDate(today)],
    ["dailyIntakeSeries", () => dailyIntakeSeries(today, 120)],
    ["usageMap", usageMap],
    ["allRecipes", allRecipes],
    ["allSavedMeals", allSavedMeals],
  ];

  for (const [name, querier] of queriers) {
    await new Promise<void>((resolve, reject) => {
      const sub = liveQuery(querier).subscribe({
        next: () => {
          sub.unsubscribe();
          resolve();
        },
        error: (error) => {
          sub.unsubscribe();
          reject(new Error(`${name} threw inside a live query: ${String(error)}`));
        },
      });
    });
  }
});

test("saving a profile derives and stores targets", async () => {
  const settings = await saveProfile(profile, 78);
  assert.ok(settings.calorieTarget > 1500);
  assert.ok(settings.proteinTarget > 100);
  const stored = await getSettings();
  assert.equal(stored?.calorieTarget, settings.calorieTarget);
});

test("logging a food scales its nutrition and records usage", async () => {
  const idli = await getFood("idli");
  assert.ok(idli);
  await addFoodLog({ date: today, meal: "breakfast", food: idli!, quantity: 80 });
  const logs = await logsForDate(today);
  assert.equal(logs.length, 1);
  assert.equal(logs[0].macros.kcal, Math.round(idli!.per100.kcal * 0.8));
  assert.equal((await usageMap()).get("idli")?.count, 1);
});

test("a saved meal replays every item", async () => {
  const saved = await saveMealFromDay("Test breakfast", today, "breakfast");
  assert.ok(saved);
  const added = await applySavedMeal(saved!.id, shiftKey(today, -1), "dinner");
  assert.equal(added, 1);
  assert.equal((await logsForDate(shiftKey(today, -1))).length, 1);
});

test("copying a day duplicates entries without touching the original", async () => {
  const copied = await copyDay(today, shiftKey(today, -2));
  assert.equal(copied, 1);
  assert.equal((await logsForDate(today)).length, 1);
  assert.equal((await logsForDate(shiftKey(today, -2))).length, 1);
});

test("a recipe becomes a per-100 g food corrected for cooked weight", async () => {
  const chicken = await getFood("chicken-breast-cooked");
  const oil = await getFood("cooking-oil");
  assert.ok(chicken && oil);

  const id = uid("rec");
  const food = await saveRecipe({
    id,
    name: "Test curry",
    servings: 2,
    cookedWeightG: 500, // 600 g of ingredients cooked down to 500 g
    ingredients: [
      { foodId: chicken!.id, name: chicken!.name, quantity: 500, unit: "g" },
      { foodId: oil!.id, name: oil!.name, quantity: 100, unit: "g" },
    ],
    createdAt: Date.now(),
  });

  const totalKcal = chicken!.per100.kcal * 5 + oil!.per100.kcal;
  assert.equal(food.per100.kcal, Math.round((totalKcal / 500) * 100));
  assert.ok((await allRecipes()).some((r) => r.id === id));
});

test("one weigh-in per day, last value wins", async () => {
  await saveWeight(today, 78.4);
  await saveWeight(today, 78.1);
  const weights = await allWeights();
  assert.equal(weights.filter((w) => w.date === today).length, 1);
  assert.equal((await latestWeight())?.weightKg, 78.1);
});

test("the daily series reports unlogged days as empty rather than zero-calorie days", async () => {
  const series = await dailyIntakeSeries(today, 7);
  assert.equal(series.length, 7);
  const blank = series.filter((d) => d.entries === 0);
  assert.ok(blank.length > 0);
  assert.ok(blank.every((d) => d.kcal === 0));
});
