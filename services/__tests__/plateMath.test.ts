import { loadPlates } from '../plateMath';

const kgs = (result: ReturnType<typeof loadPlates>) => result.perSide.map((plate) => plate.kg);

// Loading is heaviest-first (competition convention, same source as the
// IWF plate colours): 40 kg a side is a red and a yellow, not two blues.
test('100kg on a 20kg bar is 25 + 15 a side', () => {
  expect(kgs(loadPlates(100, 20))).toEqual([25, 15]);
});

test('60kg on a 20kg bar is a single 20 a side', () => {
  expect(kgs(loadPlates(60, 20))).toEqual([20]);
});

test('82.5kg on a 20kg bar needs a 1.25 change plate', () => {
  expect(kgs(loadPlates(82.5, 20))).toEqual([25, 5, 1.25]);
});

test('a weight at or below the bar is bar only', () => {
  expect(loadPlates(20, 20).barOnly).toBe(true);
  expect(loadPlates(15, 20).barOnly).toBe(true);
});

test('an unmakeable weight reports the leftover rather than lying', () => {
  expect(loadPlates(61, 20).remainderKg).toBe(0.5);
});

test('a 15kg bar changes the maths', () => {
  expect(kgs(loadPlates(100, 15))).toEqual([25, 15, 2.5]);
});

test('zero weight is bar only and never produces negative plates', () => {
  const result = loadPlates(0, 20);
  expect(result.barOnly).toBe(true);
  expect(result.perSide).toEqual([]);
});

test('floating point does not lose a plate', () => {
  expect(kgs(loadPlates(25, 20))).toEqual([2.5]);
  expect(loadPlates(25, 20).remainderKg).toBe(0);
});

test('non-finite input is treated as bar only, not NaN plates', () => {
  expect(loadPlates(NaN, 20).barOnly).toBe(true);
  expect(loadPlates(100, NaN).barOnly).toBe(true);
});
