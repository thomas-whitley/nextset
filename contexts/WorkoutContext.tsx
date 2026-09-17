import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserActiveProgramService } from '../services/userActiveProgramService';
import { WorkoutHistoryService } from '../services/workoutHistoryService';
import { createProgramSync } from '../services/programSync';
import { Exercise as DetailedExercise, Program, Workout, WorkoutExercise, UserActiveProgram } from '../services/exercise.types';
import { programTemplates } from '../data/programTemplates';
import { useAuth } from '../data/AuthContext';

const workoutCheckpointKey = (userId: string) => `momentum:in_progress_workout:${userId}`;

interface WorkoutContextType {
  /** Built-in templates the user can choose from. */
  programs: Program[];
  /** The user's active program (their editable copy of a template), restored on launch. */
  currentProgram: Program | null;
  currentWorkout: Workout | null;
  currentActiveProgram: UserActiveProgram | null;
  isWorkoutActive: boolean;
  /** True until the active program has been looked up for the signed-in user. */
  isLoadingProgram: boolean;
  setCurrentProgram: (program: Program) => Promise<void>;
  /** Forget the active program locally so the picker shows again (edits are kept in the cloud). */
  clearCurrentProgram: () => void;
  startWorkout: (workout: Workout) => void;
  updateSet: (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => Promise<void>;
  completeSet: (exerciseId: string, setId: string) => Promise<void>;
  finishWorkout: () => void;
  addExerciseToWorkout: (workoutId: string, exercise: DetailedExercise) => Promise<void>;
  removeExerciseFromWorkout: (workoutId: string, exerciseId: string) => Promise<void>;
  updateExerciseSets: (workoutId: string, exerciseId: string, newSetCount: number) => Promise<void>;
  reorderWorkouts: (workoutIds: string[]) => Promise<void>;
  /** Reorders the exercises within the current workout (drag-reorder on the workout screen). */
  reorderExercises: (orderedExerciseIds: string[]) => Promise<void>;
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
  const { user } = useAuth();

  // Refs mirror state so async code (the debounced program sync, effects that
  // fire after further edits) never reads a stale render-closure value.
  const currentWorkoutRef = useRef<Workout | null>(null);
  const currentProgramRef = useRef<Program | null>(null);
  const currentActiveProgramRef = useRef<UserActiveProgram | null>(null);
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
          setCurrentProgramState(active.program_data as Program);
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

  // Restore an in-progress workout that was checkpointed before the app was
  // backgrounded or killed, so logged sets aren't silently lost.
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(workoutCheckpointKey(user.id));
        if (stored) {
          const restored = JSON.parse(stored) as Workout;
          currentWorkoutRef.current = restored;
          setCurrentWorkout(restored);
          setIsWorkoutActive(true);
        }
      } catch (error) {
        console.error('Failed to restore in-progress workout:', error);
      }
    })();
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
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({ ...set, isComplete: false, previousWeight: undefined, previousReps: undefined })),
      })),
    };
    currentWorkoutRef.current = fresh;
    setCurrentWorkout(fresh);
    setIsWorkoutActive(true);
    persistWorkoutCheckpoint(fresh);

    // Fill in "last time" hints from history once they arrive.
    if (!user) return;
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

    const program = currentProgramRef.current;
    if (!program || !currentActiveProgramRef.current) return;
    const updatedProgram: Program = {
      ...program,
      workouts: program.workouts.map((w) => (w.id === next.id ? next : w)),
    };
    currentProgramRef.current = updatedProgram;
    setCurrentProgramState(updatedProgram);
    programSync.schedule(updatedProgram);
    if (immediate) void programSync.flush();
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
            ? { ...exercise, sets: exercise.sets.map((set) => (set.id === setId ? { ...set, isComplete: !set.isComplete } : set)) }
            : exercise
        ),
      }),
      true
    );
    await programSync.flush();
  };

  const reorderExercises = async (orderedExerciseIds: string[]) => {
    applyWorkoutUpdate((current) => {
      const byId = new Map(current.exercises.map((exercise) => [exercise.id, exercise]));
      const reordered = orderedExerciseIds
        .map((id, index) => {
          const exercise = byId.get(id);
          return exercise ? { ...exercise, order: index } : undefined;
        })
        .filter((exercise): exercise is WorkoutExercise => exercise !== undefined);
      // Never silently shrink the list on a stale or partial ordering.
      if (reordered.length !== current.exercises.length) return null;
      return { ...current, exercises: reordered };
    }, true);
    await programSync.flush();
  };

  const flushProgramSync = () => programSync.flush();

  /** After the service rewrites the program, mirror it into state (and the running workout if affected). */
  const adoptActiveProgram = (updated: UserActiveProgram, workoutId: string) => {
    setCurrentActiveProgram(updated);
    const updatedProgram = updated.program_data as Program;
    currentProgramRef.current = updatedProgram;
    setCurrentProgramState(updatedProgram);

    const live = currentWorkoutRef.current;
    if (!live || live.id !== workoutId) return;
    const updatedWorkout = updatedProgram.workouts.find((w) => w.id === workoutId);
    if (!updatedWorkout) return;

    // Keep the sets the user has already logged this session.
    const merged: Workout = {
      ...updatedWorkout,
      exercises: updatedWorkout.exercises.map((exercise) => {
        const liveExercise = live.exercises.find((e) => e.id === exercise.id);
        if (!liveExercise) return exercise;
        return {
          ...exercise,
          sets: exercise.sets.map((set) => liveExercise.sets.find((s) => s.id === set.id) ?? set),
        };
      }),
    };
    currentWorkoutRef.current = merged;
    setCurrentWorkout(merged);
    persistWorkoutCheckpoint(merged);
  };

  const addExerciseToWorkout = async (workoutId: string, exercise: DetailedExercise) => {
    if (!currentActiveProgram) return;

    try {
      const updated = await UserActiveProgramService.addExerciseToWorkout(currentActiveProgram.id, workoutId, {
        exerciseId: exercise.id,
        name: exercise.name,
        sets: 3,
      });
      adoptActiveProgram(updated, workoutId);
    } catch (error) {
      console.error('Failed to add exercise to workout:', error);
      throw error;
    }
  };

  const removeExerciseFromWorkout = async (workoutId: string, exerciseId: string) => {
    if (!currentActiveProgram) return;

    try {
      const updated = await UserActiveProgramService.removeExerciseFromWorkout(currentActiveProgram.id, workoutId, exerciseId);
      adoptActiveProgram(updated, workoutId);
    } catch (error) {
      console.error('Failed to remove exercise from workout:', error);
      throw error;
    }
  };

  const updateExerciseSets = async (workoutId: string, exerciseId: string, newSetCount: number) => {
    if (!currentActiveProgram) return;

    try {
      const updated = await UserActiveProgramService.updateExerciseSets(currentActiveProgram.id, workoutId, exerciseId, newSetCount);
      adoptActiveProgram(updated, workoutId);
    } catch (error) {
      console.error('Failed to update exercise sets:', error);
      throw error;
    }
  };

  const reorderWorkouts = async (workoutIds: string[]) => {
    if (!currentActiveProgram) return;

    try {
      const updated = await UserActiveProgramService.reorderWorkouts(currentActiveProgram.id, workoutIds);
      setCurrentActiveProgram(updated);
      setCurrentProgramState(updated.program_data as Program);
    } catch (error) {
      console.error('Failed to reorder workouts:', error);
      throw error;
    }
  };

  const finishWorkout = () => {
    programSync.cancel(); // the finished workout is saved to history, not to the program
    currentWorkoutRef.current = null;
    setCurrentWorkout(null);
    setIsWorkoutActive(false);
    persistWorkoutCheckpoint(null);
  };

  return (
    <WorkoutContext.Provider
      value={{
        programs,
        currentProgram,
        currentWorkout,
        currentActiveProgram,
        isWorkoutActive,
        isLoadingProgram,
        setCurrentProgram,
        clearCurrentProgram,
        startWorkout,
        updateSet,
        completeSet,
        finishWorkout,
        addExerciseToWorkout,
        removeExerciseFromWorkout,
        updateExerciseSets,
        reorderWorkouts,
        reorderExercises,
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
