import type { Unit } from "@/lib/types";

export interface AmountPreset {
  label: string;
  amount: number;
}

/**
 * One-tap amounts for weighing or pouring. Volumes follow what Indian kitchens actually use:
 * a tumbler (~150 ml), a glass (250 ml), a bottle (500 ml / 1 L).
 */
const ML: number[] = [50, 100, 150, 200, 250, 300, 500, 750, 1000];
const G: number[] = [25, 50, 75, 100, 150, 200, 250, 300, 500];

export function amountPresets(unit: Unit): AmountPreset[] {
  const values = unit === "ml" ? ML : G;
  return values.map((amount) => ({ amount, label: formatAmount(amount, unit) }));
}

/** 1000 ml reads as "1 L", 1500 g as "1.5 kg"; everything else keeps its base unit. */
export function formatAmount(amount: number, unit: Unit): string {
  if (amount >= 1000) {
    const big = Number((amount / 1000).toFixed(2));
    return `${big} ${unit === "ml" ? "L" : "kg"}`;
  }
  return `${Number(amount.toFixed(1))} ${unit}`;
}

/** Portion multipliers for the count stepper. Half an idli is a real thing people log. */
export const COUNT_STEPS = [0.5, 1, 1.5, 2, 3, 4];
