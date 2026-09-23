import type { Program, RepsTarget, WorkoutExercise } from './exercise.types';

const RANGE = /^\s*(\d{1,3})\s*(?:[-–]\s*(\d{1,3}))?\s*$/;

export function parseRepsTarget(raw: string): RepsTarget | undefined {
  const m = RANGE.exec(raw ?? '');
  if (!m) return undefined;
  const min = Number(m[1]);
  const max = m[2] === undefined ? min : Number(m[2]);
  if (min < 1 || max < min || max > 100) return undefined;
  return { min, max };
}

export function formatRepsTarget(t?: RepsTarget): string {
  if (!t) return '';
  return t.min === t.max ? String(t.min) : `${t.min}–${t.max}`;
}

/**
 * Copies repsTarget from the source template onto a user's program copy for
 * every exercise that lacks one, matched by workout id then exerciseId.
 * Returns the same object when nothing needed filling so callers can skip a sync.
 */
export function backfillRepsTargets(program: Program, templates: Program[]): Program {
  const template = templates.find((t) => t.id === (program.templateId ?? program.id));
  if (!template) return program;
  let changed = false;
  const workouts = program.workouts.map((w) => {
    const tw = template.workouts.find((x) => x.id === w.id);
    if (!tw) return w;
    const exercises = w.exercises.map<WorkoutExercise>((e) => {
      if (e.repsTarget) return e;
      const te = tw.exercises.find((x) => x.exerciseId === e.exerciseId);
      if (!te?.repsTarget) return e;
      changed = true;
      return { ...e, repsTarget: te.repsTarget };
    });
    return { ...w, exercises };
  });
  return changed ? { ...program, workouts } : program;
}

/**
 * What the editor's reps field does on blur (grill R2-Q1): empty clears the
 * target, a valid range is saved and shown normalised ("8-12" → "8–12"), and
 * anything else reverts to what was there rather than clearing it.
 */
export function commitRepsDraft(draft: string, current: RepsTarget | undefined): { target: RepsTarget | undefined; text: string } {
  if (draft.trim() === '') return { target: undefined, text: '' };
  const parsed = parseRepsTarget(draft);
  if (!parsed) return { target: current, text: formatRepsTarget(current) };
  return { target: parsed, text: formatRepsTarget(parsed) };
}
