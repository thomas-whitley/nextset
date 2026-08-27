import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserActiveProgramService } from '../services/userActiveProgramService';
import { WorkoutHistoryService } from '../services/workoutHistoryService';
import { Exercise as DetailedExercise, Program, Workout, UserActiveProgram } from '../services/exercise.types';
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
          setCurrentWorkout(JSON.parse(stored) as Workout);
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
          return {
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
        });
      })
      .catch((error) => console.error('Failed to load last performance:', error));
  };

  /** Applies a workout edit to local state and, when a cloud copy exists, persists the whole program. */
  const applyWorkoutUpdate = async (updatedWorkout: Workout, label: string) => {
    setCurrentWorkout(updatedWorkout);
    persistWorkoutCheckpoint(updatedWorkout);

    if (!currentActiveProgram || !currentProgram) return;

    try {
      const updatedProgram: Program = {
        ...currentProgram,
        workouts: currentProgram.workouts.map((w) => (w.id === updatedWorkout.id ? updatedWorkout : w)),
      };
      await UserActiveProgramService.updateActiveProgram(currentActiveProgram.id, updatedProgram);
      setCurrentProgramState(updatedProgram);
    } catch (error) {
      console.error(`Failed to ${label} in database:`, error);
    }
  };

  const updateSet = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    if (!currentWorkout) return;

    const updatedWorkout: Workout = {
      ...currentWorkout,
      exercises: currentWorkout.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: exercise.sets.map((set) => (set.id === setId ? { ...set, [field]: value } : set)) }
          : exercise
      ),
    };

    await applyWorkoutUpdate(updatedWorkout, 'update set');
  };

  const completeSet = async (exerciseId: string, setId: string) => {
    if (!currentWorkout) return;

    const updatedWorkout: Workout = {
      ...currentWorkout,
      exercises: currentWorkout.exercises.map((exercise) =>
        exercise.id === exerciseId
          ? { ...exercise, sets: exercise.sets.map((set) => (set.id === setId ? { ...set, isComplete: !set.isComplete } : set)) }
          : exercise
      ),
    };

    await applyWorkoutUpdate(updatedWorkout, 'complete set');
  };

  /** After the service rewrites the program, mirror it into state (and the running workout if affected). */
  const adoptActiveProgram = (updated: UserActiveProgram, workoutId: string) => {
    setCurrentActiveProgram(updated);
    const updatedProgram = updated.program_data as Program;
    setCurrentProgramState(updatedProgram);

    if (currentWorkout && currentWorkout.id === workoutId) {
      const updatedWorkout = updatedProgram.workouts.find((w) => w.id === workoutId);
      if (updatedWorkout) {
        // Keep the sets the user has already logged this session.
        const merged: Workout = {
          ...updatedWorkout,
          exercises: updatedWorkout.exercises.map((exercise) => {
            const live = currentWorkout.exercises.find((e) => e.id === exercise.id);
            if (!live) return exercise;
            return {
              ...exercise,
              sets: exercise.sets.map((set) => live.sets.find((s) => s.id === set.id) ?? set),
            };
          }),
        };
        setCurrentWorkout(merged);
        persistWorkoutCheckpoint(merged);
      }
    }
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
