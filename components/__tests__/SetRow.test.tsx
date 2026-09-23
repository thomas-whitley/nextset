import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SetRow from '../SetRow';

const base = {
  set: { id: 's1', weight: '62.5', reps: '6', isComplete: true, pr: 'weight' as const, previousWeight: '60', previousReps: '6' },
  index: 1, exerciseId: 'e', libraryExerciseId: 1, repsTarget: { min: 6, max: 6 },
  isActiveRest: false, onSlab: true,
  onToggleComplete: jest.fn(), onChange: jest.fn(), onBlur: jest.fn(), onFocus: jest.fn(),
};

test('tick, copy last time, PR badge', async () => {
  await render(<SetRow {...base} />);
  await fireEvent.press(screen.getByLabelText('Set 2 completed'));
  expect(base.onToggleComplete).toHaveBeenCalled();
  await fireEvent.press(screen.getByLabelText("Use last session's weight and reps"));
  expect(base.onChange).toHaveBeenCalledWith('weight', '60');
  expect(base.onChange).toHaveBeenCalledWith('reps', '6');
  expect(screen.getByLabelText('Personal record')).toBeTruthy();
});

test('numeric inputs cap font scaling so the row never clips (spec R22)', async () => {
  await render(<SetRow {...base} />);
  expect(screen.getByLabelText('Weight for set 2').props.maxFontSizeMultiplier).toBe(1.3);
  expect(screen.getByLabelText('Repetitions for set 2').props.maxFontSizeMultiplier).toBe(1.3);
});
