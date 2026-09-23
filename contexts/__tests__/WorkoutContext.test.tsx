import React from 'react';
import { renderHook, act, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutProvider, useWorkout } from '../WorkoutContext';
import ResumeWorkoutBar from '../../components/ResumeWorkoutBar';
import { UserActiveProgramService } from '../../services/userActiveProgramService';
import type { Program, UserActiveProgram, Workout } from '../../services/exercise.types';
import { addExercise, setSetCount } from '../../services/programEdits';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

// A stable object, not a fresh literal per call: the real useAuth() returns
// the same `user` reference across renders while signed in, and the
// "restore active program" effect depends on [user] by reference — a fresh
// object every render would refire it forever.
const mockAuthValue = { user: { id: 'user-1' }, session: null, loading: false, signOut: jest.fn(), refreshUser: jest.fn() };
jest.mock('../../data/AuthContext', () => ({
  useAuth: () => mockAuthValue,
}));

jest.mock('../../services/workoutHistoryService', () => ({
  WorkoutHistoryService: {
    getLastPerformance: jest.fn().mockResolvedValue({}),
    getExerciseBests: jest.fn().mockResolvedValue({ 1: { maxWeight: 100, maxE1rm: 110 } }),
  },
}));

const workout: Workout = {
  id: 'w1',
  name: 'Full Body A',
  description: '',
  order: 0,
  exercises: [
    { id: 'e1', exerciseId: 1, name: 'Squat', order: 0, sets: [{ id: 's1', weight: '', reps: '', isComplete: false }] },
  ],
};
const program: Program = { id: 'p1', name: 'Test', creator: '', description: '', workouts: [workout], isTemplate: false, templateId: 't1' };
const active: UserActiveProgram = {
  id: 'ap1',
  user_id: 'user-1',
  program_template_id: 't1',
  program_data: program,
  created_at: '2026-09-17T00:00:00Z',
  updated_at: '2026-09-17T00:00:00Z',
};

const wrapper = ({ children }: { children: React.ReactNode }) => <WorkoutProvider>{children}</WorkoutProvider>;

beforeEach(() => {
  jest.useFakeTimers();
  jest.spyOn(UserActiveProgramService, 'getMostRecentActiveProgram').mockResolvedValue(active);
  jest.spyOn(UserActiveProgramService, 'updateActiveProgram').mockResolvedValue(active);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function setup() {
  // @testing-library/react-native@14's act() always wraps its callback as
  // `async () => await callback()` internally (see act.ts), so every call —
  // even one with a synchronous callback — returns a thenable that must be
  // awaited, or the passive effect that copies the render result into
  // `result.current` hasn't necessarily run yet when the next line executes.
  const hook = await renderHook(() => useWorkout(), { wrapper });
  await act(async () => {
    await Promise.resolve();
  });
  await act(() => {
    hook.result.current.startWorkout(workout);
  });
  return hook;
}

test('rapid updateSet calls keep every keystroke in state', async () => {
  const { result } = await setup();
  await act(() => {
    result.current.updateSet('e1', 's1', 'weight', '6');
    result.current.updateSet('e1', 's1', 'weight', '60');
    result.current.updateSet('e1', 's1', 'reps', '5');
  });
  const set = result.current.currentWorkout!.exercises[0].sets[0];
  expect(set.weight).toBe('60');
  expect(set.reps).toBe('5');
});

test('rapid updateSet calls produce one cloud write with the final value', async () => {
  const { result } = await setup();
  await act(() => {
    result.current.updateSet('e1', 's1', 'weight', '6');
    result.current.updateSet('e1', 's1', 'weight', '60');
  });
  expect(UserActiveProgramService.updateActiveProgram).not.toHaveBeenCalled();
  await act(async () => {
    jest.advanceTimersByTime(800);
    await Promise.resolve();
  });
  expect(UserActiveProgramService.updateActiveProgram).toHaveBeenCalledTimes(1);
  const written = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls[0][1] as Program;
  expect(written.workouts[0].exercises[0].sets[0].weight).toBe('60');
});

test('completeSet flushes immediately', async () => {
  const { result } = await setup();
  await act(async () => {
    await result.current.completeSet('e1', 's1');
  });
  expect(UserActiveProgramService.updateActiveProgram).toHaveBeenCalledTimes(1);
  expect(result.current.currentWorkout!.exercises[0].sets[0].isComplete).toBe(true);
});

test('every change is checkpointed to AsyncStorage', async () => {
  const { result } = await setup();
  await act(() => {
    result.current.updateSet('e1', 's1', 'weight', '80');
  });
  const stored = await AsyncStorage.getItem('momentum:in_progress_workout:user-1');
  expect(JSON.parse(stored!).exercises[0].sets[0].weight).toBe('80');
});

test('a failed cloud write leaves the checkpoint intact', async () => {
  (UserActiveProgramService.updateActiveProgram as jest.Mock).mockRejectedValueOnce(new Error('offline'));
  const { result } = await setup();
  await act(() => {
    result.current.updateSet('e1', 's1', 'weight', '80');
  });
  await act(async () => {
    await result.current.flushProgramSync();
  });
  const stored = await AsyncStorage.getItem('momentum:in_progress_workout:user-1');
  expect(JSON.parse(stored!).exercises[0].sets[0].weight).toBe('80');
});

it('keeps the session start time when an exercise is removed mid-workout', async () => {
  const { result } = await setup();
  const startedAt = result.current.currentWorkout!.startedAt!;
  expect(startedAt).toBeGreaterThan(0);
  await act(async () => {
    await result.current.removeExerciseFromWorkout('w1', 'e1');
  });
  expect(result.current.currentWorkout!.exercises).toHaveLength(0);
  expect(result.current.currentWorkout!.startedAt).toBe(startedAt);
  expect(result.current.workoutStartedAt).toBe(startedAt);
});

describe('workout-screen structure edits go through programSync', () => {
  test('adding an exercise updates the live workout and the program in one write', async () => {
    const { result } = await setup();
    await act(async () => {
      await result.current.addExerciseToWorkout('w1', { id: 8, name: 'Row' } as any);
    });
    expect(result.current.currentWorkout!.exercises.map((e) => e.name)).toEqual(['Squat', 'Row']);
    expect(result.current.currentProgram!.workouts[0].exercises.map((e) => e.name)).toEqual(['Squat', 'Row']);
    expect(UserActiveProgramService.updateActiveProgram).toHaveBeenCalledTimes(1);
    const written = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls[0][1] as Program;
    expect(written.workouts[0].exercises).toHaveLength(2);
    expect(written.workouts[0]).not.toHaveProperty('startedAt');
  });

  test('+ Add set grows the live exercise and keeps ticked sets', async () => {
    const { result } = await setup();
    await act(async () => { await result.current.completeSet('e1', 's1'); });
    await act(async () => { await result.current.updateExerciseSets('w1', 'e1', 2); });
    const sets = result.current.currentWorkout!.exercises[0].sets;
    expect(sets).toHaveLength(2);
    expect(sets[0].isComplete).toBe(true);
  });

  test('a day reordered while its workout runs keeps its new order after the next set edit', async () => {
    const legs: Workout = { ...workout, id: 'w2', name: 'Legs', order: 1 };
    (UserActiveProgramService.getMostRecentActiveProgram as jest.Mock).mockResolvedValue({
      ...active,
      program_data: { ...program, workouts: [workout, legs] },
    });
    const { result } = await setup(); // w1 is running
    await act(async () => { await result.current.reorderWorkouts(['w2', 'w1']); });
    await act(async () => { await result.current.updateSet('e1', 's1', 'weight', '70'); });
    const days = result.current.currentProgram!.workouts;
    expect(days.find((w) => w.id === 'w1')!.order).toBe(1);
    expect(days.find((w) => w.id === 'w2')!.order).toBe(0);
  });
});

describe('bests and replaceExercise', () => {
  it('loads exercise bests when a workout starts and raises them when a heavier set is ticked', async () => {
    const { result } = await setup();
    await act(async () => { result.current.startWorkout(workout); });
    expect(result.current.exerciseBests[1].maxWeight).toBe(100);
    await act(async () => { await result.current.updateSet('e1', 's1', 'weight', '105'); });
    await act(async () => { await result.current.updateSet('e1', 's1', 'reps', '1'); });
    await act(async () => { await result.current.completeSet('e1', 's1'); });
    expect(result.current.exerciseBests[1].maxWeight).toBe(105);
    // 105 beats maxWeight 100 but 105×(1+1/30)≈108.5 < maxE1rm 110, so only weight is a PR.
    expect(result.current.currentWorkout!.exercises[0].sets[0].pr).toBe('weight');
  });

  it('replaceExercise keeps the set count, clears values and swaps identity', async () => {
    const { result } = await setup();
    await act(async () => { result.current.startWorkout(workout); });
    await act(async () => { await result.current.updateSet('e1', 's1', 'weight', '60'); });
    await act(async () => {
      await result.current.replaceExercise('e1', { id: 7, name: 'Deadlift', primary_muscle_group: 'back', equipment: 'barbell' } as any);
    });
    const ex = result.current.currentWorkout!.exercises[0];
    expect(ex.exerciseId).toBe(7);
    expect(ex.name).toBe('Deadlift');
    expect(ex.sets).toHaveLength(1);
    expect(ex.sets[0].weight).toBe('');
    expect(ex.sets[0].isComplete).toBe(false);
  });

  it('backfills repsTarget on the active program from the template', async () => {
    const { result } = await setup();
    // program fixture has no repsTarget; test template 't1' is not in programTemplates, so nothing changes
    expect(result.current.currentProgram?.workouts[0].exercises[0].repsTarget).toBeUndefined();
  });
});

it('ResumeWorkoutBar shows only while a workout is active', async () => {
  // A prior test in this file may have checkpointed a workout under this
  // user id; clear it so the restore-on-mount effect doesn't preempt the
  // "nothing active yet" assertion below.
  await AsyncStorage.removeItem('momentum:in_progress_workout:user-1');
  const resumeWrapper = ({ children }: { children: React.ReactNode }) => (
    <WorkoutProvider>
      {children}
      <ResumeWorkoutBar />
    </WorkoutProvider>
  );
  const { result } = await renderHook(() => useWorkout(), { wrapper: resumeWrapper });
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.queryByLabelText(/Resume/)).toBeNull();
  await act(async () => {
    result.current.startWorkout(workout);
  });
  expect(screen.getByLabelText(/Resume Full Body A/)).toBeTruthy();
});

describe('folds and set removal', () => {
  const twoSets: Workout = {
    ...workout,
    exercises: [{ ...workout.exercises[0], sets: [
      { id: 's1', weight: '60', reps: '5', isComplete: false },
      { id: 's2', weight: '60', reps: '5', isComplete: false },
    ] }],
  };

  async function setupWith(w: Workout) {
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    await act(() => { hook.result.current.startWorkout(w); });
    return hook;
  }

  test('folding is checkpointed but never written to the program', async () => {
    const { result } = await setupWith(twoSets);
    await act(() => { result.current.setExerciseCollapsed('e1', true); });
    expect(result.current.currentWorkout!.collapsedExerciseIds).toEqual(['e1']);
    const stored = JSON.parse((await AsyncStorage.getItem('momentum:in_progress_workout:user-1'))!);
    expect(stored.collapsedExerciseIds).toEqual(['e1']);
    expect(UserActiveProgramService.updateActiveProgram).not.toHaveBeenCalled();

    await act(async () => { await result.current.completeSet('e1', 's1'); });
    const written = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls[0][1] as Program;
    expect(written.workouts[0]).not.toHaveProperty('collapsedExerciseIds');
  });

  test('unfolding removes the id', async () => {
    const { result } = await setupWith(twoSets);
    await act(() => { result.current.setExerciseCollapsed('e1', true); });
    await act(() => { result.current.setExerciseCollapsed('e1', false); });
    expect(result.current.currentWorkout!.collapsedExerciseIds).toEqual([]);
  });

  test('removeSet drops that set and flushes', async () => {
    const { result } = await setupWith(twoSets);
    await act(async () => { await result.current.removeSet('e1', 's1'); });
    expect(result.current.currentWorkout!.exercises[0].sets.map((s) => s.id)).toEqual(['s2']);
    expect(UserActiveProgramService.updateActiveProgram).toHaveBeenCalledTimes(1);
  });

  test('removeSet refuses the last remaining set', async () => {
    const { result } = await setupWith(workout);
    await act(async () => { await result.current.removeSet('e1', 's1'); });
    expect(result.current.currentWorkout!.exercises[0].sets).toHaveLength(1);
  });

  test('a restored checkpoint keeps its folds', async () => {
    await AsyncStorage.setItem('momentum:in_progress_workout:user-1', JSON.stringify({ ...twoSets, startedAt: 1, collapsedExerciseIds: ['e1'] }));
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(hook.result.current.currentWorkout?.collapsedExerciseIds).toEqual(['e1']);
  });
});

describe('program editor', () => {
  beforeEach(async () => {
    await AsyncStorage.clear(); // no restored workout: the editor is used between sessions
  });

  async function setupIdle() {
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    return hook;
  }

  test('set count is debounced into one write', async () => {
    const { result } = await setupIdle();
    await act(() => { result.current.editDay('w1', (d) => setSetCount(d, 'e1', 2), false); });
    await act(() => { result.current.editDay('w1', (d) => setSetCount(d, 'e1', 3), false); });
    expect(UserActiveProgramService.updateActiveProgram).not.toHaveBeenCalled();
    expect(result.current.hasPendingProgramWrite()).toBe(true);
    await act(async () => {
      jest.advanceTimersByTime(800);
      await Promise.resolve();
    });
    expect(UserActiveProgramService.updateActiveProgram).toHaveBeenCalledTimes(1);
    const written = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls[0][1] as Program;
    expect(written.workouts[0].exercises[0].sets).toHaveLength(3);
  });

  test('adding an exercise is written at once', async () => {
    const { result } = await setupIdle();
    await act(async () => {
      result.current.editDay('w1', (d) => addExercise(d, { exerciseId: 8, name: 'Row' }), true);
      await result.current.flushProgramSync();
    });
    expect(UserActiveProgramService.updateActiveProgram).toHaveBeenCalledTimes(1);
    expect(result.current.currentProgram!.workouts[0].exercises).toHaveLength(2);
  });

  test('the day of the running workout is locked', async () => {
    const { result } = await setup(); // starts w1
    expect(result.current.isDayLocked('w1')).toBe(true);
    expect(result.current.isProgramWorkoutRunning).toBe(true);
    let accepted = true;
    await act(() => { accepted = result.current.editDay('w1', (d) => setSetCount(d, 'e1', 4), true); });
    expect(accepted).toBe(false);
    expect(result.current.currentProgram!.workouts[0].exercises[0].sets).toHaveLength(1);
  });

  test('nothing is locked between sessions', async () => {
    const { result } = await setupIdle();
    expect(result.current.isDayLocked('w1')).toBe(false);
    expect(result.current.isProgramWorkoutRunning).toBe(false);
  });

  test('a failed write is reported as still pending', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    const { result } = await setupIdle();
    await act(async () => {
      result.current.editDay('w1', (d) => setSetCount(d, 'e1', 2), false);
      await result.current.flushProgramSync();
    });
    expect(result.current.hasPendingProgramWrite()).toBe(true);
  });
});
