import type { Program, Workout } from './exercise.types';

type Finished = { workout_data?: { id: string; isQuick?: boolean } | null };

/**
 * Home's and Programs' "up next": the day after the most recently finished
 * day of this program, wrapping round; the first day when none has been done.
 * `recent` is newest first. Quick workouts are skipped explicitly (grill
 * R2-Q5), not by the accident of their id never matching a day.
 */
export function pickNextWorkout(program: Program | null, recent: Finished[]): Workout | null {
  if (!program || program.workouts.length === 0) return null;
  const ordered = [...program.workouts].sort((a, b) => a.order - b.order);
  const last = recent.find((r) => r.workout_data && !r.workout_data.isQuick && ordered.some((w) => w.id === r.workout_data!.id));
  if (!last) return ordered[0];
  const idx = ordered.findIndex((w) => w.id === last.workout_data!.id);
  return ordered[(idx + 1) % ordered.length];
}

/** "Quick workout 19 Mar" (spec §6.3). Not editable (grill R2-Q6). */
export function quickWorkoutName(d: Date): string {
  return `Quick workout ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
}

/** The slab's exercise line: up to three names, then "and N more". */
export function exerciseListLine(names: string[]): string {
  if (names.length === 0) return 'No exercises yet. Add some when you start.';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} and ${names.length - 3} more`;
}
