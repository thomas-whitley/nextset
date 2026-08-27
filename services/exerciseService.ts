// ExerciseService — the bundled exercise library.
//
// The library ships inside the app (services/exerciseLibrary.data.json): 40 curated
// exercises with coaching cues plus ~850 from free-exercise-db (Unlicense), merged by
// scripts/exercises/build-library.mjs. Nothing here touches the network, so the picker
// works offline. Custom (user-created) exercises are parked until after 1.0.

import library from './exerciseLibrary.data.json';
import { Exercise } from './exercise.types';

const EXERCISES: Exercise[] = library as Exercise[];
const BY_ID = new Map<number, Exercise>(EXERCISES.map((e) => [e.id, e]));

const normalise = (s: string) => s.toLowerCase().trim();

export class ExerciseService {
  /** Every exercise, sorted by name. */
  static getAll(): Exercise[] {
    return EXERCISES;
  }

  /** Alias kept for callers written against the old Supabase-backed API. */
  static async getMasterExercises(): Promise<Exercise[]> {
    return EXERCISES;
  }

  static getById(id: number): Exercise | undefined {
    return BY_ID.get(id);
  }

  /** Case-insensitive match on name, primary/secondary muscle, or equipment. */
  static search(term: string, source: Exercise[] = EXERCISES): Exercise[] {
    const q = normalise(term);
    if (!q) return source;
    return source.filter((e) =>
      normalise(e.name).includes(q) ||
      normalise(e.primary_muscle_group).includes(q) ||
      (e.secondary_muscle_groups ?? []).some((m) => normalise(m).includes(q)) ||
      normalise(e.equipment).includes(q)
    );
  }

  static getByMuscleGroup(muscleGroup: string): Exercise[] {
    const q = normalise(muscleGroup);
    return EXERCISES.filter((e) => normalise(e.primary_muscle_group) === q);
  }

  static get count(): number {
    return EXERCISES.length;
  }
}
