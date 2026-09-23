import assert from "node:assert/strict";
import test from "node:test";
import { SEED_FOODS } from "../src/data/foods";
import { SWAPS_BY_NAME } from "../src/data/swaps";
import { healthierSwaps, rateFood, rateLogged } from "../src/lib/nutrition/quality";
import { scaleFood } from "../src/lib/nutrition/scaling";

const byName = new Map(SEED_FOODS.map((f) => [f.name, f]));
const grade = (name: string) => {
  const food = byName.get(name);
  assert.ok(food, `missing seed food: ${name}`);
  return rateFood(food).grade;
};

test("every curated swap refers to a real food", () => {
  const missing = Object.entries(SWAPS_BY_NAME)
    .flatMap(([from, to]) => [from, ...to])
    .filter((name) => !byName.has(name));
  assert.deepEqual(missing, []);
});

test("grades match how a dietitian would read common South Indian foods", () => {
  for (const name of ["Idli", "Sambar", "Ragi dosa", "Chapati", "Chicken tikka", "Egg, whole boiled", "Curd (dahi)", "Buttermilk (neer mor)", "Broccoli", "Guava"]) {
    assert.equal(grade(name), "green", name);
  }
  for (const name of ["Chicken biryani", "Masala dosa", "Parotta", "Chicken 65", "Butter chicken", "Tea with milk and sugar", "Almonds"]) {
    assert.equal(grade(name), "amber", name);
  }
  for (const name of ["Gulab jamun", "Cola soft drink", "Potato chips", "Murukku", "Mysore pak", "Samosa".replace("Samosa", "Bonda"), "Ghee"]) {
    assert.equal(grade(name), "red", name);
  }
});

test("swaps are never worse than the original, and green foods get none", () => {
  for (const food of SEED_FOODS) {
    const q = rateFood(food);
    const swaps = healthierSwaps(food, SEED_FOODS);
    if (q.grade === "green") assert.equal(swaps.length, 0, food.name);
    const rank = { green: 2, amber: 1, red: 0 };
    for (const s of swaps) assert.ok(rank[s.quality.grade] >= rank[q.grade], `${food.name} → ${s.food.name}`);
  }
  const parotta = healthierSwaps(byName.get("Parotta")!, SEED_FOODS).map((s) => s.food.name);
  assert.equal(parotta[0], "Phulka (no oil)");
});

test("a logged entry keeps the grade of the food it came from", () => {
  const food = byName.get("Medu vada")!;
  const { macros } = scaleFood(food, 90);
  assert.equal(rateLogged(macros, 90, food).grade, rateFood(food).grade);
});

import { computeBadges, computeStreaks, type DayLog } from "../src/lib/streaks";
import { rangeKeys } from "../src/lib/utils/date";

function series(pattern: string, kcal = 2000): DayLog[] {
  // pattern: one char per day ending today; "x" = logged, "." = not logged
  const keys = rangeKeys("2026-09-23", pattern.length);
  return keys.map((date, i) => ({
    date,
    kcal: pattern[i] === "x" ? kcal : 0,
    protein: pattern[i] === "x" ? 120 : 0,
    fiber: pattern[i] === "x" ? 30 : 0,
    entries: pattern[i] === "x" ? 3 : 0,
    greenShare: pattern[i] === "x" ? 0.7 : 0,
  }));
}

test("an unlogged today does not break the streak, a missed yesterday does", () => {
  assert.equal(computeStreaks(series("xxxxx"), 2000).current, 5);
  assert.equal(computeStreaks(series("xxxx."), 2000).current, 4);
  assert.equal(computeStreaks(series("xxx.."), 2000).current, 0);
  const s = computeStreaks(series("xxxxxxx..xxx"), 2000);
  assert.equal(s.longest, 7);
  assert.equal(s.current, 3);
});

test("on-target streak only counts days within 10% of the target", () => {
  assert.equal(computeStreaks(series("xxxx", 2000), 2100).onTarget, 4);
  assert.equal(computeStreaks(series("xxxx", 2000), 2500).onTarget, 0);
  // A part-logged today (1000 of 2000) does not reset a run that held until yesterday.
  const days = series("xxxx", 2000);
  days[days.length - 1].kcal = 1000;
  assert.equal(computeStreaks(days, 2000).onTarget, 3);
});

test("badges unlock from the diary and report progress when locked", () => {
  const days = series("xxxxxxxx");
  const badges = computeBadges({ days, streaks: computeStreaks(days, 2000), calorieTarget: 2000, proteinTarget: 120, fiberTarget: 28, weighIns: 3, recipes: 0 });
  const get = (id: string) => badges.find((b) => b.id === id)!;
  assert.ok(get("streak-7").earned);
  assert.ok(!get("streak-30").earned);
  assert.equal(get("streak-30").progress, "8 / 30 days");
  assert.ok(get("protein-7").earned);
  assert.ok(get("green-plate").earned);
  assert.ok(!get("weigh-10").earned);
});
