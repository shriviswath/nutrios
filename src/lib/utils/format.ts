export function kcal(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return Math.round(value).toLocaleString("en-IN");
}

export function grams(value: number | undefined, digits = 0): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function kg(value: number | undefined, digits = 1): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function pct(value: number | undefined): string {
  if (value === undefined || Number.isNaN(value)) return "—";
  return `${Math.round(value)}%`;
}

export function signed(value: number, digits = 0): string {
  const s = value.toFixed(digits);
  return value > 0 ? `+${s}` : s;
}
