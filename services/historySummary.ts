import type { Workout, WorkoutExercise } from './exercise.types';
import { countLoggedSets, isLoggedSet } from './finishSummary';

type Saved = {
  id: string;
  completed_at: string;
  total_volume: number;
  workout_data?: Pick<Workout, 'name' | 'exercises'> | null;
};

/** Old or hand-edited rows can hold an exercise without a sets array; skip it rather than crash the list. */
const withSets = (exercises: WorkoutExercise[] | undefined) => (exercises ?? []).filter((e) => Array.isArray(e?.sets));

/** One Progress → History row: name, date, sets actually logged, and volume as it was saved. */
export function historyRow(entry: Saved) {
  return {
    id: entry.id,
    title: entry.workout_data?.name || 'Workout',
    completedAt: entry.completed_at,
    sets: countLoggedSets(withSets(entry.workout_data?.exercises)),
    volume: entry.total_volume,
  };
}

/**
 * The detail screen body (spec §6.5, read-only): each exercise with at least
 * one logged set, and only those sets, the same rule as the finish sheet.
 */
export function loggedExercises(workout: Pick<Workout, 'exercises'> | null | undefined) {
  return withSets(workout?.exercises)
    .map((ex) => ({
      id: ex.id,
      name: ex.name,
      sets: ex.sets.filter(isLoggedSet).map((s, i) => ({ id: s.id, n: i + 1, weight: s.weight, reps: s.reps, pr: s.pr })),
    }))
    .filter((ex) => ex.sets.length > 0);
}

/**
 * Which slice of history to fetch. A refresh on focus reloads everything
 * already on screen, so coming back does not cut the list to one page (review M12).
 */
export function historyWindow(loaded: number, fromStart: boolean, page: number): { offset: number; limit: number } {
  return fromStart ? { offset: 0, limit: Math.max(page, loaded) } : { offset: loaded, limit: page };
}

/** The last-workout tile's name. A quick workout's name already holds its date, and the tile adds one. */
export function lastWorkoutTitle(data: { name?: string; isQuick?: boolean } | null | undefined): string {
  if (data?.isQuick) return 'Quick workout';
  return data?.name || 'Last workout';
}
