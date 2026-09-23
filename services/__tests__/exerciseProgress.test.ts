import {
  bestSet,
  exerciseMode,
  exerciseRecord,
  exerciseSessions,
  type HistorySource,
} from '../exerciseProgress';
import { epley1rm } from '../prMath';

type SetSpec = [weight: string, reps: string, done?: boolean];

/** One saved workout with one exercise entry per `blocks` item. */
const entry = (
  id: string,
  day: string, // '2026-09-01'
  blocks: { exerciseId: number; name?: string; sets: SetSpec[] }[],
): HistorySource => ({
  id,
  completed_at: `${day}T12:00:00.000Z`,
  workout_data: {
    id: `w-${id}`, name: 'Push', description: '', order: 0,
    exercises: blocks.map((b, i) => ({
      id: `e${i}`, exerciseId: b.exerciseId, name: b.name ?? 'Bench', order: i,
      sets: b.sets.map(([weight, reps, done = true], j) => ({ id: `s${j}`, weight, reps, isComplete: done })),
    })),
  },
});

describe('exerciseSessions', () => {
  it('returns one session per workout, newest first, completed sets only', () => {
    const sessions = exerciseSessions(
      [
        entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['80', '5'], ['100', '5', false]] }]),
        entry('b', '2026-09-08', [{ exerciseId: 1, sets: [['85', '4']] }]),
      ],
      1,
    );
    expect(sessions.map((s) => s.historyId)).toEqual(['b', 'a']);
    expect(sessions[1].heaviest).toBe(80); // the 100 was never ticked
    expect(sessions[1].e1rm).toBeCloseTo(epley1rm(80, 5), 5);
  });

  it('ignores other exercises and workouts without this one', () => {
    const sessions = exerciseSessions(
      [
        entry('a', '2026-09-01', [{ exerciseId: 2, sets: [['60', '8']] }]),
        entry('b', '2026-09-02', [{ exerciseId: 1, sets: [['50', '8']] }, { exerciseId: 2, sets: [['200', '1']] }]),
      ],
      1,
    );
    expect(sessions).toHaveLength(1);
    expect(sessions[0].heaviest).toBe(50);
  });

  it('drops a session whose sets were never completed or have no reps', () => {
    const sessions = exerciseSessions(
      [
        entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['80', '5', false]] }]),
        entry('b', '2026-09-02', [{ exerciseId: 1, sets: [['80', '']] }]),
      ],
      1,
    );
    expect(sessions).toEqual([]);
  });

  it('pools the same exercise listed twice in one workout, and parses comma decimals', () => {
    const [s] = exerciseSessions(
      [entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['80', '5']] }, { exerciseId: 1, sets: [['82,5', '3']] }])],
      1,
    );
    expect(s.heaviest).toBe(82.5);
    expect(s.mostReps).toBe(5);
  });

  it('picks the top set by e1RM (earlier set on a tie) and the reps set by most reps', () => {
    const [s] = exerciseSessions([entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['60', '10'], ['80', '5'], ['80', '5']] }])], 1);
    // 60x10 = 80.0, 80x5 = 93.3
    expect(s.topSet).toEqual({ weight: 80, reps: 5 });
    expect(s.repsSet).toEqual({ weight: 60, reps: 10 });
  });

  it('survives malformed history rows', () => {
    const broken: HistorySource[] = [
      { id: 'x', completed_at: '2026-09-01T12:00:00.000Z', workout_data: null },
      { id: 'y', completed_at: '2026-09-02T12:00:00.000Z', workout_data: { id: 'w', name: 'W', description: '', order: 0, exercises: [{ id: 'e', exerciseId: 1, name: 'Bench', order: 0 } as any] } },
      entry('z', '2026-09-03', [{ exerciseId: 1, sets: [['70', '5']] }]),
    ];
    expect(exerciseSessions(broken, 1).map((s) => s.historyId)).toEqual(['z']);
  });
});

describe('exerciseMode', () => {
  it('is bodyweight when no completed set ever had weight', () => {
    const sessions = exerciseSessions([entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['', '8'], ['0', '10']] }])], 1);
    expect(exerciseMode(sessions)).toBe('bodyweight');
  });
  it('one weighted set anywhere makes the whole exercise weighted', () => {
    const sessions = exerciseSessions(
      [
        entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['', '8']] }]),
        entry('b', '2026-09-08', [{ exerciseId: 1, sets: [['10', '5']] }]),
      ],
      1,
    );
    expect(exerciseMode(sessions)).toBe('weighted');
  });
  it('is bodyweight for no sessions', () => expect(exerciseMode([])).toBe('bodyweight'));
});

describe('bestSet', () => {
  it('weighted: the top set; a bodyweight-only session falls back to its reps set', () => {
    const [bw, heavy] = exerciseSessions(
      [
        entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['20', '6']] }]),
        entry('b', '2026-09-08', [{ exerciseId: 1, sets: [['', '12']] }]),
      ],
      1,
    );
    expect(bestSet(heavy, 'weighted')).toEqual({ weight: 20, reps: 6 });
    expect(bestSet(bw, 'weighted')).toEqual({ weight: 0, reps: 12 });
  });
  it('bodyweight: the set with most reps', () => {
    const [s] = exerciseSessions([entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['', '8'], ['', '11']] }])], 1);
    expect(bestSet(s, 'bodyweight')).toEqual({ weight: 0, reps: 11 });
  });
});

describe('exerciseRecord', () => {
  it('takes each best over all sessions, dated when first reached', () => {
    const sessions = exerciseSessions(
      [
        entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['100', '1']] }]),
        entry('b', '2026-09-08', [{ exerciseId: 1, sets: [['90', '6']] }]),
        entry('c', '2026-09-15', [{ exerciseId: 1, sets: [['100', '1']] }]),
      ],
      1,
    );
    const r = exerciseRecord(sessions);
    expect(r.heaviest).toEqual({ value: 100, date: '2026-09-01T12:00:00.000Z' });
    expect(r.e1rm?.date).toBe('2026-09-08T12:00:00.000Z');
    expect(r.e1rm?.value).toBeCloseTo(epley1rm(90, 6), 5);
    expect(r.mostReps).toEqual({ value: 6, date: '2026-09-08T12:00:00.000Z' });
  });
  it('bodyweight: no weight records', () => {
    const r = exerciseRecord(exerciseSessions([entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['', '9']] }])], 1));
    expect(r.heaviest).toBeNull();
    expect(r.e1rm).toBeNull();
    expect(r.mostReps?.value).toBe(9);
  });
});
