import type { Food, Macros, Micros } from "@/lib/types";

/**
 * Single source of truth for portion maths.
 * Foods are stored per 100 base units; every logged entry is scaled from that.
 * Nothing derived is ever persisted as a literal.
 */

const MACRO_KEYS = ["kcal", "protein", "carbs", "fat", "fiber", "sugar", "sodium"] as const;

export function scaleMacros(per100: Macros, quantity: number): Macros {
  const f = quantity / 100;
  const out: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const key of MACRO_KEYS) {
    const value = per100[key];
    if (value === undefined || value === null) continue; // unknown stays unknown
    out[key] = round(value * f, key === "kcal" ? 0 : 1);
  }
  return out;
}

export function scaleMicros(micros: Micros | undefined, quantity: number): Micros | undefined {
  if (!micros) return undefined;
  const f = quantity / 100;
  const out: Micros = {};
  for (const [key, value] of Object.entries(micros)) {
    if (value === undefined || value === null) continue;
    out[key as keyof Micros] = round(value * f, 2);
  }
  return out;
}

export function scaleFood(food: Food, quantity: number) {
  return {
    macros: scaleMacros(food.per100, quantity),
    micros: scaleMicros(food.micros, quantity),
  };
}

export function emptyMacros(): Macros {
  return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
}

export function addMacros(a: Macros, b: Macros): Macros {
  const out: Macros = { ...a };
  for (const key of MACRO_KEYS) {
    const bv = b[key];
    if (bv === undefined) continue;
    out[key] = round((out[key] ?? 0) + bv, key === "kcal" ? 0 : 1);
  }
  return out;
}

export function sumMacros(items: Macros[]): Macros {
  return items.reduce<Macros>((acc, m) => addMacros(acc, m), emptyMacros());
}

export function addMicros(a: Micros, b: Micros | undefined): Micros {
  if (!b) return a;
  const out: Micros = { ...a };
  for (const [key, value] of Object.entries(b)) {
    if (value === undefined) continue;
    const k = key as keyof Micros;
    out[k] = round((out[k] ?? 0) + value, 2);
  }
  return out;
}

export function sumMicros(items: (Micros | undefined)[]): Micros {
  return items.reduce<Micros>((acc, m) => addMicros(acc, m), {});
}

export function round(value: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

/** Energy implied by the macros, used to flag foods whose numbers do not add up. */
export function atwaterKcal(m: Macros): number {
  // Fibre is largely indigestible and is conventionally counted at 2 kcal/g rather than 4,
  // which matters for vegetables and pulses where it is a big share of the carbohydrate.
  const fiber = m.fiber ?? 0;
  const netCarbs = Math.max(0, m.carbs - fiber);
  return m.protein * 4 + netCarbs * 4 + fiber * 2 + m.fat * 9;
}

export function macroConsistencyGap(m: Macros): number {
  if (!m.kcal) return 0;
  return (atwaterKcal(m) - m.kcal) / m.kcal;
}
