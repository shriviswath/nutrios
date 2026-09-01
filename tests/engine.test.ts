import assert from "node:assert/strict";
import test from "node:test";
import { bmr, computeCalorieTarget, computeMacroTargets, tdeeFromActivity } from "../src/lib/nutrition/energy";
import { scaleMacros, sumMacros, macroConsistencyGap } from "../src/lib/nutrition/scaling";
import { buildTrend, trendSlopeKgPerWeek, weeksToTarget } from "../src/lib/nutrition/trend";
import { estimateTdee, recommendTarget } from "../src/lib/nutrition/adaptive";
import { parseMealText } from "../src/lib/nlp/parseMealText";
import { SEED_FOODS } from "../src/data/foods";
import type { Profile } from "../src/lib/types";
import { shiftKey } from "../src/lib/utils/date";

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

test("Mifflin-St Jeor matches the published formula", () => {
  // 10(78) + 6.25(175) - 5(21) + 5 = 780 + 1093.75 - 105 + 5
  assert.equal(bmr("male", 78, 175, 21), 1774);
  assert.equal(bmr("female", 60, 165, 30), 1320);
});

test("activity multiplier is applied to BMR, not to the target", () => {
  assert.equal(tdeeFromActivity(1774, "light"), Math.round(1774 * 1.375));
});

test("a 0.4 kg/week deficit is about 440 kcal below maintenance", () => {
  const result = computeCalorieTarget(profile, 78);
  assert.equal(result.maintenance - result.calorieTarget, 440);
  assert.equal(result.clamped, false);
});

test("an unsafe rate is capped and reported rather than silently accepted", () => {
  const aggressive = { ...profile, rateKgPerWeek: 1.5 };
  const result = computeCalorieTarget(aggressive, 78);
  assert.equal(result.clamped, true);
  assert.ok(result.calorieTarget > result.rawTarget);
  assert.ok(result.findings.some((f) => f.message.includes("25%")));
  assert.ok(result.findings.some((f) => f.message.includes("body weight")));
});

test("the calorie floor is never breached", () => {
  const extreme = { ...profile, sex: "female" as const, heightCm: 150, rateKgPerWeek: 2 };
  const result = computeCalorieTarget(extreme, 45);
  assert.ok(result.calorieTarget >= 1200);
  assert.ok(result.findings.some((f) => f.level === "block"));
});

test("macro targets add up to the calorie target within rounding", () => {
  const calories = 2000;
  const m = computeMacroTargets(profile, calories, 78);
  const fromMacros = m.protein * 4 + m.carbs * 4 + m.fat * 9;
  assert.ok(Math.abs(fromMacros - calories) < 25, `macros imply ${fromMacros} kcal`);
});

test("nutrients scale linearly and unknown values stay unknown", () => {
  const per100 = { kcal: 180, protein: 10, carbs: 20, fat: 6 };
  const scaled = scaleMacros(per100, 250);
  assert.equal(scaled.kcal, 450);
  assert.equal(scaled.protein, 25);
  assert.equal(scaled.fiber, undefined);
});

test("summing entries keeps unknown fibre out of the total as absent, not zero", () => {
  const total = sumMacros([
    { kcal: 100, protein: 5, carbs: 10, fat: 3, fiber: 2 },
    { kcal: 200, protein: 8, carbs: 30, fat: 4 },
  ]);
  assert.equal(total.kcal, 300);
  assert.equal(total.fiber, 2);
});

test("every seed food's macros agree with its calories within 20%", () => {
  const bad = SEED_FOODS.filter((f) => Math.abs(macroConsistencyGap(f.per100)) > 0.2 && f.per100.kcal > 20);
  assert.deepEqual(bad.map((f) => f.name), []);
});

test("seed portions are positive and every food has at least one", () => {
  for (const food of SEED_FOODS) {
    assert.ok(food.portions.length > 0, `${food.name} has no portions`);
    for (const p of food.portions) assert.ok(p.amount > 0, `${food.name}: ${p.label}`);
  }
});

test("weight trend smooths noise and ignores gaps", () => {
  const start = "2026-01-01";
  const points = [80.0, 81.2, 79.4, 80.6, 79.8, 80.2, 79.6].map((w, i) => ({
    date: shiftKey(start, i),
    weightKg: w,
  }));
  const trend = buildTrend(points);
  assert.equal(trend.length, 7);
  const last = trend[trend.length - 1].trend;
  assert.ok(last > 79.5 && last < 80.6, `trend ${last} should sit inside the noise band`);
});

test("slope recovers a known rate of loss", () => {
  const points = Array.from({ length: 28 }, (_, i) => ({
    date: shiftKey("2026-01-01", i),
    weightKg: 80 - i * (0.5 / 7), // exactly 0.5 kg/week
  }));
  const slope = trendSlopeKgPerWeek(buildTrend(points), 28)!;
  assert.ok(Math.abs(slope + 0.5) < 0.02, `slope was ${slope}`);
});

test("time to goal is undefined when moving the wrong way", () => {
  assert.equal(weeksToTarget(80, 70, 0.3), undefined);
  assert.equal(weeksToTarget(80, 70, -0.5), 20);
});

test("TDEE falls back to the formula until there is enough data", () => {
  const estimate = estimateTdee(profile, 78, [], []);
  assert.equal(estimate.ready, false);
  assert.equal(estimate.source, "formula");
  assert.ok(estimate.explanation.includes("weigh-ins"));
});

test("TDEE is recovered from intake and weight change", () => {
  // 28 days at 2200 kcal, losing exactly 0.5 kg/week => true maintenance ≈ 2200 + 550 = 2750.
  const days = 28;
  const intake = Array.from({ length: days }, (_, i) => ({ date: shiftKey("2026-01-01", i), kcal: 2200 }));
  const weights = Array.from({ length: days }, (_, i) => ({
    date: shiftKey("2026-01-01", i),
    weightKg: 80 - i * (0.5 / 7),
  }));
  const estimate = estimateTdee(profile, 78, intake, weights);
  assert.equal(estimate.ready, true);
  assert.ok(estimate.confidence > 0.6, `confidence ${estimate.confidence}`);
  // Blended against the formula prior, so it should move well above intake, towards 2750.
  assert.ok(estimate.value > 2450 && estimate.value < 2800, `estimate ${estimate.value}`);
});

test("patchy logging is refused rather than guessed at", () => {
  const weights = Array.from({ length: 28 }, (_, i) => ({ date: shiftKey("2026-01-01", i), weightKg: 80 - i * 0.05 }));
  const intake = Array.from({ length: 8 }, (_, i) => ({ date: shiftKey("2026-01-01", i * 3), kcal: 2200 }));
  const estimate = estimateTdee(profile, 78, intake, weights);
  assert.equal(estimate.ready, false);
  assert.ok(estimate.explanation.includes("%"));
});

test("a target on plan is held, not nudged", () => {
  const days = 28;
  const intake = Array.from({ length: days }, (_, i) => ({ date: shiftKey("2026-01-01", i), kcal: 2300 }));
  const weights = Array.from({ length: days }, (_, i) => ({
    date: shiftKey("2026-01-01", i),
    weightKg: 80 - i * (0.4 / 7),
  }));
  const trend = buildTrend(weights);
  const estimate = estimateTdee(profile, 78, intake, weights);
  const rec = recommendTarget(profile, 2300, 78, estimate, trend, undefined, trend[trend.length - 1].date);
  assert.equal(rec.action, "hold");
});

test("target changes are rate-limited after a recent adjustment", () => {
  const days = 28;
  const intake = Array.from({ length: days }, (_, i) => ({ date: shiftKey("2026-01-01", i), kcal: 2600 }));
  const weights = Array.from({ length: days }, (_, i) => ({ date: shiftKey("2026-01-01", i), weightKg: 80 }));
  const trend = buildTrend(weights);
  const estimate = estimateTdee(profile, 78, intake, weights);
  const today = trend[trend.length - 1].date;
  const rec = recommendTarget(profile, 2300, 78, estimate, trend, shiftKey(today, -2), today);
  assert.equal(rec.action, "wait");
  assert.ok(rec.reasoning.includes("last adjusted"));
});

test("no single adjustment exceeds 200 kcal", () => {
  const days = 28;
  const intake = Array.from({ length: days }, (_, i) => ({ date: shiftKey("2026-01-01", i), kcal: 3200 }));
  const weights = Array.from({ length: days }, (_, i) => ({ date: shiftKey("2026-01-01", i), weightKg: 80 + i * 0.03 }));
  const trend = buildTrend(weights);
  const estimate = estimateTdee(profile, 78, intake, weights);
  const rec = recommendTarget(profile, 3200, 80, estimate, trend, undefined, trend[trend.length - 1].date);
  assert.ok(Math.abs(rec.deltaKcal) <= 200, `delta ${rec.deltaKcal}`);
});

test("the meal parser handles counts, words and units", () => {
  const items = parseMealText("2 idli, 3 eggs and one cup of tea", SEED_FOODS);
  assert.equal(items.length, 3);
  assert.equal(items[0].food?.name, "Idli");
  assert.equal(items[0].amountBase, 80);
  assert.ok(items[1].food?.name.startsWith("Egg"));
  assert.equal(items[2].food?.name, "Tea with milk and sugar");
  assert.equal(items[2].amountBase, 150);
});

test("the parser reports what it could not match instead of inventing it", () => {
  const items = parseMealText("200 g chicken breast, 1 zorbleflarn", SEED_FOODS);
  assert.equal(items[0].amountBase, 200);
  assert.equal(items[1].food, undefined);
  assert.equal(items[1].confidence, "low");
});
