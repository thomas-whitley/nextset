import { supabase } from '../data/supabase-client';
import type { Database, Json } from '../data/supabase.types';
import { Program, UserActiveProgram } from './exercise.types';

type ActiveProgramRow = Database['public']['Tables']['user_active_programs']['Row'];

/** The DB stores program_data as jsonb; the app trusts it to be a Program. Cast once, here. */
const toActive = (row: ActiveProgramRow): UserActiveProgram => ({
  ...row,
  program_data: row.program_data as unknown as Program,
  created_at: row.created_at ?? '',
  updated_at: row.updated_at ?? '',
});

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
        program_data: activeProgramData as unknown as Json,
      })
      .select()
      .single();

    if (error) {
      // 23505 = unique_violation: another device created the copy first. Use it.
      if (error.code === '23505') {
        const existing = await UserActiveProgramService.getActiveProgram(userId, templateProgram.id);
        if (existing) return existing;
      }
      throw new Error(`Failed to create active program: ${error.message}`);
    }

    return toActive(data);
  }

  /**
   * The user's copy of a template. After migration 20260917100000 the pair is
   * unique; before it, duplicates existed and `.single()` reported them as
   * "not found", which made the app insert yet another copy. Read the newest.
   */
  static async getActiveProgram(userId: string, templateId: string): Promise<UserActiveProgram | null> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .select('*')
      .eq('user_id', userId)
      .eq('program_template_id', templateId)
      .order('updated_at', { ascending: false })
      .limit(2);

    if (error) {
      throw new Error(`Failed to get active program: ${error.message}`);
    }
    if (data && data.length > 1) {
      console.error(`Duplicate active programs for template ${templateId}; using the newest`);
    }
    return data?.[0] ? toActive(data[0]) : null;
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

    return (data || []).map(toActive);
  }

  /**
   * Updates an active program's data
   */
  static async updateActiveProgram(activeProgramId: string, programData: Program): Promise<UserActiveProgram> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .update({
        program_data: programData as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeProgramId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update active program: ${error.message}`);
    }

    return toActive(data);
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

    const programData = currentProgram.program_data as unknown as Program;
    
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

    const programData = currentProgram.program_data as unknown as Program;
    
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

    const programData = currentProgram.program_data as unknown as Program;
    
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
  /**
   * Removes an exercise from a workout inside an active program.
   */
  static async removeExerciseFromWorkout(
    activeProgramId: string,
    workoutId: string,
    exerciseId: string
  ): Promise<UserActiveProgram> {
    const { data: currentProgram, error: fetchError } = await supabase
      .from('user_active_programs')
      .select('program_data')
      .eq('id', activeProgramId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch program: ${fetchError.message}`);
    }

    const programData = currentProgram.program_data as unknown as Program;
    const updatedWorkouts = programData.workouts.map((workout) => {
      if (workout.id !== workoutId) return workout;
      const remaining = workout.exercises
        .filter((exercise) => exercise.id !== exerciseId)
        .map((exercise, index) => ({ ...exercise, order: index }));
      return { ...workout, exercises: remaining };
    });

    return this.updateActiveProgram(activeProgramId, { ...programData, workouts: updatedWorkouts });
  }

  /**
   * Marks an active program as the most recently used one (restored on next launch).
   */
  static async touchActiveProgram(activeProgramId: string): Promise<void> {
    const { error } = await supabase
      .from('user_active_programs')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', activeProgramId);

    if (error) {
      throw new Error(`Failed to touch active program: ${error.message}`);
    }
  }

  /**
   * The program the user worked with most recently, or null.
   */
  static async getMostRecentActiveProgram(userId: string): Promise<UserActiveProgram | null> {
    const { data, error } = await supabase
      .from('user_active_programs')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      throw new Error(`Failed to get most recent active program: ${error.message}`);
    }

    return data?.[0] ? toActive(data[0]) : null;
  }
}
