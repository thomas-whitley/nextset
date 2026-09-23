import { similarExercises, nameWords } from '../similarExercises';
import { ExerciseService } from '../exerciseService';
import type { Exercise } from '../exercise.types';

const lib = ExerciseService.getAll();
const byName = (n: string) => lib.find((e) => e.name === n)!;

test('name words drop equipment and filler', () => {
  expect([...nameWords('Incline Dumbbell Press')]).toEqual(['incline', 'press']);
});

test('Incline Dumbbell Press: closest variants first, never itself, same muscle', () => {
  const target = byName('Incline Dumbbell Press');
  const out = similarExercises(target, lib);
  expect(out.map((e) => e.name).slice(0, 5)).toEqual([
    'Hammer Grip Incline DB Bench Press',
    'Barbell Incline Bench Press - Medium Grip',
    'Incline Cable Chest Press',
    'Leverage Incline Chest Press',
    'Smith Machine Incline Bench Press',
  ]);
  expect(out.some((e) => e.id === target.id)).toBe(false);
  expect(out.every((e) => e.primary_muscle_group === 'Chest')).toBe(true);
});

const ex = (id: number, name: string, over: Partial<Exercise> = {}): Exercise => ({
  id, name, primary_muscle_group: 'Neck', equipment: 'Bodyweight', movement_pattern: 'Push',
  exercise_type: 'Strength', executionCues: { setup: [], action: [], keyMentalCues: '' }, ...over,
});

test('no movement pattern: falls back to same muscle only', () => {
  const target = ex(1, 'Neck Thing', { movement_pattern: null });
  const lib2 = [target, ex(2, 'Neck Press'), ex(3, 'Neck Pull', { movement_pattern: 'Pull' }), ex(4, 'Chest', { primary_muscle_group: 'Chest' })];
  expect(similarExercises(target, lib2).map((e) => e.id).sort()).toEqual([2, 3]);
});

test('pattern given but nothing matches it: still returns same-muscle exercises', () => {
  const target = ex(1, 'Neck Thing', { movement_pattern: 'Static' });
  expect(similarExercises(target, [target, ex(2, 'Neck Press')]).map((e) => e.id)).toEqual([2]);
});

test('stretches and cardio are never suggested', () => {
  const target = ex(1, 'Neck Thing');
  expect(similarExercises(target, [target, ex(2, 'Neck Stretch', { exercise_type: 'Stretching' })])).toEqual([]);
});
