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
import { dateKey } from "@/lib/utils/date";

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
