// Text for an exercise card's header (spec R6). Pure and tested.
import type { WorkoutExercise, ExerciseSet } from './exercise.types';
import { formatRepsTarget } from './repsTarget';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "4 sets × 6 reps" · "3 sets × 8–12 reps" · "1 set" · timed: "3 sets × 30 secs". */
export function planLine(ex: WorkoutExercise, timed = false): string {
  const sets = plural(ex.sets.length, 'set', 'sets');
  const target = formatRepsTarget(ex.repsTarget);
  if (!target) return sets;
  return `${sets} × ${target} ${timed ? 'secs' : 'reps'}`;
}

function topSet(sets: ExerciseSet[]): ExerciseSet | undefined {
  return sets
    .filter((s) => s.isComplete && (parseFloat(s.weight) || 0) > 0)
    .sort((a, b) => parseFloat(b.weight) - parseFloat(a.weight) || (parseFloat(b.reps) || 0) - (parseFloat(a.reps) || 0))[0];
}

/** "2 of 4 done, top set 62.5 × 6" · "0 of 3 done". */
export function foldedSummary(ex: WorkoutExercise): string {
  const done = ex.sets.filter((s) => s.isComplete).length;
  const top = topSet(ex.sets);
  const base = `${done} of ${ex.sets.length} done`;
  return top ? `${base}, top set ${top.weight} × ${top.reps}` : base;
}

export function allSetsDone(ex: WorkoutExercise): boolean {
  return ex.sets.length > 0 && ex.sets.every((s) => s.isComplete);
}
