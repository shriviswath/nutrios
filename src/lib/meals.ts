import type { MealSlot } from "@/lib/types";

export const MEAL_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  morning_snack: "Morning snack",
  lunch: "Lunch",
  snacks: "Evening snack",
  dinner: "Dinner",
};

/**
 * Suggested share of the day's calories per meal — a typical South Indian day with a light tiffin
 * in the morning and evening. Guidance only: nothing is enforced per meal.
 */
export const MEAL_SHARE: Record<MealSlot, number> = {
  breakfast: 0.25,
  morning_snack: 0.1,
  lunch: 0.3,
  snacks: 0.1,
  dinner: 0.25,
};

/** Recommended range for one meal, ±15% around its share, rounded to 10 kcal. */
export function mealRange(slot: MealSlot, dailyTarget: number): [number, number] {
  const mid = dailyTarget * MEAL_SHARE[slot];
  const r = (v: number) => Math.round(v / 10) * 10;
  return [r(mid * 0.85), r(mid * 1.15)];
}

/** The slot you are most likely logging right now. */
export function guessMeal(hour = new Date().getHours()): MealSlot {
  if (hour < 10) return "breakfast";
  if (hour < 12) return "morning_snack";
  if (hour < 16) return "lunch";
  if (hour < 19) return "snacks";
  return "dinner";
}
