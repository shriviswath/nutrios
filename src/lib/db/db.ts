import Dexie, { type Table } from "dexie";
import { SEED_FOODS } from "@/data/foods";
import type {
  ExerciseLog,
  Food,
  FoodLog,
  Profile,
  Recipe,
  SavedMeal,
  Settings,
  TdeeSnapshot,
  WeightLog,
} from "@/lib/types";

/** Tracks how often and how recently a food is used, which drives search ranking. */
export interface FoodUsage {
  foodId: string;
  count: number;
  lastUsed: number;
}

export class NutriDB extends Dexie {
  foods!: Table<Food, string>;
  logs!: Table<FoodLog, number>;
  weights!: Table<WeightLog, number>;
  exercises!: Table<ExerciseLog, number>;
  recipes!: Table<Recipe, string>;
  savedMeals!: Table<SavedMeal, string>;
  profile!: Table<Profile, string>;
  settings!: Table<Settings, string>;
  snapshots!: Table<TdeeSnapshot, number>;
  usage!: Table<FoodUsage, string>;

  constructor() {
    super("nutri-os");
    this.version(1).stores({
      foods: "id, name, category, favorite, barcode, source",
      logs: "++id, date, [date+meal], foodId",
      weights: "++id, &date",
      exercises: "++id, date",
      recipes: "id, name",
      savedMeals: "id, name",
      profile: "id",
      settings: "id",
      snapshots: "++id, date",
      usage: "foodId, count, lastUsed",
    });
  }
}

export const db = new NutriDB();

/**
 * Seeds the food table once. Existing rows are left alone so user edits are never
 * overwritten; new seed foods added in a later release are inserted on next launch.
 *
 * This MUST NOT be called from inside a live query. Dexie runs queriers in a read-only
 * transaction zone and throws `ReadOnlyError` on any write, which surfaces as a blank
 * "client-side exception" page. Seeding happens once at start-up via `seedOnce()` instead.
 */
export async function ensureSeeded(): Promise<void> {
  const existing = await db.foods.count();
  if (existing === 0) {
    await db.foods.bulkPut(SEED_FOODS);
    return;
  }
  const ids = new Set(await db.foods.toCollection().primaryKeys());
  const missing = SEED_FOODS.filter((f) => !ids.has(f.id));
  if (missing.length) await db.foods.bulkPut(missing);
}

let seeding: Promise<void> | null = null;

/** Idempotent, safe to call from every mount — the work happens exactly once per page load. */
export function seedOnce(): Promise<void> {
  if (!seeding) seeding = ensureSeeded();
  return seeding;
}
