import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wdwrzowmsinuqtgohgay.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkd3J6b3dtc2ludXF0Z29oZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzIwMTIsImV4cCI6MjA2NjY0ODAxMn0.IfuRpyd3eVIhZUUiX8H8BuaP446_dkDi5_DwNA4C6Bw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function populateDatabase() {
  console.log('🚀 Starting comprehensive database population...');

  try {
    // 1. Insert sample profiles (users)
    console.log('👥 Inserting user profiles...');
    const { data: profiles, error: profileError } = await supabase
      .from('profile')
      .insert([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          email: 'alex.johnson@momentum.app',
          full_name: 'Alex Johnson',
          username: 'alexj_fitness',
          phone: '+1-555-0101',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=400',
          is_active: true,
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          email: 'sarah.martinez@momentum.app',
          full_name: 'Sarah Martinez',
          username: 'sarah_strong',
          phone: '+1-555-0102',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=400',
          is_active: true,
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          email: 'mike.trainer@momentum.app',
          full_name: 'Mike Thompson',
          username: 'mike_trainer',
          phone: '+1-555-0103',
          role: 'admin',
          avatar_url: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400',
          is_active: true,
          created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          email: 'emma.yoga@momentum.app',
          full_name: 'Emma Wilson',
          username: 'yoga_emma',
          phone: '+1-555-0104',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
          is_active: true,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          email: 'david.runner@momentum.app',
          full_name: 'David Chen',
          username: 'runner_david',
          phone: '+1-555-0105',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
          is_active: true,
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440006',
          email: 'jenny.crossfit@momentum.app',
          full_name: 'Jenny Rodriguez',
          username: 'crossfit_jenny',
          phone: '+1-555-0106',
          role: 'user',
          avatar_url: 'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=400',
          is_active: true,
          created_at: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (profileError) {
      console.error('❌ Error inserting profiles:', profileError);
      return;
    }
    console.log(`✅ Inserted ${profiles?.length || 0} user profiles`);

    // 2. Insert timer presets
    console.log('⏱️ Inserting timer presets...');
    const { data: timerPresets, error: timerError } = await supabase
      .from('timer_preset')
      .insert([
        {
          id: '660e8400-e29b-41d4-a716-446655440001',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          preset_name: 'HIIT Blast',
          description: 'High-intensity interval training for maximum calorie burn',
          timer_type: 'circuit',
          is_public: true,
          preset_data: {
            exercises: [
              { name: 'Burpees', workTime: 45, restTime: 15 },
              { name: 'Mountain Climbers', workTime: 30, restTime: 15 },
              { name: 'Jump Squats', workTime: 30, restTime: 15 },
              { name: 'Push-ups', workTime: 30, restTime: 15 }
            ],
            sets: 4,
            setRestTime: 120,
            circuits: 3,
            circuitRestTime: 180
          },
          tags: ['HIIT', 'Cardio', 'Fat Burn', 'Bodyweight'],
          usage_count: 234,
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440002',
          user_id: '550e8400-e29b-41d4-a716-446655440003',
          preset_name: 'Strength Focus',
          description: 'Perfect rest intervals for heavy compound movements',
          timer_type: 'standard',
          is_public: true,
          preset_data: {
            exercises: [
              { name: 'Compound Movement', workTime: 0, restTime: 180 },
              { name: 'Accessory Work', workTime: 0, restTime: 120 },
              { name: 'Isolation Exercise', workTime: 0, restTime: 90 }
            ],
            sets: 5,
            setRestTime: 300,
            circuits: 1,
            circuitRestTime: 0
          },
          tags: ['Strength', 'Powerlifting', 'Heavy', 'Compound'],
          usage_count: 156,
          created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440003',
          user_id: '550e8400-e29b-41d4-a716-446655440004',
          preset_name: 'Yoga Flow Timer',
          description: 'Gentle intervals for mindful movement and stretching',
          timer_type: 'circuit',
          is_public: true,
          preset_data: {
            exercises: [
              { name: 'Sun Salutation A', workTime: 60, restTime: 10 },
              { name: 'Warrior Sequence', workTime: 90, restTime: 15 },
              { name: 'Balance Poses', workTime: 45, restTime: 10 },
              { name: 'Cool Down Stretches', workTime: 120, restTime: 0 }
            ],
            sets: 3,
            setRestTime: 60,
            circuits: 1,
            circuitRestTime: 0
          },
          tags: ['Yoga', 'Flexibility', 'Mindfulness', 'Recovery'],
          usage_count: 89,
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '660e8400-e29b-41d4-a716-446655440004',
          user_id: '550e8400-e29b-41d4-a716-446655440006',
          preset_name: 'CrossFit WOD',
          description: 'Intense workout of the day timer for competitive training',
          timer_type: 'circuit',
          is_public: false,
          preset_data: {
            exercises: [
              { name: 'Thrusters', workTime: 60, restTime: 0 },
              { name: 'Pull-ups', workTime: 60, restTime: 0 },
              { name: 'Box Jumps', workTime: 60, restTime: 0 },
              { name: 'Kettlebell Swings', workTime: 60, restTime: 60 }
            ],
            sets: 5,
            setRestTime: 120,
            circuits: 1,
            circuitRestTime: 0
          },
          tags: ['CrossFit', 'WOD', 'Competition', 'Intense'],
          usage_count: 67,
          created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (timerError) {
      console.error('❌ Error inserting timer presets:', timerError);
      return;
    }
    console.log(`✅ Inserted ${timerPresets?.length || 0} timer presets`);

    // 3. Insert program enrollments
    console.log('📋 Inserting program enrollments...');
    const { data: enrollments, error: enrollmentError } = await supabase
      .from('program_enrollment')
      .insert([
        {
          id: '770e8400-e29b-41d4-a716-446655440001',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          program_template_id: '880e8400-e29b-41d4-a716-446655440001',
          status: 'active',
          program_data: {
            name: 'Push Pull Legs Split',
            description: 'Classic 6-day split for serious muscle building',
            duration_weeks: 12,
            difficulty: 'Intermediate',
            workouts: [
              {
                name: 'Push Day (Chest, Shoulders, Triceps)',
                exercises: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Lateral Raises', 'Tricep Dips', 'Close-Grip Bench Press'],
                estimated_duration: 75
              },
              {
                name: 'Pull Day (Back, Biceps)',
                exercises: ['Deadlifts', 'Pull-ups', 'Barbell Rows', 'Lat Pulldowns', 'Barbell Curls', 'Hammer Curls'],
                estimated_duration: 70
              },
              {
                name: 'Leg Day (Quads, Hamstrings, Glutes, Calves)',
                exercises: ['Squats', 'Romanian Deadlifts', 'Leg Press', 'Walking Lunges', 'Calf Raises', 'Leg Curls'],
                estimated_duration: 80
              }
            ]
          },
          current_progress: 65,
          started_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: null,
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440002',
          user_id: '550e8400-e29b-41d4-a716-446655440002',
          program_template_id: '880e8400-e29b-41d4-a716-446655440002',
          status: 'completed',
          program_data: {
            name: 'Beginner Full Body',
            description: 'Perfect starting program for new lifters',
            duration_weeks: 8,
            difficulty: 'Beginner',
            workouts: [
              {
                name: 'Full Body A',
                exercises: ['Squats', 'Bench Press', 'Bent-over Rows', 'Overhead Press', 'Planks'],
                estimated_duration: 45
              },
              {
                name: 'Full Body B',
                exercises: ['Deadlifts', 'Incline Press', 'Pull-ups', 'Dumbbell Rows', 'Russian Twists'],
                estimated_duration: 50
              }
            ]
          },
          current_progress: 100,
          started_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '770e8400-e29b-41d4-a716-446655440003',
          user_id: '550e8400-e29b-41d4-a716-446655440005',
          program_template_id: '880e8400-e29b-41d4-a716-446655440003',
          status: 'active',
          program_data: {
            name: 'Marathon Training',
            description: '16-week progressive running program for marathon preparation',
            duration_weeks: 16,
            difficulty: 'Advanced',
            workouts: [
              {
                name: 'Easy Run',
                exercises: ['5-8 mile easy pace run', 'Dynamic warm-up', 'Cool-down stretches'],
                estimated_duration: 60
              },
              {
                name: 'Long Run',
                exercises: ['12-20 mile progressive run', 'Hydration strategy', 'Recovery walk'],
                estimated_duration: 180
              },
              {
                name: 'Speed Work',
                exercises: ['Track intervals', 'Tempo runs', 'Hill repeats'],
                estimated_duration: 75
              }
            ]
          },
          current_progress: 35,
          started_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: null,
          created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (enrollmentError) {
      console.error('❌ Error inserting program enrollments:', enrollmentError);
      return;
    }
    console.log(`✅ Inserted ${enrollments?.length || 0} program enrollments`);

    // 4. Insert workout logs
    console.log('💪 Inserting workout logs...');
    const { data: workoutLogs, error: workoutError } = await supabase
      .from('workout_log')
      .insert([
        {
          id: '990e8400-e29b-41d4-a716-446655440001',
          user_id: '550e8400-e29b-41d4-a716-446655440001',
          program_enrollment_id: '770e8400-e29b-41d4-a716-446655440001',
          workout_name: 'Push Day - Week 8',
          workout_data: {
            exercises: [
              {
                name: 'Bench Press',
                sets: [
                  { weight: 185, reps: 8, rpe: 7, rest_time: 180 },
                  { weight: 185, reps: 8, rpe: 8, rest_time: 180 },
                  { weight: 185, reps: 7, rpe: 9, rest_time: 180 },
                  { weight: 175, reps: 10, rpe: 8, rest_time: 0 }
                ]
              },
              {
                name: 'Overhead Press',
                sets: [
                  { weight: 115, reps: 8, rpe: 7, rest_time: 150 },
                  { weight: 115, reps: 7, rpe: 8, rest_time: 150 },
                  { weight: 115, reps: 6, rpe: 9, rest_time: 150 }
                ]
              },
              {
                name: 'Incline Dumbbell Press',
                sets: [
                  { weight: 70, reps: 12, rpe: 7, rest_time: 120 },
                  { weight: 70, reps: 11, rpe: 8, rest_time: 120 },
                  { weight: 70, reps: 10, rpe: 9, rest_time: 120 }
                ]
              }
            ],
            notes: 'Felt strong today! Bench press moving really well. Added extra drop set.',
            workout_rating: 9
          },
          health_stats: {
            avg_heart_rate: 142,
            max_heart_rate: 168,
            calories_burned: 387,
            active_energy: 298,
            workout_load: 8.5
          },
          total_volume: 12450,
          duration_minutes: 78,
          user_notes: 'Great session! New PR on bench press. Feeling confident about hitting 200lbs soon.',
          privacy_level: 'shared',
          started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 78 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
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
                  { weight: 135, reps: 10, rpe: 6, rest_time: 120 },
                  { weight: 135, reps: 10, rpe: 7, rest_time: 120 },
                  { weight: 135, reps: 10, rpe: 8, rest_time: 120 }
                ]
              },
              {
                name: 'Bench Press',
                sets: [
                  { weight: 95, reps: 10, rpe: 7, rest_time: 120 },
                  { weight: 95, reps: 9, rpe: 8, rest_time: 120 },
                  { weight: 95, reps: 8, rpe: 9, rest_time: 120 }
                ]
              },
              {
                name: 'Bent-over Rows',
                sets: [
                  { weight: 85, reps: 10, rpe: 7, rest_time: 120 },
                  { weight: 85, reps: 10, rpe: 8, rest_time: 120 },
                  { weight: 85, reps: 9, rpe: 9, rest_time: 120 }
                ]
              }
            ],
            notes: 'Final workout of the program! So proud of the progress made.',
            workout_rating: 10
          },
          health_stats: {
            avg_heart_rate: 128,
            max_heart_rate: 152,
            calories_burned: 312,
            active_energy: 245,
            workout_load: 7.2
          },
          total_volume: 8915,
          duration_minutes: 65,
          user_notes: 'Amazing final workout! Ready to start the intermediate program. Gained so much strength and confidence.',
          privacy_level: 'public',
          started_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000 + 65 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString()
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
                sets: [{ duration: 300, intensity: 'moderate', mindfulness_rating: 8 }]
              },
              {
                name: 'Warrior Sequence',
                sets: [{ duration: 480, intensity: 'moderate', mindfulness_rating: 9 }]
              },
              {
                name: 'Balance Flow',
                sets: [{ duration: 360, intensity: 'light', mindfulness_rating: 9 }]
              },
              {
                name: 'Cool Down & Meditation',
                sets: [{ duration: 600, intensity: 'light', mindfulness_rating: 10 }]
              }
            ],
            notes: 'Beautiful morning practice. Felt very centered and grounded.',
            workout_rating: 9
          },
          health_stats: {
            avg_heart_rate: 98,
            max_heart_rate: 125,
            calories_burned: 156,
            active_energy: 89,
            stress_relief: 9
          },
          total_volume: 0,
          duration_minutes: 45,
          user_notes: 'Perfect morning practice. Feeling centered and energized for the day ahead. Grateful for this time.',
          privacy_level: 'public',
          started_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440004',
          user_id: '550e8400-e29b-41d4-a716-446655440005',
          program_enrollment_id: '770e8400-e29b-41d4-a716-446655440003',
          workout_name: 'Long Run - Week 4',
          workout_data: {
            exercises: [
              {
                name: '12 Mile Progressive Run',
                sets: [{
                  distance: 12,
                  pace_per_mile: '7:45',
                  elevation_gain: 450,
                  splits: ['8:15', '8:00', '7:50', '7:45', '7:40', '7:35', '7:30', '7:25', '7:20', '7:15', '7:10', '7:05']
                }]
              }
            ],
            notes: 'Felt strong throughout. Negative split execution was perfect.',
            workout_rating: 9
          },
          health_stats: {
            avg_heart_rate: 165,
            max_heart_rate: 182,
            calories_burned: 1245,
            active_energy: 1156,
            vo2_max_estimate: 52
          },
          total_volume: 0,
          duration_minutes: 93,
          user_notes: 'Incredible run! Felt like I could have kept going. Marathon pace is feeling more comfortable.',
          privacy_level: 'shared',
          started_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 93 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '990e8400-e29b-41d4-a716-446655440005',
          user_id: '550e8400-e29b-41d4-a716-446655440006',
          program_enrollment_id: null,
          workout_name: 'CrossFit WOD: "Fran"',
          workout_data: {
            exercises: [
              {
                name: 'Thrusters (95lbs)',
                sets: [
                  { reps: 21, time: 95 },
                  { reps: 15, time: 78 },
                  { reps: 9, time: 52 }
                ]
              },
              {
                name: 'Pull-ups',
                sets: [
                  { reps: 21, time: 85 },
                  { reps: 15, time: 72 },
                  { reps: 9, time: 48 }
                ]
              }
            ],
            notes: 'Classic benchmark WOD. Pushed hard but maintained good form.',
            workout_rating: 8,
            total_time: '6:45'
          },
          health_stats: {
            avg_heart_rate: 178,
            max_heart_rate: 195,
            calories_burned: 245,
            active_energy: 198,
            workout_intensity: 10
          },
          total_volume: 4275,
          duration_minutes: 7,
          user_notes: 'Brutal but amazing! New PR on Fran by 15 seconds. The training is paying off.',
          privacy_level: 'public',
          started_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 7 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (workoutError) {
      console.error('❌ Error inserting workout logs:', workoutError);
      return;
    }
    console.log(`✅ Inserted ${workoutLogs?.length || 0} workout logs`);

    // 5. Insert workout log sharing
    console.log('🤝 Inserting workout log sharing...');
    const { data: sharing, error: sharingError } = await supabase
      .from('workout_log_sharing')
      .insert([
        {
          workout_log_id: '990e8400-e29b-41d4-a716-446655440001',
          shared_with_user_id: '550e8400-e29b-41d4-a716-446655440003',
          permission: 'viewer',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          workout_log_id: '990e8400-e29b-41d4-a716-446655440001',
          shared_with_user_id: '550e8400-e29b-41d4-a716-446655440002',
          permission: 'viewer',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          workout_log_id: '990e8400-e29b-41d4-a716-446655440002',
          shared_with_user_id: '550e8400-e29b-41d4-a716-446655440001',
          permission: 'collaborator',
          created_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          workout_log_id: '990e8400-e29b-41d4-a716-446655440004',
          shared_with_user_id: '550e8400-e29b-41d4-a716-446655440001',
          permission: 'viewer',
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (sharingError) {
      console.error('❌ Error inserting workout log sharing:', sharingError);
      return;
    }
    console.log(`✅ Inserted ${sharing?.length || 0} workout sharing records`);

    // 6. Insert friendships
    console.log('👫 Inserting friendships...');
    const { data: friendships, error: friendshipError } = await supabase
      .from('friendship')
      .insert([
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440001',
          addressee_id: '550e8400-e29b-41d4-a716-446655440002',
          status: 'accepted',
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440001',
          addressee_id: '550e8400-e29b-41d4-a716-446655440003',
          status: 'accepted',
          created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 24 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440004',
          addressee_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'pending',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440002',
          addressee_id: '550e8400-e29b-41d4-a716-446655440004',
          status: 'accepted',
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440005',
          addressee_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'accepted',
          created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          requester_id: '550e8400-e29b-41d4-a716-446655440006',
          addressee_id: '550e8400-e29b-41d4-a716-446655440003',
          status: 'accepted',
          created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (friendshipError) {
      console.error('❌ Error inserting friendships:', friendshipError);
      return;
    }
    console.log(`✅ Inserted ${friendships?.length || 0} friendships`);

    // 7. Insert admin logs
    console.log('📊 Inserting admin logs...');
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
            reason: 'Promoted to trainer role for exceptional community contributions',
            promoted_by: 'system'
          },
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          admin_id: '550e8400-e29b-41d4-a716-446655440003',
          action: 'settings_updated',
          target_id: null,
          details: {
            setting: 'public_timer_presets',
            previous_value: false,
            new_value: true,
            reason: 'Enable community sharing of timer presets to foster collaboration'
          },
          created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          admin_id: '550e8400-e29b-41d4-a716-446655440003',
          action: 'content_deleted',
          target_id: '550e8400-e29b-41d4-a716-446655440999',
          details: {
            content_type: 'workout_log',
            reason: 'Inappropriate content reported by multiple users',
            reporter_count: 3,
            action_taken: 'content_removed'
          },
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          admin_id: '550e8400-e29b-41d4-a716-446655440003',
          action: 'manual_data_edit',
          target_id: '550e8400-e29b-41d4-a716-446655440002',
          details: {
            field_changed: 'username',
            previous_value: 'sarah_martinez',
            new_value: 'sarah_strong',
            reason: 'User requested username change due to privacy concerns'
          },
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
        }
      ])
      .select();

    if (adminError) {
      console.error('❌ Error inserting admin logs:', adminError);
      return;
    }
    console.log(`✅ Inserted ${adminLogs?.length || 0} admin logs`);

    console.log('\n🎉 Database population completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`👥 ${profiles?.length || 0} user profiles (including 1 admin)`);
    console.log(`⏱️ ${timerPresets?.length || 0} timer presets (3 public, 1 private)`);
    console.log(`📋 ${enrollments?.length || 0} program enrollments (2 active, 1 completed)`);
    console.log(`💪 ${workoutLogs?.length || 0} workout logs (strength, yoga, running, CrossFit)`);
    console.log(`🤝 ${sharing?.length || 0} workout sharing records`);
    console.log(`👫 ${friendships?.length || 0} friendships (5 accepted, 1 pending)`);
    console.log(`📊 ${adminLogs?.length || 0} admin logs`);

    console.log('\n✨ Your Momentum fitness app now has realistic sample data!');
    console.log('🔗 Check your Supabase dashboard to see all the populated tables.');

  } catch (error) {
    console.error('💥 Error populating database:', error);
  }
}

// Run the population script
populateDatabase();

async function main() {
  // ... your database client setup ...
  try {
    // ... all of your database population logic ...
    console.log('Database populated successfully!');
  } catch (error) {
    console.error('!!!!!!!!!! SCRIPT FAILED !!!!!!!!!!');
    console.error(error); // This will print the detailed error from Supabase/Postgres
    process.exit(1); // Ensure the script exits with a failure code
  }
}

main();