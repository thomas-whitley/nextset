import { summariseWorkout, countLoggedSets } from '../finishSummary';
import type { Workout } from '../exercise.types';

const workout: Workout = {
  id: 'w', name: 'Push', description: '', order: 0,
  exercises: [{ id: 'e', exerciseId: 1, name: 'Bench', order: 0, sets: [
    { id: 'a', weight: '60', reps: '8', isComplete: true, pr: 'both' },
    { id: 'b', weight: '60', reps: '7', isComplete: true },
    { id: 'c', weight: '60', reps: '', isComplete: false },
  ] }],
};

it('one line per exercise with completed sets, reps listed', () => {
  const { lines } = summariseWorkout(workout);
  expect(lines).toEqual([{ id: 'e', name: 'Bench', setsDone: 2, detail: '60 kg × 8, 7' }]);
});
it('lists PRs from flagged sets, best e1RM among them', () => {
  const { prs } = summariseWorkout(workout);
  expect(prs).toEqual([{ id: 'e', name: 'Bench', weight: '60', reps: '8', kind: 'both' }]);
});
it('no PR when no set is flagged', () => {
  const noPr: Workout = {
    ...workout,
    exercises: [{ ...workout.exercises[0], sets: workout.exercises[0].sets.map((s) => ({ ...s, pr: undefined })) }],
  };
  expect(summariseWorkout(noPr).prs).toEqual([]);
});

it('header set count matches the recap: a completed set with no weight/reps logged is not counted', () => {
  const withWeightlessTick: Workout = {
    ...workout,
    exercises: [{
      ...workout.exercises[0],
      sets: [
        { id: 'a', weight: '60', reps: '8', isComplete: true },
        { id: 'b', weight: '60', reps: '7', isComplete: true },
        // ticked complete but never logged a weight or reps
        { id: 'c', weight: '', reps: '', isComplete: true },
      ],
    }],
  };
  expect(countLoggedSets(withWeightlessTick.exercises)).toBe(2);
  expect(summariseWorkout(withWeightlessTick).lines[0].setsDone).toBe(2);
});
