import { historyRow, loggedExercises, historyWindow, lastWorkoutTitle, forHistory } from '../historySummary';

const saved = {
  id: 'h1',
  completed_at: '2026-09-22T18:00:00Z',
  total_volume: 5215,
  workout_data: {
    name: 'Push',
    exercises: [
      { id: 'a', exerciseId: 1, name: 'Bench', order: 0, sets: [
        { id: 'a1', weight: '60', reps: '8', isComplete: true },
        { id: 'a2', weight: '60', reps: '', isComplete: true },      // ticked with no reps: not logged
        { id: 'a3', weight: '62.5', reps: '6', isComplete: false },  // typed, never ticked
        { id: 'a4', weight: '62.5', reps: '6', isComplete: true, pr: 'weight' as const },
      ] },
      { id: 'b', exerciseId: 25, name: 'Lateral Raise', order: 1, sets: [{ id: 'b1', weight: '', reps: '', isComplete: false }] },
    ],
  },
};

test('historyRow counts logged sets only and keeps the saved volume', () => {
  expect(historyRow(saved)).toEqual({ id: 'h1', title: 'Push', completedAt: '2026-09-22T18:00:00Z', sets: 2, volume: 5215 });
});

test('historyRow survives a row with no workout data, or an exercise with no sets', () => {
  expect(historyRow({ id: 'h2', completed_at: 'x', total_volume: 0, workout_data: null })).toMatchObject({ title: 'Workout', sets: 0 });
  const broken = { ...saved, workout_data: { name: 'Odd', exercises: [{ id: 'z', exerciseId: 1, name: 'Z', order: 0 } as any] } };
  expect(historyRow(broken).sets).toBe(0);
});

test('loggedExercises keeps logged sets, numbered in order, and drops empty exercises', () => {
  expect(loggedExercises(saved.workout_data)).toEqual([
    { id: 'a', name: 'Bench', sets: [
      { id: 'a1', n: 1, weight: '60', reps: '8', pr: undefined },
      { id: 'a4', n: 2, weight: '62.5', reps: '6', pr: 'weight' },
    ] },
  ]);
  expect(loggedExercises(null)).toEqual([]);
});

describe('historyWindow (review M12)', () => {
  test('a refresh reloads everything already shown, never less than a page', () => {
    expect(historyWindow(0, true, 20)).toEqual({ offset: 0, limit: 20 });
    expect(historyWindow(60, true, 20)).toEqual({ offset: 0, limit: 60 });
  });
  test('"more" continues after what is loaded', () => {
    expect(historyWindow(40, false, 20)).toEqual({ offset: 40, limit: 20 });
  });
});

describe('lastWorkoutTitle (device run T2-13)', () => {
  test('a quick workout is not dated twice', () => {
    expect(lastWorkoutTitle({ name: 'Quick workout 23 Sept', isQuick: true })).toBe('Quick workout');
  });
  test('a program day keeps its name; nothing saved falls back', () => {
    expect(lastWorkoutTitle({ name: 'Push' })).toBe('Push');
    expect(lastWorkoutTitle(null)).toBe('Last workout');
  });
});

describe('forHistory (final review I2)', () => {
  test('a saved workout carries no session-only copies', () => {
    const day = { id: 'w1', name: 'Push', description: '', order: 0, exercises: [] };
    const saved = forHistory({ ...day, startedAt: 5, collapsedExerciseIds: ['e1'], discardRestore: day });
    expect('discardRestore' in saved).toBe(false);
    expect('collapsedExerciseIds' in saved).toBe(false);
    expect(saved.startedAt).toBe(5);
    expect(saved.name).toBe('Push');
  });
});
