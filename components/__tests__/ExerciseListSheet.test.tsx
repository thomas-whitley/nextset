import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import ExerciseListSheet from '../ExerciseListSheet';
import { WorkoutHistoryService } from '../../services/workoutHistoryService';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../gestures/DragDismissSheet', () => ({ __esModule: true, default: ({ visible, children }: any) => (visible ? children : null) }));
const mockAuth = { user: { id: 'user-1' } };
jest.mock('../../data/AuthContext', () => ({ useAuth: () => mockAuth }));

const entry = (id: string, day: string, exerciseId: number, name: string, weight: string, reps: string) => ({
  id, completed_at: `${day}T12:00:00.000Z`,
  workout_data: { id: 'w', name: 'W', description: '', order: 0, exercises: [
    { id: 'e', exerciseId, name, order: 0, sets: [{ id: 's', weight, reps, isComplete: true }] },
  ] },
});

const settle = async () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });

beforeEach(() => jest.restoreAllMocks());

test('most recently done first; pick calls onPick with the id', async () => {
  jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([
    entry('a', '2026-09-01', -1, 'Lift A', '80', '5'),
    entry('b', '2026-09-08', -2, 'Lift B', '', '12'),
  ]);
  const onPick = jest.fn();
  await render(<ExerciseListSheet visible onDismiss={jest.fn()} onPick={onPick} />);
  await settle();
  const labels = screen.getAllByLabelText(/^Open /).map((n) => n.props.accessibilityLabel);
  expect(labels).toEqual(['Open Lift B', 'Open Lift A']);
  expect(screen.getByText(/12 reps/)).toBeTruthy();
  expect(screen.getByText(/80 kg/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Open Lift A'));
  expect(onPick).toHaveBeenCalledWith(-1);
});

test('empty history', async () => {
  jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([]);
  await render(<ExerciseListSheet visible onDismiss={jest.fn()} onPick={jest.fn()} />);
  await settle();
  expect(screen.getByText('Finish a workout to see your lifts here.')).toBeTruthy();
});

test('failed load offers Try again', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const spy = jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockRejectedValueOnce(new Error('x')).mockResolvedValue([]);
  await render(<ExerciseListSheet visible onDismiss={jest.fn()} onPick={jest.fn()} />);
  await settle();
  expect(screen.getByText('Did not load')).toBeTruthy();
  await fireEvent.press(screen.getByText('Try again'));
  await settle();
  expect(spy).toHaveBeenCalledTimes(2);
});

test('does not fetch while hidden', async () => {
  const spy = jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([]);
  await render(<ExerciseListSheet visible={false} onDismiss={jest.fn()} onPick={jest.fn()} />);
  await settle();
  expect(spy).not.toHaveBeenCalled();
});
