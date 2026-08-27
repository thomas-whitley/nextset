// Built-in program templates (spec §11.2 #9: curated templates + in-template edits).
//
// Exercise ids reference the curated rows (1–40) of the bundled library — see
// services/exercise.database.json for the id → name table. Sets start with an empty
// weight (the input shows "kg") and a target rep count; there is no fake "previous"
// data — "last time" hints come from workout_history when a workout starts.

import { ExerciseSet, Program, Workout, WorkoutExercise } from '@/services/exercise.types';

type Line = [exerciseId: number, name: string, sets: number, reps: string];

const sets = (workoutId: string, exerciseIndex: number, count: number, reps: string): ExerciseSet[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `${workoutId}-e${exerciseIndex}-s${i + 1}`,
    weight: '',
    reps,
    isComplete: false,
  }));

const workout = (id: string, order: number, name: string, description: string, lines: Line[]): Workout => ({
  id,
  name,
  description,
  order,
  exercises: lines.map<WorkoutExercise>(([exerciseId, exName, count, reps], i) => ({
    id: `${id}-e${i}`,
    exerciseId,
    name: exName,
    order: i,
    sets: sets(id, i, count, reps),
  })),
});

export const programTemplates: Program[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    creator: 'NextSet',
    schedule: '3 days a week',
    description: 'Three days, each built around one movement family. Run it once a week, or twice for six days.',
    isTemplate: true,
    workouts: [
      workout('ppl-push', 0, 'Push', 'Chest, shoulders, triceps', [
        [1, 'Barbell Bench Press', 4, '6'],
        [23, 'Overhead Press (Barbell)', 3, '8'],
        [3, 'Incline Dumbbell Press', 3, '10'],
        [25, 'Lateral Raise', 3, '12'],
        [32, 'Triceps Pushdown', 3, '12'],
      ]),
      workout('ppl-pull', 1, 'Pull', 'Back, biceps, rear shoulders', [
        [7, 'Barbell Deadlift', 3, '5'],
        [11, 'Pull-up', 3, '8'],
        [8, 'Barbell Bent-Over Row', 3, '8'],
        [26, 'Face Pull', 3, '15'],
        [27, 'Barbell Curl', 3, '10'],
      ]),
      workout('ppl-legs', 2, 'Legs', 'Quads, hamstrings, glutes, calves', [
        [15, 'Barbell Back Squat', 4, '6'],
        [18, 'Romanian Deadlift (RDL)', 3, '8'],
        [22, 'Leg Press', 3, '10'],
        [21, 'Bulgarian Split Squat', 3, '10'],
        [37, 'Standing Calf Raise', 4, '15'],
      ]),
    ],
  },
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    creator: 'NextSet',
    schedule: '4 days a week',
    description: 'Two upper and two lower days. Heavier on days 1 and 2, more reps on days 3 and 4.',
    isTemplate: true,
    workouts: [
      workout('ul-upper-a', 0, 'Upper A', 'Heavy pressing and rowing', [
        [1, 'Barbell Bench Press', 4, '5'],
        [8, 'Barbell Bent-Over Row', 4, '5'],
        [23, 'Overhead Press (Barbell)', 3, '8'],
        [13, 'Lat Pulldown', 3, '10'],
        [28, 'Dumbbell Curl', 3, '12'],
      ]),
      workout('ul-lower-a', 1, 'Lower A', 'Squat focus', [
        [15, 'Barbell Back Squat', 4, '5'],
        [18, 'Romanian Deadlift (RDL)', 3, '8'],
        [20, 'Lunge', 3, '10'],
        [35, 'Hanging Leg Raise', 3, '12'],
      ]),
      workout('ul-upper-b', 2, 'Upper B', 'Volume pressing and pulling', [
        [3, 'Incline Dumbbell Press', 3, '10'],
        [10, 'Seated Cable Row', 3, '10'],
        [24, 'Seated Dumbbell Press', 3, '10'],
        [25, 'Lateral Raise', 3, '15'],
        [32, 'Triceps Pushdown', 3, '12'],
      ]),
      workout('ul-lower-b', 3, 'Lower B', 'Hinge focus', [
        [7, 'Barbell Deadlift', 3, '5'],
        [22, 'Leg Press', 3, '12'],
        [21, 'Bulgarian Split Squat', 3, '10'],
        [37, 'Standing Calf Raise', 4, '15'],
        [34, 'Plank', 3, '45'],
      ]),
    ],
  },
  {
    id: 'full-body-3',
    name: 'Full Body 3×',
    creator: 'NextSet',
    schedule: '3 days a week',
    description: 'Whole body every session, three sessions a week. The simplest way to train consistently.',
    isTemplate: true,
    workouts: [
      workout('fb-a', 0, 'Full Body A', 'Squat, press, row', [
        [15, 'Barbell Back Squat', 3, '8'],
        [1, 'Barbell Bench Press', 3, '8'],
        [8, 'Barbell Bent-Over Row', 3, '8'],
        [34, 'Plank', 3, '45'],
      ]),
      workout('fb-b', 1, 'Full Body B', 'Hinge, overhead, pull', [
        [7, 'Barbell Deadlift', 3, '5'],
        [23, 'Overhead Press (Barbell)', 3, '8'],
        [13, 'Lat Pulldown', 3, '10'],
        [28, 'Dumbbell Curl', 2, '12'],
      ]),
      workout('fb-c', 2, 'Full Body C', 'Single-leg, dumbbells, cables', [
        [21, 'Bulgarian Split Squat', 3, '10'],
        [2, 'Dumbbell Bench Press', 3, '10'],
        [10, 'Seated Cable Row', 3, '10'],
        [32, 'Triceps Pushdown', 2, '12'],
        [37, 'Standing Calf Raise', 3, '15'],
      ]),
    ],
  },
  {
    id: 'strength-5x5',
    name: '5×5 Strength',
    creator: 'NextSet',
    schedule: '3 days a week, alternate A and B',
    description: 'Five sets of five on the big barbell lifts. Add weight whenever you get all 25 reps.',
    isTemplate: true,
    workouts: [
      workout('55-a', 0, 'Workout A', 'Squat, bench, row', [
        [15, 'Barbell Back Squat', 5, '5'],
        [1, 'Barbell Bench Press', 5, '5'],
        [8, 'Barbell Bent-Over Row', 5, '5'],
      ]),
      workout('55-b', 1, 'Workout B', 'Squat, press, deadlift', [
        [15, 'Barbell Back Squat', 5, '5'],
        [23, 'Overhead Press (Barbell)', 5, '5'],
        [7, 'Barbell Deadlift', 1, '5'],
      ]),
    ],
  },
  {
    id: 'body-part-5',
    name: '5-Day Split',
    creator: 'NextSet',
    schedule: '5 days a week',
    description: 'One muscle group a day. More sets per muscle, one hard session each per week.',
    isTemplate: true,
    workouts: [
      workout('bp-chest', 0, 'Chest', 'Press and fly', [
        [1, 'Barbell Bench Press', 4, '8'],
        [3, 'Incline Dumbbell Press', 3, '10'],
        [6, 'Dumbbell Flye', 3, '12'],
        [4, 'Push-up', 3, '15'],
      ]),
      workout('bp-back', 1, 'Back', 'Pull and row', [
        [7, 'Barbell Deadlift', 3, '5'],
        [11, 'Pull-up', 3, '8'],
        [8, 'Barbell Bent-Over Row', 3, '10'],
        [10, 'Seated Cable Row', 3, '12'],
      ]),
      workout('bp-legs', 2, 'Legs', 'Squat, hinge, calves', [
        [15, 'Barbell Back Squat', 4, '8'],
        [18, 'Romanian Deadlift (RDL)', 3, '10'],
        [22, 'Leg Press', 3, '12'],
        [20, 'Lunge', 3, '10'],
        [37, 'Standing Calf Raise', 4, '15'],
      ]),
      workout('bp-shoulders', 3, 'Shoulders', 'Press and raise', [
        [23, 'Overhead Press (Barbell)', 4, '8'],
        [24, 'Seated Dumbbell Press', 3, '10'],
        [25, 'Lateral Raise', 4, '12'],
        [26, 'Face Pull', 3, '15'],
      ]),
      workout('bp-arms', 4, 'Arms', 'Biceps and triceps', [
        [31, 'Close-Grip Barbell Bench Press', 3, '8'],
        [27, 'Barbell Curl', 3, '10'],
        [32, 'Triceps Pushdown', 3, '12'],
        [28, 'Dumbbell Curl', 3, '12'],
        [30, 'Dips (Triceps Version)', 3, '10'],
      ]),
    ],
  },
];

export const programTemplateById = (id: string): Program | undefined =>
  programTemplates.find((p) => p.id === id);
