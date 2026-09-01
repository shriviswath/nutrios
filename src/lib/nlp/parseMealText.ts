import { rankFoods } from "@/lib/search";
import type { Food } from "@/lib/types";

/**
 * Turns "2 dosa, 3 eggs and one cup of tea" into structured entries.
 *
 * This runs entirely offline against the local food table — no model, no network. It is a
 * rule-based parser, so it is predictable and fast, and it is honest about what it could not
 * resolve. Every parsed line is shown for confirmation before anything is written to the diary.
 */

export interface ParsedItem {
  raw: string;
  quantity: number;
  portionLabel?: string;
  food?: Food;
  amountBase?: number; // grams or ml
  confidence: "high" | "medium" | "low";
  issue?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, half: 0.5, quarter: 0.25, couple: 2, dozen: 12,
};

const NOISE = new Set([
  "i", "had", "ate", "drank", "have", "with", "of", "some", "the", "and", "plus",
  "for", "breakfast", "lunch", "dinner", "snack", "today", "morning", "evening", "night",
]);

const UNIT_ALIASES: Record<string, string> = {
  g: "g", gram: "g", grams: "g", gm: "g", gms: "g", kg: "kg",
  ml: "ml", millilitre: "ml", millilitres: "ml", l: "l", litre: "l",
  cup: "cup", cups: "cup", glass: "glass", glasses: "glass", tumbler: "tumbler",
  bowl: "bowl", bowls: "bowl", plate: "plate", plates: "plate",
  piece: "piece", pieces: "piece", pcs: "piece", slice: "slice", slices: "slice",
  tbsp: "tbsp", tablespoon: "tbsp", tsp: "tsp", teaspoon: "tsp", scoop: "scoop",
  handful: "handful", spoon: "tbsp",
};

export function splitPhrases(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\band\b/g, ",")
    .replace(/\bwith\b/g, ",")
    .replace(/[+;\n]/g, ",")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseMealText(text: string, foods: Food[]): ParsedItem[] {
  return splitPhrases(text).map((phrase) => parsePhrase(phrase, foods));
}

function parsePhrase(phrase: string, foods: Food[]): ParsedItem {
  const tokens = phrase.split(/\s+/).filter(Boolean);
  let quantity = 1;
  let unit: string | undefined;
  let explicitAmount: number | undefined;
  const nameTokens: string[] = [];

  for (const token of tokens) {
    const clean = token.replace(/[^a-z0-9./]/g, "");
    if (!clean) continue;

    const inlineMatch = clean.match(/^(\d+(?:\.\d+)?)(g|gm|gms|kg|ml|l)$/);
    if (inlineMatch) {
      explicitAmount = toBase(Number(inlineMatch[1]), inlineMatch[2]);
      continue;
    }
    if (/^\d+(\.\d+)?$/.test(clean)) {
      quantity = Number(clean);
      continue;
    }
    if (/^\d+\/\d+$/.test(clean)) {
      const [a, b] = clean.split("/").map(Number);
      quantity = a / b;
      continue;
    }
    if (clean in NUMBER_WORDS && nameTokens.length === 0) {
      quantity = NUMBER_WORDS[clean];
      continue;
    }
    if (clean in UNIT_ALIASES) {
      unit = UNIT_ALIASES[clean];
      continue;
    }
    if (NOISE.has(clean)) continue;
    nameTokens.push(clean);
  }

  const name = nameTokens.join(" ").replace(/s$/, "");
  const raw = phrase;

  if (!name) {
    return { raw, quantity, confidence: "low", issue: "No food name found in this phrase." };
  }

  const matches = rankFoods(foods, name, new Map(), 3);
  if (!matches.length) {
    return { raw, quantity, confidence: "low", issue: `No match for “${name}” in your food list. Add it as a custom food.` };
  }

  const food = matches[0].food;
  const exact = food.name.toLowerCase() === name || food.name.toLowerCase().startsWith(name);

  // Resolve the amount: explicit weight wins, then a named portion, then the default portion.
  if (explicitAmount !== undefined) {
    return { raw, quantity: explicitAmount, amountBase: explicitAmount, food, portionLabel: food.unit, confidence: exact ? "high" : "medium" };
  }

  if (unit === "g" || unit === "ml" || unit === "kg" || unit === "l") {
    const amount = toBase(quantity, unit);
    return { raw, quantity: amount, amountBase: amount, food, portionLabel: food.unit, confidence: exact ? "high" : "medium" };
  }

  const portion = pickPortion(food, unit);
  const amount = portion.amount * quantity;
  return {
    raw,
    quantity,
    portionLabel: portion.label,
    amountBase: amount,
    food,
    confidence: exact && (unit === undefined || portion.label.includes(unit)) ? "high" : "medium",
    issue: exact ? undefined : `Matched to “${food.name}” — check this is right.`,
  };
}

function pickPortion(food: Food, unit?: string) {
  if (unit) {
    const hit = food.portions.find((p) => p.label.toLowerCase().includes(unit));
    if (hit) return hit;
  }
  return food.portions[food.defaultPortionIndex ?? 0] ?? { label: "100 g", amount: 100 };
}

function toBase(value: number, unit: string): number {
  if (unit === "kg" || unit === "l") return value * 1000;
  return value;
}
