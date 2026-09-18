import { epley1rm, bestsFromWorkouts, detectPr, mergeBest } from '../prMath';
import type { Workout } from '../exercise.types';

const w = (sets: [string, string, boolean][]): Workout => ({
  id: 'w', name: 'W', description: '', order: 0,
  exercises: [{ id: 'e', exerciseId: 1, name: 'Bench', order: 0,
    sets: sets.map(([weight, reps, isComplete], i) => ({ id: `s${i}`, weight, reps, isComplete })) }],
});

describe('epley1rm', () => {
  it('returns the weight for a single', () => expect(epley1rm(100, 1)).toBeCloseTo(103.33, 1));
  it('60x8 ≈ 76', () => expect(epley1rm(60, 8)).toBeCloseTo(76, 0));
  it('is 0 for missing data', () => expect(epley1rm(0, 5)).toBe(0));
});

describe('bestsFromWorkouts', () => {
  it('ignores incomplete sets and keeps max weight and max e1rm separately', () => {
    const bests = bestsFromWorkouts([w([['100', '1', true], ['80', '10', true], ['200', '1', false]])]);
    expect(bests[1].maxWeight).toBe(100);
    expect(bests[1].maxE1rm).toBeCloseTo(epley1rm(80, 10), 5);
  });
  it('returns {} for no history', () => expect(bestsFromWorkouts([])).toEqual({}));
});

describe('detectPr', () => {
  const bests = { 1: { maxWeight: 100, maxE1rm: 110 } };
  it('flags heavier weight', () => expect(detectPr(bests, 1, '102.5', '1')).toEqual({ weight: true, e1rm: false }));
  it('flags better e1rm at same weight', () => expect(detectPr(bests, 1, '100', '5')).toEqual({ weight: false, e1rm: true }));
  it('no flag when equal or lower', () => expect(detectPr(bests, 1, '100', '1')).toEqual({ weight: false, e1rm: false }));
  it('first ever set of an exercise is not a PR', () => expect(detectPr(bests, 2, '50', '5')).toEqual({ weight: false, e1rm: false }));
  it('junk input is never a PR', () => expect(detectPr(bests, 1, '', '')).toEqual({ weight: false, e1rm: false }));
});

describe('mergeBest', () => {
  it('raises the record so a second PR in one session compares against the first', () => {
    const next = mergeBest({ 1: { maxWeight: 100, maxE1rm: 110 } }, 1, '105', '1');
    expect(next[1].maxWeight).toBe(105);
    expect(detectPr(next, 1, '105', '1')).toEqual({ weight: false, e1rm: false });
  });
});
