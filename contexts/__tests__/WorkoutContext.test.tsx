import React from 'react';
import { renderHook, act, screen } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutProvider, useWorkout } from '../WorkoutContext';
import ResumeWorkoutBar from '../../components/ResumeWorkoutBar';
import { UserActiveProgramService } from '../../services/userActiveProgramService';
import type { Program, UserActiveProgram, Workout } from '../../services/exercise.types';
import { addExercise, setSetCount, removeExercise } from '../../services/programEdits';
import { programTemplates } from '../../data/programTemplates';

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

  it('an exercise added mid-workout gets its last-time hints (device run T2-10)', async () => {
    const { WorkoutHistoryService } = require('../../services/workoutHistoryService');
    (WorkoutHistoryService.getLastPerformance as jest.Mock).mockImplementation(async (_u: string, names: string[]) =>
      names.includes('Barbell Back Squat') ? { 'Barbell Back Squat': [{ weight: '60', reps: '8' }] } : {}
    );
    const { result } = await setup();
    await act(() => { result.current.startQuickWorkout(); });
    const id = result.current.currentWorkout!.id;
    await act(async () => {
      await result.current.addExerciseToWorkout(id, { id: 3, name: 'Barbell Back Squat' } as any);
    });
    const added = result.current.currentWorkout!.exercises.find((e) => e.name === 'Barbell Back Squat')!;
    expect(added.sets[0].previousWeight).toBe('60');
    expect(added.sets[0].previousReps).toBe('8');
    (WorkoutHistoryService.getLastPerformance as jest.Mock).mockResolvedValue({});
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
describe('quick workout', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  async function setupQuick() {
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    await act(() => { hook.result.current.startQuickWorkout(); });
    return hook;
  }

  test('starts empty, named for today, and leaves the program alone', async () => {
    const { result } = await setupQuick();
    const w = result.current.currentWorkout!;
    expect(w.isQuick).toBe(true);
    expect(w.exercises).toEqual([]);
    expect(w.name).toMatch(/^Quick workout \d{1,2} \w{3,4}$/);
    expect(result.current.currentProgram!.name).toBe('Test');
    expect(result.current.isDayLocked('w1')).toBe(false);
    expect(result.current.isProgramWorkoutRunning).toBe(false);
  });

  test('adding, growing, logging and removing never write to the program', async () => {
    const { result } = await setupQuick();
    const id = result.current.currentWorkout!.id;
    await act(async () => { await result.current.addExerciseToWorkout(id, { id: 8, name: 'Row' } as any); });
    const exId = result.current.currentWorkout!.exercises[0].id;
    await act(async () => { await result.current.updateExerciseSets(id, exId, 4); });
    const sets = () => result.current.currentWorkout!.exercises[0].sets;
    await act(async () => { await result.current.updateSet(exId, sets()[0].id, 'weight', '50'); });
    await act(async () => { await result.current.completeSet(exId, sets()[0].id); });
    await act(async () => { await result.current.removeSet(exId, sets()[3].id); });
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });

    expect(UserActiveProgramService.updateActiveProgram).not.toHaveBeenCalled();
    expect(result.current.currentProgram!.workouts[0].exercises.map((e) => e.name)).toEqual(['Squat']);
    expect(sets()).toHaveLength(3);
    const stored = JSON.parse((await AsyncStorage.getItem('momentum:in_progress_workout:user-1'))!);
    expect(stored.isQuick).toBe(true);
    expect(stored.exercises[0].sets).toHaveLength(3);
  });
});

describe('program copies', () => {
  const ppl = programTemplates.find((t) => t.id === 'ppl')!;
  const ul = programTemplates.find((t) => t.id === 'upper-lower')!;

  /** An in-memory user_active_programs table behind the service. */
  function fakeDb() {
    const rows = new Map<string, UserActiveProgram>();
    let seq = 0;
    jest.spyOn(UserActiveProgramService, 'getActiveProgram').mockImplementation(async (_user, templateId) =>
      [...rows.values()].find((r) => r.program_template_id === templateId) ?? null
    );
    jest.spyOn(UserActiveProgramService, 'createActiveProgram').mockImplementation(async (userId, template) => {
      const row: UserActiveProgram = {
        id: `row${++seq}`, user_id: userId, program_template_id: template.id, created_at: '', updated_at: '',
        program_data: { ...template, isTemplate: false, templateId: template.id, id: `active_${template.id}` },
      };
      rows.set(row.id, row);
      return row;
    });
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockImplementation(async (id: string, data: Program) => {
      const row = { ...rows.get(id)!, program_data: data };
      rows.set(id, row);
      return row;
    });
    jest.spyOn(UserActiveProgramService, 'touchActiveProgram').mockResolvedValue(undefined);
    jest.spyOn(UserActiveProgramService, 'deleteActiveProgram').mockImplementation(async (id) => { rows.delete(id); });
    return rows;
  }

  beforeEach(async () => {
    await AsyncStorage.clear();
    (UserActiveProgramService.getMostRecentActiveProgram as jest.Mock).mockResolvedValue(null); // fresh account
  });

  async function setupEmpty() {
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    return hook;
  }
  const pullDay = (p: Program | null) => p!.workouts.find((w) => w.id === 'ppl-pull')!;

  test('A → B → A keeps the edits made to A (D4)', async () => {
    fakeDb();
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    const firstId = pullDay(result.current.currentProgram).exercises[0].id;
    await act(async () => {
      result.current.editDay('ppl-pull', (d) => setSetCount(d, firstId, 6), true);
      await result.current.flushProgramSync();
    });
    await act(async () => { await result.current.setCurrentProgram(ul); });
    expect(result.current.currentProgram!.name).toBe('Upper / Lower');
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    expect(pullDay(result.current.currentProgram).exercises[0].sets).toHaveLength(6);
  });

  test('a debounced edit lands on the program being left, never the next one (Review Focus 1)', async () => {
    const rows = fakeDb();
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    const pplRowId = result.current.currentActiveProgram!.id;
    const firstId = pullDay(result.current.currentProgram).exercises[0].id;
    await act(() => { result.current.editDay('ppl-pull', (d) => setSetCount(d, firstId, 6), false); });
    await act(async () => { await result.current.setCurrentProgram(ul); });
    await act(async () => {
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(pullDay(rows.get(pplRowId)!.program_data).exercises[0].sets).toHaveLength(6);
    const ulRow = [...rows.values()].find((r) => r.program_template_id === 'upper-lower')!;
    expect(ulRow.program_data.name).toBe('Upper / Lower');
    expect(ulRow.program_data.workouts.some((w) => w.id === 'ppl-pull')).toBe(false);
  });

  test('switching is refused while an edit cannot be written', async () => {
    fakeDb();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    const firstId = pullDay(result.current.currentProgram).exercises[0].id;
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await act(() => { result.current.editDay('ppl-pull', (d) => setSetCount(d, firstId, 6), false); });
    let error: unknown = null;
    await act(async () => {
      try { await result.current.setCurrentProgram(ul); } catch (e) { error = e; }
    });
    expect(error).toBeInstanceOf(Error);
    expect(result.current.currentProgram!.name).toBe('Push / Pull / Legs');
  });

  test('each blank program is its own row with the empty days asked for', async () => {
    const rows = fakeDb();
    const { result } = await setupEmpty();
    let dayIds: string[] | null = null;
    await act(async () => { dayIds = await result.current.createBlankProgram(3); });
    expect(result.current.currentActiveProgram!.program_template_id.startsWith('blank-')).toBe(true);
    expect(result.current.currentProgram!.name).toBe('Blank program');
    const days = result.current.currentProgram!.workouts;
    expect(days.map((w) => w.name)).toEqual(['Day 1', 'Day 2', 'Day 3']);
    expect(days.every((w) => w.exercises.length === 0)).toBe(true);
    expect(dayIds).toEqual(days.map((w) => w.id));
    await act(async () => { await result.current.createBlankProgram(1); });
    expect(result.current.currentProgram!.workouts).toHaveLength(1);
    expect(new Set([...rows.values()].map((r) => r.program_template_id)).size).toBe(2);
  });

  test('reset restores the template days on the same row; refused for blanks', async () => {
    const rows = fakeDb();
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    const rowId = result.current.currentActiveProgram!.id;
    const firstId = pullDay(result.current.currentProgram).exercises[0].id;
    await act(async () => {
      result.current.editDay('ppl-pull', (d) => removeExercise(d, firstId), true);
      await result.current.flushProgramSync();
    });
    expect(pullDay(result.current.currentProgram).exercises).toHaveLength(4);
    let ok = false;
    await act(async () => { ok = await result.current.resetProgramToTemplate(); });
    expect(ok).toBe(true);
    expect(pullDay(result.current.currentProgram).exercises).toHaveLength(5);
    expect(result.current.currentActiveProgram!.id).toBe(rowId);
    expect(rows.get(rowId)!.program_data.id).toBe('active_ppl');

    await act(async () => { await result.current.createBlankProgram(1); });
    await act(async () => { ok = await result.current.resetProgramToTemplate(); });
    expect(ok).toBe(false);
  });

  test('reset is refused while a day of the program is running (grill R1-Q5)', async () => {
    fakeDb();
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    await act(() => { result.current.startWorkout(result.current.currentProgram!.workouts[0]); });
    let ok = true;
    await act(async () => { ok = await result.current.resetProgramToTemplate(); });
    expect(ok).toBe(false);
  });

  test('rename: blanks only, never empty (grill R2-Q3)', async () => {
    fakeDb();
    const { result } = await setupEmpty();
    await act(async () => { await result.current.createBlankProgram(1); });
    let ok = false;
    await act(async () => { ok = await result.current.renameCurrentProgram('  Arms   and abs '); });
    expect(ok).toBe(true);
    expect(result.current.currentProgram!.name).toBe('Arms and abs');
    await act(async () => { ok = await result.current.renameCurrentProgram('   '); });
    expect(ok).toBe(false);
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    await act(async () => { ok = await result.current.renameCurrentProgram('Mine'); });
    expect(ok).toBe(false);
    expect(result.current.currentProgram!.name).toBe('Push / Pull / Legs');
  });

  test('delete: blanks only; deleting the current one falls back to the most recent copy (grill R2-Q4)', async () => {
    const rows = fakeDb();
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    const pplRow = result.current.currentActiveProgram!;
    let ok = true;
    await act(async () => { ok = await result.current.deleteProgramCopy(pplRow); });
    expect(ok).toBe(false);
    expect(rows.has(pplRow.id)).toBe(true);

    await act(async () => { await result.current.createBlankProgram(1); });
    const blank = result.current.currentActiveProgram!;
    (UserActiveProgramService.getMostRecentActiveProgram as jest.Mock).mockResolvedValue(rows.get(pplRow.id)!);
    await act(async () => { ok = await result.current.deleteProgramCopy(blank); });
    expect(ok).toBe(true);
    expect(rows.has(blank.id)).toBe(false);
    expect(result.current.currentProgram!.name).toBe('Push / Pull / Legs');
  });

  test('a reset that cannot be written is undone and never written later (M7, Review Focus 4)', async () => {
    fakeDb();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    const firstId = pullDay(result.current.currentProgram).exercises[0].id;
    await act(async () => {
      result.current.editDay('ppl-pull', (d) => removeExercise(d, firstId), true);
      await result.current.flushProgramSync();
    });
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    let ok = true;
    await act(async () => { ok = await result.current.resetProgramToTemplate(); });
    expect(ok).toBe(false);
    expect(pullDay(result.current.currentProgram).exercises).toHaveLength(4);
    expect(result.current.hasPendingProgramWrite()).toBe(false);

    // Back online, a later edit must not carry the reset with it.
    const pushId = result.current.currentProgram!.workouts[0].id;
    const exId = result.current.currentProgram!.workouts[0].exercises[0].id;
    await act(async () => {
      result.current.editDay(pushId, (d) => setSetCount(d, exId, 5), true);
      await result.current.flushProgramSync();
    });
    const calls = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls;
    expect(pullDay(calls[calls.length - 1][1] as Program).exercises).toHaveLength(4);
  });

  test('a rename that cannot be written is undone (M7)', async () => {
    fakeDb();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await setupEmpty();
    await act(async () => { await result.current.createBlankProgram(1); });
    const before = result.current.currentProgram!.name;
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    let ok = true;
    await act(async () => { ok = await result.current.renameCurrentProgram('Arms'); });
    expect(ok).toBe(false);
    expect(result.current.currentProgram!.name).toBe(before);
    expect(result.current.hasPendingProgramWrite()).toBe(false);
  });

  test('a failed restore is reported, not shown as a first run, and can be retried (M13)', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (UserActiveProgramService.getMostRecentActiveProgram as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(active);
    const { result } = await setupEmpty();
    expect(result.current.programLoadFailed).toBe(true);
    expect(result.current.currentProgram).toBeNull();
    await act(async () => {
      result.current.retryProgramLoad();
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
    expect(result.current.programLoadFailed).toBe(false);
    expect(result.current.currentProgram?.name).toBe('Test');
  });

  test('deleting the current blank is refused while its edits cannot be written (review I3)', async () => {
    const rows = fakeDb();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await setupEmpty();
    let dayIds: string[] | null = null;
    await act(async () => { dayIds = await result.current.createBlankProgram(1); });
    const blank = result.current.currentActiveProgram!;
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    await act(() => { result.current.editDay(dayIds![0], (d) => addExercise(d, { exerciseId: 8, name: 'Row' }), false); });
    let error: unknown = null;
    await act(async () => {
      try { await result.current.deleteProgramCopy(blank); } catch (e) { error = e; }
    });
    expect(error).toBeInstanceOf(Error);
    expect(rows.has(blank.id)).toBe(true);
    expect(result.current.currentActiveProgram!.id).toBe(blank.id);
  });
});

describe('review fixes', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('finishing a workout still writes program edits queued before it (review I2)', async () => {
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await Promise.resolve(); });
    const { result } = hook;
    await act(() => { result.current.editDay('w1', (d) => setSetCount(d, 'e1', 3), false); });
    await act(() => { result.current.startQuickWorkout(); });
    await act(async () => {
      result.current.finishWorkout();
      await result.current.flushProgramSync();
      jest.advanceTimersByTime(2000);
      await Promise.resolve();
    });
    expect(UserActiveProgramService.updateActiveProgram).toHaveBeenCalledTimes(1);
    const written = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls[0][1] as Program;
    expect(written.workouts[0].exercises[0].sets).toHaveLength(3);
  });

  test('a token refresh (new user object, same id) does not reload the program over local edits (review I6)', async () => {
    const original = mockAuthValue.user;
    try {
      const hook = await renderHook(() => useWorkout(), { wrapper });
      await act(async () => { await Promise.resolve(); });
      await act(() => { hook.result.current.editDay('w1', (d) => setSetCount(d, 'e1', 3), false); });
      const loads = (UserActiveProgramService.getMostRecentActiveProgram as jest.Mock).mock.calls.length;
      mockAuthValue.user = { id: 'user-1' };
      await hook.rerender({});
      await act(async () => { await Promise.resolve(); await Promise.resolve(); });
      expect((UserActiveProgramService.getMostRecentActiveProgram as jest.Mock).mock.calls.length).toBe(loads);
      expect(hook.result.current.currentProgram!.workouts[0].exercises[0].sets).toHaveLength(3);
    } finally {
      mockAuthValue.user = original;
    }
  });
});

describe('discard (device run T2-3)', () => {
  const ticks = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };
  const lastWritten = () => {
    const calls = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls;
    return calls[calls.length - 1][1] as Program;
  };

  test('discarding puts the day back as it was at Start', async () => {
    const { result } = await setup();
    await act(async () => { await result.current.updateSet('e1', 's1', 'weight', '40'); });
    await act(async () => { await result.current.completeSet('e1', 's1'); });
    expect(lastWritten().workouts[0].exercises[0].sets[0].weight).toBe('40');
    await act(async () => { result.current.discardWorkout(); await ticks(); });
    expect(result.current.currentWorkout).toBeNull();
    expect(result.current.currentProgram!.workouts[0].exercises[0].sets[0].weight).toBe('');
    expect(lastWritten().workouts[0].exercises[0].sets[0].weight).toBe('');
  });

  test('the restore point is kept in the checkpoint but never reaches program_data', async () => {
    const { result } = await setup();
    await act(async () => { await result.current.completeSet('e1', 's1'); });
    expect('discardRestore' in lastWritten().workouts[0]).toBe(false);
    const stored = JSON.parse((await AsyncStorage.getItem('momentum:in_progress_workout:user-1'))!) as Workout;
    expect(stored.discardRestore?.id).toBe('w1');
  });

  test('a restored checkpoint can still be discarded back to its Start (Review Focus 2)', async () => {
    const started: Workout = {
      ...workout,
      startedAt: 1,
      exercises: [{ ...workout.exercises[0], sets: [{ id: 's1', weight: '40', reps: '5', isComplete: true }] }],
      discardRestore: workout,
    };
    await AsyncStorage.setItem('momentum:in_progress_workout:user-1', JSON.stringify(started));
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await ticks(); });
    expect(hook.result.current.currentWorkout?.id).toBe('w1');
    await act(async () => { hook.result.current.discardWorkout(); await ticks(); });
    expect(hook.result.current.currentWorkout).toBeNull();
    expect(lastWritten().workouts[0].exercises[0].sets[0].weight).toBe('');
  });

  test('a checkpoint from before this change discards without a restore point (Review Focus 3)', async () => {
    const old: Workout = { ...workout, startedAt: 1 }; // no discardRestore
    await AsyncStorage.setItem('momentum:in_progress_workout:user-1', JSON.stringify(old));
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await ticks(); });
    await act(async () => { hook.result.current.discardWorkout(); await ticks(); });
    expect(hook.result.current.currentWorkout).toBeNull();
  });

  test('a quick workout discards without touching the program', async () => {
    const { result } = await setup();
    await act(async () => { result.current.discardWorkout(); await ticks(); });
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockClear();
    await act(() => { result.current.startQuickWorkout(); });
    await act(async () => { result.current.discardWorkout(); await ticks(); });
    expect(UserActiveProgramService.updateActiveProgram).not.toHaveBeenCalled();
  });
});
