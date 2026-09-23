import { pickNextWorkout, quickWorkoutName, exerciseListLine } from '../upNext';
import type { Program } from '../exercise.types';

const prog: Program = {
  id: 'p', name: 'PPL', creator: '', description: '',
  workouts: [
    { id: 'pull', name: 'Pull', description: '', order: 1, exercises: [] },
    { id: 'push', name: 'Push', description: '', order: 0, exercises: [] },
    { id: 'legs', name: 'Legs', description: '', order: 2, exercises: [] },
  ],
};
const done = (id: string, isQuick?: boolean) => ({ workout_data: { id, isQuick } });

test('the first day by order when nothing is logged', () => {
  expect(pickNextWorkout(prog, [])!.id).toBe('push');
});

test('the day after the most recent one, wrapping round', () => {
  expect(pickNextWorkout(prog, [done('pull'), done('push')])!.id).toBe('legs');
  expect(pickNextWorkout(prog, [done('legs')])!.id).toBe('push');
});

test('quick workouts are skipped even when their id matches a day (grill R2-Q5)', () => {
  expect(pickNextWorkout(prog, [done('pull', true), done('push')])!.id).toBe('pull');
});

test('rows from other programs, and rows with no data, are ignored', () => {
  expect(pickNextWorkout(prog, [{ workout_data: null }, done('ul-upper-a'), done('push')])!.id).toBe('pull');
});

test('no program, or a program with no days, has no next workout', () => {
  expect(pickNextWorkout(null, [])).toBeNull();
  expect(pickNextWorkout({ ...prog, workouts: [] }, [])).toBeNull();
});

test('quickWorkoutName uses a short day and month', () => {
  expect(quickWorkoutName(new Date(2026, 2, 19))).toBe('Quick workout 19 Mar');
});

test('exerciseListLine names three, then counts the rest', () => {
  expect(exerciseListLine([])).toBe('No exercises yet. Add some when you start.');
  expect(exerciseListLine(['A', 'B'])).toBe('A, B');
  expect(exerciseListLine(['A', 'B', 'C'])).toBe('A, B, C');
  expect(exerciseListLine(['A', 'B', 'C', 'D', 'E'])).toBe('A, B, C and 2 more');
});
