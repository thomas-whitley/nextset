import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load the exercise database JSON file
const exercisesFilePath = path.resolve(__dirname, '../services/exercise.database.json');
const exercisesData = JSON.parse(fs.readFileSync(exercisesFilePath, 'utf-8'));

// Initialize Supabase client
// Note: In a real environment, these would be environment variables
const supabaseUrl = 'https://wdwrzowmsinuqtgohgay.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indkd3J6b3dtc2ludXF0Z29oZ2F5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNzIwMTIsImV4cCI6MjA2NjY0ODAxMn0.IfuRpyd3eVIhZUUiX8H8BuaP446_dkDi5_DwNA4C6Bw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function populateExercises() {
  console.log(`Starting to populate exercises table with ${exercisesData.length} exercises...`);

  try {
    // Create the exercises table if it doesn't exist
    const { error: createTableError } = await supabase.rpc('create_exercises_table_if_not_exists', {});
    
    if (createTableError) {
      console.log('Table might already exist or there was an error creating it:', createTableError);
      console.log('Continuing with insert operation...');
    }

    // Insert exercises in batches to avoid request size limitations
    const batchSize = 20;
    for (let i = 0; i < exercisesData.length; i += batchSize) {
      const batch = exercisesData.slice(i, i + batchSize);
      
      const { data, error } = await supabase
        .from('exercises')
        .upsert(
          batch.map(exercise => ({
            id: exercise.id,
            name: exercise.name,
            is_keystone: exercise.isKeystone,
            movement_pattern: exercise.movementPattern,
            primary_muscle_group: exercise.primaryMuscleGroup,
            secondary_muscle_groups: exercise.secondaryMuscleGroups,
            equipment: exercise.equipment,
            difficulty: exercise.difficulty,
            execution_cues: exercise.executionCues,
            common_mistakes: exercise.commonMistakes,
            contraindications: exercise.contraindications,
            progression_id: exercise.progressionId,
            regression_id: exercise.regressionId
          })),
          { onConflict: 'id' }
        );

      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error);
      } else {
        console.log(`Successfully inserted batch ${i / batchSize + 1} (${batch.length} exercises)`);
      }
    }

    console.log('Finished populating exercises table!');
  } catch (error) {
    console.error('Unexpected error during population:', error);
  }
}

// Create the stored procedure for creating the table if it doesn't exist
async function createStoredProcedure() {
  const { error } = await supabase.rpc('create_stored_procedure', {});
  
  if (error) {
    console.log('Creating stored procedure manually...');
    
    const { error: sqlError } = await supabase.sql(`
      CREATE OR REPLACE FUNCTION create_exercises_table_if_not_exists()
      RETURNS void AS $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'exercises') THEN
          CREATE TABLE public.exercises (
            id integer PRIMARY KEY,
            name text NOT NULL,
            is_keystone boolean DEFAULT false,
            movement_pattern text,
            primary_muscle_group text NOT NULL,
            secondary_muscle_groups text[] DEFAULT '{}',
            equipment text,
            difficulty text,
            execution_cues jsonb,
            common_mistakes text[] DEFAULT '{}',
            contraindications text[] DEFAULT '{}',
            progression_id integer,
            regression_id integer,
            created_at timestamptz DEFAULT now()
          );
          
          -- Enable RLS
          ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
          
          -- Create policy for read access
          CREATE POLICY "Allow read access for all users"
            ON public.exercises
            FOR SELECT
            TO public
            USING (true);
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    if (sqlError) {
      console.error('Error creating stored procedure:', sqlError);
    } else {
      console.log('Stored procedure created successfully');
    }
  }
}

async function main() {
  try {
    await createStoredProcedure();
    await populateExercises();
    console.log('Script completed successfully!');
  } catch (error) {
    console.error('Script failed:', error);
  }
}

main();