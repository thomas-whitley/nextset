import { supabase } from '../data/supabase-client';
import type { Database, Json } from '../data/supabase.types';
import { Workout } from './exercise.types';
import { computeStreaks, toDateKey } from './stats';

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

export interface PersonalRecord {
  exercise: string;
  weight: number;
  reps: number;
  date: string;
}

export interface LifetimeStats {
  totalWorkouts: number;
  totalVolume: number;
  totalMinutes: number;
  personalRecords: PersonalRecord[];
  firstWorkoutAt: string | null;
  lastWorkout: WorkoutHistoryEntry | null;
}

// Re-export toDateKey from stats for backward compatibility
export { toDateKey } from './stats';

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

type HistoryRow = Database['public']['Tables']['workout_history']['Row'];

/** jsonb columns arrive as Json; the app owns their shape. Cast once, at the boundary. */
const toEntry = (row: Partial<HistoryRow>): WorkoutHistoryEntry => ({
  id: row.id ?? '',
  user_id: row.user_id ?? '',
  completed_at: row.completed_at ?? row.created_at ?? new Date(0).toISOString(),
  workout_data: row.workout_data as unknown as WorkoutHistoryEntry['workout_data'],
  health_stats: (row.health_stats ?? {}) as WorkoutHistoryEntry['health_stats'],
  total_volume: row.total_volume ?? 0,
  duration_minutes: row.duration_minutes ?? 0,
  created_at: row.created_at ?? '',
});

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
    // Total volume across COMPLETED sets only (weight × reps). Counting
    // untouched sets would bank the template's placeholder reps plus whatever
    // was typed into a row the user never ticked, which is how a single
    // 60 kg × 6 session once stored 1,245,613,856 kg. This must stay in step
    // with the figure the finish sheet shows, which is completed-sets-only.
    const totalVolume = workout.exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        if (!set.isComplete) return exerciseTotal;
        const weight = parseFloat(set.weight) || 0;
        const reps = parseFloat(set.reps) || 0;
        return exerciseTotal + (weight * reps);
      }, 0);
    }, 0);

    const { data, error } = await supabase
      .from('workout_history')
      .insert({
        user_id: userId,
        workout_data: workout as unknown as Json,
        health_stats: (healthStats || {}) as Json,
        total_volume: totalVolume,
        duration_minutes: durationMinutes,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save workout history: ${error.message}`);
    }

    return toEntry(data);
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

    return (data || []).map(toEntry);
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

    const workouts = (data || []).map(toEntry);

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

    // Exercise progress (max weight per exercise). Only COMPLETED sets count:
    // otherwise every exercise merely present in a program appears as a
    // personal record of 0 kg, which is both untrue and meaningless.
    const exerciseMaxWeights: Record<string, { weight: number; date: string }> = {};

    workouts.forEach(workout => {
      const workoutData = workout.workout_data as Workout;
      workoutData.exercises.forEach(exercise => {
        exercise.sets.forEach(set => {
          if (!set.isComplete) return;
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

    const exerciseProgress = Object.entries(exerciseMaxWeights)
      // A 0 kg "record" says nothing — bodyweight work belongs in history,
      // not in a list of heaviest lifts.
      .filter(([, data]) => data.weight > 0)
      .map(([exercise, data]) => ({
        exercise,
        maxWeight: data.weight,
        date: data.date,
      }));

    // Bodyweight progress
    const bodyweightProgress = workouts
      .filter(workout => workout.workout_data.metadata?.bodyweight)
      .map(workout => ({
        date: new Date(workout.completed_at).toISOString().split('T')[0],
        bodyweight: parseFloat(workout.workout_data.metadata?.bodyweight ?? '') || 0,
      }))
      .filter(entry => entry.bodyweight > 0);

    // Workout notes
    const workoutNotes = workouts
      .filter(workout => workout.workout_data.metadata?.notes)
      .map(workout => ({
        date: new Date(workout.completed_at).toISOString().split('T')[0],
        notes: workout.workout_data.metadata?.notes ?? '',
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

    const keys = (data ?? []).map(toEntry).map((w) => toDateKey(new Date(w.completed_at)));
    return computeStreaks(keys, new Date());
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

    const workouts = (data || []).map(toEntry);
    
    return workouts
      .filter(workout => workout.workout_data.metadata?.bodyweight)
      .map(workout => ({
        date: new Date(workout.completed_at).toISOString().split('T')[0],
        bodyweight: parseFloat(workout.workout_data.metadata?.bodyweight ?? '') || 0,
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

    const workouts = (data || []).map(toEntry);
    
    return workouts
      .filter(workout => workout.workout_data.metadata?.notes)
      .map(workout => ({
        date: new Date(workout.completed_at).toISOString().split('T')[0],
        notes: workout.workout_data.metadata?.notes ?? '',
        workoutName: workout.workout_data.name,
      }));
  }
  /**
   * Every history row for a user, oldest first — used by CSV export and lifetime stats.
   */
  static async getAllWorkoutHistory(userId: string): Promise<WorkoutHistoryEntry[]> {
    const { data, error } = await supabase
      .from('workout_history')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get workout history: ${error.message}`);
    }

    return (data || []).map(toEntry);
  }

  /**
   * Lifetime totals for the Profile tab: workouts, kg lifted, and the heaviest set
   * ever logged per exercise (the PR list).
   */
  static async getLifetimeStats(userId: string): Promise<LifetimeStats> {
    const rows = await this.getAllWorkoutHistory(userId);
    const records: Record<string, PersonalRecord> = {};

    rows.forEach((row) => {
      const workoutData = row.workout_data as Workout;
      (workoutData?.exercises ?? []).forEach((exercise) => {
        exercise.sets.forEach((set) => {
          const weight = parseFloat(set.weight) || 0;
          const reps = parseInt(set.reps, 10) || 0;
          if (weight <= 0) return;
          const current = records[exercise.name];
          if (!current || weight > current.weight || (weight === current.weight && reps > current.reps)) {
            records[exercise.name] = { exercise: exercise.name, weight, reps, date: row.completed_at };
          }
        });
      });
    });

    return {
      totalWorkouts: rows.length,
      totalVolume: rows.reduce((sum, r) => sum + (r.total_volume || 0), 0),
      totalMinutes: rows.reduce((sum, r) => sum + (r.duration_minutes || 0), 0),
      personalRecords: Object.values(records).sort((a, b) => b.weight - a.weight),
      firstWorkoutAt: rows[0]?.completed_at ?? null,
      lastWorkout: rows.length ? rows[rows.length - 1] : null,
    };
  }

  /**
   * The most recent logged sets for each of the given exercise names — the
   * "last time" hint shown next to every set while a workout is running.
   */
  static async getLastPerformance(
    userId: string,
    exerciseNames: string[]
  ): Promise<Record<string, { weight: string; reps: string }[]>> {
    if (exerciseNames.length === 0) return {};

    const { data, error } = await supabase
      .from('workout_history')
      .select('completed_at, workout_data')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(40);

    if (error) {
      throw new Error(`Failed to get last performance: ${error.message}`);
    }

    const wanted = new Set(exerciseNames);
    const result: Record<string, { weight: string; reps: string }[]> = {};

    for (const row of (data || []).map(toEntry)) {
      const workoutData = row.workout_data as Workout;
      for (const exercise of workoutData?.exercises ?? []) {
        if (!wanted.has(exercise.name) || result[exercise.name]) continue;
        const done = exercise.sets.filter((s) => s.isComplete && (parseFloat(s.weight) || parseFloat(s.reps)));
        if (done.length) {
          result[exercise.name] = done.map((s) => ({ weight: s.weight, reps: s.reps }));
        }
      }
      if (Object.keys(result).length === wanted.size) break;
    }

    return result;
  }
}
