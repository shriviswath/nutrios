import { KCAL_PER_KG, computeCalorieTarget, deltaForRate } from "@/lib/nutrition/energy";
import { buildTrend, fittedChangeKg, trendSlopeKgPerWeek, type TrendPoint, type WeightPoint } from "@/lib/nutrition/trend";
import { daysBetween } from "@/lib/utils/date";
import type { Profile } from "@/lib/types";

/** Days with an implausibly small total are treated as partial logs, not real days. */
const MIN_CREDIBLE_INTAKE = 600;
const MIN_WINDOW_DAYS = 14;
const DEFAULT_WINDOW_DAYS = 28;
const MIN_COVERAGE = 0.65;

export interface IntakeDay {
  date: string;
  kcal: number;
}

export interface TdeeEstimate {
  /** Best current estimate of maintenance calories. */
  value: number;
  /** ± range implied by the confidence and residual noise. */
  margin: number;
  confidence: number; // 0..1
  source: "formula" | "blended" | "data";
  windowDays: number;
  loggedDays: number;
  coverage: number;
  weighIns: number;
  meanIntake?: number;
  slopeKgPerWeek?: number;
  /** Plain-language explanation shown in the UI. Never present a number without it. */
  explanation: string;
  ready: boolean;
}

/**
 * Energy balance in reverse.
 *
 * Over a window, the body's expenditure equals what went in minus what was stored:
 *   TDEE ≈ meanIntake − (Δ trend weight × 7700) / days
 *
 * The estimate is only trusted in proportion to how good the data is, then blended with the
 * Mifflin-St Jeor prior. With no data you get the formula; with a month of consistent logging
 * you get almost entirely the measurement.
 */
export function estimateTdee(
  profile: Profile,
  currentWeightKg: number,
  intake: IntakeDay[],
  weights: WeightPoint[],
  windowDays = DEFAULT_WINDOW_DAYS,
): TdeeEstimate {
  const prior = computeCalorieTarget(profile, currentWeightKg).maintenance;
  const series = buildTrend(weights);

  const insufficient = (explanation: string, extra: Partial<TdeeEstimate> = {}): TdeeEstimate => ({
    value: prior,
    margin: Math.round(prior * 0.12),
    confidence: 0,
    source: "formula",
    windowDays: 0,
    loggedDays: 0,
    coverage: 0,
    weighIns: weights.length,
    ready: false,
    explanation,
    ...extra,
  });

  if (series.length < MIN_WINDOW_DAYS) {
    return insufficient(
      `Using the Mifflin-St Jeor estimate for now. ${MIN_WINDOW_DAYS} days of weigh-ins are needed before your real expenditure can be measured — there are ${series.length} so far.`,
    );
  }

  const window = series.slice(-windowDays);
  const start = window[0];
  const end = window[window.length - 1];
  const days = window.length; // calendar days covered by the window
  const span = Math.max(1, days - 1); // intervals over which weight actually changed

  const intakeInWindow = intake.filter(
    (d) => d.date >= start.date && d.date <= end.date && d.kcal >= MIN_CREDIBLE_INTAKE,
  );
  const loggedDays = intakeInWindow.length;
  const coverage = loggedDays / days;
  const weighIns = window.filter((p) => p.weight !== undefined).length;

  if (coverage < MIN_COVERAGE || loggedDays < 10) {
    return insufficient(
      `Food is logged on ${loggedDays} of the last ${days} days (${Math.round(coverage * 100)}%). At least ${Math.round(MIN_COVERAGE * 100)}% is needed before intake data can be used to estimate expenditure.`,
      { windowDays: days, loggedDays, coverage, weighIns },
    );
  }
  if (weighIns < 6) {
    return insufficient(
      `Only ${weighIns} weigh-ins in the last ${days} days. Weighing at least every other day makes the trend readable.`,
      { windowDays: days, loggedDays, coverage, weighIns },
    );
  }

  const meanIntake = intakeInWindow.reduce((a, d) => a + d.kcal, 0) / loggedDays;
  // Change is read off the fitted line over the window, which is unbiased, rather than the
  // difference between two smoothed endpoints, which is not.
  const deltaKg = fittedChangeKg(window, window.length) ?? end.trend - start.trend;
  const storedKcalPerDay = (deltaKg * KCAL_PER_KG) / span;
  const measured = meanIntake - storedKcalPerDay;

  // Data quality → confidence.
  const spanScore = clamp01((days - MIN_WINDOW_DAYS) / (DEFAULT_WINDOW_DAYS - MIN_WINDOW_DAYS)) * 0.6 + 0.4;
  const coverageScore = clamp01((coverage - MIN_COVERAGE) / (1 - MIN_COVERAGE)) * 0.7 + 0.3;
  const weighScore = clamp01(weighIns / (days * 0.6));
  const confidence = Number((spanScore * coverageScore * weighScore).toFixed(2));

  // Blend with the prior and refuse physiologically implausible jumps.
  const blended = confidence * measured + (1 - confidence) * prior;
  const bounded = Math.min(prior * 1.45, Math.max(prior * 0.65, blended));
  const value = Math.round(bounded / 5) * 5; // avoid false precision

  const slope = trendSlopeKgPerWeek(window, days);
  const margin = Math.round(Math.max(60, value * (0.14 - 0.09 * confidence)));

  return {
    value,
    margin,
    confidence,
    source: confidence > 0.75 ? "data" : "blended",
    windowDays: days,
    loggedDays,
    coverage,
    weighIns,
    meanIntake: Math.round(meanIntake),
    slopeKgPerWeek: slope,
    ready: true,
    explanation:
      `Over ${days} days you averaged ${Math.round(meanIntake)} kcal on ${loggedDays} logged days while your trend weight moved ${formatKg(deltaKg)}. ` +
      `That implies maintenance near ${value} kcal (±${margin}).` +
      (confidence < 0.75
        ? ` Logging is still patchy, so this is weighted ${Math.round(confidence * 100)}% towards your data and the rest towards the formula estimate.`
        : ""),
  };
}

export interface TargetRecommendation {
  action: "hold" | "increase" | "decrease" | "wait";
  currentTarget: number;
  suggestedTarget: number;
  deltaKcal: number;
  observedRate?: number;
  desiredRate: number;
  reasoning: string;
}

const MAX_STEP_KCAL = 200;
const MIN_MEANINGFUL_STEP = 60;
const MIN_DAYS_BETWEEN_ADAPTS = 7;

/**
 * Compares the observed rate of change with the intended one and proposes a step.
 * Steps are capped and rate-limited: a tracker that chases daily noise is worse than useless.
 */
export function recommendTarget(
  profile: Profile,
  currentTarget: number,
  currentWeightKg: number,
  estimate: TdeeEstimate,
  trend: TrendPoint[],
  lastAdaptedAt?: string,
  today = trend[trend.length - 1]?.date,
): TargetRecommendation {
  const desiredRate = profile.goal === "lose" ? -Math.abs(profile.rateKgPerWeek) : profile.goal === "gain" ? Math.abs(profile.rateKgPerWeek) : 0;
  const observedRate = trendSlopeKgPerWeek(trend, 21);

  const base: TargetRecommendation = {
    action: "wait",
    currentTarget,
    suggestedTarget: currentTarget,
    deltaKcal: 0,
    observedRate,
    desiredRate,
    reasoning: "",
  };

  if (!estimate.ready || estimate.confidence < 0.45) {
    return { ...base, reasoning: estimate.explanation };
  }
  if (lastAdaptedAt && today && daysBetween(lastAdaptedAt, today) < MIN_DAYS_BETWEEN_ADAPTS) {
    return {
      ...base,
      action: "wait",
      reasoning: `The target was last adjusted on ${lastAdaptedAt}. Changes are held for at least ${MIN_DAYS_BETWEEN_ADAPTS} days so the effect can be measured.`,
    };
  }
  if (observedRate === undefined) {
    return { ...base, reasoning: "Not enough weigh-ins in the last three weeks to read a rate of change." };
  }

  const idealTarget = computeCalorieTarget(profile, currentWeightKg, estimate.value).calorieTarget;
  const rateError = desiredRate - observedRate; // kg/week still needed
  const rawDelta = idealTarget - currentTarget;
  const delta = Math.max(-MAX_STEP_KCAL, Math.min(MAX_STEP_KCAL, Math.round(rawDelta / 10) * 10));

  const onTrack = Math.abs(rateError) <= Math.max(0.1, Math.abs(desiredRate) * 0.25);
  if (onTrack || Math.abs(delta) < MIN_MEANINGFUL_STEP) {
    return {
      ...base,
      action: "hold",
      reasoning:
        `Average intake is about ${estimate.meanIntake} kcal/day and your trend weight is moving ${formatRate(observedRate)}, ` +
        `against a goal of ${formatRate(desiredRate)}. That is within tolerance, so the target stays at ${currentTarget} kcal.`,
    };
  }

  const suggested = currentTarget + delta;
  return {
    ...base,
    action: delta > 0 ? "increase" : "decrease",
    suggestedTarget: suggested,
    deltaKcal: delta,
    reasoning:
      `Your trend weight is moving ${formatRate(observedRate)} against a goal of ${formatRate(desiredRate)}, and maintenance now looks like ${estimate.value} kcal. ` +
      `${delta > 0 ? "Raising" : "Lowering"} the target by ${Math.abs(delta)} kcal to ${suggested} should bring the rate back in line. Change is capped at ${MAX_STEP_KCAL} kcal per adjustment.`,
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function formatKg(delta: number) {
  const abs = Math.abs(delta).toFixed(2);
  if (Math.abs(delta) < 0.05) return "less than 0.05 kg";
  return `${delta < 0 ? "down" : "up"} ${abs} kg`;
}

export function formatRate(rate: number) {
  if (Math.abs(rate) < 0.02) return "roughly flat";
  return `${rate < 0 ? "down" : "up"} ${Math.abs(rate).toFixed(2)} kg/week`;
}

export { deltaForRate };
