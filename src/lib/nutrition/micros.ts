import type { Micros, Sex } from "@/lib/types";

/**
 * Reference daily intakes for adults, taken from the ICMR-NIN 2020 RDA for Indians where
 * available and US DRI elsewhere. These are population reference values, not personal
 * requirements — the UI labels them "reference", never "your requirement".
 */
export interface MicroDef {
  key: keyof Micros;
  label: string;
  unit: string;
  group: "vitamin" | "mineral";
  male: number;
  female: number;
}

export const MICRO_DEFS: MicroDef[] = [
  { key: "vitA_ug", label: "Vitamin A", unit: "µg", group: "vitamin", male: 1000, female: 840 },
  { key: "vitB1_mg", label: "Thiamine (B1)", unit: "mg", group: "vitamin", male: 1.4, female: 1.4 },
  { key: "vitB2_mg", label: "Riboflavin (B2)", unit: "mg", group: "vitamin", male: 2.0, female: 1.9 },
  { key: "vitB3_mg", label: "Niacin (B3)", unit: "mg", group: "vitamin", male: 18, female: 14 },
  { key: "vitB6_mg", label: "Vitamin B6", unit: "mg", group: "vitamin", male: 2.4, female: 1.9 },
  { key: "vitB12_ug", label: "Vitamin B12", unit: "µg", group: "vitamin", male: 2.2, female: 2.2 },
  { key: "vitC_mg", label: "Vitamin C", unit: "mg", group: "vitamin", male: 80, female: 65 },
  { key: "vitD_ug", label: "Vitamin D", unit: "µg", group: "vitamin", male: 15, female: 15 },
  { key: "vitE_mg", label: "Vitamin E", unit: "mg", group: "vitamin", male: 10, female: 8 },
  { key: "vitK_ug", label: "Vitamin K", unit: "µg", group: "vitamin", male: 120, female: 90 },
  { key: "calcium_mg", label: "Calcium", unit: "mg", group: "mineral", male: 1000, female: 1000 },
  { key: "iron_mg", label: "Iron", unit: "mg", group: "mineral", male: 19, female: 29 },
  { key: "magnesium_mg", label: "Magnesium", unit: "mg", group: "mineral", male: 440, female: 370 },
  { key: "potassium_mg", label: "Potassium", unit: "mg", group: "mineral", male: 3500, female: 3500 },
  { key: "zinc_mg", label: "Zinc", unit: "mg", group: "mineral", male: 17, female: 13 },
  { key: "phosphorus_mg", label: "Phosphorus", unit: "mg", group: "mineral", male: 1000, female: 1000 },
];

export function microTarget(def: MicroDef, sex: Sex): number {
  return sex === "male" ? def.male : def.female;
}

/**
 * Share of the day's food (by calories) that carries data for a given nutrient.
 * Below ~60% the total is too incomplete to read as a percentage of the reference value.
 */
export function coverageOf(entries: { kcal: number; has: boolean }[]): number {
  const total = entries.reduce((a, e) => a + e.kcal, 0);
  if (total <= 0) return 0;
  const covered = entries.filter((e) => e.has).reduce((a, e) => a + e.kcal, 0);
  return covered / total;
}
