import { supabase } from '../data/supabase-client';
import { Workout } from './exercise.types';

export interface WorkoutHistoryEntry {
  id: string;
  user_id: string;
  completed_at: string;
  workout_data: Workout & {
    metadata?: {
      startTime: Date;
      endTime: Date;
      bodyweight: string;
      notes: string;
      duration: number;
    };
  };
  health_stats: {
    avg_heart_rate?: number;
    max_heart_rate?: number;
    calories_burned?: number;
    active_energy?: number;
    steps?: number;
  };
  total_volume: number;
  duration_minutes: number;
  created_at: string;
}

export interface ProgressStats {
  totalWorkouts: number;
  totalVolume: number;
  averageHeartRate: number;
  workoutFrequency: { date: string; count: number }[];
  volumeProgress: { date: string; volume: number }[];
  exerciseProgress: { exercise: string; maxWeight: number; date: string }[];
  bodyweightProgress: { date: string; bodyweight: number }[];
  workoutNotes: { date: string; notes: string; workoutName: string }[];
}

export class WorkoutHistoryService {
  /**
   * Save a completed workout to history
   */
  static async saveWorkoutHistory(
    userId: string,
    workout: Workout & { metadata?: any },
    durationMinutes: number,
    healthStats?: any
  ): Promise<WorkoutHistoryEntry> {
    // Calculate total volume (sets × reps × weight)
    const totalVolume = workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseFloat(set.reps) || 0;
        return exerciseTotal + (weight * reps);
      }, 0);
    }, 0);

    const { data, error } = await supabase
      .from('workout_history')
      .insert({
        user_id: userId,
        workout_data: workout,
        health_stats: healthStats || {},
        total_volume: totalVolume,
        duration_minutes: durationMinutes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save workout history: ${error.message}`);
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
  ): Promise<WorkoutHistoryEntry[]> {
    let query = supabase
      .from('workout_history')
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
      throw new Error(`Failed to get workout history: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get progress statistics for a user
   */
  static async getProgressStats(userId: string, days: number = 30): Promise<ProgressStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('workout_history')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', startDate.toISOString())
      .order('completed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get progress stats: ${error.message}`);
    }

    const workouts = data || [];

    // Calculate statistics
    const totalWorkouts = workouts.length;
    const totalVolume = workouts.reduce((sum, w) => sum + (w.total_volume || 0), 0);
    const averageHeartRate = workouts.reduce((sum, w) => {
      return sum + (w.health_stats?.avg_heart_rate || 0);
    }, 0) / (workouts.filter(w => w.health_stats?.avg_heart_rate).length || 1);

    // Group workouts by date for frequency chart
    const workoutsByDate = workouts.reduce((acc, workout) => {
      const date = new Date(workout.completed_at).toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const workoutFrequency = Object.entries(workoutsByDate).map(([date, count]) => ({
      date,
      count: Number(count),
    }));

    // Volume progress over time
    const volumeProgress = workouts.map(workout => ({
      date: new Date(workout.completed_at).toISOString().split('T')[0],
      volume: workout.total_volume || 0,
    }));

    // Exercise progress (max weight per exercise)
    const exerciseMaxWeights: Record<string, { weight: number; date: string }> = {};
    
    workouts.forEach(workout => {
      const workoutData = workout.workout_data as Workout;
      workoutData.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          const weight = parseFloat(set.weight) || 0;
          const exerciseName = exercise.name;
          
          if (!exerciseMaxWeights[exerciseName] || weight > exerciseMaxWeights[exerciseName].weight) {
            exerciseMaxWeights[exerciseName] = {
              weight,
              date: new Date(workout.completed_at).toISOString().split('T')[0],
            };
          }
        });
      });
    });

    const exerciseProgress = Object.entries(exerciseMaxWeights).map(([exercise, data]) => ({
      exercise,
      maxWeight: data.weight,
      date: data.date,
    }));

    // Bodyweight progress
    const bodyweightProgress = workouts
      .filter(workout => workout.workout_data.metadata?.bodyweight)
      .map(workout => ({
        date: new Date(workout.completed_at).toISOString().split('T')[0],
        bodyweight: parseFloat(workout.workout_data.metadata.bodyweight) || 0,
      }))
      .filter(entry => entry.bodyweight > 0);

    // Workout notes
    const workoutNotes = workouts
      .filter(workout => workout.workout_data.metadata?.notes)
      .map(workout => ({
        date: new Date(workout.completed_at).toISOString().split('T')[0],
        notes: workout.workout_data.metadata.notes,
        workoutName: workout.workout_data.name,
      }));

    return {
      totalWorkouts,
      totalVolume,
      averageHeartRate,
      workoutFrequency,
      volumeProgress,
      exerciseProgress,
      bodyweightProgress,
      workoutNotes,
    };
  }

  /**
   * Get workout streak information
   */
  static async getWorkoutStreak(userId: string): Promise<{ currentStreak: number; longestStreak: number }> {
    const { data, error } = await supabase
      .from('workout_history')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get workout streak: ${error.message}`);
    }

    const workouts = data || [];
    if (workouts.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Group workouts by date
    const workoutDates = new Set(
      workouts.map(w => new Date(w.completed_at).toISOString().split('T')[0])
    );

    const sortedDates = Array.from(workoutDates).sort().reverse();

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toISOString().split('T')[0];
    let checkDate = new Date(today);

    for (let i = 0; i < 365; i++) { // Check up to a year back
      const dateStr = checkDate.toISOString().split('T')[0];
      if (sortedDates.includes(dateStr)) {
        currentStreak++;
      } else if (currentStreak > 0) {
        break; // Streak is broken
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedDates.reverse()) {
      const currentDate = new Date(dateStr);
      
      if (prevDate === null) {
        tempStreak = 1;
      } else {
        const dayDiff = Math.abs(currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
      
      prevDate = currentDate;
    }
    
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  }

  /**
   * Get bodyweight history for a user
   */
  static async getBodyweightHistory(userId: string): Promise<{ date: string; bodyweight: number }[]> {
    const { data, error } = await supabase
      .from('workout_history')
      .select('completed_at, workout_data')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get bodyweight history: ${error.message}`);
    }

    const workouts = data || [];
    
    return workouts
      .filter(workout => workout.workout_data.metadata?.bodyweight)
      .map(workout => ({
        date: new Date(workout.completed_at).toISOString().split('T')[0],
        bodyweight: parseFloat(workout.workout_data.metadata.bodyweight) || 0,
      }))
      .filter(entry => entry.bodyweight > 0);
  }

  /**
   * Get workout notes history for a user
   */
  static async getWorkoutNotesHistory(userId: string): Promise<{ date: string; notes: string; workoutName: string }[]> {
    const { data, error } = await supabase
      .from('workout_history')
      .select('completed_at, workout_data')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get workout notes history: ${error.message}`);
    }

    const workouts = data || [];
    
    return workouts
      .filter(workout => workout.workout_data.metadata?.notes)
      .map(workout => ({
        date: new Date(workout.completed_at).toISOString().split('T')[0],
        notes: workout.workout_data.metadata.notes,
        workoutName: workout.workout_data.name,
      }));
  }
}