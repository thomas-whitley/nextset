// An exercise or set the user has swiped away but that is still inside its
// undo window. Everything that counts sets or volume must look through
// withoutPending, or the finish sheet and the saved workout disagree
// (CLAUDE.md: "Volume is computed from completed sets only … must never diverge").
import type { WorkoutExercise, ExerciseSet } from './exercise.types';

export type PendingRemoval =
  | { kind: 'exercise'; exercise: WorkoutExercise }
  | { kind: 'set'; exerciseId: string; set: ExerciseSet; setNumber: number };

export const pendingKey = (p: PendingRemoval): string => (p.kind === 'exercise' ? p.exercise.id : p.set.id);

export function withoutPending(exercises: WorkoutExercise[], p: PendingRemoval | null): WorkoutExercise[] {
  if (!p) return exercises;
  if (p.kind === 'exercise') return exercises.filter((e) => e.id !== p.exercise.id);
  return exercises.map((e) => (e.id === p.exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== p.set.id) } : e));
}
