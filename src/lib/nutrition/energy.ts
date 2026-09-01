import { ACTIVITY_LEVELS, type Goal, type Profile, type Sex, type ActivityLevel } from "@/lib/types";

/**
 * Energy content of body-mass change. 7700 kcal/kg is the classic figure for adipose tissue.
 * It is an approximation: real tissue change mixes fat, lean mass and water, so every
 * derived number in this module is reported as an estimate, never as a measurement.
 */
export const KCAL_PER_KG = 7700;
export const KCAL_PER_KG_PER_DAY = KCAL_PER_KG / 7; // ≈1100 kcal/day per kg/week

export const ATWATER = { protein: 4, carbs: 4, fat: 9, alcohol: 7 } as const;

/** Mifflin-St Jeor resting metabolic rate. */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

export function tdeeFromActivity(bmrValue: number, level: ActivityLevel): number {
  return Math.round(bmrValue * ACTIVITY_LEVELS[level].factor);
}

/** Daily energy delta required for a given rate of weight change. */
export function deltaForRate(goal: Goal, rateKgPerWeek: number): number {
  if (goal === "maintain") return 0;
  const magnitude = Math.abs(rateKgPerWeek) * KCAL_PER_KG_PER_DAY;
  return goal === "lose" ? -magnitude : magnitude;
}

export interface SafetyFinding {
  level: "warn" | "block";
  message: string;
}

/** Absolute floor below which we refuse to recommend a target without supervision. */
export function calorieFloor(sex: Sex): number {
  return sex === "male" ? 1500 : 1200;
}

export interface TargetResult {
  bmr: number;
  maintenance: number;
  maintenanceSource: "formula" | "adaptive";
  rawTarget: number;
  calorieTarget: number;
  clamped: boolean;
  findings: SafetyFinding[];
}

/**
 * Turns a maintenance estimate plus a goal into a calorie target.
 * Two guards are applied, in order:
 *  1. deficit is capped at 25% of maintenance (surplus at 20%),
 *  2. the result is never pushed below the absolute floor for the user's sex.
 */
export function computeCalorieTarget(
  profile: Pick<Profile, "sex" | "goal" | "rateKgPerWeek" | "startWeightKg" | "heightCm" | "age" | "activityLevel">,
  currentWeightKg: number,
  maintenanceOverride?: number,
): TargetResult {
  const b = bmr(profile.sex, currentWeightKg, profile.heightCm, profile.age);
  const maintenance = maintenanceOverride ?? tdeeFromActivity(b, profile.activityLevel);
  const delta = deltaForRate(profile.goal, profile.rateKgPerWeek);
  const rawTarget = maintenance + delta;

  const findings: SafetyFinding[] = [];
  let target = rawTarget;
  let clamped = false;

  const maxDeficit = maintenance * 0.25;
  const maxSurplus = maintenance * 0.2;
  if (delta < -maxDeficit) {
    target = Math.round(maintenance - maxDeficit);
    clamped = true;
    findings.push({
      level: "warn",
      message: `A ${Math.abs(profile.rateKgPerWeek)} kg/week loss needs a deficit larger than 25% of your estimated maintenance. The target has been capped at ${Math.round(target)} kcal.`,
    });
  }
  if (delta > maxSurplus) {
    target = Math.round(maintenance + maxSurplus);
    clamped = true;
    findings.push({
      level: "warn",
      message: `A ${profile.rateKgPerWeek} kg/week gain needs a surplus larger than 20% of maintenance, which mostly adds fat. The target has been capped at ${Math.round(target)} kcal.`,
    });
  }

  const floor = calorieFloor(profile.sex);
  if (target < floor) {
    target = floor;
    clamped = true;
    findings.push({
      level: "block",
      message: `Targets below ${floor} kcal are hard to meet nutritionally and should be supervised by a doctor or dietitian. The target has been raised to ${floor} kcal.`,
    });
  }

  const weeklyPercent = (Math.abs(profile.rateKgPerWeek) / currentWeightKg) * 100;
  if (weeklyPercent > 1) {
    findings.push({
      level: "warn",
      message: `${Math.abs(profile.rateKgPerWeek)} kg/week is ${weeklyPercent.toFixed(1)}% of your body weight. Above about 1% per week, more of the change comes from lean mass. Consider a slower rate.`,
    });
  }

  const bmiTarget = profile.heightCm > 0 ? currentWeightKg / (profile.heightCm / 100) ** 2 : 0;
  if (profile.goal === "lose" && bmiTarget < 18.5) {
    findings.push({
      level: "warn",
      message: "Your current weight is already below the healthy BMI range. Losing further is not a goal this app can support safely — please talk to a clinician.",
    });
  }

  return {
    bmr: b,
    maintenance: Math.round(maintenance),
    maintenanceSource: maintenanceOverride ? "adaptive" : "formula",
    rawTarget: Math.round(rawTarget),
    calorieTarget: Math.round(target),
    clamped,
    findings,
  };
}

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/**
 * Auto split: protein is set per kg of body weight (higher in a deficit to protect lean mass),
 * fat gets a floor for hormonal function, carbohydrate takes the remainder.
 */
export function computeMacroTargets(profile: Profile, calories: number, weightKg: number): MacroTargets {
  if (profile.macroMode === "grams" && profile.proteinG && profile.carbG && profile.fatG) {
    return {
      protein: profile.proteinG,
      carbs: profile.carbG,
      fat: profile.fatG,
      fiber: fiberTarget(calories),
    };
  }
  if (profile.macroMode === "percent" && profile.proteinPercent && profile.carbPercent && profile.fatPercent) {
    return {
      protein: Math.round((calories * profile.proteinPercent) / 100 / ATWATER.protein),
      carbs: Math.round((calories * profile.carbPercent) / 100 / ATWATER.carbs),
      fat: Math.round((calories * profile.fatPercent) / 100 / ATWATER.fat),
      fiber: fiberTarget(calories),
    };
  }

  const proteinPerKg = profile.goal === "lose" ? 2.0 : profile.goal === "gain" ? 1.8 : 1.6;
  const protein = Math.round(proteinPerKg * weightKg);
  const fatFloor = Math.round(0.7 * weightKg);
  let fat = Math.max(fatFloor, Math.round((calories * 0.25) / ATWATER.fat));
  let carbKcal = calories - protein * ATWATER.protein - fat * ATWATER.fat;

  // Guard against impossible splits at very low calorie targets.
  if (carbKcal < calories * 0.15) {
    fat = Math.max(fatFloor, Math.round((calories - protein * ATWATER.protein - calories * 0.15) / ATWATER.fat));
    carbKcal = calories - protein * ATWATER.protein - fat * ATWATER.fat;
  }

  return {
    protein,
    carbs: Math.max(0, Math.round(carbKcal / ATWATER.carbs)),
    fat,
    fiber: fiberTarget(calories),
  };
}

/** 14 g of fibre per 1000 kcal, the usual dietary-guideline anchor. */
export function fiberTarget(calories: number): number {
  return Math.round((calories / 1000) * 14);
}

export function macroPercentages(m: MacroTargets, calories: number) {
  if (calories <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: Math.round(((m.protein * ATWATER.protein) / calories) * 100),
    carbs: Math.round(((m.carbs * ATWATER.carbs) / calories) * 100),
    fat: Math.round(((m.fat * ATWATER.fat) / calories) * 100),
  };
}
