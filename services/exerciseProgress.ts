import type { Workout } from './exercise.types';
import { epley1rm, parseSetNumber } from './prMath';
import { ExerciseService } from './exerciseService';
import { formatKg } from '../utils/format';

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

/** chart-kit crowds its x labels past about a dozen points. */
export const CHART_SESSIONS = 12;

export const metricName: Record<SeriesMetric, string> = {
  e1rm: 'Est. 1RM',
  heaviest: 'Heaviest weight',
  reps: 'Most reps',
};

/** e1RM is an estimate, so it is plotted in whole kg; logged weights stay as typed. */
export function seriesValue(session: ExerciseSession, metric: SeriesMetric): number {
  if (metric === 'e1rm') return Math.round(session.e1rm);
  if (metric === 'heaviest') return session.heaviest;
  return session.mostReps;
}

/**
 * The newest `CHART_SESSIONS` points, oldest first. A session with no value for
 * this metric (an unweighted day of a weighted lift) is skipped, not drawn as 0.
 */
export function chartSeries(sessions: ExerciseSession[], metric: SeriesMetric): { labels: string[]; values: number[] } {
  const points = sessions.filter((s) => seriesValue(s, metric) > 0).slice(0, CHART_SESSIONS).reverse();
  return {
    labels: points.map((s) => {
      const d = new Date(s.completedAt);
      return `${d.getDate()}/${d.getMonth() + 1}`;
    }),
    values: points.map((s) => seriesValue(s, metric)),
  };
}

const oneDecimal = (n: number) => String(Math.round(n * 10) / 10);

/** The chart is an SVG a screen reader cannot see; this sentence stands in for it. */
export function chartSummaryLabel(metric: SeriesMetric, values: number[]): string {
  const unit = metric === 'reps' ? 'reps' : 'kg';
  const first = values[0] ?? 0;
  const last = values[values.length - 1] ?? 0;
  return `${metricName[metric]}, ${values.length} sessions, ${oneDecimal(first)} to ${oneDecimal(last)} ${unit}`;
}

export type NameFor = (exerciseId: number) => string | undefined;

/** The bundled library's name for an id. */
export const libraryName: NameFor = (id) => ExerciseService.getById(id)?.name;

/** Library name; else the name saved in the most recent workout that has it. */
export function exerciseName(entries: HistorySource[], exerciseId: number, nameFor: NameFor): string {
  const fromLibrary = nameFor(exerciseId);
  if (fromLibrary) return fromLibrary;
  for (const entry of [...entries].sort(newestFirst)) {
    const saved = entry.workout_data?.exercises?.find((e) => e.exerciseId === exerciseId)?.name;
    if (saved) return saved;
  }
  return 'Exercise';
}

export interface ExerciseListItem {
  exerciseId: number;
  name: string;
  lastDoneAt: string;
  mode: ExerciseMode;
  record: ExerciseRecord;
}

/** Every exercise with at least one completed set, most recently done first. */
export function exerciseList(entries: HistorySource[], nameFor: NameFor): ExerciseListItem[] {
  const ids = new Set<number>();
  for (const entry of entries) {
    for (const exercise of entry.workout_data?.exercises ?? []) {
      if (typeof exercise.exerciseId === 'number' && Number.isFinite(exercise.exerciseId)) ids.add(exercise.exerciseId);
    }
  }
  const items: ExerciseListItem[] = [];
  for (const exerciseId of ids) {
    const sessions = exerciseSessions(entries, exerciseId);
    if (sessions.length === 0) continue;
    items.push({
      exerciseId,
      name: exerciseName(entries, exerciseId, nameFor),
      lastDoneAt: sessions[0].completedAt,
      mode: exerciseMode(sessions),
      record: exerciseRecord(sessions),
    });
  }
  return items.sort((a, b) => Date.parse(b.lastDoneAt) - Date.parse(a.lastDoneAt) || a.name.localeCompare(b.name));
}

/** The one-figure record a list row shows. */
export function recordText(item: Pick<ExerciseListItem, 'mode' | 'record'>): string {
  if (item.mode === 'weighted') return formatKg(item.record.heaviest?.value);
  return item.record.mostReps ? `${item.record.mostReps.value} reps` : '—';
}
