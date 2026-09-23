import { parseRepsTarget, formatRepsTarget, backfillRepsTargets, commitRepsDraft } from '../repsTarget';
import type { Program } from '../exercise.types';

describe('parseRepsTarget', () => {
  it('parses a single number', () => expect(parseRepsTarget('8')).toEqual({ min: 8, max: 8 }));
  it('parses a range with hyphen or en dash', () => {
    expect(parseRepsTarget('8-12')).toEqual({ min: 8, max: 12 });
    expect(parseRepsTarget('8–12')).toEqual({ min: 8, max: 12 });
  });
  it('rejects junk and inverted ranges', () => {
    expect(parseRepsTarget('')).toBeUndefined();
    expect(parseRepsTarget('abc')).toBeUndefined();
    expect(parseRepsTarget('12-8')).toBeUndefined();
    expect(parseRepsTarget('0')).toBeUndefined();
  });
});

describe('formatRepsTarget', () => {
  it('formats', () => {
    expect(formatRepsTarget({ min: 8, max: 8 })).toBe('8');
    expect(formatRepsTarget({ min: 8, max: 12 })).toBe('8–12');
    expect(formatRepsTarget(undefined)).toBe('');
  });
});

describe('backfillRepsTargets', () => {
  const tmpl: Program = {
    id: 't1', name: 'T', creator: '', description: '', isTemplate: true,
    workouts: [{ id: 'w1', name: 'A', description: '', order: 0, exercises: [
      { id: 'w1-e0', exerciseId: 1, name: 'Squat', order: 0, repsTarget: { min: 5, max: 5 }, sets: [] },
    ] }],
  };
  it('copies the target from the matching template exercise by exerciseId', () => {
    const copy: Program = { ...tmpl, id: 'c1', isTemplate: false, templateId: 't1',
      workouts: [{ ...tmpl.workouts[0], exercises: [{ ...tmpl.workouts[0].exercises[0], repsTarget: undefined }] }] };
    const out = backfillRepsTargets(copy, [tmpl]);
    expect(out.workouts[0].exercises[0].repsTarget).toEqual({ min: 5, max: 5 });
  });
  it('returns the same object once a copy has been backfilled', () => {
    const copy: Program = { ...tmpl, id: 'c1', isTemplate: false, templateId: 't1', repsTargetsBackfilled: true };
    expect(backfillRepsTargets(copy, [tmpl])).toBe(copy);
  });
  it('marks a copy as backfilled the first time, even when nothing needed filling', () => {
    const copy: Program = { ...tmpl, id: 'c1', isTemplate: false, templateId: 't1' };
    const out = backfillRepsTargets(copy, [tmpl]);
    expect(out.repsTargetsBackfilled).toBe(true);
    expect(out.workouts).toEqual(copy.workouts);
  });
  it('never refills a target the user cleared after the first backfill (review I1)', () => {
    const cleared: Program = { ...tmpl, id: 'c1', isTemplate: false, templateId: 't1', repsTargetsBackfilled: true,
      workouts: [{ ...tmpl.workouts[0], exercises: [{ ...tmpl.workouts[0].exercises[0], repsTarget: undefined }] }] };
    expect(backfillRepsTargets(cleared, [tmpl]).workouts[0].exercises[0].repsTarget).toBeUndefined();
  });
  it('leaves unknown exercises without a target', () => {
    const copy: Program = { ...tmpl, id: 'c1', isTemplate: false, templateId: 't1',
      workouts: [{ ...tmpl.workouts[0], exercises: [{ id: 'x', exerciseId: 99, name: 'Other', order: 0, sets: [] }] }] };
    expect(backfillRepsTargets(copy, [tmpl]).workouts[0].exercises[0].repsTarget).toBeUndefined();
  });
});

describe('commitRepsDraft (editor field blur, grill R2-Q1)', () => {
  const six = { min: 6, max: 6 };
  test('a valid range is saved and shown normalised', () => {
    expect(commitRepsDraft('8-12', six)).toEqual({ target: { min: 8, max: 12 }, text: '8–12' });
    expect(commitRepsDraft(' 8 - 12 ', six)).toEqual({ target: { min: 8, max: 12 }, text: '8–12' });
    expect(commitRepsDraft('10', six)).toEqual({ target: { min: 10, max: 10 }, text: '10' });
  });
  test('anything invalid reverts to what was there (Review Focus 4)', () => {
    for (const junk of ['12-8', '0', '150', 'abc', '8-', '-8', '8–120']) {
      expect({ junk, out: commitRepsDraft(junk, six) }).toEqual({ junk, out: { target: six, text: '6' } });
    }
    expect(commitRepsDraft('abc', undefined)).toEqual({ target: undefined, text: '' });
  });
  test('empty clears the target', () => {
    expect(commitRepsDraft('   ', six)).toEqual({ target: undefined, text: '' });
  });
});
