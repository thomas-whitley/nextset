// Builds services/exerciseLibrary.data.json — the bundled exercise library.
//
// Sources:
//   1. services/exercise.database.json  — 40 curated exercises with coaching cues (ours)
//   2. free-exercise-db (yuhonas/free-exercise-db, Unlicense) — ~870 exercises
//
// Usage:  node scripts/exercises/build-library.mjs            (fetches the dataset)
//         node scripts/exercises/build-library.mjs <path.json> (use a local copy)
//
// Output rows use the snake_case field names of `Exercise` in services/exercise.types.ts
// so the app needs no runtime mapping. Curated ids stay 1..40; imported rows start at 1001
// in alphabetical slug order so ids are stable between builds.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const SOURCE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

const MUSCLE = {
  abdominals: 'Abs', abductors: 'Abductors', adductors: 'Adductors', biceps: 'Biceps',
  calves: 'Calves', chest: 'Chest', forearms: 'Forearms', glutes: 'Glutes',
  hamstrings: 'Hamstrings', lats: 'Back', 'lower back': 'Lower Back', 'middle back': 'Back',
  neck: 'Neck', quadriceps: 'Quads', shoulders: 'Shoulders', traps: 'Traps', triceps: 'Triceps',
};
const EQUIPMENT = {
  'body only': 'Bodyweight', machine: 'Machine', other: 'Other', 'foam roll': 'Foam Roller',
  kettlebells: 'Kettlebell', dumbbell: 'Dumbbell', cable: 'Cable', barbell: 'Barbell',
  bands: 'Bands', 'medicine ball': 'Medicine Ball', 'exercise ball': 'Exercise Ball',
  'e-z curl bar': 'EZ Bar',
};
const LEVEL = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Advanced' };
const CATEGORY = {
  strength: 'Strength', stretching: 'Stretching', plyometrics: 'Plyometric', strongman: 'Strongman',
  powerlifting: 'Strength', cardio: 'Cardio', 'olympic weightlifting': 'Olympic',
};
const FORCE = { push: 'Push', pull: 'Pull', static: 'Static' };

const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

const curated = JSON.parse(readFileSync(resolve(root, 'services/exercise.database.json'), 'utf8'))
  .map((e) => ({
    id: e.id,
    name: e.name,
    primary_muscle_group: e.primaryMuscleGroup,
    secondary_muscle_groups: e.secondaryMuscleGroups ?? [],
    equipment: e.equipment,
    difficulty_level: e.difficulty,
    movement_pattern: e.movementPattern,
    exercise_type: e.primaryMuscleGroup === 'Cardio' ? 'Cardio' : 'Strength',
    isKeystone: !!e.isKeystone,
    executionCues: e.executionCues,
    common_mistakes: e.commonMistakes ?? [],
    contraindications: e.contraindications ?? [],
    progressionId: e.progressionId ?? null,
    regressionId: e.regressionId ?? null,
    source: 'nextset',
  }));

let raw;
if (process.argv[2]) {
  raw = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'));
} else {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
  raw = await res.json();
}

// Dedupe on a normalised name, treating singular/plural as the same exercise
// ("Seated Cable Row" vs "Seated Cable Rows"). Curated rows always win.
const variants = (key) => [key, key.endsWith('s') ? key.slice(0, -1) : `${key}s`];
const seen = new Set(curated.flatMap((e) => variants(norm(e.name))));
let nextId = 1001;
const imported = raw
  .slice()
  .sort((a, b) => a.id.localeCompare(b.id))
  .filter((e) => {
    const keys = variants(norm(e.name));
    if (keys.some((k) => seen.has(k))) return false;
    keys.forEach((k) => seen.add(k));
    return true;
  })
  .map((e) => ({
    id: nextId++,
    name: e.name,
    primary_muscle_group: MUSCLE[e.primaryMuscles?.[0]] ?? 'Other',
    secondary_muscle_groups: [...new Set((e.secondaryMuscles ?? []).map((m) => MUSCLE[m] ?? 'Other'))],
    equipment: EQUIPMENT[e.equipment] ?? 'Other',
    difficulty_level: LEVEL[e.level] ?? 'Intermediate',
    movement_pattern: FORCE[e.force] ?? null,
    exercise_type: CATEGORY[e.category] ?? 'Strength',
    isKeystone: false,
    executionCues: { setup: [], action: e.instructions ?? [], keyMentalCues: '' },
    common_mistakes: [],
    contraindications: [],
    progressionId: null,
    regressionId: null,
    source: 'free-exercise-db',
    slug: e.id,
  }));

const all = [...curated, ...imported].sort((a, b) => a.name.localeCompare(b.name));
const out = resolve(root, 'services/exerciseLibrary.data.json');
writeFileSync(out, JSON.stringify(all));
console.log(`wrote ${all.length} exercises (${curated.length} curated + ${imported.length} imported) -> ${out}`);
