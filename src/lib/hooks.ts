"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { db } from "@/lib/db/db";
import {
  allFoods,
  allRecipes,
  allSavedMeals,
  allWeights,
  dailyIntakeSeries,
  exercisesForDate,
  getProfile,
  getSettings,
  latestWeight,
  logsForDate,
  usageMap,
} from "@/lib/db/repo";
import { estimateTdee, recommendTarget } from "@/lib/nutrition/adaptive";
import { buildTrend, trendSlopeKgPerWeek, weeksToTarget } from "@/lib/nutrition/trend";
import { buildWeeklyReport } from "@/lib/report/weekly";
import { sumMacros, sumMicros } from "@/lib/nutrition/scaling";
import { MEAL_SLOTS, type FoodLog, type MealSlot } from "@/lib/types";
import { dateKey, rangeKeys } from "@/lib/utils/date";
import { rateLogged } from "@/lib/nutrition/quality";
import { computeBadges, computeStreaks, type DayLog } from "@/lib/streaks";
import { logsForRange } from "@/lib/db/repo";
import type { Food } from "@/lib/types";

const HISTORY_DAYS = 120;

export function useProfile() {
  return useLiveQuery(async () => (await getProfile()) ?? null, []);
}

export function useSettings() {
  return useLiveQuery(async () => (await getSettings()) ?? null, []);
}

export function useFoods() {
  return useLiveQuery(() => allFoods(), [], []);
}

export function useUsage() {
  return useLiveQuery(() => usageMap(), [], new Map());
}

export function useRecipes() {
  return useLiveQuery(() => allRecipes(), [], []);
}

export function useSavedMeals() {
  return useLiveQuery(() => allSavedMeals(), [], []);
}

export function useWeights() {
  return useLiveQuery(() => allWeights(), [], []);
}

export function useLatestWeight() {
  return useLiveQuery(() => latestWeight(), []);
}

export interface DayData {
  logs: FoodLog[];
  byMeal: Record<MealSlot, FoodLog[]>;
  totals: ReturnType<typeof sumMacros>;
  micros: ReturnType<typeof sumMicros>;
  exerciseKcal: number;
}

export function useDay(date: string): DayData | undefined {
  return useLiveQuery(async () => {
    const [logs, exercises] = await Promise.all([logsForDate(date), exercisesForDate(date)]);
    const byMeal = Object.fromEntries(MEAL_SLOTS.map((m) => [m, [] as FoodLog[]])) as Record<MealSlot, FoodLog[]>;
    for (const log of logs) byMeal[log.meal]?.push(log);
    return {
      logs,
      byMeal,
      totals: sumMacros(logs.map((l) => l.macros)),
      micros: sumMicros(logs.map((l) => l.micros)),
      exerciseKcal: exercises.reduce((a, e) => a + e.kcal, 0),
    };
  }, [date]);
}

export function useExercises(date: string) {
  return useLiveQuery(() => exercisesForDate(date), [date], []);
}

export function useHistory(days = HISTORY_DAYS) {
  return useLiveQuery(() => dailyIntakeSeries(dateKey(), days), [days], []);
}

/**
 * The analytics bundle: trend, adaptive TDEE, target recommendation and the weekly report,
 * all derived from the same window so nothing on screen disagrees with anything else.
 */
export function useAnalytics(days = HISTORY_DAYS) {
  const profile = useProfile();
  const settings = useSettings();
  const weights = useWeights();
  const intake = useHistory(days);

  return useMemo(() => {
    if (!profile || !settings) return null;
    const trend = buildTrend(weights.map((w) => ({ date: w.date, weightKg: w.weightKg })));
    const currentWeight = trend.length ? trend[trend.length - 1].trend : profile.startWeightKg;
    const estimate = estimateTdee(
      profile,
      currentWeight,
      intake.filter((d) => d.entries > 0).map((d) => ({ date: d.date, kcal: d.kcal })),
      weights.map((w) => ({ date: w.date, weightKg: w.weightKg })),
    );
    const recommendation = recommendTarget(
      profile,
      settings.calorieTarget,
      currentWeight,
      estimate,
      trend,
      settings.lastAdaptedAt,
      dateKey(),
    );
    const report = buildWeeklyReport(intake, settings, trend, estimate);
    const slope = trendSlopeKgPerWeek(trend, 28);
    return {
      profile,
      settings,
      trend,
      intake,
      currentWeight,
      estimate,
      recommendation,
      report,
      slope,
      weeksToTarget: weeksToTarget(currentWeight, profile.targetWeightKg, slope),
    };
  }, [profile, settings, weights, intake]);
}

export function useDbReady() {
  return useLiveQuery(async () => (await db.foods.count()) > 0, [], false);
}


/** Foods keyed by id, for looking up the grade and category behind a logged entry. */
export function useFoodsById(): Map<string, Food> {
  const foods = useFoods();
  return useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
}

const STREAK_DAYS = 400;

/**
 * Daily series for streaks and badges: a year and a bit of logs, graded per entry.
 * `today` is a parameter so the series rolls over at midnight when the caller re-renders.
 */
export function useDayLogs(today: string): DayLog[] | undefined {
  return useLiveQuery(async () => {
    const keys = rangeKeys(today, STREAK_DAYS);
    const [logs, foods] = await Promise.all([logsForRange(keys[0], today), db.foods.toArray()]);
    const byId = new Map(foods.map((f) => [f.id, f]));
    const rows = new Map<string, DayLog & { green: number }>(
      keys.map((k) => [k, { date: k, kcal: 0, protein: 0, fiber: 0, entries: 0, greenShare: 0, green: 0 }]),
    );
    for (const log of logs) {
      const row = rows.get(log.date);
      if (!row) continue;
      row.kcal += log.macros.kcal;
      row.protein += log.macros.protein;
      row.fiber += log.macros.fiber ?? 0;
      row.entries += 1;
      if (rateLogged(log.macros, log.quantity, byId.get(log.foodId)).grade === "green") row.green += log.macros.kcal;
    }
    return keys.map((k) => {
      const { green, ...row } = rows.get(k)!;
      return { ...row, greenShare: row.kcal > 0 ? green / row.kcal : 0 };
    });
  }, [today]);
}

export function useGamification(today = dateKey()) {
  const settings = useSettings();
  const days = useDayLogs(today);
  const recipes = useRecipes();
  const weights = useWeights();
  return useMemo(() => {
    if (!settings || !days) return null;
    const streaks = computeStreaks(days, settings.calorieTarget);
    const badges = computeBadges({
      days,
      streaks,
      calorieTarget: settings.calorieTarget,
      proteinTarget: settings.proteinTarget,
      fiberTarget: settings.fiberTarget,
      weighIns: weights.length,
      recipes: recipes.length,
    });
    return { streaks, badges, days };
  }, [settings, days, recipes, weights]);
}
