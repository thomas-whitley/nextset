import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdwrzowmsinuqtgohgay.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkd3J6b3dtc2ludXF0Z29oZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzIwMTIsImV4cCI6MjA2NjY0ODAxMn0.IfuRpyd3eVIhZUUiX8H8BuaP446_dkDi5_DwNA4C6Bw';

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

// Test database connection and insert test record
export const testDatabaseConnection = async () => {
  try {
    console.log('Testing Supabase connection...');
    
    // Test basic connection to the profile table
    const { data: connectionTest, error: connectionError } = await supabase
      .from('profile')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('Connection test failed:', connectionError);
      return { success: false, error: connectionError };
    }
    
    console.log('Connection successful! Profile table exists');
    
    // Test workout_log table as well
    const { data: workoutTest, error: workoutError } = await supabase
      .from('workout_log')
      .select('count', { count: 'exact', head: true });
    
    if (workoutError) {
      console.error('Workout log table test failed:', workoutError);
      return { success: false, error: workoutError };
    }
    
    console.log('Workout log table also accessible');
    
    return { 
      success: true, 
      message: 'All tables accessible',
      tables: ['profile', 'workout_log']
    };
    
  } catch (error) {
    console.error('Database test failed:', error);
    return { success: false, error };
  }
};