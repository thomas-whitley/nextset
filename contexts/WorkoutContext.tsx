import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useReducer } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserActiveProgramService } from '../services/userActiveProgramService';
import { WorkoutHistoryService } from '../services/workoutHistoryService';
import { createProgramSync } from '../services/programSync';
import { Exercise as DetailedExercise, Program, Workout, UserActiveProgram } from '../services/exercise.types';
import { programTemplates } from '../data/programTemplates';
import { useAuth } from '../data/AuthContext';
import { backfillRepsTargets } from '../services/repsTarget';
import { mergeBest, mergeBests, detectPr, type ExerciseBests } from '../services/prMath';
import { restReducer, IDLE_REST, type RestState, type RestAction } from '../services/restTimer';
import { cancelRestNotification } from '../services/restNotifications';
import { addExercise, removeExercise, setSetCount, reorderExercises as reorderExerciseList, reorderDays } from '../services/programEdits';

const workoutCheckpointKey = (userId: string) => `momentum:in_progress_workout:${userId}`;

interface WorkoutContextType {
  /** Built-in templates the user can choose from. */
  programs: Program[];
  /** The user's active program (their editable copy of a template), restored on launch. */
  currentProgram: Program | null;
  currentWorkout: Workout | null;
  currentActiveProgram: UserActiveProgram | null;
  isWorkoutActive: boolean;
  /** Wall-clock ms when the current workout started, or null when none is active. */
  workoutStartedAt: number | null;
  /** True until the active program has been looked up for the signed-in user. */
  isLoadingProgram: boolean;
  /** Best weight / e1RM per exerciseId, loaded when a workout starts and raised as sets complete. */
  exerciseBests: ExerciseBests;
  /** Rest-timer state, lifted here so it survives Minimise (the screen unmounts, this doesn't). */
  rest: RestState;
  dispatchRest: (action: RestAction) => void;
  setCurrentProgram: (program: Program) => Promise<void>;
  /** Forget the active program locally so the picker shows again (edits are kept in the cloud). */
  clearCurrentProgram: () => void;
  startWorkout: (workout: Workout) => void;
  updateSet: (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => Promise<void>;
  completeSet: (exerciseId: string, setId: string) => Promise<void>;
  /** Swaps an exercise's identity in the running workout, keeping the set count but clearing logged values. */
  replaceExercise: (exerciseId: string, next: DetailedExercise) => Promise<void>;
  finishWorkout: () => void;
  addExerciseToWorkout: (workoutId: string, exercise: DetailedExercise) => Promise<void>;
  removeExerciseFromWorkout: (workoutId: string, exerciseId: string) => Promise<void>;
  updateExerciseSets: (workoutId: string, exerciseId: string, newSetCount: number) => Promise<void>;
  reorderWorkouts: (workoutIds: string[]) => Promise<void>;
  /** Reorders the exercises within the current workout (drag-reorder on the workout screen). */
  reorderExercises: (orderedExerciseIds: string[]) => Promise<void>;
  /** Fold or unfold an exercise card. Local only: checkpointed, never synced (spec R7). */
  setExerciseCollapsed: (exerciseId: string, collapsed: boolean) => void;
  /** Remove one set from the running workout; refuses the exercise's last set. */
  removeSet: (exerciseId: string, setId: string) => Promise<void>;
  /** Write any pending program edits to Supabase now (blur, before save, app background). */
  flushProgramSync: () => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [programs] = useState<Program[]>(programTemplates);
  const [currentProgram, setCurrentProgramState] = useState<Program | null>(null);
  const [currentActiveProgram, setCurrentActiveProgram] = useState<UserActiveProgram | null>(null);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [isLoadingProgram, setIsLoadingProgram] = useState(true);
  const [exerciseBests, setExerciseBests] = useState<ExerciseBests>({});
  const [rest, dispatchRest] = useReducer(restReducer, IDLE_REST);
  const { user } = useAuth();

  // Refs mirror state so async code (the debounced program sync, effects that
  // fire after further edits) never reads a stale render-closure value.
  const currentWorkoutRef = useRef<Workout | null>(null);
  const currentProgramRef = useRef<Program | null>(null);
  const currentActiveProgramRef = useRef<UserActiveProgram | null>(null);
  const exerciseBestsRef = useRef<ExerciseBests>({});
  currentProgramRef.current = currentProgram;
  currentActiveProgramRef.current = currentActiveProgram;

  const programSync = useRef(
    createProgramSync(async (program) => {
      const activeProgram = currentActiveProgramRef.current;
      if (!activeProgram) return;
      const updated = await UserActiveProgramService.updateActiveProgram(activeProgram.id, program);
      setCurrentActiveProgram(updated);
    })
  ).current;

  // Flush on background so a killed app never loses more than the debounce window.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' || state === 'inactive') void programSync.flush();
    });
    return () => {
      sub.remove();
      void programSync.flush();
    };
  }, [programSync]);

  // Clear in-memory workout state on sign-out or account switch so a
  // previous user's program/workout data isn't visible to the next
  // signed-in user on a shared device.
  const previousUserId = useRef<string | null>(null);
  useEffect(() => {
    const currentUserId = user?.id ?? null;
    if (previousUserId.current !== null && previousUserId.current !== currentUserId) {
      setCurrentProgramState(null);
      setCurrentActiveProgram(null);
      setCurrentWorkout(null);
      currentWorkoutRef.current = null;
      setIsWorkoutActive(false);
    }
    previousUserId.current = currentUserId;
  }, [user]);

  // Restore the most recently used active program so Home can offer "Start"
  // straight after launch instead of forgetting the user's choice.
  useEffect(() => {
    if (!user) {
      setIsLoadingProgram(false);
      return;
    }
    let cancelled = false;
    setIsLoadingProgram(true);
    (async () => {
      try {
        const active = await UserActiveProgramService.getMostRecentActiveProgram(user.id);
        if (!cancelled && active) {
          setCurrentActiveProgram(active);
          const loaded = active.program_data as Program;
          const filled = backfillRepsTargets(loaded, programTemplates);
          currentProgramRef.current = filled;
          setCurrentProgramState(filled);
          if (filled !== loaded) programSync.schedule(filled); // lazy persist, spec D13
        }
      } catch (error) {
        console.error('Failed to restore active program:', error);
      } finally {
        if (!cancelled) setIsLoadingProgram(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const persistWorkoutCheckpoint = async (workout: Workout | null) => {
    if (!user) return;
    try {
      if (workout) {
        await AsyncStorage.setItem(workoutCheckpointKey(user.id), JSON.stringify(workout));
      } else {
        await AsyncStorage.removeItem(workoutCheckpointKey(user.id));
      }
    } catch (error) {
      console.error('Failed to checkpoint in-progress workout:', error);
    }
  };

  /** Fetches lifetime bests and folds them into whatever ticks already raised in-memory (item 5). */
  const loadBests = async (userId: string) => {
    try {
      const fetched = await WorkoutHistoryService.getExerciseBests(userId);
      const merged = mergeBests(exerciseBestsRef.current, fetched);
      exerciseBestsRef.current = merged;
      setExerciseBests(merged);
    } catch (error) {
      console.error('Failed to load exercise bests:', error);
    }
  };

  // Restore an in-progress workout that was checkpointed before the app was
  // backgrounded or killed, so logged sets aren't silently lost.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(workoutCheckpointKey(user.id));
        if (stored) {
          const restored = JSON.parse(stored) as Workout;
          // A checkpoint from before startedAt existed (or one that otherwise
          // lost it) must not show a blank/garbage duration on resume.
          let repaired = restored;
          if (repaired.startedAt === undefined) {
            repaired = { ...repaired, startedAt: Date.now() };
            await persistWorkoutCheckpoint(repaired);
          }
          currentWorkoutRef.current = repaired;
          setCurrentWorkout(repaired);
          setIsWorkoutActive(true);
          void loadBests(user.id);
        }
      } catch (error) {
        console.error('Failed to restore in-progress workout:', error);
      }
    })();
  }, [user]);

  const setCurrentProgram = async (program: Program) => {
    if (!user) {
      console.error('No user logged in');
      return;
    }

    try {
      // Reuse the user's existing copy of this template (keeps their edits),
      // otherwise create one from the template.
      let activeProgram = await UserActiveProgramService.getActiveProgram(user.id, program.id);

      if (activeProgram) {
        await UserActiveProgramService.touchActiveProgram(activeProgram.id);
      } else {
        activeProgram = await UserActiveProgramService.createActiveProgram(user.id, program);
      }

      setCurrentActiveProgram(activeProgram);
      setCurrentProgramState(activeProgram.program_data as Program);
    } catch (error) {
      console.error('Failed to set current program:', error);
      // Fallback to using the template directly
      setCurrentProgramState(program);
    }
  };

  const clearCurrentProgram = useCallback(() => {
    setCurrentProgramState(null);
    setCurrentActiveProgram(null);
  }, []);

  const startWorkout = (workout: Workout) => {
    // Start with a clean sheet: nothing ticked, weights as the template/last edit left them.
    const fresh: Workout = {
      ...workout,
      // Always a fresh session start — never the incoming template/program
      // workout's startedAt, or last week's session start leaks into this one
      // (item 1). The AsyncStorage checkpoint is the only place startedAt
      // survives across app restarts (see the restore effect above).
      startedAt: Date.now(),
      collapsedExerciseIds: [],
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set, isComplete: false, pr: undefined, previousWeight: undefined, previousReps: undefined })),
      })),
    };
    currentWorkoutRef.current = fresh;
    setCurrentWorkout(fresh);
    setIsWorkoutActive(true);
    persistWorkoutCheckpoint(fresh);

    // Fill in "last time" hints from history once they arrive.
    if (!user) return;

    void loadBests(user.id);

    const names = fresh.exercises.map((e) => e.name);
    WorkoutHistoryService.getLastPerformance(user.id, names)
      .then((last) => {
        setCurrentWorkout((current) => {
          if (!current || current.id !== fresh.id) return current;
          const filled: Workout = {
            ...current,
            exercises: current.exercises.map((exercise) => {
              const prev = last[exercise.name];
              if (!prev) return exercise;
              return {
                ...exercise,
                sets: exercise.sets.map((set, i) => {
                  const p = prev[Math.min(i, prev.length - 1)];
                  return { ...set, previousWeight: p.weight, previousReps: p.reps };
                }),
              };
            }),
          };
          currentWorkoutRef.current = filled;
          return filled;
        });
      })
      .catch((error) => console.error('Failed to load last performance:', error));
  };

  /**
   * The one way program_data changes: edit the in-memory program (the ref,
   * never the render closure), then schedule the debounced write, or write
   * now when `immediate`. Returns false when there was nothing to change or
   * no cloud copy to write to.
   */
  const applyProgramUpdate = (edit: (program: Program) => Program | null, immediate: boolean): boolean => {
    const program = currentProgramRef.current;
    if (!program || !currentActiveProgramRef.current) return false;
    const next = edit(program);
    if (!next) return false;
    currentProgramRef.current = next;
    setCurrentProgramState(next);
    programSync.schedule(next);
    if (immediate) void programSync.flush();
    return true;
  };

  /**
   * Applies an edit to the running workout using the *latest* workout (the
   * ref, not the render closure), then checkpoints locally at once and
   * schedules (or flushes) the cloud write. `edit` must be pure: it receives
   * the current workout and returns the next one, or null to make no change.
   * A ref (not a state updater) is the source of truth here so rapid
   * same-tick calls chain correctly without depending on React running
   * updaters synchronously.
   */
  const applyWorkoutUpdate = (edit: (current: Workout) => Workout | null, immediate: boolean) => {
    const current = currentWorkoutRef.current;
    if (!current) return;
    const next = edit(current);
    if (!next) return;
    currentWorkoutRef.current = next;
    setCurrentWorkout(next);
    persistWorkoutCheckpoint(next);

    // A quick workout belongs to no program (spec D12): the checkpoint above is its only copy.
    if (next.isQuick) return;
    // Strip transient session-only fields before this lands in program_data:
    // startedAt (item 1 — otherwise next week's session inherits this week's
    // start time) and each set's pr flag (item 2 — a per-session PR badge has
    // no business surviving into the program template), and
    // collapsedExerciseIds (spec R7) — a fold is how this session looks, not part of the program.
    const { startedAt, collapsedExerciseIds, ...forProgram } = next;
    const forProgramWorkout: Workout = {
      ...forProgram,
      exercises: forProgram.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map(({ pr, ...set }) => set),
      })),
    };
    applyProgramUpdate(
      (program) => ({
        ...program,
        // Keep the program's own order for this day. Days can be reordered on
        // the Programs tab while this workout runs, and the live copy still
        // carries the order it started with.
        workouts: program.workouts.map((w) => (w.id === forProgramWorkout.id ? { ...forProgramWorkout, order: w.order } : w)),
      }),
      immediate
    );
  };

  const updateSet = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    applyWorkoutUpdate(
      (current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? { ...exercise, sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)) }
            : exercise
        ),
      }),
      false
    );
  };

  const completeSet = async (exerciseId: string, setId: string) => {
    applyWorkoutUpdate(
      (current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets.map((set) => {
                  if (set.id !== setId) return set;
                  if (set.isComplete) return { ...set, isComplete: false, pr: undefined }; // un-ticking clears the flag
                  // Flag the PR now, against bests as they stood BEFORE this
                  // tick (item 2) — mergeBest below raises exerciseBests only
                  // after this flag is computed, so a set never gets compared
                  // against a record it just set.
                  const flag = detectPr(exerciseBestsRef.current, exercise.exerciseId, set.weight, set.reps);
                  const pr = flag.weight && flag.e1rm ? 'both' : flag.weight ? 'weight' : flag.e1rm ? 'e1rm' : undefined;
                  return { ...set, isComplete: true, pr };
                }),
              }
            : exercise
        ),
      }),
      true
    );

    const live = currentWorkoutRef.current?.exercises.find((e) => e.id === exerciseId);
    const set = live?.sets.find((s) => s.id === setId);
    if (live && set?.isComplete) {
      const next = mergeBest(exerciseBestsRef.current, live.exerciseId, set.weight, set.reps);
      if (next !== exerciseBestsRef.current) {
        exerciseBestsRef.current = next;
        setExerciseBests(next);
      }
    }

    await programSync.flush();
  };

  const reorderExercises = async (orderedExerciseIds: string[]) => {
    // Never silently shrink the list on a stale or partial ordering: the pure edit refuses it.
    applyWorkoutUpdate((current) => reorderExerciseList(current, orderedExerciseIds), true);
    await programSync.flush();
  };

  const setExerciseCollapsed = (exerciseId: string, collapsed: boolean) => {
    const current = currentWorkoutRef.current;
    if (!current) return;
    const ids = current.collapsedExerciseIds ?? [];
    const has = ids.includes(exerciseId);
    if (has === collapsed) return;
    const next: Workout = {
      ...current,
      collapsedExerciseIds: collapsed ? [...ids, exerciseId] : ids.filter((id) => id !== exerciseId),
    };
    // Deliberately not applyWorkoutUpdate: a fold must not schedule a cloud write.
    currentWorkoutRef.current = next;
    setCurrentWorkout(next);
    persistWorkoutCheckpoint(next);
  };

  const removeSet = async (exerciseId: string, setId: string) => {
    applyWorkoutUpdate((current) => {
      const exercise = current.exercises.find((e) => e.id === exerciseId);
      if (!exercise || exercise.sets.length <= 1 || !exercise.sets.some((s) => s.id === setId)) return null;
      return {
        ...current,
        exercises: current.exercises.map((e) =>
          e.id === exerciseId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e
        ),
      };
    }, true);
    await programSync.flush();
  };

  const flushProgramSync = () => programSync.flush();

  const replaceExercise = async (exerciseId: string, next: DetailedExercise) => {
    applyWorkoutUpdate(
      (current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                exerciseId: next.id,
                name: next.name,
                sets: exercise.sets.map((set) => ({
                  ...set,
                  weight: '',
                  reps: '',
                  isComplete: false,
                  previousWeight: undefined,
                  previousReps: undefined,
                })),
              }
            : exercise
        ),
      }),
      true
    );
    await programSync.flush();
    if (!user) return;
    const last = await WorkoutHistoryService.getLastPerformance(user.id, [next.name]).catch(
      () => ({} as Record<string, { weight: string; reps: string }[]>)
    );
    const prev = last[next.name];
    if (!prev) return;
    applyWorkoutUpdate(
      (current) => ({
        ...current,
        exercises: current.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets.map((set, i) => {
                  const p = prev[Math.min(i, prev.length - 1)];
                  return { ...set, previousWeight: p.weight, previousReps: p.reps };
                }),
              }
            : exercise
        ),
      }),
      false
    );
  };

  // The running workout's structure edits. The same code serves a program day
  // (applyWorkoutUpdate mirrors it into program_data) and a quick workout
  // (checkpoint only), so workout.tsx does not need to know which it is
  // (grill R1-Q4).
  const addExerciseToWorkout = async (workoutId: string, exercise: DetailedExercise) => {
    applyWorkoutUpdate(
      (current) => (current.id === workoutId ? addExercise(current, { exerciseId: exercise.id, name: exercise.name }) : null),
      true
    );
    await programSync.flush();
  };

  const removeExerciseFromWorkout = async (workoutId: string, exerciseId: string) => {
    applyWorkoutUpdate((current) => (current.id === workoutId ? removeExercise(current, exerciseId) : null), true);
    await programSync.flush();
  };

  const updateExerciseSets = async (workoutId: string, exerciseId: string, newSetCount: number) => {
    applyWorkoutUpdate((current) => (current.id === workoutId ? setSetCount(current, exerciseId, newSetCount) : null), true);
    await programSync.flush();
  };

  const reorderWorkouts = async (workoutIds: string[]) => {
    applyProgramUpdate((program) => reorderDays(program, workoutIds), true);
    await programSync.flush();
  };

  const finishWorkout = () => {
    programSync.cancel(); // the finished workout is saved to history, not to the program
    currentWorkoutRef.current = null;
    setCurrentWorkout(null);
    setIsWorkoutActive(false);
    persistWorkoutCheckpoint(null);
    exerciseBestsRef.current = {};
    setExerciseBests({});
    dispatchRest({ type: 'skip' }); // back to IDLE_REST; a rest banner must not survive into the next workout
    void cancelRestNotification();
  };

  return (
    <WorkoutContext.Provider
      value={{
        programs,
        currentProgram,
        currentWorkout,
        currentActiveProgram,
        isWorkoutActive,
        workoutStartedAt: currentWorkout?.startedAt ?? null,
        isLoadingProgram,
        exerciseBests,
        rest,
        dispatchRest,
        setCurrentProgram,
        clearCurrentProgram,
        startWorkout,
        updateSet,
        completeSet,
        replaceExercise,
        finishWorkout,
        addExerciseToWorkout,
        removeExerciseFromWorkout,
        updateExerciseSets,
        reorderWorkouts,
        reorderExercises,
        setExerciseCollapsed,
        removeSet,
        flushProgramSync,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
