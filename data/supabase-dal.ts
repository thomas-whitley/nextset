import { supabase } from './supabase-client';

// =============================================================================
// TYPES
// =============================================================================

export type UserRole = 'user' | 'admin' | 'super_admin';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserActiveProgram {
  id: string;
  user_id: string;
  program_template_id: string;
  program_data: any;
  created_at?: string;
  updated_at?: string;
}

export interface WorkoutHistory {
  id: string;
  user_id: string;
  completed_at?: string;
  workout_data: any;
  health_stats?: any;
  total_volume?: number;
  duration_minutes?: number;
  created_at?: string;
}

export interface ExerciseLog {
  id: string;
  user_id: string;
  completed_at?: string;
  workout_name: string;
  duration_seconds?: number;
  workout_data: any;
  created_at?: string;
}

export interface TimerPreset {
  id: string;
  user_id?: string;
  preset_name: string;
  is_public?: boolean;
  preset_data: any;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// PROFILE
// =============================================================================

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

export async function updateProfile(userId: string, updates: Partial<Pick<Profile, 'full_name' | 'username' | 'phone' | 'avatar_url'>>): Promise<Profile | null> {
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

export async function getCurrentUserProfile(): Promise<Profile | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    return await getProfile(user.id);
  } catch (error) {
    console.error('Error getting current user profile:', error);
    return null;
  }
}

// =============================================================================
// USER ACTIVE PROGRAMS
// =============================================================================

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

// =============================================================================
// WORKOUT HISTORY
// =============================================================================

export async function getWorkoutHistoryForUser(userId: string, limit?: number): Promise<WorkoutHistory[]> {
  try {
    let query = supabase
      .from('workout_history')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (limit) query = query.limit(limit);

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

// =============================================================================
// EXERCISE LOG
// =============================================================================

export async function getExerciseLogsForUser(userId: string, limit?: number): Promise<ExerciseLog[]> {
  try {
    let query = supabase
      .from('exercise_log')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (limit) query = query.limit(limit);

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

// =============================================================================
// TIMER PRESETS
// =============================================================================

export async function getTimerPresets(userId?: string): Promise<TimerPreset[]> {
  try {
    let query = supabase
      .from('timer_presets')
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

export async function createTimerPreset(preset: Omit<TimerPreset, 'id' | 'created_at' | 'updated_at'>): Promise<TimerPreset | null> {
  try {
    const { data, error } = await supabase
      .from('timer_presets')
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
