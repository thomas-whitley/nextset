import { createClient } from '@supabase/supabase-js';
import { Exercise } from '../services/exercise.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      exercises: {
        Row: Exercise;
        Insert: Omit<Exercise, 'id'>;
        Update: Partial<Exercise>;
      };
    };
  };
}