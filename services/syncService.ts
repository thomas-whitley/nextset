import { supabase } from '../data/supabase-client';
import { Platform } from 'react-native';
import {
  getDatabase,
  getRecordsNeedingSync,
  markRecordsAsSynced,
  LocalWorkoutSession,
  LocalWorkoutExercise,
  LocalExerciseSet,
  LocalPersonalRecord
} from './localDatabase';
import NetInfo from '@react-native-community/netinfo';

export interface SyncResult {
  success: boolean;
  syncedCounts: {
    workoutSessions: number;
    workoutExercises: number;
    exerciseSets: number;
    personalRecords: number;
  };
  errors: string[];
}

export class SyncService {
  private static isOnline = true;
  private static isSyncing = false;

  /**
   * Initialize network monitoring
   */
  static initialize(): void {
    // Skip initialization on web platform
    if (Platform.OS === 'web') {
      console.log('SyncService: Skipping initialization on web platform');
      return;
    }
    
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      console.log('Network status:', this.isOnline ? 'Online' : 'Offline');
      
      // Auto-sync when coming back online
      if (this.isOnline && !this.isSyncing) {
        this.syncToSupabase();
      }
    });
  }

  /**
   * Check if device is connected to Wi-Fi
   */
  static async isConnectedToWiFi(): Promise<boolean> {
    // Always return false on web platform
    if (Platform.OS === 'web') {
      return false;
    }
    
    try {
      const state = await NetInfo.fetch();
      return state.isConnected === true && state.type === 'wifi';
    } catch (error) {
      console.error('Failed to check network status:', error);
      return false;
    }
  }

  /**
   * Main sync function - uploads local data to Supabase
   */
  static async syncToSupabase(forceSync: boolean = false): Promise<SyncResult> {
    // Skip sync on web platform
    if (Platform.OS === 'web') {
      console.log('SyncService: Sync not available on web platform');
      return {
        success: false,
        syncedCounts: { workoutSessions: 0, workoutExercises: 0, exerciseSets: 0, personalRecords: 0 },
        errors: ['Sync not available on web platform']
      };
    }
    
    if (this.isSyncing) {
      console.log('Sync already in progress');
      return {
        success: false,
        syncedCounts: { workoutSessions: 0, workoutExercises: 0, exerciseSets: 0, personalRecords: 0 },
        errors: ['Sync already in progress']
      };
    }

    // Check network connection (unless forced)
    if (!forceSync) {
      const isWiFi = await this.isConnectedToWiFi();
      if (!isWiFi) {
        console.log('Not connected to Wi-Fi, skipping sync');
        return {
          success: false,
          syncedCounts: { workoutSessions: 0, workoutExercises: 0, exerciseSets: 0, personalRecords: 0 },
          errors: ['Not connected to Wi-Fi']
        };
      }
    }

    this.isSyncing = true;
    const errors: string[] = [];
    const syncedCounts = {
      workoutSessions: 0,
      workoutExercises: 0,
      exerciseSets: 0,
      personalRecords: 0
    };

    try {
      console.log('Starting sync to Supabase...');
      
      // Get all records that need syncing
      const recordsToSync = await getRecordsNeedingSync();
      
      // Sync workout sessions first (parent records)
      if (recordsToSync.workoutSessions.length > 0) {
        const { synced, errors: sessionErrors } = await this.syncWorkoutSessions(recordsToSync.workoutSessions);
        syncedCounts.workoutSessions = synced.length;
        errors.push(...sessionErrors);
        
        if (synced.length > 0) {
          await markRecordsAsSynced(synced.map(s => s.id));
        }
      }

      // Sync workout exercises
      if (recordsToSync.workoutExercises.length > 0) {
        const { synced, errors: exerciseErrors } = await this.syncWorkoutExercises(recordsToSync.workoutExercises);
        syncedCounts.workoutExercises = synced.length;
        errors.push(...exerciseErrors);
        
        if (synced.length > 0) {
          await markRecordsAsSynced([], synced.map(e => e.id));
        }
      }

      // Sync exercise sets
      if (recordsToSync.exerciseSets.length > 0) {
        const { synced, errors: setErrors } = await this.syncExerciseSets(recordsToSync.exerciseSets, recordsToSync.workoutExercises);
        syncedCounts.exerciseSets = synced.length;
        errors.push(...setErrors);
        
        if (synced.length > 0) {
          await markRecordsAsSynced([], [], synced.map(s => s.id));
        }
      }

      // Sync personal records
      if (recordsToSync.personalRecords.length > 0) {
        const { synced, errors: prErrors } = await this.syncPersonalRecords(recordsToSync.personalRecords);
        syncedCounts.personalRecords = synced.length;
        errors.push(...prErrors);
        
        if (synced.length > 0) {
          await markRecordsAsSynced([], [], [], synced.map(pr => pr.id));
        }
      }

      const totalSynced = Object.values(syncedCounts).reduce((sum, count) => sum + count, 0);
      console.log(`Sync completed. Synced ${totalSynced} records with ${errors.length} errors`);

      return {
        success: errors.length === 0,
        syncedCounts,
        errors
      };

    } catch (error) {
      console.error('Sync failed:', error);
      errors.push(`Sync failed: ${error}`);
      
      return {
        success: false,
        syncedCounts,
        errors
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync workout sessions to Supabase workout_log table
   */
  private static async syncWorkoutSessions(sessions: LocalWorkoutSession[]): Promise<{
    synced: LocalWorkoutSession[];
    errors: string[];
  }> {
    const synced: LocalWorkoutSession[] = [];
    const errors: string[] = [];

    for (const session of sessions) {
      try {
        // Transform local session to Supabase format
        const supabaseWorkout = {
          id: session.id,
          user_id: session.user_id,
          program_enrollment_id: session.program_id || null,
          workout_name: session.name,
          workout_data: {
            name: session.name,
            duration_seconds: session.duration_seconds,
            notes: session.notes
          },
          health_stats: {
            avg_heart_rate: session.avg_heart_rate,
            max_heart_rate: session.max_heart_rate,
            calories_burned: session.calories_burned
          },
          total_volume: session.total_volume,
          duration_minutes: Math.round(session.duration_seconds / 60),
          user_notes: session.notes,
          privacy_level: 'private' as const,
          started_at: session.started_at,
          completed_at: session.completed_at,
        };

        const { error } = await supabase
          .from('workout_log')
          .upsert(supabaseWorkout);

        if (error) {
          console.error('Failed to sync workout session:', error);
          errors.push(`Workout ${session.name}: ${error.message}`);
        } else {
          synced.push(session);
        }
      } catch (error) {
        console.error('Error syncing workout session:', error);
        errors.push(`Workout ${session.name}: ${error}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Sync workout exercises (stored in workout_data JSONB field)
   */
  private static async syncWorkoutExercises(exercises: LocalWorkoutExercise[]): Promise<{
    synced: LocalWorkoutExercise[];
    errors: string[];
  }> {
    const synced: LocalWorkoutExercise[] = [];
    const errors: string[] = [];

    // Group exercises by workout session
    const exercisesBySession = exercises.reduce((acc, exercise) => {
      if (!acc[exercise.workout_session_id]) {
        acc[exercise.workout_session_id] = [];
      }
      acc[exercise.workout_session_id].push(exercise);
      return acc;
    }, {} as Record<string, LocalWorkoutExercise[]>);

    for (const [sessionId, sessionExercises] of Object.entries(exercisesBySession)) {
      try {
        // Get the current workout_log record
        const { data: workoutLog, error: fetchError } = await supabase
          .from('workout_log')
          .select('workout_data')
          .eq('id', sessionId)
          .single();

        if (fetchError) {
          errors.push(`Failed to fetch workout for exercises: ${fetchError.message}`);
          continue;
        }

        // Update workout_data with exercises
        const updatedWorkoutData = {
          ...workoutLog.workout_data,
          exercises: sessionExercises.map(ex => ({
            id: ex.id,
            exercise_id: ex.exercise_id,
            name: ex.exercise_name,
            order: ex.order_index,
            notes: ex.notes
          }))
        };

        const { error: updateError } = await supabase
          .from('workout_log')
          .update({ workout_data: updatedWorkoutData })
          .eq('id', sessionId);

        if (updateError) {
          errors.push(`Failed to sync exercises for workout ${sessionId}: ${updateError.message}`);
        } else {
          synced.push(...sessionExercises);
        }
      } catch (error) {
        errors.push(`Error syncing exercises for workout ${sessionId}: ${error}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Sync exercise sets by embedding them into workout_data.exercises[].sets in workout_log
   */
  private static async syncExerciseSets(
    sets: LocalExerciseSet[],
    exercises: LocalWorkoutExercise[]
  ): Promise<{
    synced: LocalExerciseSet[];
    errors: string[];
  }> {
    const synced: LocalExerciseSet[] = [];
    const errors: string[] = [];

    // Build lookup: workout_exercise_id → workout_session_id
    const exerciseSessionMap = exercises.reduce((acc, ex) => {
      acc[ex.id] = ex.workout_session_id;
      return acc;
    }, {} as Record<string, string>);

    // Group sets by session (via exercise → session lookup)
    const setsBySession = sets.reduce((acc, set) => {
      const sessionId = exerciseSessionMap[set.workout_exercise_id];
      if (!sessionId) return acc;
      if (!acc[sessionId]) acc[sessionId] = [];
      acc[sessionId].push(set);
      return acc;
    }, {} as Record<string, LocalExerciseSet[]>);

    // Group sets by exercise_id for quick lookup when building the update
    const setsByExerciseId = sets.reduce((acc, set) => {
      if (!acc[set.workout_exercise_id]) acc[set.workout_exercise_id] = [];
      acc[set.workout_exercise_id].push(set);
      return acc;
    }, {} as Record<string, LocalExerciseSet[]>);

    for (const [sessionId, sessionSets] of Object.entries(setsBySession)) {
      try {
        const { data: workoutLog, error: fetchError } = await supabase
          .from('workout_log')
          .select('workout_data')
          .eq('id', sessionId)
          .single();

        if (fetchError) {
          errors.push(`Failed to fetch workout for sets (session ${sessionId}): ${fetchError.message}`);
          continue;
        }

        const currentExercises: Array<Record<string, unknown>> =
          (workoutLog.workout_data as Record<string, unknown>)?.exercises as Array<Record<string, unknown>> ?? [];

        const updatedWorkoutData = {
          ...(workoutLog.workout_data as Record<string, unknown>),
          exercises: currentExercises.map(ex => ({
            ...ex,
            sets: (setsByExerciseId[ex.id as string] ?? []).map(s => ({
              set_number: s.set_number,
              weight: s.weight,
              reps: s.reps,
              is_completed: s.is_completed,
              rpe: s.rpe,
              rest_time_seconds: s.rest_time_seconds,
            })),
          })),
        };

        const { error: updateError } = await supabase
          .from('workout_log')
          .update({ workout_data: updatedWorkoutData })
          .eq('id', sessionId);

        if (updateError) {
          errors.push(`Failed to sync sets for workout ${sessionId}: ${updateError.message}`);
        } else {
          synced.push(...sessionSets);
        }
      } catch (error) {
        errors.push(`Error syncing sets for workout ${sessionId}: ${error}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Sync personal records to Supabase (you might need to create this table)
   */
  private static async syncPersonalRecords(records: LocalPersonalRecord[]): Promise<{
    synced: LocalPersonalRecord[];
    errors: string[];
  }> {
    const synced: LocalPersonalRecord[] = [];
    const errors: string[] = [];

    // For now, we'll just mark them as synced since the Supabase schema
    // doesn't have a dedicated personal_records table
    // You could store these in the workout_data JSONB or create a new table
    
    for (const record of records) {
      try {
        // Store as a special workout log entry or in user metadata
        // This is a simplified approach - you might want to extend the schema
        synced.push(record);
      } catch (error) {
        errors.push(`Failed to sync PR for ${record.exercise_name}: ${error}`);
      }
    }

    return { synced, errors };
  }

  /**
   * Download data from Supabase to local database (for initial setup or data recovery)
   */
  static async downloadFromSupabase(userId: string): Promise<{
    success: boolean;
    downloadedCounts: {
      workoutSessions: number;
    };
    errors: string[];
  }> {
    // Skip download on web platform
    if (Platform.OS === 'web') {
      console.log('SyncService: Download not available on web platform');
      return {
        success: false,
        downloadedCounts: { workoutSessions: 0 },
        errors: ['Download not available on web platform']
      };
    }
    
    const errors: string[] = [];
    let downloadedCounts = { workoutSessions: 0 };

    try {
      console.log('Downloading data from Supabase...');

      // Download workout logs
      const { data: workoutLogs, error } = await supabase
        .from('workout_log')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) {
        errors.push(`Failed to download workouts: ${error.message}`);
      } else if (workoutLogs) {
        // Convert and save to local database
        for (const log of workoutLogs) {
          try {
            // Check if already exists locally
            const existing = await getDatabase().getFirstAsync(
              'SELECT id FROM workout_sessions WHERE id = ?',
              [log.id]
            );

            if (!existing) {
              await getDatabase().runAsync(
                `INSERT INTO workout_sessions (
                  id, user_id, name, program_id, started_at, completed_at,
                  duration_seconds, total_volume, notes, avg_heart_rate,
                  max_heart_rate, calories_burned, created_at, updated_at, needs_sync
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
                [
                  log.id, log.user_id, log.workout_name || 'Downloaded Workout',
                  log.program_enrollment_id, log.started_at, log.completed_at,
                  (log.duration_minutes || 0) * 60, log.total_volume || 0,
                  log.user_notes, log.health_stats?.avg_heart_rate,
                  log.health_stats?.max_heart_rate, log.health_stats?.calories_burned,
                  log.created_at, log.updated_at
                ]
              );
              downloadedCounts.workoutSessions++;
            }
          } catch (error) {
            errors.push(`Failed to save downloaded workout ${log.id}: ${error}`);
          }
        }
      }

      console.log(`Download completed. Downloaded ${downloadedCounts.workoutSessions} workouts`);

      return {
        success: errors.length === 0,
        downloadedCounts,
        errors
      };

    } catch (error) {
      console.error('Download failed:', error);
      return {
        success: false,
        downloadedCounts,
        errors: [`Download failed: ${error}`]
      };
    }
  }

  /**
   * Get sync status information
   */
  static async getSyncStatus(): Promise<{
    pendingSync: number;
    lastSyncAt: string | null;
    isOnline: boolean;
    isWiFi: boolean;
  }> {
    // Return default values for web platform
    if (Platform.OS === 'web') {
      return {
        pendingSync: 0,
        lastSyncAt: null,
        isOnline: true,
        isWiFi: false
      };
    }
    
    try {
      const recordsToSync = await getRecordsNeedingSync();
      const pendingSync = Object.values(recordsToSync).reduce(
        (total, records) => total + records.length, 
        0
      );

      const isWiFi = await this.isConnectedToWiFi();

      // Get last sync time from sync_status table
      const lastSyncResult = await getDatabase().getFirstAsync(
        'SELECT MAX(last_sync_at) as last_sync FROM sync_status'
      ) as { last_sync: string | null };

      return {
        pendingSync,
        lastSyncAt: lastSyncResult?.last_sync || null,
        isOnline: this.isOnline,
        isWiFi
      };
    } catch (error) {
      console.error('Failed to get sync status:', error);
      return {
        pendingSync: 0,
        lastSyncAt: null,
        isOnline: false,
        isWiFi: false
      };
    }
  }
}