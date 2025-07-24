import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// =============================================================================
// 1. TYPESCRIPT TYPE DEFINITIONS
// =============================================================================

/**
 * User role enumeration
 */
export type UserRole = 'admin' | 'user' | 'super_admin';

/**
 * Admin action type enumeration
 */
export type AdminActionType = 'user_role_changed' | 'user_deactivated' | 'user_reactivated' | 'content_deleted' | 'settings_updated' | 'manual_data_edit';

/**
 * Timer preset type enumeration
 */
export type TimerPresetType = 'circuit' | 'standard';

/**
 * Enrollment status enumeration
 */
export type EnrollmentStatus = 'active' | 'paused' | 'completed' | 'cancelled';

/**
 * Privacy level enumeration
 */
export type PrivacyLevel = 'private' | 'shared' | 'public';

/**
 * Permission level enumeration
 */
export type PermissionLevel = 'viewer' | 'collaborator';

/**
 * Friendship status enumeration
 */
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

/**
 * User profile interface
 */
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  username: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User active programs interface
 */
export interface UserActiveProgram {
  id: string;
  user_id: string;
  program_template_id: string;
  program_data: any; // JSONB field
  created_at?: string;
  updated_at?: string;
}

/**
 * Timer preset interface
 */
export interface TimerPreset {
  id: string;
  user_id?: string;
  preset_name: string;
  description?: string;
  timer_type: TimerPresetType;
  is_public: boolean;
  preset_data: any; // JSONB field
  tags?: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Workout history interface
 */
export interface WorkoutHistory {
  id: string;
  user_id: string;
  completed_at?: string;
  workout_data: any; // JSONB field
  health_stats: any; // JSONB field
  total_volume?: number;
  duration_minutes?: number;
  created_at?: string;
}

/**
 * Program enrollment interface
 */
export interface ProgramEnrollment {
  id: string;
  user_id: string;
  program_template_id: string;
  status: EnrollmentStatus;
  program_data: any; // JSONB field
  current_progress: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Timer presets interface (legacy table)
 */
export interface TimerPresets {
  id: string;
  user_id?: string;
  preset_name: string;
  is_public?: boolean;
  preset_data: any; // JSONB field
  created_at?: string;
  updated_at?: string;
}

/**
 * Friendship interface
 */
export interface Friendship {
  id: number;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Exercise log interface
 */
export interface ExerciseLog {
  id: string;
  user_id: string;
  completed_at?: string;
  workout_name: string;
  duration_seconds?: number;
  workout_data: any; // JSONB field
  created_at?: string;
}

/**
 * Workout log interface
 */
export interface WorkoutLog {
  id: string;
  user_id: string;
  program_enrollment_id?: string;
  workout_name?: string;
  workout_data: any; // JSONB field
  health_stats?: any; // JSONB field
  total_volume?: number;
  duration_minutes?: number;
  user_notes?: string;
  privacy_level: PrivacyLevel;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Workout log sharing interface
 */
export interface WorkoutLogSharing {
  id: number;
  workout_log_id: string;
  shared_with_user_id: string;
  permission: PermissionLevel;
  created_at: string;
}

// =============================================================================
// 2. DATA ACCESS FUNCTIONS
// =============================================================================

// -----------------------------------------------------------------------------
// PROFILE FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get a user profile by ID
 * @param userId - The user's ID
 * @returns Promise<Profile | null> - The user profile or null if not found
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error fetching profile:', error);
    return null;
  }
}

/**
 * Create a new user profile
 * @param profile - Profile data without timestamps
 * @returns Promise<Profile | null> - The created profile or null on failure
 */
export async function createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profile')
      .insert(profile)
      .select()
      .single();

    if (error) {
      console.error('Error creating profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating profile:', error);
    return null;
  }
}

/**
 * Update a user profile
 * @param userId - The user's ID
 * @param updates - Partial profile data to update
 * @returns Promise<Profile | null> - The updated profile or null on failure
 */
export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from('profile')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating profile:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// USER ACTIVE PROGRAMS FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get all active programs for a user
 * @param userId - The user's ID
 * @returns Promise<UserActiveProgram[]> - Array of user's active programs
 */
export async function getUserActivePrograms(userId: string): Promise<UserActiveProgram[]> {
  try {
    const { data, error } = await supabase
      .from('user_active_programs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user active programs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching user active programs:', error);
    return [];
  }
}

/**
 * Create a new active program for a user
 * @param program - Active program data without timestamps
 * @returns Promise<UserActiveProgram | null> - The created program or null on failure
 */
export async function createUserActiveProgram(program: Omit<UserActiveProgram, 'id' | 'created_at' | 'updated_at'>): Promise<UserActiveProgram | null> {
  try {
    const { data, error } = await supabase
      .from('user_active_programs')
      .insert(program)
      .select()
      .single();

    if (error) {
      console.error('Error creating user active program:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating user active program:', error);
    return null;
  }
}

/**
 * Update an active program
 * @param programId - The program's ID
 * @param updates - Partial program data to update
 * @returns Promise<UserActiveProgram | null> - The updated program or null on failure
 */
export async function updateUserActiveProgram(programId: string, updates: Partial<UserActiveProgram>): Promise<UserActiveProgram | null> {
  try {
    const { data, error } = await supabase
      .from('user_active_programs')
      .update(updates)
      .eq('id', programId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user active program:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating user active program:', error);
    return null;
  }
}

/**
 * Delete an active program
 * @param programId - The program's ID
 * @returns Promise<boolean> - True if deleted successfully, false otherwise
 */
export async function deleteUserActiveProgram(programId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_active_programs')
      .delete()
      .eq('id', programId);

    if (error) {
      console.error('Error deleting user active program:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error deleting user active program:', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// TIMER PRESET FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get timer presets for a user (public + user's own)
 * @param userId - The user's ID (optional)
 * @returns Promise<TimerPreset[]> - Array of timer presets
 */
export async function getTimerPresets(userId?: string): Promise<TimerPreset[]> {
  try {
    let query = supabase
      .from('timer_preset')
      .select('*')
      .order('is_public', { ascending: false })
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
    } else {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching timer presets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching timer presets:', error);
    return [];
  }
}

/**
 * Create a new timer preset
 * @param preset - Timer preset data without timestamps
 * @returns Promise<TimerPreset | null> - The created preset or null on failure
 */
export async function createTimerPreset(preset: Omit<TimerPreset, 'id' | 'created_at' | 'updated_at'>): Promise<TimerPreset | null> {
  try {
    const { data, error } = await supabase
      .from('timer_preset')
      .insert(preset)
      .select()
      .single();

    if (error) {
      console.error('Error creating timer preset:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating timer preset:', error);
    return null;
  }
}

/**
 * Update a timer preset
 * @param presetId - The preset's ID
 * @param updates - Partial preset data to update
 * @returns Promise<TimerPreset | null> - The updated preset or null on failure
 */
export async function updateTimerPreset(presetId: string, updates: Partial<TimerPreset>): Promise<TimerPreset | null> {
  try {
    const { data, error } = await supabase
      .from('timer_preset')
      .update(updates)
      .eq('id', presetId)
      .select()
      .single();

    if (error) {
      console.error('Error updating timer preset:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating timer preset:', error);
    return null;
  }
}

/**
 * Delete a timer preset
 * @param presetId - The preset's ID
 * @returns Promise<boolean> - True if deleted successfully, false otherwise
 */
export async function deleteTimerPreset(presetId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('timer_preset')
      .delete()
      .eq('id', presetId);

    if (error) {
      console.error('Error deleting timer preset:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error deleting timer preset:', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// WORKOUT HISTORY FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get workout history for a user
 * @param userId - The user's ID
 * @param limit - Maximum number of records to return (optional)
 * @returns Promise<WorkoutHistory[]> - Array of workout history records
 */
export async function getWorkoutHistoryForUser(userId: string, limit?: number): Promise<WorkoutHistory[]> {
  try {
    let query = supabase
      .from('workout_history')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching workout history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching workout history:', error);
    return [];
  }
}

/**
 * Add a new workout history record
 * @param workout - Workout history data without ID and timestamps
 * @returns Promise<WorkoutHistory | null> - The created workout history or null on failure
 */
export async function addWorkoutHistory(workout: Omit<WorkoutHistory, 'id' | 'created_at'>): Promise<WorkoutHistory | null> {
  try {
    const { data, error } = await supabase
      .from('workout_history')
      .insert(workout)
      .select()
      .single();

    if (error) {
      console.error('Error adding workout history:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error adding workout history:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// PROGRAM ENROLLMENT FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get program enrollments for a user
 * @param userId - The user's ID
 * @returns Promise<ProgramEnrollment[]> - Array of program enrollments
 */
export async function getProgramEnrollmentsForUser(userId: string): Promise<ProgramEnrollment[]> {
  try {
    const { data, error } = await supabase
      .from('program_enrollment')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching program enrollments:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching program enrollments:', error);
    return [];
  }
}

/**
 * Create a new program enrollment
 * @param enrollment - Program enrollment data without timestamps
 * @returns Promise<ProgramEnrollment | null> - The created enrollment or null on failure
 */
export async function createProgramEnrollment(enrollment: Omit<ProgramEnrollment, 'id' | 'created_at' | 'updated_at'>): Promise<ProgramEnrollment | null> {
  try {
    const { data, error } = await supabase
      .from('program_enrollment')
      .insert(enrollment)
      .select()
      .single();

    if (error) {
      console.error('Error creating program enrollment:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating program enrollment:', error);
    return null;
  }
}

/**
 * Update a program enrollment
 * @param enrollmentId - The enrollment's ID
 * @param updates - Partial enrollment data to update
 * @returns Promise<ProgramEnrollment | null> - The updated enrollment or null on failure
 */
export async function updateProgramEnrollment(enrollmentId: string, updates: Partial<ProgramEnrollment>): Promise<ProgramEnrollment | null> {
  try {
    const { data, error } = await supabase
      .from('program_enrollment')
      .update(updates)
      .eq('id', enrollmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating program enrollment:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating program enrollment:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// EXERCISE LOG FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get exercise logs for a user
 * @param userId - The user's ID
 * @param limit - Maximum number of records to return (optional)
 * @returns Promise<ExerciseLog[]> - Array of exercise logs
 */
export async function getExerciseLogsForUser(userId: string, limit?: number): Promise<ExerciseLog[]> {
  try {
    let query = supabase
      .from('exercise_log')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching exercise logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching exercise logs:', error);
    return [];
  }
}

/**
 * Add a new exercise log
 * @param exerciseLog - Exercise log data without ID and timestamps
 * @returns Promise<ExerciseLog | null> - The created exercise log or null on failure
 */
export async function addExerciseLog(exerciseLog: Omit<ExerciseLog, 'id' | 'created_at'>): Promise<ExerciseLog | null> {
  try {
    const { data, error } = await supabase
      .from('exercise_log')
      .insert(exerciseLog)
      .select()
      .single();

    if (error) {
      console.error('Error adding exercise log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error adding exercise log:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// WORKOUT LOG FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get workout logs for a user
 * @param userId - The user's ID
 * @param limit - Maximum number of records to return (optional)
 * @returns Promise<WorkoutLog[]> - Array of workout logs
 */
export async function getWorkoutLogsForUser(userId: string, limit?: number): Promise<WorkoutLog[]> {
  try {
    let query = supabase
      .from('workout_log')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching workout logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching workout logs:', error);
    return [];
  }
}

/**
 * Create a new workout log
 * @param workoutLog - Workout log data without timestamps
 * @returns Promise<WorkoutLog | null> - The created workout log or null on failure
 */
export async function createWorkoutLog(workoutLog: Omit<WorkoutLog, 'id' | 'created_at' | 'updated_at'>): Promise<WorkoutLog | null> {
  try {
    const { data, error } = await supabase
      .from('workout_log')
      .insert(workoutLog)
      .select()
      .single();

    if (error) {
      console.error('Error creating workout log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating workout log:', error);
    return null;
  }
}

/**
 * Update a workout log
 * @param workoutLogId - The workout log's ID
 * @param updates - Partial workout log data to update
 * @returns Promise<WorkoutLog | null> - The updated workout log or null on failure
 */
export async function updateWorkoutLog(workoutLogId: string, updates: Partial<WorkoutLog>): Promise<WorkoutLog | null> {
  try {
    const { data, error } = await supabase
      .from('workout_log')
      .update(updates)
      .eq('id', workoutLogId)
      .select()
      .single();

    if (error) {
      console.error('Error updating workout log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating workout log:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// WORKOUT LOG SHARING FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get shared workout logs for a user
 * @param userId - The user's ID
 * @returns Promise<WorkoutLogSharing[]> - Array of shared workout logs
 */
export async function getSharedWorkoutLogs(userId: string): Promise<WorkoutLogSharing[]> {
  try {
    const { data, error } = await supabase
      .from('workout_log_sharing')
      .select('*')
      .eq('shared_with_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching shared workout logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching shared workout logs:', error);
    return [];
  }
}

/**
 * Share a workout log with another user
 * @param sharing - Workout log sharing data without ID and timestamps
 * @returns Promise<WorkoutLogSharing | null> - The created sharing record or null on failure
 */
export async function shareWorkoutLog(sharing: Omit<WorkoutLogSharing, 'id' | 'created_at'>): Promise<WorkoutLogSharing | null> {
  try {
    const { data, error } = await supabase
      .from('workout_log_sharing')
      .insert(sharing)
      .select()
      .single();

    if (error) {
      console.error('Error sharing workout log:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error sharing workout log:', error);
    return null;
  }
}

/**
 * Remove workout log sharing
 * @param sharingId - The sharing record's ID
 * @returns Promise<boolean> - True if removed successfully, false otherwise
 */
export async function removeWorkoutLogSharing(sharingId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('workout_log_sharing')
      .delete()
      .eq('id', sharingId);

    if (error) {
      console.error('Error removing workout log sharing:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error removing workout log sharing:', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// FRIENDSHIP FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Get friendships for a user (both as requester and addressee)
 * @param userId - The user's ID
 * @returns Promise<Friendship[]> - Array of friendships
 */
export async function getFriendshipsForUser(userId: string): Promise<Friendship[]> {
  try {
    const { data, error } = await supabase
      .from('friendship')
      .select('*')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching friendships:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching friendships:', error);
    return [];
  }
}

/**
 * Create a friendship request
 * @param friendship - Friendship data without timestamps
 * @returns Promise<Friendship | null> - The created friendship or null on failure
 */
export async function createFriendshipRequest(friendship: Omit<Friendship, 'id' | 'created_at' | 'updated_at'>): Promise<Friendship | null> {
  try {
    const { data, error } = await supabase
      .from('friendship')
      .insert(friendship)
      .select()
      .single();

    if (error) {
      console.error('Error creating friendship request:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating friendship request:', error);
    return null;
  }
}

/**
 * Update friendship status
 * @param friendshipId - The friendship's ID
 * @param status - New friendship status
 * @returns Promise<Friendship | null> - The updated friendship or null on failure
 */
export async function updateFriendshipStatus(friendshipId: number, status: FriendshipStatus): Promise<Friendship | null> {
  try {
    const { data, error } = await supabase
      .from('friendship')
      .update({ status })
      .eq('id', friendshipId)
      .select()
      .single();

    if (error) {
      console.error('Error updating friendship status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error updating friendship status:', error);
    return null;
  }
}

/**
 * Delete a friendship
 * @param friendshipId - The friendship's ID
 * @returns Promise<boolean> - True if deleted successfully, false otherwise
 */
export async function deleteFriendship(friendshipId: number): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('friendship')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      console.error('Error deleting friendship:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Unexpected error deleting friendship:', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// LEGACY TIMER PRESETS FUNCTIONS (for timer_presets table)
// -----------------------------------------------------------------------------

/**
 * Get legacy timer presets for a user
 * @param userId - The user's ID (optional)
 * @returns Promise<TimerPresets[]> - Array of legacy timer presets
 */
export async function getLegacyTimerPresets(userId?: string): Promise<TimerPresets[]> {
  try {
    let query = supabase
      .from('timer_presets')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
    } else {
      query = query.eq('is_public', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching legacy timer presets:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching legacy timer presets:', error);
    return [];
  }
}

/**
 * Create a new legacy timer preset
 * @param preset - Timer preset data without timestamps
 * @returns Promise<TimerPresets | null> - The created preset or null on failure
 */
export async function createLegacyTimerPreset(preset: Omit<TimerPresets, 'id' | 'created_at' | 'updated_at'>): Promise<TimerPresets | null> {
  try {
    const { data, error } = await supabase
      .from('timer_presets')
      .insert(preset)
      .select()
      .single();

    if (error) {
      console.error('Error creating legacy timer preset:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Unexpected error creating legacy timer preset:', error);
    return null;
  }
}

// -----------------------------------------------------------------------------
// UTILITY FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Test database connection
 * @returns Promise<boolean> - True if connection is successful, false otherwise
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('profile')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('Database connection test failed:', error);
      return false;
    }

    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Unexpected error testing database connection:', error);
    return false;
  }
}

/**
 * Get current authenticated user
 * @returns Promise<Profile | null> - The current user's profile or null
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return null;
    }

    return await getProfile(user.id);
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return null;
  }
}