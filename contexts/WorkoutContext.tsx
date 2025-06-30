import React, { createContext, useContext, useState, useEffect } from 'react';
import { ExerciseService } from '../services/exerciseService';
import { UserActiveProgramService } from '../services/userActiveProgramService';
import { Exercise as DetailedExercise, Program, Workout, WorkoutExercise, ExerciseSet, UserActiveProgram } from '../services/exercise.types';
import { useAuth } from '../data/AuthContext';

interface WorkoutContextType {
  programs: Program[];
  currentProgram: Program | null;
  currentWorkout: Workout | null;
  currentActiveProgram: UserActiveProgram | null;
  isWorkoutActive: boolean;
  masterExercises: DetailedExercise[];
  userCustomExercises: DetailedExercise[];
  isLoadingMasterExercises: boolean;
  isLoadingUserCustomExercises: boolean;
  setCurrentProgram: (program: Program) => Promise<void>;
  startWorkout: (workout: Workout) => void;
  updateSet: (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => Promise<void>;
  completeSet: (exerciseId: string, setId: string) => Promise<void>;
  finishWorkout: () => void;
  loadMasterExercises: () => Promise<void>;
  loadUserCustomExercises: () => Promise<void>;
  addExerciseToWorkout: (workoutId: string, exercise: DetailedExercise) => Promise<void>;
  updateExerciseSets: (workoutId: string, exerciseId: string, newSetCount: number) => Promise<void>;
  reorderWorkouts: (workoutIds: string[]) => Promise<void>;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

const mockPrograms: Program[] = [
  {
    id: '1',
    name: '5-Day Split',
    creator: 'You',
    description: 'A comprehensive 5-day workout split focusing on different muscle groups each day.',
    imageUrl: 'https://images.pexels.com/photos/4164761/pexels-photo-4164761.jpeg',
    isTemplate: true,
    workouts: [
      {
        id: '1-1',
        name: 'Push Day',
        description: 'Chest, Shoulders, Triceps',
        order: 0,
        exercises: [
          {
            id: 'e1',
            exerciseId: 1,
            name: 'Bench Press',
            order: 0,
            sets: [
              { id: 's1', weight: '60', reps: '8', isComplete: false, previousWeight: '55', previousReps: '8' },
              { id: 's2', weight: '60', reps: '8', isComplete: false, previousWeight: '55', previousReps: '8' },
              { id: 's3', weight: '60', reps: '8', isComplete: false, previousWeight: '55', previousReps: '8' },
            ],
          },
          {
            id: 'e2',
            exerciseId: 30,
            name: 'Overhead Press',
            order: 1,
            sets: [
              { id: 's4', weight: '40', reps: '8', isComplete: false, previousWeight: '35', previousReps: '8' },
              { id: 's5', weight: '40', reps: '8', isComplete: false, previousWeight: '35', previousReps: '8' },
              { id: 's6', weight: '40', reps: '8', isComplete: false, previousWeight: '35', previousReps: '8' },
            ],
          },
        ],
      },
      {
        id: '1-2',
        name: 'Pull Day',
        description: 'Back, Biceps',
        order: 1,
        exercises: [
          {
            id: 'e3',
            exerciseId: 10,
            name: 'Barbell Row',
            order: 0,
            sets: [
              { id: 's7', weight: '50', reps: '10', isComplete: false, previousWeight: '45', previousReps: '10' },
              { id: 's8', weight: '50', reps: '10', isComplete: false, previousWeight: '45', previousReps: '10' },
              { id: 's9', weight: '50', reps: '10', isComplete: false, previousWeight: '45', previousReps: '10' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Upper/Lower Split',
    creator: 'You',
    description: 'A 4-day split alternating between upper and lower body workouts.',
    imageUrl: 'https://images.pexels.com/photos/4164762/pexels-photo-4164762.jpeg',
    isTemplate: true,
    workouts: [
      {
        id: '2-1',
        name: 'Upper Body',
        description: 'Chest, Back, Shoulders, Arms',
        order: 0,
        exercises: [
          {
            id: 'e4',
            exerciseId: 13,
            name: 'Pull-ups',
            order: 0,
            sets: [
              { id: 's10', weight: '0', reps: '8', isComplete: false, previousWeight: '0', previousReps: '6' },
              { id: 's11', weight: '0', reps: '8', isComplete: false, previousWeight: '0', previousReps: '6' },
              { id: 's12', weight: '0', reps: '8', isComplete: false, previousWeight: '0', previousReps: '6' },
            ],
          },
        ],
      },
      {
        id: '2-2',
        name: 'Lower Body',
        description: 'Legs, Glutes',
        order: 1,
        exercises: [
          {
            id: 'e5',
            exerciseId: 20,
            name: 'Squat',
            order: 0,
            sets: [
              { id: 's13', weight: '80', reps: '5', isComplete: false, previousWeight: '75', previousReps: '5' },
              { id: 's14', weight: '80', reps: '5', isComplete: false, previousWeight: '75', previousReps: '5' },
              { id: 's15', weight: '80', reps: '5', isComplete: false, previousWeight: '75', previousReps: '5' },
            ],
          },
        ],
      },
    ],
  },
];

export function WorkoutProvider({ children }: { children: React.ReactNode }) {
  const [programs] = useState<Program[]>(mockPrograms);
  const [currentProgram, setCurrentProgramState] = useState<Program | null>(null);
  const [currentActiveProgram, setCurrentActiveProgram] = useState<UserActiveProgram | null>(null);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const { user } = useAuth();

  const [masterExercises, setMasterExercises] = useState<DetailedExercise[]>([]);
  const [userCustomExercises, setUserCustomExercises] = useState<DetailedExercise[]>([]);
  const [isLoadingMasterExercises, setIsLoadingMasterExercises] = useState(false);
  const [isLoadingUserCustomExercises, setIsLoadingUserCustomExercises] = useState(false);

  const setCurrentProgram = async (program: Program) => {
    if (!user) {
      console.error('No user logged in');
      return;
    }

    try {
      // Check if user already has an active program for this template
      let activeProgram = await UserActiveProgramService.getActiveProgram(user.id, program.id);
      
      if (!activeProgram) {
        // Create a new active program from the template
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

  const startWorkout = (workout: Workout) => {
    setCurrentWorkout(workout);
    setIsWorkoutActive(true);
  };

  const loadMasterExercises = async () => {
    setIsLoadingMasterExercises(true);
    try {
      const exercises = await ExerciseService.getMasterExercises();
      setMasterExercises(exercises);
    } catch (error) {
      console.error("Failed to load master exercises:", error);
    } finally {
      setIsLoadingMasterExercises(false);
    }
  };

  const loadUserCustomExercises = async () => {
    if (!user) {
      setUserCustomExercises([]);
      return;
    }
    setIsLoadingUserCustomExercises(true);
    try {
      const exercises = await ExerciseService.getUserCustomExercises(user.id);
      setUserCustomExercises(exercises);
    } catch (error) {
      console.error("Failed to load user custom exercises:", error);
    } finally {
      setIsLoadingUserCustomExercises(false);
    }
  };

  const updateSet = async (exerciseId: string, setId: string, field: 'weight' | 'reps', value: string) => {
    if (!currentWorkout || !currentActiveProgram) return;

    const updatedWorkout = {
      ...currentWorkout,
      exercises: currentWorkout.exercises.map(exercise =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map(set =>
                set.id === setId ? { ...set, [field]: value } : set
              )
            }
          : exercise
      )
    };

    setCurrentWorkout(updatedWorkout);

    // Update the active program in the database
    try {
      const updatedProgram = currentProgram ? {
        ...currentProgram,
        workouts: currentProgram.workouts.map(w => 
          w.id === updatedWorkout.id ? updatedWorkout : w
        )
      } : null;

      if (updatedProgram) {
        await UserActiveProgramService.updateActiveProgram(currentActiveProgram.id, updatedProgram);
        setCurrentProgramState(updatedProgram);
      }
    } catch (error) {
      console.error('Failed to update set in database:', error);
    }
  };

  const completeSet = async (exerciseId: string, setId: string) => {
    if (!currentWorkout || !currentActiveProgram) return;

    const updatedWorkout = {
      ...currentWorkout,
      exercises: currentWorkout.exercises.map(exercise =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map(set =>
                set.id === setId ? { ...set, isComplete: !set.isComplete } : set
              )
            }
          : exercise
      )
    };

    setCurrentWorkout(updatedWorkout);

    // Update the active program in the database
    try {
      const updatedProgram = currentProgram ? {
        ...currentProgram,
        workouts: currentProgram.workouts.map(w => 
          w.id === updatedWorkout.id ? updatedWorkout : w
        )
      } : null;

      if (updatedProgram) {
        await UserActiveProgramService.updateActiveProgram(currentActiveProgram.id, updatedProgram);
        setCurrentProgramState(updatedProgram);
      }
    } catch (error) {
      console.error('Failed to complete set in database:', error);
    }
  };

  const addExerciseToWorkout = async (workoutId: string, exercise: DetailedExercise) => {
    if (!currentActiveProgram) return;

    try {
      const updatedActiveProgram = await UserActiveProgramService.addExerciseToWorkout(
        currentActiveProgram.id,
        workoutId,
        {
          exerciseId: exercise.id,
          name: exercise.name,
          sets: 3, // Default to 3 sets
        }
      );

      setCurrentActiveProgram(updatedActiveProgram);
      setCurrentProgramState(updatedActiveProgram.program_data as Program);

      // Update current workout if it's the one being modified
      if (currentWorkout && currentWorkout.id === workoutId) {
        const updatedProgram = updatedActiveProgram.program_data as Program;
        const updatedWorkout = updatedProgram.workouts.find(w => w.id === workoutId);
        if (updatedWorkout) {
          setCurrentWorkout(updatedWorkout);
        }
      }
    } catch (error) {
      console.error('Failed to add exercise to workout:', error);
    }
  };

  const updateExerciseSets = async (workoutId: string, exerciseId: string, newSetCount: number) => {
    if (!currentActiveProgram) return;

    try {
      const updatedActiveProgram = await UserActiveProgramService.updateExerciseSets(
        currentActiveProgram.id,
        workoutId,
        exerciseId,
        newSetCount
      );

      setCurrentActiveProgram(updatedActiveProgram);
      setCurrentProgramState(updatedActiveProgram.program_data as Program);

      // Update current workout if it's the one being modified
      if (currentWorkout && currentWorkout.id === workoutId) {
        const updatedProgram = updatedActiveProgram.program_data as Program;
        const updatedWorkout = updatedProgram.workouts.find(w => w.id === workoutId);
        if (updatedWorkout) {
          setCurrentWorkout(updatedWorkout);
        }
      }
    } catch (error) {
      console.error('Failed to update exercise sets:', error);
    }
  };

  const reorderWorkouts = async (workoutIds: string[]) => {
    if (!currentActiveProgram) return;

    try {
      const updatedActiveProgram = await UserActiveProgramService.reorderWorkouts(
        currentActiveProgram.id,
        workoutIds
      );

      setCurrentActiveProgram(updatedActiveProgram);
      setCurrentProgramState(updatedActiveProgram.program_data as Program);
    } catch (error) {
      console.error('Failed to reorder workouts:', error);
    }
  };

  const finishWorkout = () => {
    setCurrentWorkout(null);
    setIsWorkoutActive(false);
  };

  return (
    <WorkoutContext.Provider
      value={{
        programs,
        currentProgram,
        currentWorkout,
        currentActiveProgram,
        isWorkoutActive,
        masterExercises,
        userCustomExercises,
        isLoadingMasterExercises,
        isLoadingUserCustomExercises,
        setCurrentProgram,
        startWorkout,
        updateSet,
        completeSet,
        finishWorkout,
        loadMasterExercises,
        loadUserCustomExercises,
        addExerciseToWorkout,
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