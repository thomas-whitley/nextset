import { supabase } from '@/data/supabase-client';
import { Workout } from '@/services/exercise.types';

export interface WorkoutLogEntry {
  id: string;
  user_id: string;
  completed_at: string;
  workout_name: string;
  duration_seconds: number;
  workout_data: Workout & {
    metadata?: {
      startTime: Date;
      endTime: Date;
      notes: Record<string, string>;
      duration: number;
    };
  };
  created_at: string;
}

export class WorkoutLogService {
  /**
   * Save a completed workout to the exercise_log table
   */
  static async saveWorkout(
    userId: string,
    workout: Workout & { metadata?: any },
    durationSeconds: number
  ): Promise<WorkoutLogEntry> {
    const { data, error } = await supabase
      .from('exercise_log')
      .insert({
        user_id: userId,
        workout_name: workout.name,
        duration_seconds: durationSeconds,
        workout_data: workout
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save workout:', error);
      throw new Error(`Failed to save workout: ${error.message}`);
    }

    return data;
  }

  /**
   * Get workout history for a user
   */
  static async getWorkoutHistory(
    userId: string,
    limit?: number,
    offset?: number
  ): Promise<WorkoutLogEntry[]> {
    let query = supabase
      .from('exercise_log')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get workout history:', error);
      throw new Error(`Failed to get workout history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific workout log by ID
   */
  static async getWorkoutLogById(logId: string): Promise<WorkoutLogEntry | null> {
    const { data, error } = await supabase
      .from('exercise_log')
      .select('*')
      .eq('id', logId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('Failed to get workout log:', error);
      throw new Error(`Failed to get workout log: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a workout log
   */
  static async deleteWorkoutLog(logId: string): Promise<void> {
    const { error } = await supabase
      .from('exercise_log')
      .delete()
      .eq('id', logId);

    if (error) {
      console.error('Failed to delete workout log:', error);
      throw new Error(`Failed to delete workout log: ${error.message}`);
    }
  }
}