/**
 * Streaks and badges, derived on read from the diary — nothing here is stored, so editing or
 * deleting an old entry can never leave a stale badge behind.
 *
 * Pure functions over a contiguous, date-ascending series that ends today.
 */

export interface DayLog {
  date: string;
  kcal: number;
  protein: number;
  fiber: number;
  entries: number;
  /** Share of the day's calories from green-graded foods, 0..1. */
  greenShare: number;
}

export interface StreakInfo {
  /** Consecutive logged days ending today — or yesterday, if today isn't logged yet. */
  current: number;
  longest: number;
  loggedToday: boolean;
  /** Consecutive days within ±10% of the calorie target, ending today if today is on target, else yesterday. */
  onTarget: number;
}

const logged = (d: DayLog) => d.entries > 0;

export function computeStreaks(days: DayLog[], calorieTarget: number): StreakInfo {
  if (days.length === 0) return { current: 0, longest: 0, loggedToday: false, onTarget: 0 };
  const loggedToday = logged(days[days.length - 1]);
  // An unlogged today doesn't break the streak yet — the day isn't over.
  const anchor = loggedToday ? days.length - 1 : days.length - 2;

  const runBack = (ok: (d: DayLog) => boolean) => {
    let n = 0;
    for (let i = anchor; i >= 0 && ok(days[i]); i--) n++;
    return n;
  };

  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = logged(d) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }

  const inBand = (d: DayLog) => logged(d) && Math.abs(d.kcal - calorieTarget) <= calorieTarget * 0.1;
  // Today only counts once it is on target; a half-eaten day is not a miss.
  let onTarget = 0;
  for (let i = inBand(days[days.length - 1]) ? days.length - 1 : days.length - 2; i >= 0 && inBand(days[i]); i--) onTarget++;
  return { current: runBack(logged), longest, loggedToday, onTarget };
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  /** "4 / 7 days" style progress for unearned badges. */
  progress: string;
}

export interface BadgeInput {
  days: DayLog[];
  streaks: StreakInfo;
  calorieTarget: number;
  proteinTarget: number;
  fiberTarget: number;
  weighIns: number;
  recipes: number;
}

export function computeBadges(input: BadgeInput): Badge[] {
  const { days, streaks, calorieTarget, proteinTarget, fiberTarget, weighIns, recipes } = input;
  const loggedDays = days.filter(logged);
  const onTargetDays = loggedDays.filter((d) => Math.abs(d.kcal - calorieTarget) <= calorieTarget * 0.1).length;
  const proteinDays = loggedDays.filter((d) => proteinTarget > 0 && d.protein >= proteinTarget * 0.9).length;
  const fibreDays = loggedDays.filter((d) => fiberTarget > 0 && d.fiber >= fiberTarget).length;
  const greenDays = loggedDays.filter((d) => d.kcal >= 600 && d.greenShare >= 0.6).length;

  const make = (id: string, title: string, description: string, have: number, need: number, unit = "days"): Badge => ({
    id,
    title,
    description,
    earned: have >= need,
    progress: `${Math.min(have, need)} / ${need} ${unit}`,
  });

  return [
    make("first-log", "First bite", "Log your first meal.", loggedDays.length, 1),
    make("streak-3", "Warming up", "Log food 3 days in a row.", streaks.longest, 3),
    make("streak-7", "Full week", "Log food 7 days in a row.", streaks.longest, 7),
    make("streak-30", "Habit formed", "Log food 30 days in a row.", streaks.longest, 30),
    make("streak-100", "Centurion", "Log food 100 days in a row.", streaks.longest, 100),
    make("on-target-7", "Bullseye", "Land within 10% of your calorie target on 7 days.", onTargetDays, 7),
    make("protein-7", "Protein pro", "Reach 90% of your protein target on 7 days.", proteinDays, 7),
    make("fibre-5", "Fibre friend", "Hit your fibre target on 5 days.", fibreDays, 5),
    make("green-plate", "Green plate", "Get 60% of a full day's calories from green foods.", greenDays, 1, "day"),
    make("weigh-10", "Scale regular", "Log 10 weigh-ins.", weighIns, 10, "weigh-ins"),
    make("recipe-1", "Home chef", "Save one of your own recipes.", recipes, 1, "recipe"),
  ];
}
