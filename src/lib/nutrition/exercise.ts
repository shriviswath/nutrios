/**
 * Exercise energy is estimated from MET values (Compendium of Physical Activities).
 * kcal/min = MET × 3.5 × kg / 200
 *
 * These are population averages and routinely overestimate by 20–30% for an individual,
 * which is why the app never adds exercise calories back into the food target automatically.
 * The adaptive TDEE engine picks up real activity from the weight trend instead.
 */

export interface ActivityDef {
  id: string;
  name: string;
  met: number;
  group: "cardio" | "strength" | "sport" | "daily";
}

export const ACTIVITIES: ActivityDef[] = [
  { id: "walk_slow", name: "Walking, easy (4 km/h)", met: 3.0, group: "daily" },
  { id: "walk_brisk", name: "Walking, brisk (6 km/h)", met: 4.3, group: "daily" },
  { id: "run_8", name: "Running (8 km/h)", met: 8.3, group: "cardio" },
  { id: "run_10", name: "Running (10 km/h)", met: 9.8, group: "cardio" },
  { id: "run_12", name: "Running (12 km/h)", met: 11.8, group: "cardio" },
  { id: "cycle_light", name: "Cycling, leisure (16 km/h)", met: 5.8, group: "cardio" },
  { id: "cycle_hard", name: "Cycling, vigorous (25 km/h)", met: 10.0, group: "cardio" },
  { id: "gym_moderate", name: "Weight training, moderate", met: 3.5, group: "strength" },
  { id: "gym_hard", name: "Weight training, vigorous", met: 6.0, group: "strength" },
  { id: "calisthenics", name: "Calisthenics / bodyweight", met: 4.0, group: "strength" },
  { id: "hiit", name: "HIIT / circuit training", met: 8.0, group: "cardio" },
  { id: "skipping", name: "Skipping rope", met: 11.0, group: "cardio" },
  { id: "swim", name: "Swimming, moderate", met: 5.8, group: "cardio" },
  { id: "cricket", name: "Cricket", met: 4.8, group: "sport" },
  { id: "football", name: "Football", met: 7.0, group: "sport" },
  { id: "badminton", name: "Badminton", met: 5.5, group: "sport" },
  { id: "basketball", name: "Basketball", met: 6.5, group: "sport" },
  { id: "yoga", name: "Yoga", met: 3.0, group: "daily" },
  { id: "stairs", name: "Stair climbing", met: 8.0, group: "daily" },
  { id: "housework", name: "Housework / chores", met: 3.3, group: "daily" },
];

export function estimateExerciseKcal(met: number, minutes: number, weightKg: number): number {
  return Math.round((met * 3.5 * weightKg * minutes) / 200);
}

/**
 * Only the energy above resting counts as "extra" — sitting still for an hour also burns calories,
 * and those are already inside the TDEE estimate.
 */
export function netExerciseKcal(met: number, minutes: number, weightKg: number): number {
  return Math.max(0, Math.round(((met - 1) * 3.5 * weightKg * minutes) / 200));
}
