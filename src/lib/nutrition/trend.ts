import { addDays, dateKey, daysBetween } from "@/lib/utils/date";

export interface WeightPoint {
  date: string;
  weightKg: number;
}

export interface TrendPoint {
  date: string;
  /** Raw scale reading for that day, if one exists. */
  weight?: number;
  /** Smoothed estimate of true body mass. */
  trend: number;
}

const HALF_LIFE_DAYS = 7;

/**
 * Time-aware exponentially weighted trend.
 *
 * A single weigh-in says very little: day-to-day scale noise from water, glycogen and gut
 * content is routinely ±1 kg, which is larger than a week of real fat loss. The smoothing
 * factor is derived from the gap between weigh-ins, so skipping days does not distort the
 * result the way a fixed-alpha EMA would.
 *
 * alpha = 1 - 2^(-dt / halfLife)
 */
export function buildTrend(points: WeightPoint[], halfLife = HALF_LIFE_DAYS): TrendPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));

  const byDate = new Map<string, number>();
  for (const p of sorted) byDate.set(p.date, p.weightKg); // last write wins per day

  const out: TrendPoint[] = [];
  let trend = sorted[0].weightKg;
  let cursor = sorted[0].date;
  const end = sorted[sorted.length - 1].date;

  let previous = cursor;
  while (cursor <= end) {
    const reading = byDate.get(cursor);
    if (reading !== undefined) {
      const dt = Math.max(1, daysBetween(previous, cursor));
      const alpha = 1 - Math.pow(2, -dt / halfLife);
      trend = trend + alpha * (reading - trend);
      previous = cursor;
    }
    out.push({ date: cursor, weight: reading, trend: Number(trend.toFixed(2)) });
    cursor = dateKey(addDays(cursor, 1));
  }
  return out;
}

export function trendOn(series: TrendPoint[], date: string): number | undefined {
  let match: TrendPoint | undefined;
  for (const p of series) {
    if (p.date <= date) match = p;
    else break;
  }
  return match?.trend;
}

export interface Regression {
  slopePerDay: number;
  intercept: number;
  n: number;
  /** Standard deviation of the residuals, i.e. how noisy the scale readings are. */
  residualSd: number;
}

/**
 * Least squares over the *raw* weigh-ins in the window, not the smoothed line.
 *
 * Regressing the EWMA looks tidier but is biased: the smoother is seeded at the first reading
 * and then lags a real trend by roughly one and a half half-lives, so a genuine 0.5 kg/week
 * loss reads as about 0.35 kg/week for the first month. Raw readings give an unbiased slope,
 * and the smoothing stays where it belongs — on the chart and on the "trend weight" readout.
 */
export function regressWeights(series: TrendPoint[], windowDays = 28): Regression | undefined {
  const slice = series.slice(-windowDays);
  const points = slice
    .map((p, i) => ({ x: i, y: p.weight }))
    .filter((p): p is { x: number; y: number } => p.y !== undefined);
  if (points.length < 4) return undefined;

  const n = points.length;
  const meanX = points.reduce((a, p) => a + p.x, 0) / n;
  const meanY = points.reduce((a, p) => a + p.y, 0) / n;
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - meanX) * (p.y - meanY);
    den += (p.x - meanX) ** 2;
  }
  const slopePerDay = den === 0 ? 0 : num / den;
  const intercept = meanY - slopePerDay * meanX;
  const residualSd = Math.sqrt(
    points.reduce((a, p) => a + (p.y - (intercept + slopePerDay * p.x)) ** 2, 0) / Math.max(1, n - 2),
  );
  return { slopePerDay, intercept, n, residualSd };
}

/** Rate of change in kg per week, or undefined when there are too few weigh-ins to say. */
export function trendSlopeKgPerWeek(series: TrendPoint[], windowDays = 28): number | undefined {
  const fit = regressWeights(series, windowDays);
  if (!fit) return undefined;
  return Number((fit.slopePerDay * 7).toFixed(3));
}

/** Total weight change across the window, read off the fitted line rather than the endpoints. */
export function fittedChangeKg(series: TrendPoint[], windowDays = 28): number | undefined {
  const slice = series.slice(-windowDays);
  const fit = regressWeights(series, windowDays);
  if (!fit) return undefined;
  return fit.slopePerDay * Math.max(1, slice.length - 1);
}

/** Weeks until the target weight at the current observed rate. */
export function weeksToTarget(currentTrend: number, targetKg: number, slopeKgPerWeek?: number): number | undefined {
  if (!slopeKgPerWeek) return undefined;
  const remaining = targetKg - currentTrend;
  if (Math.abs(remaining) < 0.05) return 0;
  if (Math.sign(remaining) !== Math.sign(slopeKgPerWeek)) return undefined; // moving the wrong way
  return Number((remaining / slopeKgPerWeek).toFixed(1));
}
