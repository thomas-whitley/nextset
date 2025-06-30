// Updated types to match your actual database schema
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  username?: string;
  phone?: string;
  role?: 'user' | 'admin' | 'super_admin';
  avatar_url?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  action: string;
  target_user_id?: string;
  details?: any;
  created_at: string;
}

export interface TimerPreset {
  id: string;
  user_id?: string;
  preset_name: string;
  is_public: boolean;
  preset_data: any;
  created_at: string;
  updated_at: string;
}

export interface ProgramEnrollment {
  id: string;
  user_id: string;
  program_id: string;
  enrolled_at: string;
  status: string;
  progress?: any;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_name: string;
  workout_data?: any;
  duration_minutes?: number;
  total_volume?: number;
  notes?: string;
  completed_at: string;
  created_at: string;
}

export interface WorkoutLogSharing {
  id: string;
  workout_log_id: string;
  shared_by_user_id: string;
  shared_with_user_id?: string;
  is_public: boolean;
  shared_at: string;
}

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      profile: {
        Row: Profile;
        Insert: Omit<Profile, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Profile>;
      };
      admin_log: {
        Row: AdminLog;
        Insert: Omit<AdminLog, 'id' | 'created_at'>;
        Update: Partial<AdminLog>;
      };
      timer_preset: {
        Row: TimerPreset;
        Insert: Omit<TimerPreset, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<TimerPreset>;
      };
      program_enrollment: {
        Row: ProgramEnrollment;
        Insert: Omit<ProgramEnrollment, 'id'>;
        Update: Partial<ProgramEnrollment>;
      };
      workout_log: {
        Row: WorkoutLog;
        Insert: Omit<WorkoutLog, 'id' | 'created_at'>;
        Update: Partial<WorkoutLog>;
      };
      workout_log_sharing: {
        Row: WorkoutLogSharing;
        Insert: Omit<WorkoutLogSharing, 'id'>;
        Update: Partial<WorkoutLogSharing>;
      };
      friendship: {
        Row: Friendship;
        Insert: Omit<Friendship, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Friendship>;
      };
    };
    Functions: {
      // Define any Supabase SQL functions you call here
    };
  };
}