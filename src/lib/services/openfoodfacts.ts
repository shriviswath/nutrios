import type { Food, Macros } from "@/lib/types";

/**
 * Barcode lookup against Open Food Facts.
 *
 * This is the only part of the app that touches the network. It sits behind this service
 * boundary so the rest of the code has no idea it exists, and everything still works offline
 * with the local database when the lookup fails.
 */

const ENDPOINT = "https://world.openfoodfacts.org/api/v2/product";
const FIELDS = "product_name,brands,quantity,serving_size,nutriments,code";

export interface LookupResult {
  ok: boolean;
  food?: Food;
  error?: string;
}

export async function lookupBarcode(barcode: string, signal?: AbortSignal): Promise<LookupResult> {
  if (!/^\d{6,14}$/.test(barcode)) return { ok: false, error: "That does not look like a product barcode." };
  try {
    const res = await fetch(`${ENDPOINT}/${barcode}.json?fields=${FIELDS}`, { signal });
    if (!res.ok) return { ok: false, error: `Lookup failed (${res.status}).` };
    const data = await res.json();
    if (data.status !== 1 || !data.product) return { ok: false, error: "This barcode is not in the Open Food Facts database yet." };

    const n = data.product.nutriments ?? {};
    const kcal = n["energy-kcal_100g"] ?? (n.energy_100g ? n.energy_100g / 4.184 : undefined);
    if (kcal === undefined) return { ok: false, error: "The product exists but has no nutrition data. Enter it manually." };

    const per100: Macros = {
      kcal: Math.round(kcal),
      protein: num(n.proteins_100g),
      carbs: num(n.carbohydrates_100g),
      fat: num(n.fat_100g),
      fiber: optional(n.fiber_100g),
      sugar: optional(n.sugars_100g),
      sodium: n.sodium_100g !== undefined ? Math.round(n.sodium_100g * 1000) : undefined,
    };

    const servingG = parseServing(data.product.serving_size);
    const food: Food = {
      id: `off_${barcode}`,
      name: data.product.product_name || `Product ${barcode}`,
      brand: data.product.brands,
      category: "Packaged",
      unit: "g",
      per100,
      portions: servingG
        ? [{ label: `1 serving (${servingG} g)`, amount: servingG }, { label: "100 g", amount: 100 }]
        : [{ label: "100 g", amount: 100 }],
      defaultPortionIndex: 0,
      source: "database",
      barcode,
      createdAt: Date.now(),
      notes: "Imported from Open Food Facts. Values are crowd-sourced — check them against the pack.",
    };
    return { ok: true, food };
  } catch (error) {
    if ((error as Error).name === "AbortError") return { ok: false, error: "Lookup cancelled." };
    return { ok: false, error: "No connection. Add the food manually and it will sync nothing — everything stays on this device anyway." };
  }
}

function num(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : 0;
}

function optional(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10) / 10 : undefined;
}

function parseServing(serving?: string): number | undefined {
  if (!serving) return undefined;
  const match = serving.match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
  return match ? Math.round(Number(match[1])) : undefined;
}
