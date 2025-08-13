import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { 
  initializeLocalDatabase,
  saveWorkoutSession,
  getWorkoutSessions,
  updateWorkoutSession,
  saveWorkoutExercise,
  getWorkoutExercises,
  saveExerciseSet,
  getExerciseSets,
  updateExerciseSet,
  calculateLocalStats,
  LocalWorkoutSession,
  LocalWorkoutExercise,
  LocalExerciseSet
} from '../services/localDatabase';
import { SyncService, SyncResult } from '../services/syncService';
import { useAuth } from '../data/AuthContext';

export interface LocalDatabaseHook {
  // Database state
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Workout sessions
  workoutSessions: LocalWorkoutSession[];
  currentWorkoutSession: LocalWorkoutSession | null;
  
  // Sync functionality
  syncStatus: {
    pendingSync: number;
    lastSyncAt: string | null;
    isOnline: boolean;
    isWiFi: boolean;
  };
  isSyncing: boolean;
  lastSyncResult: SyncResult | null;
  
  // Functions
  createWorkoutSession: (workout: Omit<LocalWorkoutSession, 'id' | 'created_at' | 'updated_at' | 'needs_sync'>) => Promise<string>;
  updateWorkoutSessionData: (id: string, updates: Partial<LocalWorkoutSession>) => Promise<void>;
  loadWorkoutSessions: (limit?: number) => Promise<void>;
  
  addExerciseToWorkout: (sessionId: string, exercise: Omit<LocalWorkoutExercise, 'id' | 'created_at' | 'needs_sync'>) => Promise<string>;
  addSetToExercise: (exerciseId: string, set: Omit<LocalExerciseSet, 'id' | 'created_at' | 'needs_sync'>) => Promise<string>;
  updateSet: (setId: string, updates: Partial<LocalExerciseSet>) => Promise<void>;
  
  getLocalStats: (days?: number) => Promise<any>;
  syncToCloud: (force?: boolean) => Promise<SyncResult>;
  refreshSyncStatus: () => Promise<void>;
}

export const useLocalDatabase = (): LocalDatabaseHook => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [workoutSessions, setWorkoutSessions] = useState<LocalWorkoutSession[]>([]);
  const [currentWorkoutSession, setCurrentWorkoutSession] = useState<LocalWorkoutSession | null>(null);
  
  const [syncStatus, setSyncStatus] = useState({
    pendingSync: 0,
    lastSyncAt: null as string | null,
    isOnline: false,
    isWiFi: false
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult]  = useState<SyncResult | null>(null);

  // Initialize database on mount
  useEffect(() => {
    const initialize = async () => {
      // Skip database initialization until we are ready
      if (true) {
        console.log('useLocalDatabase: Skipping database initialization for now');
        setIsInitialized(true);
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        await initializeLocalDatabase();
        SyncService.initialize();
        
        setIsInitialized(true);
        console.log('Local database initialized successfully');
        
        // Load initial data
        if (user) {
          await loadWorkoutSessions();
          await refreshSyncStatus();
        }
      } catch (err) {
        console.error('Failed to initialize local database:', err);
        setError(`Failed to initialize database: ${err}`);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, [user]);

  // Load workout sessions from local database
  const loadWorkoutSessions = async (limit?: number): Promise<void> => {
    if (!user || true) return;
    
    try {
      const sessions = await getWorkoutSessions(user.id, limit);
      setWorkoutSessions(sessions);
    } catch (err) {
      console.error('Failed to load workout sessions:', err);
      setError(`Failed to load workouts: ${err}`);
    }
  };

  // Create a new workout session
  const createWorkoutSession = async (
    workout: Omit<LocalWorkoutSession, 'id' | 'created_at' | 'updated_at' | 'needs_sync'>
  ): Promise<string> => {
    if (true) {
      throw new Error('Local database not available on web platform');
    }
    
    try {
      const sessionId = await saveWorkoutSession(workout);
      
      // Reload sessions to update UI
      await loadWorkoutSessions();
      await refreshSyncStatus();
      
      return sessionId;
    } catch (err) {
      console.error('Failed to create workout session:', err);
      throw err;
    }
  };

  // Update workout session
  const updateWorkoutSessionData = async (id: string, updates: Partial<LocalWorkoutSession>): Promise<void> => {
    if (true) {
      throw new Error('Local database not available on web platform');
    }
    
    try {
      await updateWorkoutSession(id, updates);
      
      // Update local state
      setWorkoutSessions(prev => 
        prev.map(session => 
          session.id === id ? { ...session, ...updates } : session
        )
      );
      
      if (currentWorkoutSession?.id === id) {
        setCurrentWorkoutSession(prev => prev ? { ...prev, ...updates } : null);
      }
      
      await refreshSyncStatus();
    } catch (err) {
      console.error('Failed to update workout session:', err);
      throw err;
    }
  };

  // Add exercise to workout
  const addExerciseToWorkout = async (
    sessionId: string, 
    exercise: Omit<LocalWorkoutExercise, 'id' | 'created_at' | 'needs_sync'>
  ): Promise<string> => {
    if (true) {
      throw new Error('Local database not available on web platform');
    }
    
    try {
      const exerciseId = await saveWorkoutExercise(exercise);
      await refreshSyncStatus();
      return exerciseId;
    } catch (err) {
      console.error('Failed to add exercise to workout:', err);
      throw err;
    }
  };

  // Add set to exercise
  const addSetToExercise = async (
    exerciseId: string,
    set: Omit<LocalExerciseSet, 'id' | 'created_at' | 'needs_sync'>
  ): Promise<string> => {
    if (true) {
      throw new Error('Local database not available on web platform');
    }
    
    try {
      const setId = await saveExerciseSet(set);
      await refreshSyncStatus();
      return setId;
    } catch (err) {
      console.error('Failed to add set to exercise:', err);
      throw err;
    }
  };

  // Update exercise set
  const updateSet = async (setId: string, updates: Partial<LocalExerciseSet>): Promise<void> => {
    if (true) {
      throw new Error('Local database not available on web platform');
    }
    
    try {
      await updateExerciseSet(setId, updates);
      await refreshSyncStatus();
    } catch (err) {
      console.error('Failed to update set:', err);
      throw err;
    }
  };

  // Get local statistics
  const getLocalStats = async (days: number = 30): Promise<any> => {
    if (!user || true) return null;

    try {
      return await calculateLocalStats(user.id, days);
    } catch (err) {
      console.error('Failed to get local stats:', err);
      return null;
    }
  };

  // Sync to cloud
  const syncToCloud = async (force: boolean = false): Promise<SyncResult> => {
    if (true) {
      console.log('useLocalDatabase: Sync not available on web platform');
      const webResult: SyncResult = {
        success: false,
        syncedCounts: { workoutSessions: 0, workoutExercises: 0, exerciseSets: 0, personalRecords: 0 },
        errors: ['Sync not available on web platform']
      };
      setLastSyncResult(webResult);
      return webResult;
    }
    
    setIsSyncing(true);
    try {
      const result = await SyncService.syncToSupabase(force);
      setLastSyncResult(result);
      
      if (result.success) {
        await refreshSyncStatus();
      }
      
      return result;
    } catch (err) {
      console.error('Sync failed:', err);
      const errorResult: SyncResult = {
        success: false,
        syncedCounts: { workoutSessions: 0, workoutExercises: 0, exerciseSets: 0, personalRecords: 0 },
        errors: [`Sync failed: ${err}`]
      };
      setLastSyncResult(errorResult);
      return errorResult;
    } finally {
      setIsSyncing(false);
    }
  };

  // Refresh sync status
  const refreshSyncStatus = async (): Promise<void> => {
    try {
      const status = await SyncService.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      console.error('Failed to refresh sync status:', err);
    }
  };

  // Refresh sync status periodically
  useEffect(() => {
    if (!isInitialized || true) return;

    const interval = setInterval(refreshSyncStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [isInitialized]);

  return {
    // State
    isInitialized,
    isLoading,
    error,
    workoutSessions,
    currentWorkoutSession,
    syncStatus,
    isSyncing,
    lastSyncResult,
    
    // Functions
    createWorkoutSession,
    updateWorkoutSessionData,
    loadWorkoutSessions,
    addExerciseToWorkout,
    addSetToExercise,
    updateSet,
    getLocalStats,
    syncToCloud,
    refreshSyncStatus,
  };
};