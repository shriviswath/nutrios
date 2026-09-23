import type { Food, Macros } from "@/lib/types";
import { SWAPS_BY_NAME } from "@/data/swaps";
import { slug } from "@/lib/utils/id";

/**
 * Food quality grade — green / amber / red — from nutrient density rather than calories alone.
 *
 * Everything is normalised per 100 kcal so a big bowl of sambar and a spoon of ghee are judged
 * on what each calorie brings with it, not on how heavy the portion is. The grade is guidance
 * for choosing, never a verdict on a meal: it is shown next to the food, not used to hide it.
 *
 * Pure functions only: no DB, no DOM, so it is testable and cheap to call per search row.
 */

export type Grade = "green" | "amber" | "red";

export interface Quality {
  grade: Grade;
  /** 0–100, higher is better. Exposed for sorting swaps, not shown as a number. */
  score: number;
  /** Short, plain-language reasons, most important first. */
  reasons: string[];
}

const GREEN_AT = 62;
const AMBER_AT = 42;

/** Foods where nutrient density alone gives the wrong answer. Keyed by food id. */
const OVERRIDES: Record<string, { grade: Grade; reason: string }> = {
  almonds: { grade: "amber", reason: "Healthy fats, but calorie dense — keep to a handful" },
  walnuts: { grade: "amber", reason: "Healthy fats, but calorie dense — keep to a handful" },
  cashews: { grade: "amber", reason: "Calorie dense — keep to a handful" },
  "roasted-groundnuts": { grade: "amber", reason: "Good protein, but calorie dense — keep to a handful" },
  "peanut-butter": { grade: "amber", reason: "Good protein, but calorie dense — measure the spoon" },
  "dark-chocolate-70": { grade: "amber", reason: "Less sugar than milk chocolate, still calorie dense" },
  "whey-protein-powder": { grade: "green", reason: "Concentrated protein" },
  "whey-shake-in-water": { grade: "green", reason: "Concentrated protein" },
  water: { grade: "green", reason: "No calories" },
  "egg-whole-boiled": { grade: "green", reason: "Complete protein, no added oil" },
  "chia-seeds": { grade: "green", reason: "Very high fibre and omega-3 — a teaspoon or two is the right amount" },
  "flax-seeds-alsi": { grade: "green", reason: "Very high fibre and omega-3 — a teaspoon or two is the right amount" },
  "pumpkin-seeds": { grade: "amber", reason: "Good protein and minerals, but calorie dense — measure the spoon" },
  "sunflower-seeds": { grade: "amber", reason: "Healthy fats and vitamin E, but calorie dense — measure the spoon" },
  "sesame-seeds-ellu-til": { grade: "amber", reason: "Calcium-rich, but calorie dense — measure the spoon" },
  "hemp-seeds-hulled": { grade: "amber", reason: "High protein, but calorie dense — measure the spoon" },
  "watermelon-seeds-magaz": { grade: "amber", reason: "Good protein, but calorie dense — measure the spoon" },
  "sabja-basil-seeds": { grade: "green", reason: "Swells in water and fills you up — a teaspoon is plenty" },
  "curd-dahi": { grade: "green", reason: "Probiotic, with protein and calcium" },
  "tea-with-milk-and-sugar": { grade: "amber", reason: "Fine in itself — the sugar is the part worth cutting" },
  "coffee-with-milk-and-sugar": { grade: "amber", reason: "Fine in itself — the sugar is the part worth cutting" },
  "filter-coffee-decoction-with-milk": { grade: "amber", reason: "Fine in itself — the sugar is the part worth cutting" },
};

/** Plain dairy, fresh juice and coconut water: the sugar is lactose or fruit sugar, not added. */
const NATURAL_SUGAR = new Set([
  "milk-full-fat",
  "milk-toned",
  "milk-skimmed",
  "buttermilk-neer-mor",
  "curd-dahi",
  "greek-yoghurt-plain",
  "tender-coconut-water",
  "tea-with-milk-no-sugar",
  "fresh-orange-juice",
  "mosambi-juice",
  "watermelon-juice",
]);

/** Categories where zero fibre is normal, so it isn't held against the food. */
const NO_FIBRE_EXPECTED = new Set(["Drinks", "Dairy"]);

/** Matched against food ids. Crude, but frying is the single biggest swing in Indian food energy. */
const FRIED = /(^|-)(fry|fried|65|bajji|bonda|pakoda|vada|vadai|puff|chips|samosa|kachori|poori|puri|bhatura|murukku|cutlet|appalam|boondi|thattai|seedai|sev|omapodi|mixture|fries|jalebi)(-|$)/;
const STEAMED = /(^|-)(idli|idiyappam|puttu|kozhukattai|dhokla|momos)(-|$)/;

export function rateMacros(per100: Macros, opts: { category?: string; id?: string } = {}): Quality {
  const override = opts.id ? OVERRIDES[opts.id] : undefined;
  if (override) {
    return { grade: override.grade, score: override.grade === "green" ? 80 : override.grade === "amber" ? 50 : 25, reasons: [override.reason] };
  }

  const kcal = per100.kcal;
  if (kcal < 5) return { grade: "green", score: 90, reasons: ["Virtually no calories"] };

  const reasons: { text: string; weight: number }[] = [];
  let score = 60;
  const add = (delta: number, text?: string) => {
    score += delta;
    if (text) reasons.push({ text, weight: Math.abs(delta) });
  };

  const id = opts.id ?? "";
  const naturalSugar = opts.category === "Fruit" || NATURAL_SUGAR.has(id);
  const sugarShare = per100.sugar !== undefined ? (per100.sugar * 4) / kcal : 0;
  const carbShare = (per100.carbs * 4) / kcal;

  // Energy density (per 100 g/ml). Dry staples (flour, dal, oats) are weighed raw and would all
  // look "dense", so they are judged on composition only.
  if (opts.category !== "Staples") {
    if (kcal > 450) add(-25, "Very calorie dense");
    else if (kcal > 350) add(-15, "Calorie dense");
    else if (kcal > 280) add(-5);
    // Low density only counts in your favour when it isn't just dilute sugar.
    else if (sugarShare <= 0.3 || naturalSugar) {
      if (kcal < 60) add(12, "Light on calories");
      else if (kcal < 100) add(8, "Light on calories");
    }
  }

  // Protein per 100 kcal.
  const protein = (per100.protein / kcal) * 100;
  if (protein >= 10) add(20, "High protein");
  else if (protein >= 6) add(12, "Good protein");
  else if (protein >= 3.5) add(5);
  else if (protein < 1.5) add(-5, "Very little protein");

  // Fibre per 100 kcal (unknown fibre is neutral, not zero). Refined, starchy foods with almost
  // no fibre are what spike and crash, so they lose points.
  if (per100.fiber !== undefined) {
    const fiber = (per100.fiber / kcal) * 100;
    if (fiber >= 3) add(15, "High fibre");
    else if (fiber >= 1.5) add(8, "Good fibre");
    else if (fiber >= 1) add(3);
    else if (fiber < 0.8 && carbShare > 0.4 && !NO_FIBRE_EXPECTED.has(opts.category ?? "")) add(-5, "Low fibre");
  }

  // Share of energy from fat.
  const fatShare = (per100.fat * 9) / kcal;
  if (fatShare > 0.5) add(-12, "Mostly fat");
  else if (fatShare > 0.4) add(-8, "High in fat");
  else if (fatShare > 0.3) add(-3);

  // Sugar, when known. Whole fruit, fresh juice and plain dairy carry natural sugar, which is
  // penalised far less than added sugar.
  if (per100.sugar !== undefined) {
    if (sugarShare > 0.5) add(naturalSugar ? -8 : -25, naturalSugar ? undefined : "High in added sugar");
    else if (sugarShare > 0.3) add(naturalSugar ? -4 : -15, naturalSugar ? undefined : "High in sugar");
    else if (sugarShare > 0.15) add(naturalSugar ? 0 : -6);
  }

  if (per100.sodium !== undefined && (per100.sodium / kcal) * 100 > 400) add(-10, "High in salt");

  if (FRIED.test(id)) add(-8, "Deep fried or oil-heavy");
  if (STEAMED.test(id)) add(4, "Steamed");
  if (opts.category === "Sweets") add(-10, "Sweet");
  if (opts.category === "Fast food") add(-6);

  score = Math.max(0, Math.min(100, Math.round(score)));
  const grade: Grade = score >= GREEN_AT ? "green" : score >= AMBER_AT ? "amber" : "red";

  // Lead with the reasons that actually drove the grade in that direction.
  const sorted = reasons.sort((a, b) => b.weight - a.weight).map((r) => r.text);
  return { grade, score, reasons: sorted.slice(0, 3) };
}

export function rateFood(food: Pick<Food, "per100" | "category" | "id">): Quality {
  return rateMacros(food.per100, { category: food.category, id: food.id });
}

/** Rates a logged entry from its stored macros, so history keeps its grade even if the food is edited. */
export function rateLogged(macros: Macros, quantity: number, food?: Pick<Food, "category" | "id">): Quality {
  if (quantity <= 0) return rateMacros({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const f = 100 / quantity;
  const per100: Macros = {
    kcal: macros.kcal * f,
    protein: macros.protein * f,
    carbs: macros.carbs * f,
    fat: macros.fat * f,
    fiber: macros.fiber === undefined ? undefined : macros.fiber * f,
    sugar: macros.sugar === undefined ? undefined : macros.sugar * f,
    sodium: macros.sodium === undefined ? undefined : macros.sodium * f,
  };
  return rateMacros(per100, { category: food?.category, id: food?.id });
}

export const GRADE_LABEL: Record<Grade, string> = {
  green: "Eat freely",
  amber: "In moderation",
  red: "Occasionally",
};

export const GRADE_COLOR: Record<Grade, string> = {
  green: "var(--color-ok)",
  amber: "var(--color-energy)",
  red: "var(--color-warn)",
};

/* ------------------------------------------------------------------ swaps */

export interface Swap {
  food: Food;
  quality: Quality;
  /** kcal of the swap's default portion minus the original's default portion. */
  kcalDelta: number;
}

function defaultPortionKcal(food: Food): number {
  const portion = food.portions[food.defaultPortionIndex ?? 0];
  return (food.per100.kcal * (portion?.amount ?? 100)) / 100;
}

/**
 * Healthier alternatives: curated swaps first (a dietitian's "have phulka instead of parotta"),
 * then the best-graded foods from the same category as a fallback. Green foods get no swaps.
 */
export function healthierSwaps(food: Food, all: Food[], limit = 3): Swap[] {
  const q = rateFood(food);
  if (q.grade === "green") return [];

  const byId = new Map(all.map((f) => [f.id, f]));
  const curated = (SWAPS_BY_NAME[food.name] ?? []).map((name) => byId.get(slug(name))).filter((f): f is Food => Boolean(f));

  const baseKcal = defaultPortionKcal(food);
  const rank = { green: 2, amber: 1, red: 0 } as const;

  const fallback = all
    .filter((f) => f.id !== food.id && f.category === food.category && f.unit === food.unit)
    .map((f) => ({ f, q: rateFood(f) }))
    .filter(({ f, q: fq }) => rank[fq.grade] > rank[q.grade] && defaultPortionKcal(f) <= baseKcal * 1.1)
    .sort((a, b) => b.q.score - a.q.score)
    .map(({ f }) => f);

  const seen = new Set<string>();
  const out: Swap[] = [];
  for (const f of [...curated, ...fallback]) {
    if (seen.has(f.id) || f.id === food.id) continue;
    seen.add(f.id);
    const fq = rateFood(f);
    if (rank[fq.grade] < rank[q.grade]) continue; // never suggest something worse
    out.push({ food: f, quality: fq, kcalDelta: Math.round(defaultPortionKcal(f) - baseKcal) });
    if (out.length >= limit) break;
  }
  return out;
}

/** Share of the day's calories by grade, for the "food quality" bar on the dashboard. */
export function gradeBreakdown(entries: { kcal: number; grade: Grade }[]): Record<Grade, number> {
  const total = entries.reduce((a, e) => a + e.kcal, 0);
  const out: Record<Grade, number> = { green: 0, amber: 0, red: 0 };
  if (total <= 0) return out;
  for (const e of entries) out[e.grade] += e.kcal;
  return { green: out.green / total, amber: out.amber / total, red: out.red / total };
}
