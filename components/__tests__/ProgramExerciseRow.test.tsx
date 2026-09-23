import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ProgramExerciseRow from '../ProgramExerciseRow';

const exercise = {
  id: 'e', exerciseId: 1, name: 'Barbell Bench Press', order: 0, repsTarget: { min: 6, max: 6 },
  sets: [
    { id: 'a', weight: '', reps: '', isComplete: false },
    { id: 'b', weight: '', reps: '', isComplete: false },
  ],
};
const props = (over = {}) => ({
  exercise, locked: false, onSetCount: jest.fn(), onRepsTarget: jest.fn(), onRemove: jest.fn(),
  dragHandle: (n: React.ReactNode) => n, ...over,
});
const field = () => screen.getByLabelText('Reps target for Barbell Bench Press');

test('the stepper asks for one more or one fewer set', async () => {
  const p = props();
  await render(<ProgramExerciseRow {...p} />);
  await fireEvent.press(screen.getByLabelText('More sets for Barbell Bench Press'));
  expect(p.onSetCount).toHaveBeenCalledWith(3);
  await fireEvent.press(screen.getByLabelText('Fewer sets for Barbell Bench Press'));
  expect(p.onSetCount).toHaveBeenCalledWith(1);
});

test('Fewer is disabled at one set', async () => {
  const p = props({ exercise: { ...exercise, sets: [exercise.sets[0]] } });
  await render(<ProgramExerciseRow {...p} />);
  await fireEvent.press(screen.getByLabelText('Fewer sets for Barbell Bench Press'));
  expect(p.onSetCount).not.toHaveBeenCalled();
});

test('reps field: range saved normalised, junk reverts, empty clears (Review Focus 4)', async () => {
  const p = props();
  await render(<ProgramExerciseRow {...p} />);
  expect(field().props.value).toBe('6');
  expect(field().props.maxFontSizeMultiplier).toBe(1.3);

  await fireEvent.changeText(field(), '8-12');
  await fireEvent(field(), 'blur');
  expect(p.onRepsTarget).toHaveBeenLastCalledWith({ min: 8, max: 12 });
  expect(field().props.value).toBe('8–12');

  await fireEvent.changeText(field(), '12-8');
  await fireEvent(field(), 'blur');
  expect(field().props.value).toBe('6'); // the prop still says 6: the parent never accepted 8–12 in this test
  expect(p.onRepsTarget).toHaveBeenCalledTimes(1);

  await fireEvent.changeText(field(), '');
  await fireEvent(field(), 'blur');
  expect(p.onRepsTarget).toHaveBeenLastCalledWith(undefined);
});

test('remove asks the parent', async () => {
  const p = props();
  await render(<ProgramExerciseRow {...p} />);
  await fireEvent.press(screen.getByLabelText('Remove Barbell Bench Press'));
  expect(p.onRemove).toHaveBeenCalled();
});

test('locked: the plan as text, no controls', async () => {
  await render(<ProgramExerciseRow {...props({ locked: true })} />);
  expect(screen.getByText('2 sets × 6 reps')).toBeTruthy();
  expect(screen.queryByLabelText('Remove Barbell Bench Press')).toBeNull();
  expect(screen.queryByLabelText('Reps target for Barbell Bench Press')).toBeNull();
});

test('empty reps shows the word "reps", centred like the set inputs (device run T2-8, T2-9)', async () => {
  await render(<ProgramExerciseRow {...props({ exercise: { ...exercise, repsTarget: undefined } })} />);
  expect(field().props.placeholder).toBe('reps');
  const style = StyleSheet.flatten(field().props.style);
  expect(style.textAlignVertical).toBe('center');
  expect(style.paddingVertical).toBe(0);
});
