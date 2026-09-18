import { summariseWorkout } from '../finishSummary';
import type { Workout } from '../exercise.types';

const workout: Workout = {
  id: 'w', name: 'Push', description: '', order: 0,
  exercises: [{ id: 'e', exerciseId: 1, name: 'Bench', order: 0, sets: [
    { id: 'a', weight: '60', reps: '8', isComplete: true },
    { id: 'b', weight: '60', reps: '7', isComplete: true },
    { id: 'c', weight: '60', reps: '', isComplete: false },
  ] }],
};

it('one line per exercise with completed sets, reps listed', () => {
  const { lines } = summariseWorkout(workout, {});
  expect(lines).toEqual([{ name: 'Bench', setsDone: 2, detail: '60 kg × 8, 7' }]);
});
it('lists PRs against pre-session bests, best set only per kind', () => {
  const { prs } = summariseWorkout(workout, { 1: { maxWeight: 55, maxE1rm: 60 } });
  expect(prs).toEqual([{ name: 'Bench', weight: '60', reps: '8', kind: 'both' }]);
});
it('no PR when nothing beats the record', () => {
  expect(summariseWorkout(workout, { 1: { maxWeight: 100, maxE1rm: 150 } }).prs).toEqual([]);
});
