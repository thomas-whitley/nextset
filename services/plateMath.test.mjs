import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadPlates } from './plateMath.ts';

const kgs = (result) => result.perSide.map((plate) => plate.kg);

// Loading is heaviest-first, which is competition convention and the same
// convention the IWF plate colours come from. 40kg a side is a red and a
// yellow, not two blues — both are exact and both are two plates, but a meet
// loads 25+15. If testers who train in commercial gyms (where 20s are the
// common plate) find this surprising, revisit it as a preference.
test('100kg on a 20kg bar is 25 + 15 a side', () => {
  assert.deepEqual(kgs(loadPlates(100, 20)), [25, 15]);
});

test('60kg on a 20kg bar is a single 20 a side', () => {
  assert.deepEqual(kgs(loadPlates(60, 20)), [20]);
});

test('82.5kg on a 20kg bar needs a 1.25 change plate', () => {
  assert.deepEqual(kgs(loadPlates(82.5, 20)), [25, 5, 1.25]);
});

test('a weight at or below the bar is bar only', () => {
  assert.equal(loadPlates(20, 20).barOnly, true);
  assert.equal(loadPlates(15, 20).barOnly, true);
});

test('an unmakeable weight reports the leftover rather than lying', () => {
  const result = loadPlates(61, 20);
  assert.equal(result.remainderKg, 0.5);
});

test('a 15kg bar changes the maths', () => {
  assert.deepEqual(kgs(loadPlates(100, 15)), [25, 15, 2.5]);
});

test('zero weight is bar only and never produces negative plates', () => {
  const result = loadPlates(0, 20);
  assert.equal(result.barOnly, true);
  assert.deepEqual(result.perSide, []);
});

test('floating point does not lose a plate', () => {
  // 0.1 + 0.2 style drift must not turn 2.5 into 2.4999999 and drop it.
  assert.deepEqual(kgs(loadPlates(25, 20)), [2.5]);
  assert.equal(loadPlates(25, 20).remainderKg, 0);
});

test('non-finite input is treated as bar only, not NaN plates', () => {
  assert.equal(loadPlates(NaN, 20).barOnly, true);
  assert.equal(loadPlates(100, NaN).barOnly, true);
});
