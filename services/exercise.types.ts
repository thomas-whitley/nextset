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

export interface Exercise {
  id: number; // Changed to number to match JSON
  name: string;
  isKeystone?: boolean; // Added from JSON
  primary_muscle_group: MuscleGroup;
  secondary_muscle_groups?: MuscleGroup[];
  equipment: Equipment; // Changed from equipment_required: Equipment[] to match JSON
  difficulty_level?: DifficultyLevel;
  movement_pattern?: MovementPattern;
  executionCues: ExecutionCues; // Added from JSON, replacing execution_notes
  common_mistakes?: string[]; // Matches JSON
  contraindications?: string[]; // Added from JSON
  progressionId?: number | null; // Added from JSON
  regressionId?: number | null; // Added from JSON

  // Fields from original interface not directly in exercise.database.json, made optional
  description?: string; // Not in JSON
  exercise_type?: ExerciseType; // Not in JSON
  rep_ranges?: RepRanges; // Not in JSON
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
  imageUrl: string;
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