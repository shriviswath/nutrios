/**
 * Domain model for the whole application.
 * Everything below is storage-shaped: these types map 1:1 to IndexedDB tables
 * (see src/lib/db/db.ts). Derived values are never stored.
 */

export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain";
export type Unit = "g" | "ml";
export type MealSlot = "breakfast" | "lunch" | "snacks" | "dinner";

/** Where a number came from. Shown in the UI so estimates are never mistaken for data. */
export type Provenance = "database" | "estimated" | "ai" | "user";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "snacks", "dinner"];

export const ACTIVITY_LEVELS = {
  sedentary: { factor: 1.2, label: "Sedentary", hint: "Desk work, little movement" },
  light: { factor: 1.375, label: "Lightly active", hint: "1–3 light sessions a week" },
  moderate: { factor: 1.55, label: "Moderately active", hint: "3–5 sessions a week" },
  high: { factor: 1.725, label: "Very active", hint: "6–7 hard sessions a week" },
  athlete: { factor: 1.9, label: "Athlete", hint: "Physical job or twice-daily training" },
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

/** Macronutrients per reference amount. `undefined` means "not known", which is not the same as 0. */
export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number; // mg
}

export interface Micros {
  vitA_ug?: number;
  vitB1_mg?: number;
  vitB2_mg?: number;
  vitB3_mg?: number;
  vitB6_mg?: number;
  vitB12_ug?: number;
  vitC_mg?: number;
  vitD_ug?: number;
  vitE_mg?: number;
  vitK_ug?: number;
  calcium_mg?: number;
  iron_mg?: number;
  magnesium_mg?: number;
  potassium_mg?: number;
  zinc_mg?: number;
  phosphorus_mg?: number;
}

/** A named amount of a food, e.g. "1 idli" = 40 g. All portions resolve to base units. */
export interface Portion {
  label: string;
  amount: number; // in the food's base unit (g or ml)
}

/**
 * Every food is normalised to "per 100 base units". Piece-based foods (1 idli, 1 dosa)
 * carry portions that convert to grams, so the scaling engine has a single code path.
 */
export interface Food {
  id: string;
  name: string;
  brand?: string;
  category: string;
  unit: Unit;
  per100: Macros;
  micros?: Micros;
  portions: Portion[];
  defaultPortionIndex?: number;
  source: Provenance;
  /** Set for foods derived from a recipe, so the recipe can update them later. */
  recipeId?: string;
  barcode?: string;
  favorite?: boolean;
  createdAt?: number;
  notes?: string;
}

export interface Profile {
  id: "me";
  name: string;
  birthYear?: number;
  age: number;
  sex: Sex;
  heightCm: number;
  startWeightKg: number;
  targetWeightKg: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  /** Desired change in kg per week. Positive for gain, positive magnitude for loss too. */
  rateKgPerWeek: number;
  units: "metric" | "imperial";
  dietaryPreference?: string;
  /** Macro split strategy. */
  macroMode: "auto" | "percent" | "grams";
  proteinPercent?: number;
  carbPercent?: number;
  fatPercent?: number;
  proteinG?: number;
  carbG?: number;
  fatG?: number;
  /** Manual override of the calorie target; when null the engine decides. */
  calorieOverride?: number | null;
  /** Let the adaptive engine move the calorie target automatically. */
  autoAdapt: boolean;
  createdAt: number;
  onboardedAt?: number;
}

export interface FoodLog {
  id?: number;
  date: string; // YYYY-MM-DD, local
  meal: MealSlot;
  foodId: string;
  /** Snapshot of the food name so history survives food edits/deletes. */
  name: string;
  quantity: number; // in `unit`
  unit: Unit;
  /** Resolved nutrition for this entry, computed at log time from the food record. */
  macros: Macros;
  micros?: Micros;
  source: Provenance;
  createdAt: number;
}

export interface WeightLog {
  id?: number;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
  createdAt: number;
}

export interface ExerciseLog {
  id?: number;
  date: string;
  activity: string;
  minutes: number;
  kcal: number;
  source: Provenance;
  createdAt: number;
}

export interface RecipeIngredient {
  foodId: string;
  name: string;
  quantity: number;
  unit: Unit;
}

export interface Recipe {
  id: string;
  name: string;
  servings: number;
  /** Cooked weight in g. Falls back to raw ingredient sum when not provided. */
  cookedWeightG?: number;
  ingredients: RecipeIngredient[];
  createdAt: number;
}

export interface SavedMealItem {
  foodId: string;
  name: string;
  quantity: number;
  unit: Unit;
}

export interface SavedMeal {
  id: string;
  name: string;
  slot?: MealSlot;
  items: SavedMealItem[];
  createdAt: number;
}

/** A dated snapshot of what the adaptive engine believed, so history is auditable. */
export interface TdeeSnapshot {
  id?: number;
  date: string;
  estimatedTdee: number;
  confidence: number; // 0..1
  windowDays: number;
  loggedDays: number;
  meanIntake: number;
  trendSlopeKgPerWeek: number;
  createdAt: number;
}

export interface Settings {
  id: "settings";
  /** Calorie target currently in force. */
  calorieTarget: number;
  proteinTarget: number;
  carbTarget: number;
  fatTarget: number;
  fiberTarget: number;
  /** Last target the adaptive engine wrote, used to rate-limit changes. */
  lastAdaptedAt?: string;
  showMicros: boolean;
  theme: "system" | "light" | "dark";
  updatedAt: number;
}
