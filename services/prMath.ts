import type { Workout } from './exercise.types';

export type ExerciseBests = Record<number, { maxWeight: number; maxE1rm: number }>;

/** Epley estimated one-rep max. 0 when either input is missing. */
export function epley1rm(weightKg: number, reps: number): number {
  if (!(weightKg > 0) || !(reps > 0)) return 0;
  return weightKg * (1 + reps / 30);
}

/** A set's weight or reps as typed: comma decimals accepted; blank, junk or ≤ 0 is 0. */
export function parseSetNumber(s: string): number {
  const n = parseFloat((s ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function mergeBest(bests: ExerciseBests, exerciseId: number, weight: string, reps: string): ExerciseBests {
  const w = parseSetNumber(weight);
  const r = parseSetNumber(reps);
  if (!w || !r) return bests;
  const cur = bests[exerciseId] ?? { maxWeight: 0, maxE1rm: 0 };
  const next = { maxWeight: Math.max(cur.maxWeight, w), maxE1rm: Math.max(cur.maxE1rm, epley1rm(w, r)) };
  if (next.maxWeight === cur.maxWeight && next.maxE1rm === cur.maxE1rm) return bests;
  return { ...bests, [exerciseId]: next };
}

/** Best weight and best e1RM per exerciseId across completed sets only. */
export function bestsFromWorkouts(workouts: Workout[]): ExerciseBests {
  let bests: ExerciseBests = {};
  for (const workout of workouts) {
    for (const exercise of workout.exercises ?? []) {
      for (const set of exercise.sets ?? []) {
        if (!set.isComplete) continue;
        bests = mergeBest(bests, exercise.exerciseId, set.weight, set.reps);
      }
    }
  }
  return bests;
}

/**
 * Folds `b` into `a`, keeping the max of each field per exerciseId. Used to
 * merge a fresh `getExerciseBests` fetch with whatever ticks raised the
 * in-memory bests while that fetch was in flight, so neither side loses.
 */
export function mergeBests(a: ExerciseBests, b: ExerciseBests): ExerciseBests {
  let merged = a;
  for (const key of Object.keys(b)) {
    const id = Number(key);
    const other = b[id];
    const cur = merged[id] ?? { maxWeight: 0, maxE1rm: 0 };
    const next = { maxWeight: Math.max(cur.maxWeight, other.maxWeight), maxE1rm: Math.max(cur.maxE1rm, other.maxE1rm) };
    if (next.maxWeight !== cur.maxWeight || next.maxE1rm !== cur.maxE1rm) {
      merged = merged === a ? { ...a } : merged;
      merged[id] = next;
    }
  }
  return merged;
}

/** A PR needs an existing record to beat; the first-ever set of an exercise is not one. */
export function detectPr(bests: ExerciseBests, exerciseId: number, weight: string, reps: string) {
  const cur = bests[exerciseId];
  const w = parseSetNumber(weight);
  const r = parseSetNumber(reps);
  if (!cur || !w || !r) return { weight: false, e1rm: false };
  return { weight: w > cur.maxWeight, e1rm: epley1rm(w, r) > cur.maxE1rm };
}
