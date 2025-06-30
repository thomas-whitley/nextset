import { supabase } from '../data/supabase-client';
import { Program, UserActiveProgram } from './exercise.types';

export class UserActiveProgramService {
  /**
   * Creates a new active program for a user based on a template
   */
  static async createActiveProgram(userId: string, templateProgram: Program): Promise<UserActiveProgram> {
    // Create a mutable copy of the template program
    const activeProgramData: Program = {
      ...templateProgram,
      isTemplate: false,
      templateId: templateProgram.id,
      id: `active_${templateProgram.id}_${Date.now()}`, // Generate unique ID for active program
    };

    const { data, error } = await supabase
      .from('user_active_programs')
      .insert({
        user_id: userId,
        program_template_id: templateProgram.id,
        program_data: activeProgramData,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create active program: ${error.message}`);
    }

    return data;
  }

  /**
   * Gets the user's active program for a specific template
   */
  static async getActiveProgram(userId: string, templateId: string): Promise<UserActiveProgram | null> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .select('*')
      .eq('user_id', userId)
      .eq('program_template_id', templateId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw new Error(`Failed to get active program: ${error.message}`);
    }

    return data || null;
  }

  /**
   * Gets all active programs for a user
   */
  static async getUserActivePrograms(userId: string): Promise<UserActiveProgram[]> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user active programs: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Updates an active program's data
   */
  static async updateActiveProgram(activeProgramId: string, programData: Program): Promise<UserActiveProgram> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .update({
        program_data: programData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeProgramId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update active program: ${error.message}`);
    }

    return data;
  }

  /**
   * Deletes an active program
   */
  static async deleteActiveProgram(activeProgramId: string): Promise<void> {
    const { error } = await supabase
      .from('user_active_programs')
      .delete()
      .eq('id', activeProgramId);

    if (error) {
      throw new Error(`Failed to delete active program: ${error.message}`);
    }
  }

  /**
   * Reorders workouts within an active program
   */
  static async reorderWorkouts(activeProgramId: string, workoutIds: string[]): Promise<UserActiveProgram> {
    // First get the current program data
    const { data: currentProgram, error: fetchError } = await supabase
      .from('user_active_programs')
      .select('program_data')
      .eq('id', activeProgramId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch program for reordering: ${fetchError.message}`);
    }

    const programData = currentProgram.program_data as Program;
    
    // Reorder workouts based on the provided order
    const reorderedWorkouts = workoutIds.map((workoutId, index) => {
      const workout = programData.workouts.find(w => w.id === workoutId);
      if (!workout) {
        throw new Error(`Workout with id ${workoutId} not found`);
      }
      return { ...workout, order: index };
    });

    const updatedProgramData = {
      ...programData,
      workouts: reorderedWorkouts,
    };

    return this.updateActiveProgram(activeProgramId, updatedProgramData);
  }

  /**
   * Adds an exercise to a workout within an active program
   */
  static async addExerciseToWorkout(
    activeProgramId: string, 
    workoutId: string, 
    exercise: { exerciseId: number; name: string; sets?: number }
  ): Promise<UserActiveProgram> {
    // Get current program data
    const { data: currentProgram, error: fetchError } = await supabase
      .from('user_active_programs')
      .select('program_data')
      .eq('id', activeProgramId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch program: ${fetchError.message}`);
    }

    const programData = currentProgram.program_data as Program;
    
    // Find the workout and add the exercise
    const updatedWorkouts = programData.workouts.map(workout => {
      if (workout.id === workoutId) {
        const newExercise = {
          id: `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          exerciseId: exercise.exerciseId,
          name: exercise.name,
          sets: Array.from({ length: exercise.sets || 3 }, (_, index) => ({
            id: `set_${Date.now()}_${index}`,
            weight: '',
            reps: '',
            isComplete: false,
          })),
          order: workout.exercises.length,
        };

        return {
          ...workout,
          exercises: [...workout.exercises, newExercise],
        };
      }
      return workout;
    });

    const updatedProgramData = {
      ...programData,
      workouts: updatedWorkouts,
    };

    return this.updateActiveProgram(activeProgramId, updatedProgramData);
  }

  /**
   * Updates the number of sets for an exercise in a workout
   */
  static async updateExerciseSets(
    activeProgramId: string,
    workoutId: string,
    exerciseId: string,
    newSetCount: number
  ): Promise<UserActiveProgram> {
    // Get current program data
    const { data: currentProgram, error: fetchError } = await supabase
      .from('user_active_programs')
      .select('program_data')
      .eq('id', activeProgramId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch program: ${fetchError.message}`);
    }

    const programData = currentProgram.program_data as Program;
    
    // Update the exercise sets
    const updatedWorkouts = programData.workouts.map(workout => {
      if (workout.id === workoutId) {
        const updatedExercises = workout.exercises.map(exercise => {
          if (exercise.id === exerciseId) {
            const currentSets = exercise.sets;
            let newSets = [...currentSets];

            if (newSetCount > currentSets.length) {
              // Add new sets
              for (let i = currentSets.length; i < newSetCount; i++) {
                newSets.push({
                  id: `set_${Date.now()}_${i}`,
                  weight: '',
                  reps: '',
                  isComplete: false,
                });
              }
            } else if (newSetCount < currentSets.length) {
              // Remove sets from the end
              newSets = newSets.slice(0, newSetCount);
            }

            return { ...exercise, sets: newSets };
          }
          return exercise;
        });

        return { ...workout, exercises: updatedExercises };
      }
      return workout;
    });

    const updatedProgramData = {
      ...programData,
      workouts: updatedWorkouts,
    };

    return this.updateActiveProgram(activeProgramId, updatedProgramData);
  }
}