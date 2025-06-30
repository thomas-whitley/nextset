import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdwrzowmsinuqtgohgay.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkd3J6b3dtc2ludXF0Z29oZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzIwMTIsImV4cCI6MjA2NjY0ODAxMn0.IfuRpyd3eVIhZUUiX8H8BuaP446_dkDi5_DwNA4C6Bw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function populateDatabase() {
  console.log('Starting database population...');

  try {
    // 1. Insert sample profiles (users)
    console.log('Inserting profiles...');
    const { data: profiles, error: profileError } = await supabase
      .from('profile')
      .insert([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'alex.johnson@email.com',
          full_name: 'Alex Johnson',
          username: 'alexj_fitness',
          phone: '+1-555-0101',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          email: 'sarah.martinez@email.com',
          full_name: 'Sarah Martinez',
          username: 'sarah_strong',
          phone: '+1-555-0102',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          email: 'mike.trainer@email.com',
          full_name: 'Mike Thompson',
          username: 'mike_trainer',
          phone: '+1-555-0103',
          role: 'admin',
          avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          email: 'emma.yoga@email.com',
          full_name: 'Emma Wilson',
          username: 'yoga_emma',
          phone: '+1-555-0104',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          email: 'david.runner@email.com',
          full_name: 'David Chen',
          username: 'runner_david',
          phone: '+1-555-0105',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (profileError) {
      console.error('Error inserting profiles:', profileError);
      return;
    }
    console.log(`✅ Inserted ${profiles?.length || 0} profiles`);

    // 2. Insert timer presets
    console.log('Inserting timer presets...');
    const { data: timerPresets, error: timerError } = await supabase
      .from('timer_preset')
      .insert([
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          preset_name: 'HIIT Blast',
          description: 'High-intensity interval training for maximum burn',
          timer_type: 'circuit',
          is_public: true,
          preset_data: {
            work_time: 45,
            rest_time: 15,
            rounds: 8,
            sets: 3,
            set_rest: 120
          },
          tags: ['HIIT', 'Cardio', 'Fat Burn'],
          usage_count: 156,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440002',
          user_id: '550e8400-e29b-41d4-a716-446655440002',
          preset_name: 'Strength Focus',
          description: 'Perfect rest intervals for heavy lifting',
          timer_type: 'standard',
          is_public: true,
          preset_data: {
            work_time: 0,
            rest_time: 180,
            rounds: 1,
            sets: 5,
            set_rest: 300
          },
          tags: ['Strength', 'Powerlifting', 'Heavy'],
          usage_count: 89,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440003',
          user_id: '550e8400-e29b-41d4-a716-446655440004',
          preset_name: 'Yoga Flow Timer',
          description: 'Gentle intervals for yoga practice',
          timer_type: 'circuit',
          is_public: true,
          preset_data: {
            work_time: 60,
            rest_time: 10,
            rounds: 12,
            sets: 1,
            set_rest: 0
          },
          tags: ['Yoga', 'Flexibility', 'Mindfulness'],
          usage_count: 234,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (timerError) {
      console.error('Error inserting timer presets:', timerError);
      return;
    }
    console.log(`✅ Inserted ${timerPresets?.length || 0} timer presets`);

    // 3. Insert program enrollments
    console.log('Inserting program enrollments...');
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('program_enrollment')
      .insert([
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          program_template_id: '880e8400-e29b-41d4-a716-446655440001',
          status: 'active',
          program_data: {
            name: 'Push Pull Legs',
            description: 'Classic 3-day split for muscle building',
            weeks: 12,
            workouts: [
              {
                name: 'Push Day',
                exercises: ['Bench Press', 'Overhead Press', 'Dips', 'Lateral Raises']
              },
              {
                name: 'Pull Day', 
                exercises: ['Pull-ups', 'Barbell Rows', 'Face Pulls', 'Bicep Curls']
              },
              {
                name: 'Leg Day',
                exercises: ['Squats', 'Romanian Deadlifts', 'Leg Press', 'Calf Raises']
              }
            ]
          },
          current_progress: 45,
          started_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440002',
          user_id: '550e8400-e29b-41d4-a716-446655440002',
          program_template_id: '880e8400-e29b-41d4-a716-446655440002',
          status: 'completed',
          program_data: {
            name: 'Beginner Full Body',
            description: 'Perfect starting program for new lifters',
            weeks: 8,
            workouts: [
              {
                name: 'Full Body A',
                exercises: ['Squats', 'Bench Press', 'Bent-over Rows', 'Overhead Press']
              },
              {
                name: 'Full Body B',
                exercises: ['Deadlifts', 'Incline Press', 'Pull-ups', 'Dumbbell Rows']
              }
            ]
          },
          current_progress: 100,
          started_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (enrollmentError) {
      console.error('Error inserting program enrollments:', enrollmentError);
      return;
    }
    console.log(`✅ Inserted ${enrollments?.length || 0} program enrollments`);

    // 4. Insert workout logs
    console.log('Inserting workout logs...');
    const { data: workoutLogs, error: workoutError } = await supabase
      .from('workout_log')
      .insert([
        {
          id: '990e8400-e29b-41d4-a716-446655440001',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          program_enrollment_id: '770e8400-e29b-41d4-a716-446655440001',
          workout_name: 'Push Day - Week 6',
          workout_data: {
            exercises: [
              {
                name: 'Bench Press',
                sets: [
                  { weight: 185, reps: 8, rpe: 7 },
                  { weight: 185, reps: 8, rpe: 8 },
                  { weight: 185, reps: 7, rpe: 9 }
                ]
              },
              {
                name: 'Overhead Press',
                sets: [
                  { weight: 115, reps: 8, rpe: 7 },
                  { weight: 115, reps: 7, rpe: 8 },
                  { weight: 115, reps: 6, rpe: 9 }
                ]
              }
            ]
          },
          health_stats: {
            avg_heart_rate: 142,
            max_heart_rate: 168,
            calories_burned: 387,
            active_energy: 298
          },
          total_volume: 8950,
          duration_minutes: 78,
          user_notes: 'Felt strong today! Bench press moving well.',
          privacy_level: 'shared',
          started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 78 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440002',
          user_id: '550e8400-e29b-41d4-a716-446655440002',
          program_enrollment_id: '770e8400-e29b-41d4-a716-446655440002',
          workout_name: 'Full Body A - Final Week',
          workout_data: {
            exercises: [
              {
                name: 'Squats',
                sets: [
                  { weight: 135, reps: 10, rpe: 6 },
                  { weight: 135, reps: 10, rpe: 7 },
                  { weight: 135, reps: 10, rpe: 8 }
                ]
              },
              {
                name: 'Bench Press',
                sets: [
                  { weight: 95, reps: 10, rpe: 7 },
                  { weight: 95, reps: 9, rpe: 8 },
                  { weight: 95, reps: 8, rpe: 9 }
                ]
              }
            ]
          },
          health_stats: {
            avg_heart_rate: 128,
            max_heart_rate: 152,
            calories_burned: 312,
            active_energy: 245
          },
          total_volume: 6915,
          duration_minutes: 65,
          user_notes: 'Great final workout! Ready for the next program.',
          privacy_level: 'public',
          started_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000 + 65 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440003',
          user_id: '550e8400-e29b-41d4-a716-446655440004',
          program_enrollment_id: null,
          workout_name: 'Morning Yoga Flow',
          workout_data: {
            exercises: [
              {
                name: 'Sun Salutation A',
                sets: [{ duration: 300, intensity: 'moderate' }]
              },
              {
                name: 'Warrior Sequence',
                sets: [{ duration: 480, intensity: 'moderate' }]
              },
              {
                name: 'Cool Down Stretches',
                sets: [{ duration: 600, intensity: 'light' }]
              }
            ]
          },
          health_stats: {
            avg_heart_rate: 98,
            max_heart_rate: 125,
            calories_burned: 156,
            active_energy: 89
          },
          total_volume: 0,
          duration_minutes: 45,
          user_notes: 'Perfect morning practice. Feeling centered and energized.',
          privacy_level: 'public',
          started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (workoutError) {
      console.error('Error inserting workout logs:', workoutError);
      return;
    }
    console.log(`✅ Inserted ${workoutLogs?.length || 0} workout logs`);

    // 5. Insert workout log sharing
    console.log('Inserting workout log sharing...');
    const { data: sharing, error: sharingError } = await supabase
      .from('workout_log_sharing')
      .insert([
        {
          workout_log_id: '990e8400-e29b-41d4-a716-446655440001',
          shared_with_user_id: '550e8400-e29b-41d4-a716-446655440003',
          permission: 'viewer',
          created_at: new Date().toISOString()
        },
        {
          workout_log_id: '990e8400-e29b-41d4-a716-446655440002',
          shared_with_user_id: '550e8400-e29b-41d4-a716-446655440001',
          permission: 'collaborator',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (sharingError) {
      console.error('Error inserting workout log sharing:', sharingError);
      return;
    }
    console.log(`✅ Inserted ${sharing?.length || 0} workout sharing records`);

    // 6. Insert friendships
    console.log('Inserting friendships...');
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendship')
      .insert([
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440001',
          addressee_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'accepted',
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440001',
          addressee_id: '550e8400-e29b-41d4-a716-446655440003',
          status: 'accepted',
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440004',
          addressee_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'pending',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440002',
          addressee_id: '550e8400-e29b-41d4-a716-446655440004',
          status: 'accepted',
          created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (friendshipError) {
      console.error('Error inserting friendships:', friendshipError);
      return;
    }
    console.log(`✅ Inserted ${friendships?.length || 0} friendships`);

    // 7. Insert admin logs
    console.log('Inserting admin logs...');
    const { data: adminLogs, error: adminError } = await supabase
      .from('admin_log')
      .insert([
        {
          admin_id: '550e8400-e29b-41d4-a716-446655440003',
          action: 'user_role_changed',
          target_id: '550e8400-e29b-41d4-a716-446655440003',
          details: {
            previous_role: 'user',
            new_role: 'admin',
            reason: 'Promoted to trainer role'
          },
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          admin_id: '550e8400-e29b-41d4-a716-446655440003',
          action: 'settings_updated',
          target_id: null,
          details: {
            setting: 'public_timer_presets',
            previous_value: false,
            new_value: true,
            reason: 'Enable community sharing of timer presets'
          },
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (adminError) {
      console.error('Error inserting admin logs:', adminError);
      return;
    }
    console.log(`✅ Inserted ${adminLogs?.length || 0} admin logs`);

    console.log('\n🎉 Database population completed successfully!');
    console.log('\nSummary:');
    console.log(`- ${profiles?.length || 0} user profiles`);
    console.log(`- ${timerPresets?.length || 0} timer presets`);
    console.log(`- ${enrollments?.length || 0} program enrollments`);
    console.log(`- ${workoutLogs?.length || 0} workout logs`);
    console.log(`- ${sharing?.length || 0} workout sharing records`);
    console.log(`- ${friendships?.length || 0} friendships`);
    console.log(`- ${adminLogs?.length || 0} admin logs`);

  } catch (error) {
    console.error('Error populating database:', error);
  }
}

// Run the population script
populateDatabase();