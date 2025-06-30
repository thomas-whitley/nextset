import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function populateDatabase() {
  console.log("Reading exercise data from JSON file...");
  const jsonPath = path.resolve(__dirname, 'exercise_ontology.json');
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

  console.log(`Found ${jsonData.length} exercises. Uploading to Supabase...`);

  // Prepare data for batch upsert if each exercise is a row
  // Assumes each exercise in jsonData has an 'id' and you want the whole exercise object as 'payload'
  const exercisesToUpsert = jsonData.map((exercise: any) => ({
    id: exercise.id, // Assuming your exercise objects have an 'id' field
    payload: exercise, // Store the entire exercise object in the payload
    updated_at: new Date().toISOString(),
  }));

  if (exercisesToUpsert.length > 0) {
    // 'upsert' will create rows if they don't exist or update them if they do, based on 'id'.
    const { data, error } = await supabase
      .from('exercise_data')
      .upsert(exercisesToUpsert)
      .select();

    if (error) {
      console.error('FATAL: Error upserting exercise data:', error);
    } else {
      console.log(`SUCCESS: Successfully upserted ${data ? data.length : 0} exercises.`);
      // console.log('Data:', data); // Uncomment to see the returned data
    }
  } else {
    console.log("No exercises found to upsert.");
  }
}

populateDatabase();