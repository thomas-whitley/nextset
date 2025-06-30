// ExerciseService.ts
// This service handles operations related to exercises, such as fetching, searching, and managing exercises in workouts.
// and provides functions to start, update, and finish workouts. The context can be used in
// any component wrapped in the WorkoutProvider.

import { supabase } from '../data/supabase-client';
import { Exercise, MuscleGroup } from './exercise.types'; // Removed unused enums for this specific file context

export class ExerciseService {
  static initialize() {
    throw new Error('Method not implemented.');
  }
  static async getAllExercises(): Promise<Exercise[]> {
    const { data, error } = await supabase.from('exercises').select('*');
    if (error) throw new Error(`Failed to fetch exercises: ${error.message}`);
    return data || [];
  }

  static async getExercisesByMuscleGroup(muscleGroup: MuscleGroup): Promise<Exercise[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('primary_muscle_group', muscleGroup);
    if (error) throw new Error(`Failed to fetch exercises: ${error.message}`);
    return data || [];
  }

  static async searchExercises(searchTerm: string): Promise<Exercise[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .ilike('name', `%${searchTerm}%`);
    if (error) throw new Error(`Failed to search exercises: ${error.message}`);
    return data || [];
  }
  static async getExerciseById(id: string | number): Promise<Exercise | null> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`Failed to fetch exercise: ${error.message}`);
    return data || null;
  }

  /**
   * Fetches master exercises.
   * Assumes master exercises have a `user_id` field that is NULL.
   * Adjust the filter if your schema for distinguishing master exercises is different.
   */
  static async getMasterExercises(): Promise<Exercise[]> {
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .is('user_id', null); 
    if (error) throw new Error(`Failed to fetch master exercises: ${error.message}`);
    return data || [];
  }

  /**
   * Fetches custom exercises created by a specific user.
   */
  static async getUserCustomExercises(userId: string): Promise<Exercise[]> {
    const { data, error } = await supabase.from('exercises').select('*').eq('user_id', userId);
    if (error) throw new Error(`Failed to fetch user custom exercises for user ${userId}: ${error.message}`);
    return data || [];
  }
}
// Function to add an exercise to a workout
// This function assumes you have a 'workout_exercises' table that links workouts and exercises
// and that it has columns for workout_id, exercise_id, sets, weight, reps,
export async function addExerciseToWorkout(workoutId: string | number, exerciseId: string | number, params: any) {
  // params: { sets, weight, reps, ... }
  return supabase
    .from('workout_exercises')
    .insert([{ workout_id: workoutId, exercise_id: exerciseId, ...params }]);
}
// Function to remove an exercise from a workout
export async function removeExerciseFromWorkout(workoutId: string | number, exerciseId: string | number, params: any) {
  return supabase
    .from('workout_exercises')
    .delete()
    .match({ workout_id: workoutId, exercise_id: exerciseId });
} 
// Function to update an exercise in a workout
export async function updateExerciseInWorkout(workoutId: string | number, exerciseId: string | number, params: any) {
  // params: { sets, weight, reps, ... }
  return supabase
    .from('workout_exercises')
    .update(params)
    .match({ workout_id: workoutId, exercise_id: exerciseId });
} 
// Function to get all exercises in a workout
export async function getExercisesInWorkout(workoutId: string | number) {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select('*')
    .eq('workout_id', workoutId);
  if (error) throw new Error(`Failed to fetch exercises in workout: ${error.message}`);
  return data || [];
}  
// Function to get all workouts for a user
export async function getWorkoutsForUser(userId: string | number) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to fetch workouts for user: ${error.message}`);
  return data || [];
}
// Function to create a new workout
export async function createWorkout(userId: string | number, workoutName: string) {
  const { data, error } = await supabase
    .from('workouts')
    .insert([{ user_id: userId, name: workoutName }])
    .select()
    .single();
  if (error) throw new Error(`Failed to create workout: ${error.message}`);
  return data;
}
// Function to delete a workout
export async function deleteWorkout(workoutId: string | number) {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', workoutId);
  if (error) throw new Error(`Failed to delete workout: ${error.message}`);
  return true;
}
// Function to update a workout
export async function updateWorkout(workoutId: string | number, updates: any) {
  const { data, error } = await supabase
    .from('workouts')
    .update(updates)
    .eq('id', workoutId)
    .select()
    .single();
  if (error) throw new Error(`Failed to update workout: ${error.message}`);
  return data;
}
// Function to get a specific workout by ID
export async function getWorkoutById(workoutId: string | number) {
  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();
  if (error) throw new Error(`Failed to fetch workout: ${error.message}`);
  return data;
} 
// Function to get all exercises in a workout with details
export async function getWorkoutExercises(workoutId: string | number) {
  const { data, error } = await supabase
    .from('workout_exercises')
    .select(`
      *,
      exercises:exercise_id (
        id,
        name,
        primary_muscle_group,
        secondary_muscle_groups,
        description
      )
    `)
    .eq('workout_id', workoutId);
  if (error) throw new Error(`Failed to fetch exercises in workout: ${error.message}`);
  return data || [];
}
// Function to get all workouts with exercises for a user
export async function getWorkoutsWithExercisesForUser(userId: string | number) {
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      *,
      workout_exercises (
        *,
        exercises:exercise_id (
          id,
          name,
          primary_muscle_group,
          secondary_muscle_groups,
          description
        )
      )
    `)
    .eq('user_id', userId);
  if (error) throw new Error(`Failed to fetch workouts with exercises for user: ${error.message}`);
  return data || [];
}
// Function to get all exercises with their details
export async function getAllExercisesWithDetails() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*');
  if (error) throw new Error(`Failed to fetch all exercises: ${error.message}`);
  return data || [];
} 
