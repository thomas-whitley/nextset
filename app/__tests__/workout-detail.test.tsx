import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import WorkoutDetailScreen from '../workout-detail';
import { WorkoutHistoryService } from '../../services/workoutHistoryService';

// No SafeAreaProvider in a unit render: use the library's own jest mock (zero insets).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => ({ router: { back: jest.fn() }, useLocalSearchParams: () => ({ id: 'h1' }) }));
const mockAuth = { user: { id: 'user-1' } };
jest.mock('../../data/AuthContext', () => ({ useAuth: () => mockAuth }));

const entry = {
  id: 'h1', user_id: 'user-1', completed_at: '2026-09-22T18:00:00Z', created_at: '', health_stats: {},
  total_volume: 975, duration_minutes: 48,
  workout_data: {
    id: 'ppl-push', name: 'Push', description: '', order: 0,
    metadata: { notes: 'Felt strong' },
    exercises: [{ id: 'a', exerciseId: 1, name: 'Barbell Bench Press', order: 0, sets: [
      { id: 'a1', weight: '60', reps: '8', isComplete: true },
      { id: 'a2', weight: '62.5', reps: '6', isComplete: true, pr: 'weight' },
      { id: 'a3', weight: '70', reps: '5', isComplete: false },
    ] }],
  },
};

const settle = async () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });

test('shows the logged sets of a saved workout, read-only', async () => {
  jest.spyOn(WorkoutHistoryService, 'getWorkoutById').mockResolvedValue(entry as any);
  await render(<WorkoutDetailScreen />);
  await settle();
  expect(WorkoutHistoryService.getWorkoutById).toHaveBeenCalledWith('user-1', 'h1');
  expect(screen.getByText('Push')).toBeTruthy();
  expect(screen.getByText('60 kg × 8')).toBeTruthy();
  expect(screen.getByText('62.5 kg × 6')).toBeTruthy();
  expect(screen.queryByText('70 kg × 5')).toBeNull(); // never ticked
  expect(screen.getByLabelText('Personal record')).toBeTruthy();
  expect(screen.getByText('Felt strong')).toBeTruthy();
  expect(screen.queryByRole('textbox')).toBeNull();
});

test('a workout that is gone says so', async () => {
  jest.spyOn(WorkoutHistoryService, 'getWorkoutById').mockResolvedValue(null);
  await render(<WorkoutDetailScreen />);
  await settle();
  expect(screen.getByText('This workout is no longer in your history.')).toBeTruthy();
});
