import { supabase } from '../../data/supabase-client';
import { WorkoutHistoryService } from '../workoutHistoryService';
import { ExerciseService } from '../exerciseService';

// A thenable query builder: every chained call returns the builder; awaiting it yields `result`.
jest.mock('../../data/supabase-client', () => {
  const result: { data: unknown[] | null; error: unknown } = { data: [], error: null };
  const chain: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'order', 'limit']) chain[m] = jest.fn(() => chain);
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(result).then(resolve, reject);
  return { supabase: { from: jest.fn(() => chain), __chain: chain, __result: result } };
});

const mocked = supabase as unknown as {
  __chain: Record<string, jest.Mock>;
  __result: { data: unknown[] | null; error: unknown };
};

beforeEach(() => {
  mocked.__result.data = [];
  mocked.__result.error = null;
  for (const m of ['select', 'eq', 'gte', 'order', 'limit']) mocked.__chain[m].mockClear();
});

const row = (id: string, day: string, exerciseId: number, name: string, weight: string) => ({
  id, user_id: 'u', created_at: '', completed_at: `${day}T12:00:00.000Z`, total_volume: 0, duration_minutes: 0, health_stats: {},
  workout_data: { id: 'w', name: 'Push', description: '', order: 0, exercises: [
    { id: 'e', exerciseId, name, order: 0, sets: [{ id: 's', weight, reps: '5', isComplete: true }] },
  ] },
});

describe('getExerciseHistory', () => {
  it('reads id, date and workout_data for the newest 500 workouts', async () => {
    mocked.__result.data = [row('h1', '2026-09-01', 1, 'Bench', '80')];
    const rows = await WorkoutHistoryService.getExerciseHistory('u');
    expect(mocked.__chain.select).toHaveBeenCalledWith('id, completed_at, workout_data');
    expect(mocked.__chain.eq).toHaveBeenCalledWith('user_id', 'u');
    expect(mocked.__chain.order).toHaveBeenCalledWith('completed_at', { ascending: false });
    expect(mocked.__chain.limit).toHaveBeenCalledWith(500);
    expect(rows).toEqual([{ id: 'h1', completed_at: '2026-09-01T12:00:00.000Z', workout_data: expect.objectContaining({ name: 'Push' }) }]);
  });

  it('throws when the query fails', async () => {
    mocked.__result.error = { message: 'Failed to fetch' };
    await expect(WorkoutHistoryService.getExerciseHistory('u')).rejects.toBeTruthy();
  });
});

describe('getProgressStats exercise PRs', () => {
  it('groups by exerciseId, not by saved name, and uses the library name', async () => {
    const lib = ExerciseService.getAll()[0];
    mocked.__result.data = [
      row('h1', '2026-09-01', lib.id, 'Old name', '80'),
      row('h2', '2026-09-08', lib.id, 'Renamed', '90'),
      row('h3', '2026-09-09', -7, 'Retired lift', '40'),
    ];
    const stats = await WorkoutHistoryService.getProgressStats('u', 30);
    const libRows = stats.exerciseProgress.filter((p) => p.exerciseId === lib.id);
    expect(libRows).toEqual([{ exerciseId: lib.id, exercise: lib.name, maxWeight: 90, date: '2026-09-08' }]);
    expect(stats.exerciseProgress.find((p) => p.exerciseId === -7)?.exercise).toBe('Retired lift');
  });
});
