import type { Workout } from './exercise.types';
import { epley1rm } from './prMath';

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
    const done = ex.sets.filter((s) => s.isComplete && parseFloat(s.weight) > 0 && parseInt(s.reps, 10) > 0);
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
