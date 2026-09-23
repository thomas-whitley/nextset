import { withoutPending, pendingKey } from '../pendingRemoval';
import { summariseWorkout, countLoggedSets } from '../finishSummary';
import type { WorkoutExercise } from '../exercise.types';

const exs: WorkoutExercise[] = [
  { id: 'e1', exerciseId: 1, name: 'Bench', order: 0, sets: [
    { id: 's1', weight: '60', reps: '6', isComplete: true },
    { id: 's2', weight: '100', reps: '6', isComplete: true },
  ] },
  { id: 'e2', exerciseId: 2, name: 'Row', order: 1, sets: [{ id: 's3', weight: '50', reps: '8', isComplete: true }] },
];
const volume = (xs: WorkoutExercise[]) =>
  xs.reduce((t, e) => t + e.sets.filter((st) => st.isComplete).reduce((u, st) => u + (parseFloat(st.weight) || 0) * (parseFloat(st.reps) || 0), 0), 0);

test('nothing pending: same list', () => {
  expect(withoutPending(exs, null)).toBe(exs);
});

test('a pending set is gone from volume, set count and recap', () => {
  const p = { kind: 'set' as const, exerciseId: 'e1', set: exs[0].sets[1], setNumber: 2 };
  const visible = withoutPending(exs, p);
  expect(volume(visible)).toBe(60 * 6 + 50 * 8);
  expect(countLoggedSets(visible)).toBe(2);
  const { lines } = summariseWorkout({ id: 'w', name: 'W', description: '', order: 0, exercises: visible });
  expect(lines.find((l) => l.id === 'e1')!.setsDone).toBe(1);
  expect(pendingKey(p)).toBe('s2');
});

test('a pending exercise is gone entirely', () => {
  const p = { kind: 'exercise' as const, exercise: exs[1] };
  expect(withoutPending(exs, p).map((e) => e.id)).toEqual(['e1']);
  expect(pendingKey(p)).toBe('e2');
});
