import {
  bestSet,
  chartSeries,
  chartSummaryLabel,
  CHART_SESSIONS,
  exerciseList,
  exerciseName,
  recordText,
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

const weeks = (n: number, weight: (i: number) => string, reps = '5') =>
  Array.from({ length: n }, (_, i) =>
    entry(`h${i}`, `2026-${String(1 + Math.floor(i / 4)).padStart(2, '0')}-${String(1 + (i % 4) * 7).padStart(2, '0')}`, [
      { exerciseId: 1, sets: [[weight(i), reps]] },
    ]),
  );

describe('chartSeries', () => {
  it('keeps the newest 12 sessions, oldest first, with d/m labels', () => {
    const sessions = exerciseSessions(weeks(15, (i) => String(60 + i)), 1);
    const { labels, values } = chartSeries(sessions, 'heaviest');
    expect(values).toHaveLength(CHART_SESSIONS);
    expect(values[0]).toBe(63);
    expect(values[11]).toBe(74);
    expect(labels[11]).toBe('15/4'); // i = 14 → 15 April
  });

  it('rounds e1RM to whole kg', () => {
    const sessions = exerciseSessions(weeks(2, () => '80'), 1); // 80x5 = 93.33
    expect(chartSeries(sessions, 'e1rm').values).toEqual([93, 93]);
  });

  it('skips a weighted lift’s unweighted session rather than plotting 0', () => {
    const sessions = exerciseSessions(
      [
        entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['20', '6']] }]),
        entry('b', '2026-09-08', [{ exerciseId: 1, sets: [['', '12']] }]),
        entry('c', '2026-09-15', [{ exerciseId: 1, sets: [['25', '5']] }]),
      ],
      1,
    );
    expect(chartSeries(sessions, 'heaviest').values).toEqual([20, 25]);
    expect(chartSeries(sessions, 'reps').values).toEqual([6, 12, 5]);
  });
});

describe('chartSummaryLabel', () => {
  it('reads first to last with the unit', () => {
    expect(chartSummaryLabel('e1rm', [80, 88, 93])).toBe('Est. 1RM, 3 sessions, 80 to 93 kg');
    expect(chartSummaryLabel('heaviest', [82.5, 85])).toBe('Heaviest weight, 2 sessions, 82.5 to 85 kg');
    expect(chartSummaryLabel('reps', [8, 12])).toBe('Most reps, 2 sessions, 8 to 12 reps');
  });
});

describe('exerciseName', () => {
  const history = [
    entry('a', '2026-09-01', [{ exerciseId: 9, name: 'Old Bench', sets: [['60', '5']] }]),
    entry('b', '2026-09-08', [{ exerciseId: 9, name: 'Newer Bench', sets: [['60', '5']] }]),
  ];
  it('prefers the library name', () => expect(exerciseName(history, 9, () => 'Bench Press')).toBe('Bench Press'));
  it('falls back to the name saved in the most recent workout', () =>
    expect(exerciseName(history, 9, () => undefined)).toBe('Newer Bench'));
  it('has a last resort', () => expect(exerciseName([], 9, () => undefined)).toBe('Exercise'));
});

describe('exerciseList', () => {
  it('lists every exercise with a completed set, most recently done first', () => {
    const list = exerciseList(
      [
        entry('a', '2026-09-01', [{ exerciseId: 1, name: 'Bench', sets: [['80', '5']] }, { exerciseId: 2, name: 'Row', sets: [['60', '8']] }]),
        entry('b', '2026-09-08', [{ exerciseId: 2, name: 'Row', sets: [['65', '8']] }, { exerciseId: 3, name: 'Curl', sets: [['20', '10', false]] }]),
        entry('c', '2026-09-10', [{ exerciseId: 4, name: 'Pull-up', sets: [['', '9']] }]),
      ],
      () => undefined,
    );
    expect(list.map((i) => i.name)).toEqual(['Pull-up', 'Row', 'Bench']); // Curl never completed
    expect(list[1]).toMatchObject({ exerciseId: 2, lastDoneAt: '2026-09-08T12:00:00.000Z', mode: 'weighted' });
    expect(list[1].record.heaviest?.value).toBe(65);
    expect(list[0].mode).toBe('bodyweight');
  });

  it('skips entries without a numeric exerciseId', () => {
    const bad = entry('a', '2026-09-01', [{ exerciseId: 1, sets: [['80', '5']] }]);
    (bad.workout_data!.exercises[0] as any).exerciseId = undefined;
    expect(exerciseList([bad], () => undefined)).toEqual([]);
  });
});

describe('recordText', () => {
  it('heaviest weight for weighted, most reps for bodyweight', () => {
    expect(recordText({ mode: 'weighted', record: { heaviest: { value: 82.5, date: '' }, e1rm: null, mostReps: null } })).toBe('82.5 kg');
    expect(recordText({ mode: 'bodyweight', record: { heaviest: null, e1rm: null, mostReps: { value: 12, date: '' } } })).toBe('12 reps');
  });
});
