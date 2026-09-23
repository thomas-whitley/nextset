import type { Workout } from './exercise.types';
import { epley1rm, parseSetNumber } from './prMath';

// Per-exercise progress (spec 2026-09-23). Pure: callers fetch the history
// rows and pass them in. Completed sets only, like prMath.

export type ChartMetric = 'e1rm' | 'heaviest';
/** What the chart actually plots: bodyweight exercises plot reps. */
export type SeriesMetric = ChartMetric | 'reps';
export type ExerciseMode = 'weighted' | 'bodyweight';

/** The three fields of a `workout_history` row these helpers read. */
export interface HistorySource {
  id: string;
  completed_at: string;
  workout_data: Workout | null;
}

export interface LoggedSet {
  weight: number;
  reps: number;
}

/** One saved workout's worth of one exercise. */
export interface ExerciseSession {
  historyId: string;
  completedAt: string;
  /** Best Epley estimate across the session's sets; 0 when no set had weight. */
  e1rm: number;
  /** Heaviest weight lifted for at least one rep; 0 when no set had weight. */
  heaviest: number;
  mostReps: number;
  /** The set behind `e1rm` (earlier set on a tie); null when no set had weight. */
  topSet: LoggedSet | null;
  /** The set with the most reps (earlier set on a tie). */
  repsSet: LoggedSet;
}

export interface RecordValue {
  value: number;
  date: string;
}

export interface ExerciseRecord {
  heaviest: RecordValue | null;
  e1rm: RecordValue | null;
  mostReps: RecordValue | null;
}

const newestFirst = (a: HistorySource, b: HistorySource) => Date.parse(b.completed_at) - Date.parse(a.completed_at);

/** Every session of `exerciseId`, newest first. Workouts where it has no completed set with reps are skipped. */
export function exerciseSessions(entries: HistorySource[], exerciseId: number): ExerciseSession[] {
  const sessions: ExerciseSession[] = [];
  for (const entry of [...entries].sort(newestFirst)) {
    const sets: LoggedSet[] = [];
    // The same exercise can be in a workout twice; both entries pool into one session.
    for (const exercise of entry.workout_data?.exercises ?? []) {
      if (exercise.exerciseId !== exerciseId) continue;
      for (const set of exercise.sets ?? []) {
        if (!set.isComplete) continue;
        const reps = parseSetNumber(set.reps);
        if (!reps) continue;
        sets.push({ weight: parseSetNumber(set.weight), reps });
      }
    }
    if (sets.length === 0) continue;

    let e1rm = 0;
    let heaviest = 0;
    let topSet: LoggedSet | null = null;
    let repsSet = sets[0];
    for (const set of sets) {
      const estimate = epley1rm(set.weight, set.reps);
      if (estimate > e1rm) {
        e1rm = estimate;
        topSet = set;
      }
      if (set.weight > heaviest) heaviest = set.weight;
      if (set.reps > repsSet.reps) repsSet = set;
    }
    sessions.push({ historyId: entry.id, completedAt: entry.completed_at, e1rm, heaviest, mostReps: repsSet.reps, topSet, repsSet });
  }
  return sessions;
}

/** Bodyweight until any completed set has weight; then the whole exercise is weighted. */
export function exerciseMode(sessions: ExerciseSession[]): ExerciseMode {
  return sessions.some((s) => s.heaviest > 0) ? 'weighted' : 'bodyweight';
}

/** The set a session row shows. A weighted exercise's unweighted day shows its reps. */
export function bestSet(session: ExerciseSession, mode: ExerciseMode): LoggedSet {
  return mode === 'weighted' ? session.topSet ?? session.repsSet : session.repsSet;
}

/** All-time bests over `sessions` (newest first, as `exerciseSessions` returns). Each dated when first reached. */
export function exerciseRecord(sessions: ExerciseSession[]): ExerciseRecord {
  let heaviest: RecordValue | null = null;
  let e1rm: RecordValue | null = null;
  let mostReps: RecordValue | null = null;
  // Oldest first, strictly greater: a tie keeps the date it was first reached.
  for (let i = sessions.length - 1; i >= 0; i--) {
    const s = sessions[i];
    if (s.heaviest > 0 && (!heaviest || s.heaviest > heaviest.value)) heaviest = { value: s.heaviest, date: s.completedAt };
    if (s.e1rm > 0 && (!e1rm || s.e1rm > e1rm.value)) e1rm = { value: s.e1rm, date: s.completedAt };
    if (!mostReps || s.mostReps > mostReps.value) mostReps = { value: s.mostReps, date: s.completedAt };
  }
  return { heaviest, e1rm, mostReps };
}
