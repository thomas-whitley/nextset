import {
  addExercise, removeExercise, setSetCount, setRepsTarget, reorderExercises, updateDay, reorderDays,
  resetToTemplate, makeBlankTemplate, isBlankProgram, isBlankTemplateId, cleanProgramName, MAX_SETS, MAX_BLANK_DAYS,
} from '../programEdits';
import type { Program, Workout } from '../exercise.types';

const day = (): Workout => ({
  id: 'd1', name: 'Pull', description: '', order: 0,
  exercises: [
    { id: 'a', exerciseId: 7, name: 'Deadlift', order: 0, repsTarget: { min: 5, max: 5 }, sets: [{ id: 'a1', weight: '100', reps: '5', isComplete: false }] },
    { id: 'b', exerciseId: 11, name: 'Pull-up', order: 1, sets: [
      { id: 'b1', weight: '', reps: '', isComplete: false },
      { id: 'b2', weight: '', reps: '', isComplete: false },
    ] },
  ],
});
const program = (): Program => ({
  id: 'active_ppl_1', name: 'PPL', creator: 'NextSet', description: '', isTemplate: false, templateId: 'ppl',
  workouts: [day(), { ...day(), id: 'd2', name: 'Legs', order: 1 }],
});

test('addExercise appends three blank sets, all ids unique, at the end', () => {
  const next = addExercise(day(), { exerciseId: 8, name: 'Row' });
  const added = next.exercises[2];
  expect(added).toMatchObject({ exerciseId: 8, name: 'Row', order: 2 });
  expect(added.sets).toHaveLength(3);
  expect(added.sets.every((s) => s.weight === '' && s.reps === '' && !s.isComplete)).toBe(true);
  expect(new Set([added.id, ...added.sets.map((s) => s.id), 'a', 'b']).size).toBe(6);
});

test('two adds in the same millisecond still get different ids', () => {
  const twice = addExercise(addExercise(day(), { exerciseId: 8, name: 'Row' }), { exerciseId: 8, name: 'Row' });
  expect(twice.exercises[2].id).not.toBe(twice.exercises[3].id);
});

test('removeExercise renumbers order; an unknown id is no change', () => {
  expect(removeExercise(day(), 'a')!.exercises.map((e) => [e.id, e.order])).toEqual([['b', 0]]);
  expect(removeExercise(day(), 'zzz')).toBeNull();
});

test('setSetCount grows with blank sets and shrinks from the end', () => {
  expect(setSetCount(day(), 'a', 3)!.exercises[0].sets.map((s) => s.weight)).toEqual(['100', '', '']);
  expect(setSetCount(day(), 'b', 1)!.exercises[1].sets.map((s) => s.id)).toEqual(['b1']);
});

test('setSetCount clamps to 1..MAX_SETS and returns null when nothing changes', () => {
  expect(setSetCount(day(), 'a', 0)).toBeNull(); // clamps to 1, which it already is
  expect(setSetCount(day(), 'a', 999)!.exercises[0].sets).toHaveLength(MAX_SETS);
  expect(setSetCount(day(), 'b', 2)).toBeNull();
  expect(setSetCount(day(), 'nope', 3)).toBeNull();
});

test('setRepsTarget sets, clears, and ignores a no-op', () => {
  expect(setRepsTarget(day(), 'b', { min: 8, max: 12 })!.exercises[1].repsTarget).toEqual({ min: 8, max: 12 });
  expect(setRepsTarget(day(), 'a', undefined)!.exercises[0]).not.toHaveProperty('repsTarget');
  expect(setRepsTarget(day(), 'a', { min: 5, max: 5 })).toBeNull();
  expect(setRepsTarget(day(), 'b', undefined)).toBeNull();
});

test('reorderExercises needs every id exactly once', () => {
  expect(reorderExercises(day(), ['b', 'a'])!.exercises.map((e) => [e.id, e.order])).toEqual([['b', 0], ['a', 1]]);
  expect(reorderExercises(day(), ['b'])).toBeNull();
  expect(reorderExercises(day(), ['b', 'b'])).toBeNull();
});

test('updateDay edits one day and leaves the others as they were', () => {
  const p = program();
  const next = updateDay(p, 'd2', (w) => removeExercise(w, 'a'))!;
  expect(next.workouts[0]).toBe(p.workouts[0]);
  expect(next.workouts[1].exercises).toHaveLength(1);
  expect(updateDay(p, 'nope', (w) => w)).toBeNull();
  expect(updateDay(p, 'd1', () => null)).toBeNull();
});

test('reorderDays rewrites order and refuses a partial list', () => {
  expect(reorderDays(program(), ['d2', 'd1'])!.workouts.map((w) => [w.id, w.order])).toEqual([['d2', 0], ['d1', 1]]);
  expect(reorderDays(program(), ['d2'])).toBeNull();
});

test("resetToTemplate takes the template's days but keeps this copy's id", () => {
  const template: Program = { id: 'ppl', name: 'Push / Pull / Legs', creator: 'NextSet', description: 'x', isTemplate: true, workouts: [{ ...day(), exercises: [] }] };
  const reset = resetToTemplate(program(), template);
  expect(reset).toMatchObject({ id: 'active_ppl_1', templateId: 'ppl', isTemplate: false, name: 'Push / Pull / Legs' });
  expect(reset.workouts).toEqual(template.workouts);
  expect(reset.workouts).not.toBe(template.workouts); // a copy: the bundled templates are never shared
});

test('makeBlankTemplate: unique blank- id, one empty day when asked for one', () => {
  const a = makeBlankTemplate(1, 1000, () => 0.1);
  const b = makeBlankTemplate(1, 1000, () => 0.2);
  expect(a.id.startsWith('blank-')).toBe(true);
  expect(a.id).not.toBe(b.id);
  expect(a.name).toBe('Blank program');
  expect(a.workouts).toEqual([{ id: `${a.id}-d1`, name: 'Day 1', description: '', order: 0, exercises: [] }]);
});

test('makeBlankTemplate: N empty days named Day 1..N, clamped to 1..7 (grill Q4/Q13)', () => {
  const three = makeBlankTemplate(3, 1000, () => 0.1);
  expect(three.workouts.map((w) => [w.id, w.name, w.order, w.exercises.length])).toEqual([
    [`${three.id}-d1`, 'Day 1', 0, 0],
    [`${three.id}-d2`, 'Day 2', 1, 0],
    [`${three.id}-d3`, 'Day 3', 2, 0],
  ]);
  expect(makeBlankTemplate(0).workouts).toHaveLength(1);
  expect(makeBlankTemplate(99).workouts).toHaveLength(MAX_BLANK_DAYS);
  expect(makeBlankTemplate(2.6).workouts).toHaveLength(3);
});

test('isBlankProgram reads templateId, falling back to id', () => {
  expect(isBlankProgram({ ...program(), templateId: 'blank-x' })).toBe(true);
  expect(isBlankProgram(program())).toBe(false);
  expect(isBlankProgram({ ...program(), templateId: undefined, id: 'blank-y' })).toBe(true);
  expect(isBlankTemplateId('blank-z')).toBe(true);
  expect(isBlankTemplateId('ppl')).toBe(false);
});

test('cleanProgramName trims, collapses spaces, caps at 40, rejects empty', () => {
  expect(cleanProgramName('  Arms   and abs ')).toBe('Arms and abs');
  expect(cleanProgramName('   ')).toBeNull();
  expect(cleanProgramName('x'.repeat(60))).toHaveLength(40);
});
