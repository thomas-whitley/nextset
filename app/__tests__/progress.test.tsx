import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import ProgressScreen from '../(tabs)/progress';
import { WorkoutHistoryService } from '../../services/workoutHistoryService';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('expo-router', () => {
  const React = require('react');
  return { router: { push: jest.fn() }, useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]) };
});
const mockAuth = { user: { id: 'user-1' } };
jest.mock('../../data/AuthContext', () => ({ useAuth: () => mockAuth }));
jest.mock('react-native-chart-kit', () => ({ LineChart: () => null, BarChart: () => null }));
// The sheet has its own tests; here we only care that Progress opens it.
jest.mock('../../components/ExerciseListSheet', () => ({
  __esModule: true,
  default: ({ visible }: { visible: boolean }) => {
    const { Text } = require('react-native');
    return visible ? <Text>SHEET OPEN</Text> : null;
  },
}));

const stats = (exerciseProgress: { exerciseId: number; exercise: string; maxWeight: number; date: string }[]) => ({
  totalWorkouts: 1, totalVolume: 400, averageHeartRate: 0, workoutFrequency: [], volumeProgress: [],
  exerciseProgress, bodyweightProgress: [], workoutNotes: [],
});
const historyEntry = {
  id: 'h1', user_id: 'user-1', completed_at: '2026-09-22T18:00:00Z', created_at: '', health_stats: {}, total_volume: 400, duration_minutes: 30,
  workout_data: { id: 'w', name: 'Push', description: '', order: 0, exercises: [] },
};

const settle = async () => act(async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); });

beforeEach(() => {
  jest.restoreAllMocks();
  (router.push as jest.Mock).mockClear();
  jest.spyOn(WorkoutHistoryService, 'getWorkoutStreak').mockResolvedValue({ currentStreak: 0, longestStreak: 0 });
  jest.spyOn(WorkoutHistoryService, 'getWorkoutHistory').mockResolvedValue([historyEntry as any]);
});

test('a personal record row opens that exercise', async () => {
  jest.spyOn(WorkoutHistoryService, 'getProgressStats').mockResolvedValue(stats([{ exerciseId: 42, exercise: 'Bench', maxWeight: 80, date: '2026-09-22' }]) as any);
  await render(<ProgressScreen />);
  await settle();
  await fireEvent.press(screen.getByLabelText('Open Bench'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/exercise-progress', params: { id: '42' } });
});

test('See all exercises is there even with no weighted records in range', async () => {
  jest.spyOn(WorkoutHistoryService, 'getProgressStats').mockResolvedValue(stats([]) as any);
  await render(<ProgressScreen />);
  await settle();
  await fireEvent.press(screen.getByText('See all exercises'));
  expect(screen.getByText('SHEET OPEN')).toBeTruthy();
});
