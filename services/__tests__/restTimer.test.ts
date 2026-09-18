import { restReducer, remainingSeconds, IDLE_REST } from '../restTimer';

const start = restReducer(IDLE_REST, { type: 'start', setId: 's1', seconds: 90, now: 1000_000, exerciseName: 'Bench', setNumber: 2 });

describe('restReducer', () => {
  it('start sets endsAt = now + seconds', () => {
    expect(start.setId).toBe('s1');
    expect(remainingSeconds(start, 1000_000)).toBe(90);
    expect(remainingSeconds(start, 1030_000)).toBe(60);
  });
  it('a second start restarts the countdown for the new set', () => {
    const again = restReducer(start, { type: 'start', setId: 's2', seconds: 60, now: 1010_000, exerciseName: 'Bench', setNumber: 3 });
    expect(again.setId).toBe('s2');
    expect(remainingSeconds(again, 1010_000)).toBe(60);
  });
  it('adjust moves endsAt but never below now', () => {
    expect(remainingSeconds(restReducer(start, { type: 'adjust', deltaSeconds: 15, now: 1000_000 }), 1000_000)).toBe(105);
    expect(remainingSeconds(restReducer(start, { type: 'adjust', deltaSeconds: -200, now: 1000_000 }), 1000_000)).toBe(0);
  });
  it('skip and expire return idle', () => {
    expect(restReducer(start, { type: 'skip' })).toEqual(IDLE_REST);
    expect(restReducer(start, { type: 'expire' })).toEqual(IDLE_REST);
  });
  it('remainingSeconds clamps at 0 and is 0 when idle', () => {
    expect(remainingSeconds(start, 2000_000)).toBe(0);
    expect(remainingSeconds(IDLE_REST, 0)).toBe(0);
  });
});
