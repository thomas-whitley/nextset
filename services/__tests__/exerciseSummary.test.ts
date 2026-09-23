import { planLine, foldedSummary, allSetsDone } from '../exerciseSummary';
import type { WorkoutExercise } from '../exercise.types';

const s = (id: string, weight: string, reps: string, isComplete: boolean) => ({ id, weight, reps, isComplete });
const bench: WorkoutExercise = {
  id: 'e', exerciseId: 1, name: 'Bench', order: 0, repsTarget: { min: 6, max: 6 },
  sets: [s('a', '60', '6', true), s('b', '62.5', '6', true), s('c', '', '', false), s('d', '', '', false)],
};

test('plan line', () => {
  expect(planLine(bench)).toBe('4 sets × 6 reps');
  expect(planLine({ ...bench, repsTarget: { min: 8, max: 12 } })).toBe('4 sets × 8–12 reps');
  expect(planLine({ ...bench, repsTarget: undefined, sets: [bench.sets[0]] })).toBe('1 set');
  expect(planLine({ ...bench, repsTarget: { min: 30, max: 30 } }, true)).toBe('4 sets × 30 secs');
});

test('folded summary names the heaviest completed set', () => {
  expect(foldedSummary(bench)).toBe('2 of 4 done, top set 62.5 × 6');
  expect(foldedSummary({ ...bench, sets: bench.sets.map((x) => ({ ...x, isComplete: false })) })).toBe('0 of 4 done');
});

test('top set ties go to more reps; weightless ticks are not a top set', () => {
  const ex = { ...bench, sets: [s('a', '60', '5', true), s('b', '60', '8', true), s('c', '', '10', true)] };
  expect(foldedSummary(ex)).toBe('3 of 3 done, top set 60 × 8');
});

test('all done', () => {
  expect(allSetsDone(bench)).toBe(false);
  expect(allSetsDone({ ...bench, sets: bench.sets.map((x) => ({ ...x, isComplete: true })) })).toBe(true);
  expect(allSetsDone({ ...bench, sets: [] })).toBe(false);
});
