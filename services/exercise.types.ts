// Exercise.ts
// Exercise Types and Enums for Workout Application

// Updated to match JSON values (PascalCase)
export enum MuscleGroup {
  CHEST = "Chest",
  BACK = "Back",
  SHOULDERS = "Shoulders",
  BICEPS = "Biceps",
  TRICEPS = "Triceps",
  LEGS = "Upper Legs", // JSON uses "Upper Legs"
  UPPER_LEGS = "Upper Legs",
  LOWER_LEGS = "Lower Legs",
  GLUTES = "Glutes",
  HAMSTRINGS = "Hamstrings",
  CORE = "Core",
  ABS = "Abs", // JSON uses "Abs" for some core exercises
  CALVES = "Calves",
  FOREARMS = "Forearms",
  CARDIO = "Cardio", // For cardio exercises
}

// Updated to match JSON values
export enum Equipment {
  BARBELL = "Barbell",
  DUMBBELL = "Dumbbell",
  MACHINE = "Machine",
  BODYWEIGHT = "Bodyweight",
  KETTLEBELL = "Kettlebell",
  CABLE = "Cable",
  BANDS = "Bands",
  TREADMILL = "Treadmill", // Added from JSON
}

export enum DifficultyLevel {
  BEGINNER = "Beginner",
  INTERMEDIATE = "Intermediate",
  ADVANCED = "Advanced",
  Elite = "Elite",
  // JSON uses "Beginner", "Intermediate", "Advanced"
}

// Updated to match JSON values
export enum MovementPattern {
  PUSH = "Push",
  PULL = "Pull",
  HINGE = "Hinge",
  SQUAT = "Squat",
  LUNGE = "Lunge",
  CARRY = "Carry",
  ROTATION = "Rotation",
  CORE = "Core", // Added from JSON
  ANKLE = "Ankle", // Added from JSON
  WRIST = "Wrist", // Added from JSON
  CARDIO = "Cardio", // Added from JSON
}

export enum ExerciseType {
  STRENGTH = "Strength",
  CARDIO = "Cardio",
  PLYOMETRIC = "Plyometric",
  STRETCHING = "Stretching",
  // Add others
}

export interface RepRanges { // Not in JSON, keep as optional or remove if not used elsewhere
  strength: string;
  hypertrophy: string;
  endurance: string;
}

export interface ExecutionCues {
  setup: string[];
  action: string[];
  keyMentalCues: string;
}

// One row of the bundled library (services/exerciseLibrary.data.json, built by
// scripts/exercises/build-library.mjs). Vocabulary fields are plain strings: the
// enums above list the common values but the merged dataset has more.
export interface Exercise {
  id: number;
  name: string;
  isKeystone?: boolean;
  primary_muscle_group: string;
  secondary_muscle_groups?: string[];
  equipment: string;
  difficulty_level?: string;
  movement_pattern?: string | null;
  executionCues: ExecutionCues;
  common_mistakes?: string[];
  contraindications?: string[];
  progressionId?: number | null;
  regressionId?: number | null;
  description?: string;
  exercise_type?: string;
  rep_ranges?: RepRanges;
  /** 'nextset' (curated, with cues) or 'free-exercise-db' (Unlicense) */
  source?: string;
  slug?: string;
}

// Updated types for dynamic workout customization
export interface ExerciseSet {
  id: string;
  weight: string;
  reps: string;
  isComplete: boolean;
  previousWeight?: string;
  previousReps?: string;
  restTime?: number; // in seconds
}

export interface WorkoutExercise {
  id: string;
  exerciseId: number; // References Exercise.id
  name: string;
  sets: ExerciseSet[];
  notes?: string;
  order: number; // For reordering exercises within a workout
}

export interface Workout {
  id: string;
  name: string;
  description: string;
  exercises: WorkoutExercise[];
  order: number; // For reordering workouts within a program
  estimatedDuration?: number; // in minutes
}

export interface Program {
  id: string;
  name: string;
  creator: string;
  description: string;
  imageUrl?: string;
  /** Short label for the card header, e.g. "3 days a week" */
  schedule?: string;
  workouts: Workout[];
  isTemplate?: boolean; // Distinguishes between templates and user instances
  templateId?: string; // References the original template if this is a user instance
}

// New interface for user active programs
export interface UserActiveProgram {
  id: string;
  user_id: string;
  program_template_id: string;
  program_data: Program;
  created_at: string;
  updated_at: string;
}