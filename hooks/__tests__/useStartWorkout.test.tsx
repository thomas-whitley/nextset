import { Alert } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useStartWorkout } from '../useStartWorkout';

const mockCtx = {
  isWorkoutActive: false,
  currentWorkout: null as { name: string } | null,
  startWorkout: jest.fn(),
  startQuickWorkout: jest.fn(),
};
jest.mock('../../contexts/WorkoutContext', () => ({ useWorkout: () => mockCtx }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockCtx.isWorkoutActive = false;
  mockCtx.currentWorkout = null;
});

test('starts and opens the workout when nothing is running', async () => {
  const { result } = await renderHook(() => useStartWorkout());
  const day = { id: 'd', name: 'Pull' } as any;
  result.current.start(day);
  expect(mockCtx.startWorkout).toHaveBeenCalledWith(day);
  expect(router.push).toHaveBeenCalledWith('/workout');
});

test('a running workout is offered back, never replaced (Review Focus 2)', async () => {
  mockCtx.isWorkoutActive = true;
  mockCtx.currentWorkout = { name: 'Legs' };
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const { result } = await renderHook(() => useStartWorkout());
  result.current.startQuick();
  result.current.start({ id: 'd', name: 'Pull' } as any);
  expect(mockCtx.startQuickWorkout).not.toHaveBeenCalled();
  expect(mockCtx.startWorkout).not.toHaveBeenCalled();
  expect(alert.mock.calls[0][0]).toBe('A workout is already running');
  const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === 'Resume')!.onPress!();
  expect(router.push).toHaveBeenCalledWith('/workout');
});
