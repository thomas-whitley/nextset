import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import SwapExerciseSheet from '../SwapExerciseSheet';
import { ExerciseService } from '../../services/exerciseService';

jest.mock('../gestures/DragDismissSheet', () => ({ __esModule: true, default: ({ visible, children }: any) => (visible ? children : null) }));

const incline = ExerciseService.getAll().find((e) => e.name === 'Incline Dumbbell Press')!;

test('similar first, pick one', async () => {
  const onPick = jest.fn();
  await render(<SwapExerciseSheet visible libraryExerciseId={incline.id} currentName={incline.name} onDismiss={jest.fn()} onPick={onPick} />);
  expect(screen.getByText('Similar: chest, pushing')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Swap to Hammer Grip Incline DB Bench Press'));
  expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ name: 'Hammer Grip Incline DB Bench Press' }));
});

test('search replaces the similar list', async () => {
  await render(<SwapExerciseSheet visible libraryExerciseId={incline.id} currentName={incline.name} onDismiss={jest.fn()} onPick={jest.fn()} />);
  await fireEvent.changeText(screen.getByLabelText('Search all exercises'), 'squat');
  expect(screen.queryByText('Similar: chest, pushing')).toBeNull();
  expect(screen.getAllByLabelText(/^Swap to .*Squat/i).length).toBeGreaterThan(0);
});

test('unknown library id: search still works, no similar section', async () => {
  await render(<SwapExerciseSheet visible libraryExerciseId={-1} currentName="Mystery" onDismiss={jest.fn()} onPick={jest.fn()} />);
  expect(screen.queryByText(/^Similar/)).toBeNull();
  expect(screen.getByLabelText('Search all exercises')).toBeTruthy();
});
