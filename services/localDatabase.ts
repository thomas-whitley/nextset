import * as SQLite from 'expo-sqlite';
import { Exercise, Workout, WorkoutExercise, ExerciseSet } from './exercise.types';

// Database instance
let db: SQLite.SQLiteDatabase;

// Export the database instance for use in other services
export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeLocalDatabase() first.');
  }
  return db;
};

// Initialize the local SQLite database
export const initializeLocalDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabaseAsync('momentum_fitness.db');
    
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');
    
    // Create tables
    await createTables();
    
    console.log('Local database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize local database:', error);
    throw error;
  }
};

// Create all necessary tables
const createTables = async (): Promise<void> => {
  const createTablesSQL = `
    -- Users table (simplified for local storage)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      full_name TEXT,
      username TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      needs_sync INTEGER DEFAULT 1
    );

    -- Local workout sessions
    CREATE TABLE IF NOT EXISTS workout_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      program_id TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_seconds INTEGER DEFAULT 0,
      total_volume REAL DEFAULT 0,
      notes TEXT,
      bodyweight REAL,
      avg_heart_rate INTEGER,
      max_heart_rate INTEGER,
      calories_burned INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      needs_sync INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users (id)
    );

    -- Exercises performed in workouts
    CREATE TABLE IF NOT EXISTS workout_exercises (
      id TEXT PRIMARY KEY,
      workout_session_id TEXT NOT NULL,
      exercise_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      needs_sync INTEGER DEFAULT 1,
      FOREIGN KEY (workout_session_id) REFERENCES workout_sessions (id) ON DELETE CASCADE
    );

    -- Individual sets within exercises
    CREATE TABLE IF NOT EXISTS exercise_sets (
      id TEXT PRIMARY KEY,
      workout_exercise_id TEXT NOT NULL,
      set_number INTEGER NOT NULL,
      weight REAL,
      reps INTEGER,
      distance REAL,
      duration_seconds INTEGER,
      rpe INTEGER,
      rest_time_seconds INTEGER,
      is_completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      needs_sync INTEGER DEFAULT 1,
      FOREIGN KEY (workout_exercise_id) REFERENCES workout_exercises (id) ON DELETE CASCADE
    );

    -- Personal records tracking
    CREATE TABLE IF NOT EXISTS personal_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      exercise_id INTEGER NOT NULL,
      exercise_name TEXT NOT NULL,
      record_type TEXT NOT NULL, -- 'max_weight', 'max_reps', 'max_volume', etc.
      value REAL NOT NULL,
      workout_session_id TEXT,
      achieved_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      needs_sync INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (workout_session_id) REFERENCES workout_sessions (id)
    );

    -- Sync status tracking
    CREATE TABLE IF NOT EXISTS sync_status (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      last_sync_at TEXT,
      sync_errors TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions (user_id);
    CREATE INDEX IF NOT EXISTS idx_workout_sessions_completed_at ON workout_sessions (completed_at);
    CREATE INDEX IF NOT EXISTS idx_workout_exercises_session_id ON workout_exercises (workout_session_id);
    CREATE INDEX IF NOT EXISTS idx_exercise_sets_workout_exercise_id ON exercise_sets (workout_exercise_id);
    CREATE INDEX IF NOT EXISTS idx_personal_records_user_id ON personal_records (user_id);
    CREATE INDEX IF NOT EXISTS idx_personal_records_exercise_id ON personal_records (exercise_id);
    CREATE INDEX IF NOT EXISTS idx_needs_sync ON workout_sessions (needs_sync);
  `;

  await db.execAsync(createTablesSQL);
};

// Local data types
export interface LocalWorkoutSession {
  id: string;
  user_id: string;
  name: string;
  program_id?: string;
  started_at: string;
  completed_at?: string;
  duration_seconds: number;
  total_volume: number;
  notes?: string;
  bodyweight?: number;
  avg_heart_rate?: number;
  max_heart_rate?: number;
  calories_burned?: number;
  created_at: string;
  updated_at: string;
  needs_sync: number;
}

export interface LocalWorkoutExercise {
  id: string;
  workout_session_id: string;
  exercise_id: number;
  exercise_name: string;
  order_index: number;
  notes?: string;
  created_at: string;
  needs_sync: number;
}

export interface LocalExerciseSet {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  weight?: number;
  reps?: number;
  distance?: number;
  duration_seconds?: number;
  rpe?: number;
  rest_time_seconds?: number;
  is_completed: number;
  created_at: string;
  needs_sync: number;
}

export interface LocalPersonalRecord {
  id: string;
  user_id: string;
  exercise_id: number;
  exercise_name: string;
  record_type: string;
  value: number;
  workout_session_id?: string;
  achieved_at: string;
  created_at: string;
  needs_sync: number;
}

// CRUD Operations for Workout Sessions
export const saveWorkoutSession = async (workout: Omit<LocalWorkoutSession, 'id' | 'created_at' | 'updated_at' | 'needs_sync'>): Promise<string> => {
  try {
    const id = `workout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await db.runAsync(
      `INSERT INTO workout_sessions (
        id, user_id, name, program_id, started_at, completed_at, 
        duration_seconds, total_volume, notes, bodyweight, 
        avg_heart_rate, max_heart_rate, calories_burned, 
        created_at, updated_at, needs_sync
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, workout.user_id, workout.name, workout.program_id || null,
        workout.started_at, workout.completed_at || null,
        workout.duration_seconds, workout.total_volume,
        workout.notes || null, workout.bodyweight ?? null,
        workout.avg_heart_rate ?? null, workout.max_heart_rate ?? null,
        workout.calories_burned ?? null, now, now
      ]
    );
    
    console.log('Workout session saved locally:', id);
    return id;
  } catch (error) {
    console.error('Failed to save workout session:', error);
    throw error;
  }
};

export const getWorkoutSessions = async (userId: string, limit?: number): Promise<LocalWorkoutSession[]> => {
  try {
    let query = `
      SELECT * FROM workout_sessions 
      WHERE user_id = ? 
      ORDER BY started_at DESC
    `;
    
    const params = [userId];
    
    if (limit) {
      query += ' LIMIT ?';
      params.push(limit.toString());
    }
    
    const result = await db.getAllAsync(query, params);
    return result as LocalWorkoutSession[];
  } catch (error) {
    console.error('Failed to get workout sessions:', error);
    return [];
  }
};

const WORKOUT_SESSION_UPDATABLE_FIELDS: (keyof LocalWorkoutSession)[] = [
  'name', 'program_id', 'started_at', 'completed_at', 'duration_seconds',
  'total_volume', 'notes', 'bodyweight', 'avg_heart_rate', 'max_heart_rate',
  'calories_burned',
];

export const updateWorkoutSession = async (id: string, updates: Partial<LocalWorkoutSession>): Promise<void> => {
  try {
    const fields = Object.keys(updates).filter(
      (key): key is keyof LocalWorkoutSession => WORKOUT_SESSION_UPDATABLE_FIELDS.includes(key as keyof LocalWorkoutSession)
    );

    if (fields.length === 0) return;

    const updateFields = fields.map(key => `${key} = ?`).join(', ');
    const values = fields.map(key => updates[key] ?? null);

    await db.runAsync(
      `UPDATE workout_sessions SET ${updateFields}, updated_at = ?, needs_sync = 1 WHERE id = ?`,
      [...values, new Date().toISOString(), id]
    );

    console.log('Workout session updated locally:', id);
  } catch (error) {
    console.error('Failed to update workout session:', error);
    throw error;
  }
};

// CRUD Operations for Workout Exercises
export const saveWorkoutExercise = async (exercise: Omit<LocalWorkoutExercise, 'id' | 'created_at' | 'needs_sync'>): Promise<string> => {
  try {
    const id = `exercise_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await db.runAsync(
      `INSERT INTO workout_exercises (
        id, workout_session_id, exercise_id, exercise_name, 
        order_index, notes, created_at, needs_sync
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, exercise.workout_session_id, exercise.exercise_id,
        exercise.exercise_name, exercise.order_index,
        exercise.notes || null, now
      ]
    );
    
    return id;
  } catch (error) {
    console.error('Failed to save workout exercise:', error);
    throw error;
  }
};

export const getWorkoutExercises = async (workoutSessionId: string): Promise<LocalWorkoutExercise[]> => {
  try {
    const result = await db.getAllAsync(
      'SELECT * FROM workout_exercises WHERE workout_session_id = ? ORDER BY order_index',
      [workoutSessionId]
    );
    return result as LocalWorkoutExercise[];
  } catch (error) {
    console.error('Failed to get workout exercises:', error);
    return [];
  }
};

// CRUD Operations for Exercise Sets
export const saveExerciseSet = async (set: Omit<LocalExerciseSet, 'id' | 'created_at' | 'needs_sync'>): Promise<string> => {
  try {
    const id = `set_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await db.runAsync(
      `INSERT INTO exercise_sets (
        id, workout_exercise_id, set_number, weight, reps, 
        distance, duration_seconds, rpe, rest_time_seconds, 
        is_completed, created_at, needs_sync
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, set.workout_exercise_id, set.set_number,
        set.weight ?? null, set.reps ?? null, set.distance ?? null,
        set.duration_seconds ?? null, set.rpe ?? null,
        set.rest_time_seconds ?? null, set.is_completed, now
      ]
    );
    
    return id;
  } catch (error) {
    console.error('Failed to save exercise set:', error);
    throw error;
  }
};

export const getExerciseSets = async (workoutExerciseId: string): Promise<LocalExerciseSet[]> => {
  try {
    const result = await db.getAllAsync(
      'SELECT * FROM exercise_sets WHERE workout_exercise_id = ? ORDER BY set_number',
      [workoutExerciseId]
    );
    return result as LocalExerciseSet[];
  } catch (error) {
    console.error('Failed to get exercise sets:', error);
    return [];
  }
};

const EXERCISE_SET_UPDATABLE_FIELDS: (keyof LocalExerciseSet)[] = [
  'set_number', 'weight', 'reps', 'distance', 'duration_seconds', 'rpe',
  'rest_time_seconds', 'is_completed',
];

export const updateExerciseSet = async (id: string, updates: Partial<LocalExerciseSet>): Promise<void> => {
  try {
    const fields = Object.keys(updates).filter(
      (key): key is keyof LocalExerciseSet => EXERCISE_SET_UPDATABLE_FIELDS.includes(key as keyof LocalExerciseSet)
    );

    if (fields.length === 0) return;

    const updateFields = fields.map(key => `${key} = ?`).join(', ');
    const values = fields.map(key => updates[key] ?? null);

    await db.runAsync(
      `UPDATE exercise_sets SET ${updateFields}, needs_sync = 1 WHERE id = ?`,
      [...values, id]
    );
  } catch (error) {
    console.error('Failed to update exercise set:', error);
    throw error;
  }
};

// Personal Records Management
export const savePersonalRecord = async (pr: Omit<LocalPersonalRecord, 'id' | 'created_at' | 'needs_sync'>): Promise<string> => {
  try {
    const id = `pr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    await db.runAsync(
      `INSERT INTO personal_records (
        id, user_id, exercise_id, exercise_name, record_type, 
        value, workout_session_id, achieved_at, created_at, needs_sync
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id, pr.user_id, pr.exercise_id, pr.exercise_name,
        pr.record_type, pr.value, pr.workout_session_id || null,
        pr.achieved_at, now
      ]
    );
    
    return id;
  } catch (error) {
    console.error('Failed to save personal record:', error);
    throw error;
  }
};

export const getPersonalRecords = async (userId: string, exerciseId?: number): Promise<LocalPersonalRecord[]> => {
  try {
    let query = 'SELECT * FROM personal_records WHERE user_id = ?';
    const params = [userId];
    
    if (exerciseId) {
      query += ' AND exercise_id = ?';
      params.push(exerciseId.toString());
    }
    
    query += ' ORDER BY achieved_at DESC';
    
    const result = await db.getAllAsync(query, params);
    return result as LocalPersonalRecord[];
  } catch (error) {
    console.error('Failed to get personal records:', error);
    return [];
  }
};

// Calculate local statistics
export const calculateLocalStats = async (userId: string, days: number = 30): Promise<{
  totalWorkouts: number;
  totalVolume: number;
  averageHeartRate: number;
  workoutFrequency: { date: string; count: number }[];
  volumeProgress: { date: string; volume: number }[];
}> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString();
    
    // Total workouts
    const totalWorkoutsResult = await db.getFirstAsync(
      'SELECT COUNT(*) as count FROM workout_sessions WHERE user_id = ? AND completed_at >= ?',
      [userId, startDateStr]
    ) as { count: number };
    
    // Total volume
    const totalVolumeResult = await db.getFirstAsync(
      'SELECT SUM(total_volume) as volume FROM workout_sessions WHERE user_id = ? AND completed_at >= ?',
      [userId, startDateStr]
    ) as { volume: number };
    
    // Average heart rate
    const avgHeartRateResult = await db.getFirstAsync(
      'SELECT AVG(avg_heart_rate) as avg_hr FROM workout_sessions WHERE user_id = ? AND completed_at >= ? AND avg_heart_rate IS NOT NULL',
      [userId, startDateStr]
    ) as { avg_hr: number };
    
    // Workout frequency by date
    const frequencyResult = await db.getAllAsync(
      `SELECT DATE(completed_at) as date, COUNT(*) as count 
       FROM workout_sessions 
       WHERE user_id = ? AND completed_at >= ? 
       GROUP BY DATE(completed_at) 
       ORDER BY date`,
      [userId, startDateStr]
    ) as { date: string; count: number }[];
    
    // Volume progress by date
    const volumeResult = await db.getAllAsync(
      `SELECT DATE(completed_at) as date, SUM(total_volume) as volume 
       FROM workout_sessions 
       WHERE user_id = ? AND completed_at >= ? 
       GROUP BY DATE(completed_at) 
       ORDER BY date`,
      [userId, startDateStr]
    ) as { date: string; volume: number }[];
    
    return {
      totalWorkouts: totalWorkoutsResult.count || 0,
      totalVolume: totalVolumeResult.volume || 0,
      averageHeartRate: avgHeartRateResult.avg_hr || 0,
      workoutFrequency: frequencyResult,
      volumeProgress: volumeResult,
    };
  } catch (error) {
    console.error('Failed to calculate local stats:', error);
    return {
      totalWorkouts: 0,
      totalVolume: 0,
      averageHeartRate: 0,
      workoutFrequency: [],
      volumeProgress: [],
    };
  }
};

// Get records that need syncing
export const getRecordsNeedingSync = async (): Promise<{
  workoutSessions: LocalWorkoutSession[];
  workoutExercises: LocalWorkoutExercise[];
  exerciseSets: LocalExerciseSet[];
  personalRecords: LocalPersonalRecord[];
}> => {
  try {
    const [workoutSessions, workoutExercises, exerciseSets, personalRecords] = await Promise.all([
      db.getAllAsync('SELECT * FROM workout_sessions WHERE needs_sync = 1') as Promise<LocalWorkoutSession[]>,
      db.getAllAsync('SELECT * FROM workout_exercises WHERE needs_sync = 1') as Promise<LocalWorkoutExercise[]>,
      db.getAllAsync('SELECT * FROM exercise_sets WHERE needs_sync = 1') as Promise<LocalExerciseSet[]>,
      db.getAllAsync('SELECT * FROM personal_records WHERE needs_sync = 1') as Promise<LocalPersonalRecord[]>,
    ]);
    
    return {
      workoutSessions,
      workoutExercises,
      exerciseSets,
      personalRecords,
    };
  } catch (error) {
    console.error('Failed to get records needing sync:', error);
    return {
      workoutSessions: [],
      workoutExercises: [],
      exerciseSets: [],
      personalRecords: [],
    };
  }
};

// Mark records as synced
export const markRecordsAsSynced = async (
  workoutSessionIds: string[] = [],
  workoutExerciseIds: string[] = [],
  exerciseSetIds: string[] = [],
  personalRecordIds: string[] = []
): Promise<void> => {
  try {
    const promises = [];
    
    if (workoutSessionIds.length > 0) {
      const placeholders = workoutSessionIds.map(() => '?').join(',');
      promises.push(
        db.runAsync(
          `UPDATE workout_sessions SET needs_sync = 0 WHERE id IN (${placeholders})`,
          workoutSessionIds
        )
      );
    }
    
    if (workoutExerciseIds.length > 0) {
      const placeholders = workoutExerciseIds.map(() => '?').join(',');
      promises.push(
        db.runAsync(
          `UPDATE workout_exercises SET needs_sync = 0 WHERE id IN (${placeholders})`,
          workoutExerciseIds
        )
      );
    }
    
    if (exerciseSetIds.length > 0) {
      const placeholders = exerciseSetIds.map(() => '?').join(',');
      promises.push(
        db.runAsync(
          `UPDATE exercise_sets SET needs_sync = 0 WHERE id IN (${placeholders})`,
          exerciseSetIds
        )
      );
    }
    
    if (personalRecordIds.length > 0) {
      const placeholders = personalRecordIds.map(() => '?').join(',');
      promises.push(
        db.runAsync(
          `UPDATE personal_records SET needs_sync = 0 WHERE id IN (${placeholders})`,
          personalRecordIds
        )
      );
    }
    
    await Promise.all(promises);
    console.log('Records marked as synced');
  } catch (error) {
    console.error('Failed to mark records as synced:', error);
    throw error;
  }
};

// Database maintenance
export const clearOldData = async (daysToKeep: number = 365): Promise<void> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateStr = cutoffDate.toISOString();
    
    await db.runAsync(
      'DELETE FROM workout_sessions WHERE completed_at < ? AND needs_sync = 0',
      [cutoffDateStr]
    );
    
    console.log(`Cleared workout data older than ${daysToKeep} days`);
  } catch (error) {
    console.error('Failed to clear old data:', error);
  }
};

// Export database for debugging
export const exportDatabaseData = async (): Promise<{
  workoutSessions: LocalWorkoutSession[];
  workoutExercises: LocalWorkoutExercise[];
  exerciseSets: LocalExerciseSet[];
  personalRecords: LocalPersonalRecord[];
}> => {
  try {
    const [workoutSessions, workoutExercises, exerciseSets, personalRecords] = await Promise.all([
      db.getAllAsync('SELECT * FROM workout_sessions ORDER BY created_at DESC') as Promise<LocalWorkoutSession[]>,
      db.getAllAsync('SELECT * FROM workout_exercises ORDER BY created_at DESC') as Promise<LocalWorkoutExercise[]>,
      db.getAllAsync('SELECT * FROM exercise_sets ORDER BY created_at DESC') as Promise<LocalExerciseSet[]>,
      db.getAllAsync('SELECT * FROM personal_records ORDER BY created_at DESC') as Promise<LocalPersonalRecord[]>,
    ]);
    
    return {
      workoutSessions,
      workoutExercises,
      exerciseSets,
      personalRecords,
    };
  } catch (error) {
    console.error('Failed to export database data:', error);
    throw error;
  }
};