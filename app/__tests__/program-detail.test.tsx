import React from 'react';
import { Alert } from 'react-native';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import ProgramDayEditorScreen from '../program-detail';

// No SafeAreaProvider in a unit render: use the library's own jest mock (zero insets).
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

const mockListeners: Record<string, (e: unknown) => void> = {};
const mockNav = {
  addListener: jest.fn((type: string, cb: (e: unknown) => void) => {
    mockListeners[type] = cb;
    return () => {};
  }),
  dispatch: jest.fn(),
};
const mockScreenOptions: { current: Record<string, unknown> | null } = { current: null };
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ day: 'd1' }),
  useNavigation: () => mockNav,
  Stack: { Screen: ({ options }: { options: Record<string, unknown> }) => { mockScreenOptions.current = options; return null; } },
}));

const day = {
  id: 'd1', name: 'Pull', description: '', order: 0,
  exercises: [{ id: 'e1', exerciseId: 7, name: 'Barbell Deadlift', order: 0, repsTarget: { min: 5, max: 5 }, sets: [{ id: 's1', weight: '', reps: '', isComplete: false }] }],
};
const mockCtx = {
  currentProgram: { id: 'p', name: 'Push / Pull / Legs', creator: '', description: '', workouts: [day] },
  currentActiveProgram: { id: 'row' },
  editDay: jest.fn((..._args: unknown[]) => true),
  isDayLocked: jest.fn((_id: string) => false),
  flushProgramSync: jest.fn(async () => {}),
  hasPendingProgramWrite: jest.fn(() => false),
};
jest.mock('../../contexts/WorkoutContext', () => ({ useWorkout: () => mockCtx }));
// Render list items plainly; the drag machinery is not under test here.
jest.mock('../../components/gestures/DraggableList', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ items, renderItem, keyExtractor }: any) =>
      items.map((item: any, i: number) => React.createElement(React.Fragment, { key: keyExtractor(item) }, renderItem(item, i, false, (n: any) => n))),
  };
});

const settle = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCtx.isDayLocked.mockReturnValue(false);
  mockCtx.hasPendingProgramWrite.mockReturnValue(false);
});

test('a set-count change goes through editDay, debounced', async () => {
  await render(<ProgramDayEditorScreen />);
  await fireEvent.press(screen.getByLabelText('More sets for Barbell Deadlift'));
  expect(mockCtx.editDay).toHaveBeenCalledWith('d1', expect.any(Function), false);
  const edit = mockCtx.editDay.mock.calls[0][1] as (d: typeof day) => typeof day;
  expect(edit(day).exercises[0].sets).toHaveLength(2);
});

test('the running day is read-only', async () => {
  mockCtx.isDayLocked.mockReturnValue(true);
  await render(<ProgramDayEditorScreen />);
  expect(screen.getByText('You are doing this workout now. Finish it to edit this day.')).toBeTruthy();
  expect(screen.queryByLabelText('Remove Barbell Deadlift')).toBeNull();
  expect(screen.queryByLabelText('Add exercise to Pull')).toBeNull();
});

test('leaving flushes, and stays with an alert while a write is still pending (Review Focus 5)', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockCtx.hasPendingProgramWrite.mockReturnValue(true);
  await render(<ProgramDayEditorScreen />);
  const event = { preventDefault: jest.fn(), data: { action: 'GO_BACK' } };
  await act(async () => {
    mockListeners.beforeRemove(event);
    await settle();
  });
  expect(event.preventDefault).toHaveBeenCalled();
  expect(mockCtx.flushProgramSync).toHaveBeenCalled();
  expect(alert.mock.calls[0][0]).toBe('Not saved yet');
  expect(mockNav.dispatch).not.toHaveBeenCalled();
});

test('leaving with everything saved closes the screen', async () => {
  await render(<ProgramDayEditorScreen />);
  const event = { preventDefault: jest.fn(), data: { action: 'GO_BACK' } };
  await act(async () => {
    mockListeners.beforeRemove(event);
    await settle();
  });
  expect(mockNav.dispatch).toHaveBeenCalledWith('GO_BACK');
});

test('the iOS swipe-down is switched off, so every exit goes through the leave check (review I4)', async () => {
  mockScreenOptions.current = null;
  await render(<ProgramDayEditorScreen />);
  expect(mockScreenOptions.current).toMatchObject({ gestureEnabled: false });
});

test('a reps value typed but not yet committed is saved before the leave check flushes (review I5)', async () => {
  await render(<ProgramDayEditorScreen />);
  await fireEvent.changeText(screen.getByLabelText('Reps target for Barbell Deadlift'), '10-12');
  expect(mockCtx.editDay).not.toHaveBeenCalled(); // nothing committed yet: the field has not blurred
  const event = { preventDefault: jest.fn(), data: { action: 'GO_BACK' } };
  await act(async () => {
    mockListeners.beforeRemove(event);
    await settle();
  });
  expect(mockCtx.editDay).toHaveBeenCalledWith('d1', expect.any(Function), false);
  const edit = mockCtx.editDay.mock.calls[0][1] as (d: typeof day) => typeof day;
  expect(edit(day).exercises[0].repsTarget).toEqual({ min: 10, max: 12 });
  expect(mockCtx.editDay.mock.invocationCallOrder[0]).toBeLessThan(mockCtx.flushProgramSync.mock.invocationCallOrder[0]);
  expect(mockNav.dispatch).toHaveBeenCalledWith('GO_BACK');
});
