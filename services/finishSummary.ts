import type { Workout } from './exercise.types';
import { detectPr, epley1rm, type ExerciseBests } from './prMath';

export function summariseWorkout(workout: Workout, startBests: ExerciseBests) {
  const lines: { name: string; setsDone: number; detail: string }[] = [];
  const prs: { name: string; weight: string; reps: string; kind: 'weight' | 'e1rm' | 'both' }[] = [];
  for (const ex of workout.exercises) {
    const done = ex.sets.filter((s) => s.isComplete && parseFloat(s.weight) > 0 && parseInt(s.reps, 10) > 0);
    if (done.length === 0) continue;
    const weights = new Set(done.map((s) => s.weight));
    const detail = weights.size === 1
      ? `${done[0].weight} kg × ${done.map((s) => s.reps).join(', ')}`
      : done.map((s) => `${s.weight}×${s.reps}`).join(', ');
    lines.push({ name: ex.name, setsDone: done.length, detail });

    let best: (typeof prs)[number] | null = null;
    let bestScore = -1;
    for (const s of done) {
      const pr = detectPr(startBests, ex.exerciseId, s.weight, s.reps);
      if (!pr.weight && !pr.e1rm) continue;
      const score = epley1rm(parseFloat(s.weight), parseInt(s.reps, 10));
      if (score > bestScore) { bestScore = score; best = { name: ex.name, weight: s.weight, reps: s.reps, kind: pr.weight && pr.e1rm ? 'both' : pr.weight ? 'weight' : 'e1rm' }; }
    }
    if (best) prs.push(best);
  }
  return { lines, prs };
}
