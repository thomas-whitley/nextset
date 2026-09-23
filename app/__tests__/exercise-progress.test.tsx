import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { router } from 'expo-router';
import ExerciseProgressScreen from '../exercise-progress';
import { WorkoutHistoryService } from '../../services/workoutHistoryService';
import { ExerciseService } from '../../services/exerciseService';

// No SafeAreaProvider in a unit render: use the library's own jest mock (zero insets).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
const mockParams: { id?: string } = {};
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() }, useLocalSearchParams: () => mockParams }));
const mockAuth = { user: { id: 'user-1' } };
jest.mock('../../data/AuthContext', () => ({ useAuth: () => mockAuth }));
// The SVG is not under test; its accessibility label on the wrapper is.
jest.mock('react-native-chart-kit', () => ({ LineChart: () => null }));

const bench = ExerciseService.getAll()[0];

const entry = (id: string, day: string, sets: [string, string][], exerciseId = bench.id) => ({
  id, completed_at: `${day}T12:00:00.000Z`,
  workout_data: { id: 'w', name: 'Push', description: '', order: 0, exercises: [
    { id: 'e', exerciseId, name: 'Saved name', order: 0, sets: sets.map(([weight, reps], i) => ({ id: `s${i}`, weight, reps, isComplete: true })) },
  ] },
});

const settle = async () => act(async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); });

beforeEach(async () => {
  mockParams.id = String(bench.id);
  await AsyncStorage.clear();
  jest.restoreAllMocks();
  (router.push as jest.Mock).mockClear();
});

test('no sessions: says so, no chart', async () => {
  jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([]);
  await render(<ExerciseProgressScreen />);
  await settle();
  expect(screen.getByText('No sets logged for this exercise yet.')).toBeTruthy();
});

test('one session: record and list, no chart, a nudge', async () => {
  jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([entry('h1', '2026-09-01', [['80', '5']])]);
  await render(<ExerciseProgressScreen />);
  await settle();
  expect(screen.getByText(bench.name)).toBeTruthy();
  expect(screen.getByText('Log it once more to see a trend.')).toBeTruthy();
  expect(screen.queryByLabelText(/^Est\. 1RM, /)).toBeNull();
  expect(screen.getByText('80 kg × 5')).toBeTruthy();
  expect(screen.getByText('93 kg')).toBeTruthy(); // best est. 1RM, whole kg
});

test('two sessions: chart summary; the toggle switches metric and is remembered', async () => {
  jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([
    entry('h2', '2026-09-08', [['85', '4']]),
    entry('h1', '2026-09-01', [['80', '5']]),
  ]);
  await render(<ExerciseProgressScreen />);
  await settle();
  expect(screen.getByLabelText('Est. 1RM, 2 sessions, 93 to 96 kg')).toBeTruthy();
  await fireEvent.press(screen.getByText('Heaviest weight'));
  expect(screen.getByLabelText('Heaviest weight, 2 sessions, 80 to 85 kg')).toBeTruthy();
  await settle();
  expect(await AsyncStorage.getItem('nextset:exercise_chart_metric')).toBe('heaviest');
});

test('a remembered metric is used on open', async () => {
  await AsyncStorage.setItem('nextset:exercise_chart_metric', 'heaviest');
  jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([
    entry('h2', '2026-09-08', [['85', '4']]),
    entry('h1', '2026-09-01', [['80', '5']]),
  ]);
  await render(<ExerciseProgressScreen />);
  await settle();
  expect(screen.getByLabelText('Heaviest weight, 2 sessions, 80 to 85 kg')).toBeTruthy();
});

test('bodyweight exercise: most reps, no toggle', async () => {
  jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([
    entry('h2', '2026-09-08', [['', '10']]),
    entry('h1', '2026-09-01', [['', '8']]),
  ]);
  await render(<ExerciseProgressScreen />);
  await settle();
  expect(screen.getByLabelText('Most reps, 2 sessions, 8 to 10 reps')).toBeTruthy();
  expect(screen.queryByText('Heaviest weight')).toBeNull();
  expect(screen.getAllByText('10 reps').length).toBeGreaterThan(0); // record tile and session row
});

test('a session row opens that workout', async () => {
  jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([entry('h1', '2026-09-01', [['80', '5']])]);
  await render(<ExerciseProgressScreen />);
  await settle();
  await fireEvent.press(screen.getByText('80 kg × 5'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/workout-detail', params: { id: 'h1' } });
});

test('failed load: Did not load, Try again refetches', async () => {
  const spy = jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockRejectedValueOnce(new Error('Failed to fetch')).mockResolvedValue([]);
  jest.spyOn(console, 'error').mockImplementation(() => {});
  await render(<ExerciseProgressScreen />);
  await settle();
  expect(screen.getByText('Did not load')).toBeTruthy();
  await fireEvent.press(screen.getByText('Try again'));
  await settle();
  expect(spy).toHaveBeenCalledTimes(2);
  expect(screen.getByText('No sets logged for this exercise yet.')).toBeTruthy();
});

test('a bad id param shows the empty state without fetching', async () => {
  mockParams.id = 'abc';
  const spy = jest.spyOn(WorkoutHistoryService, 'getExerciseHistory').mockResolvedValue([]);
  await render(<ExerciseProgressScreen />);
  await settle();
  expect(spy).not.toHaveBeenCalled();
  expect(screen.getByText('No sets logged for this exercise yet.')).toBeTruthy();
});
