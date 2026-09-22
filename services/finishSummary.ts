import type { ExerciseSet, Workout, WorkoutExercise } from './exercise.types';
import { epley1rm } from './prMath';

/**
 * A set counts as logged once it is ticked complete *and* carries a real
 * weight and reps — a set ticked with nothing typed into it (or the
 * template's placeholder) must not inflate the finish header's "N sets"
 * or the recap. Keep this in step with `saveWorkoutHistory`'s volume rule
 * (CLAUDE.md): that rule is `isComplete` only, because an unlogged set's
 * weight/reps parse to 0 and contribute nothing to volume either way.
 */
export function isLoggedSet(set: ExerciseSet): boolean {
  return set.isComplete && parseFloat(set.weight) > 0 && parseInt(set.reps, 10) > 0;
}

/** The finish header's "N sets" — identical inclusion rule to the recap below. */
export function countLoggedSets(exercises: WorkoutExercise[]): number {
  return exercises.reduce((n, e) => n + e.sets.filter(isLoggedSet).length, 0);
}

/**
 * Builds the finish-sheet recap from a workout whose sets already carry the
 * `pr` flag `WorkoutContext.completeSet` set at tick time (against bests
 * recorded before that tick) — this never re-derives PRs against bests that
 * this same session has since raised.
 */
export function summariseWorkout(workout: Workout) {
  const lines: { id: string; name: string; setsDone: number; detail: string }[] = [];
  const prs: { id: string; name: string; weight: string; reps: string; kind: 'weight' | 'e1rm' | 'both' }[] = [];
  for (const ex of workout.exercises) {
    const done = ex.sets.filter(isLoggedSet);
    if (done.length === 0) continue;
    const weights = new Set(done.map((s) => s.weight));
    const detail = weights.size === 1
      ? `${done[0].weight} kg × ${done.map((s) => s.reps).join(', ')}`
      : done.map((s) => `${s.weight}×${s.reps}`).join(', ');
    lines.push({ id: ex.id, name: ex.name, setsDone: done.length, detail });

    let best: (typeof prs)[number] | null = null;
    let bestScore = -1;
    for (const s of done) {
      if (!s.pr) continue;
      const score = epley1rm(parseFloat(s.weight), parseInt(s.reps, 10));
      if (score > bestScore) { bestScore = score; best = { id: ex.id, name: ex.name, weight: s.weight, reps: s.reps, kind: s.pr }; }
    }
    if (best) prs.push(best);
  }
  return { lines, prs };
}
