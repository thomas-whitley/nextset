// Pure edits to a program day or a whole program (spec §6.1). Shared by the
// day editor and the running workout, so both produce the same shapes. Every
// function returns a new object, or null for "nothing changed" so callers can
// skip a write.
import type { ExerciseSet, Program, RepsTarget, Workout, WorkoutExercise } from './exercise.types';

export const MAX_SETS = 20;
export const MAX_PROGRAM_NAME = 40;
export const BLANK_PREFIX = 'blank-';
export const MAX_BLANK_DAYS = 7;
export const DEFAULT_BLANK_DAYS = 3;

// Ids only need to be unique within one program. Time alone is not enough:
// two taps can land in the same millisecond.
let seq = 0;
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

const blankSet = (id: string): ExerciseSet => ({ id, weight: '', reps: '', isComplete: false });

const renumber = (exercises: WorkoutExercise[]) => exercises.map((e, i) => (e.order === i ? e : { ...e, order: i }));

const mapExercise = (workout: Workout, exerciseId: string, fn: (e: WorkoutExercise) => WorkoutExercise): Workout => ({
  ...workout,
  exercises: workout.exercises.map((e) => (e.id === exerciseId ? fn(e) : e)),
});

/** Same ids, each exactly once. */
const isPermutation = (ids: string[], of: { id: string }[]) =>
  ids.length === of.length && new Set(ids).size === ids.length && of.every((x) => ids.includes(x.id));

export function addExercise(workout: Workout, ex: { exerciseId: number; name: string }, sets = 3): Workout {
  const id = newId('exercise');
  const exercise: WorkoutExercise = {
    id,
    exerciseId: ex.exerciseId,
    name: ex.name,
    order: workout.exercises.length,
    sets: Array.from({ length: sets }, () => blankSet(newId(`${id}-s`))),
  };
  return { ...workout, exercises: [...workout.exercises, exercise] };
}

export function removeExercise(workout: Workout, exerciseId: string): Workout | null {
  if (!workout.exercises.some((e) => e.id === exerciseId)) return null;
  return { ...workout, exercises: renumber(workout.exercises.filter((e) => e.id !== exerciseId)) };
}

/** Grows with blank sets or shrinks from the end, clamped to 1..MAX_SETS. */
export function setSetCount(workout: Workout, exerciseId: string, count: number): Workout | null {
  const ex = workout.exercises.find((e) => e.id === exerciseId);
  if (!ex) return null;
  const target = Math.max(1, Math.min(MAX_SETS, Math.round(count)));
  if (target === ex.sets.length) return null;
  const sets =
    target < ex.sets.length
      ? ex.sets.slice(0, target)
      : [...ex.sets, ...Array.from({ length: target - ex.sets.length }, () => blankSet(newId(`${ex.id}-s`)))];
  return mapExercise(workout, exerciseId, (e) => ({ ...e, sets }));
}

export function setRepsTarget(workout: Workout, exerciseId: string, target: RepsTarget | undefined): Workout | null {
  const ex = workout.exercises.find((e) => e.id === exerciseId);
  if (!ex) return null;
  if (ex.repsTarget?.min === target?.min && ex.repsTarget?.max === target?.max) return null;
  return mapExercise(workout, exerciseId, (e) => {
    const next: WorkoutExercise = { ...e };
    if (target) next.repsTarget = target;
    else delete next.repsTarget; // absent, not undefined: "no target" (spec D8)
    return next;
  });
}

export function reorderExercises(workout: Workout, orderedIds: string[]): Workout | null {
  if (!isPermutation(orderedIds, workout.exercises)) return null;
  const byId = new Map(workout.exercises.map((e) => [e.id, e]));
  return { ...workout, exercises: orderedIds.map((id, i) => ({ ...byId.get(id)!, order: i })) };
}

export function updateDay(program: Program, workoutId: string, edit: (day: Workout) => Workout | null): Program | null {
  const day = program.workouts.find((w) => w.id === workoutId);
  if (!day) return null;
  const next = edit(day);
  if (!next) return null;
  return { ...program, workouts: program.workouts.map((w) => (w.id === workoutId ? next : w)) };
}

export function reorderDays(program: Program, orderedIds: string[]): Program | null {
  if (!isPermutation(orderedIds, program.workouts)) return null;
  const byId = new Map(program.workouts.map((w) => [w.id, w]));
  return { ...program, workouts: orderedIds.map((id, i) => ({ ...byId.get(id)!, order: i })) };
}

/** The template's days, sets and targets, under this copy's own id (spec §6.1, Q3 R3). */
export function resetToTemplate(copy: Program, template: Program): Program {
  // A deep copy: the bundled templates are module constants and must never be shared by reference.
  const workouts = JSON.parse(JSON.stringify(template.workouts)) as Workout[];
  return { ...template, workouts, id: copy.id, templateId: template.id, isTemplate: false };
}

/**
 * A template for one new blank program: its own `blank-` id (grill R1-Q3) and
 * `days` empty days named "Day 1" … "Day N", clamped to 1..7 (grill Q4(c), Q13).
 * Day names are fixed: the editor does not rename, add or remove days.
 */
export function makeBlankTemplate(days: number, now = Date.now(), rand: () => number = Math.random): Program {
  const id = `${BLANK_PREFIX}${now.toString(36)}${Math.floor(rand() * 36 ** 6).toString(36)}`;
  const count = Math.max(1, Math.min(MAX_BLANK_DAYS, Math.round(days)));
  return {
    id,
    name: 'Blank program',
    creator: 'You',
    description: '',
    isTemplate: true, // createActiveProgram turns it into a copy
    workouts: Array.from({ length: count }, (_, i) => ({
      id: `${id}-d${i + 1}`,
      name: `Day ${i + 1}`,
      description: '',
      order: i,
      exercises: [],
    })),
  };
}

export const isBlankTemplateId = (id: string) => id.startsWith(BLANK_PREFIX);
export const isBlankProgram = (p: Program) => isBlankTemplateId(p.templateId ?? p.id);

/** Trimmed, inner whitespace collapsed, at most 40 characters; null when nothing is left. */
export function cleanProgramName(raw: string): string | null {
  const name = raw.replace(/\s+/g, ' ').trim().slice(0, MAX_PROGRAM_NAME).trim();
  return name ? name : null;
}
