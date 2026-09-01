import type { DailyIntake } from "@/lib/db/repo";
import type { TrendPoint } from "@/lib/nutrition/trend";
import { trendSlopeKgPerWeek } from "@/lib/nutrition/trend";
import { formatRate, type TdeeEstimate } from "@/lib/nutrition/adaptive";
import type { Settings } from "@/lib/types";

export interface WeeklyReport {
  start: string;
  end: string;
  loggedDays: number;
  meanKcal: number;
  targetKcal: number;
  meanProtein: number;
  meanCarbs: number;
  meanFat: number;
  meanFiber: number;
  weightStart?: number;
  weightEnd?: number;
  weightChange?: number;
  trendRate?: number;
  estimatedTdee?: number;
  /** Share of logged days that landed within ±10% of target. */
  adherence: number;
  headline: string;
}

export function buildWeeklyReport(
  intake: DailyIntake[],
  settings: Settings,
  trend: TrendPoint[],
  estimate?: TdeeEstimate,
): WeeklyReport {
  const week = intake.slice(-7);
  const logged = week.filter((d) => d.entries > 0);
  const n = Math.max(1, logged.length);
  const mean = (pick: (d: DailyIntake) => number) => Math.round(logged.reduce((a, d) => a + pick(d), 0) / n);

  const trendWeek = trend.slice(-7);
  const weightStart = trendWeek[0]?.trend;
  const weightEnd = trendWeek[trendWeek.length - 1]?.trend;
  const inBand = logged.filter((d) => Math.abs(d.kcal - settings.calorieTarget) <= settings.calorieTarget * 0.1).length;

  const meanKcal = mean((d) => d.kcal);
  const rate = trendSlopeKgPerWeek(trend, 14);

  const report: WeeklyReport = {
    start: week[0]?.date ?? "",
    end: week[week.length - 1]?.date ?? "",
    loggedDays: logged.length,
    meanKcal,
    targetKcal: settings.calorieTarget,
    meanProtein: mean((d) => d.protein),
    meanCarbs: mean((d) => d.carbs),
    meanFat: mean((d) => d.fat),
    meanFiber: mean((d) => d.fiber),
    weightStart,
    weightEnd,
    weightChange: weightStart !== undefined && weightEnd !== undefined ? Number((weightEnd - weightStart).toFixed(2)) : undefined,
    trendRate: rate,
    estimatedTdee: estimate?.ready ? estimate.value : undefined,
    adherence: logged.length ? Math.round((inBand / logged.length) * 100) : 0,
    headline: "",
  };

  report.headline = headlineFor(report);
  return report;
}

function headlineFor(r: WeeklyReport): string {
  if (r.loggedDays === 0) return "Nothing logged this week. One day of data is worth more than a perfect plan.";
  if (r.loggedDays < 4) {
    return `Only ${r.loggedDays} days logged, so the averages below are thin. Consistency is what makes the rest of this app work.`;
  }
  const gap = r.meanKcal - r.targetKcal;
  const parts: string[] = [];
  parts.push(
    Math.abs(gap) <= r.targetKcal * 0.05
      ? `Intake averaged ${r.meanKcal} kcal against a ${r.targetKcal} kcal target — right on plan.`
      : `Intake averaged ${r.meanKcal} kcal, ${Math.abs(gap)} kcal ${gap > 0 ? "above" : "below"} your ${r.targetKcal} kcal target.`,
  );
  if (r.trendRate !== undefined) parts.push(`Trend weight is ${formatRate(r.trendRate)}.`);
  if (r.meanProtein) parts.push(`Protein averaged ${r.meanProtein} g/day.`);
  return parts.join(" ");
}
