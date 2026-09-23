import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ExerciseCard from '../ExerciseCard';

const exercise = {
  id: 'e', exerciseId: 1, name: 'Barbell Bench Press', order: 0, repsTarget: { min: 6, max: 6 },
  sets: [
    { id: 'a', weight: '60', reps: '6', isComplete: true },
    { id: 'b', weight: '62.5', reps: '6', isComplete: true },
  ],
};
const props = (over = {}) => ({
  exercise, active: true, collapsed: false,
  onToggleCollapsed: jest.fn(), onOpenActions: jest.fn(), onAddSet: jest.fn(), onRemoveSet: jest.fn(),
  notes: '', onChangeNotes: jest.fn(),
  renderSetRow: (set: { id: string }) => <Text key={set.id}>{`row ${set.id}`}</Text>,
  nextSetId: null, dragHandle: (n: React.ReactNode) => n, ...over,
});

test('open: plan line, rows, add set; header folds', async () => {
  const p = props();
  await render(<ExerciseCard {...p} />);
  expect(screen.getByText('2 sets × 6 reps')).toBeTruthy();
  expect(screen.getByText('row a')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Add set to Barbell Bench Press'));
  expect(p.onAddSet).toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText(/^Barbell Bench Press, 2 sets × 6 reps/));
  expect(p.onToggleCollapsed).toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText('More actions for Barbell Bench Press'));
  expect(p.onOpenActions).toHaveBeenCalled();
});

test('folded: summary, done badge, no rows, drag handle', async () => {
  await render(<ExerciseCard {...props({ collapsed: true })} />);
  expect(screen.getByText('2 of 2 done, top set 62.5 × 6')).toBeTruthy();
  expect(screen.getByLabelText('All sets done')).toBeTruthy();
  expect(screen.queryByText('row a')).toBeNull();
  expect(screen.getByLabelText('Drag to reorder Barbell Bench Press')).toBeTruthy();
});

test('an exercise with one set offers no swipe', async () => {
  await render(<ExerciseCard {...props({ exercise: { ...exercise, sets: [exercise.sets[0]] } })} />);
  expect(screen.queryByLabelText('Remove set 1')).toBeNull();
});
