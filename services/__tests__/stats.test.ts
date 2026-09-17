import { computeStreaks, toDateKey } from '../stats';

const today = new Date(2026, 8, 17); // 17 Sep 2026, local

test('no workouts is no streak', () => {
  expect(computeStreaks([], today)).toEqual({ currentStreak: 0, longestStreak: 0 });
});

test('today with no workout yet continues from yesterday', () => {
  expect(computeStreaks(['2026-09-16', '2026-09-15'], today)).toEqual({ currentStreak: 2, longestStreak: 2 });
});

test('a workout today counts', () => {
  expect(computeStreaks(['2026-09-17', '2026-09-16'], today)).toEqual({ currentStreak: 2, longestStreak: 2 });
});

test('a gap of two days ends the current streak', () => {
  expect(computeStreaks(['2026-09-14', '2026-09-13'], today).currentStreak).toBe(0);
});

test('longest streak is found in the past', () => {
  const keys = ['2026-09-17', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'];
  expect(computeStreaks(keys, today)).toEqual({ currentStreak: 1, longestStreak: 4 });
});

test('two workouts on one day count once', () => {
  expect(computeStreaks(['2026-09-17', '2026-09-17', '2026-09-16'], today).currentStreak).toBe(2);
});

test('toDateKey is local calendar, zero-padded', () => {
  expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
});
