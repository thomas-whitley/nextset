import { stepValue } from '../setSteps';

describe('stepValue', () => {
  it('weight steps by 2.5', () => {
    expect(stepValue('weight', '60', 1)).toBe('62.5');
    expect(stepValue('weight', '62.5', -1)).toBe('60');
    expect(stepValue('weight', '', 1)).toBe('2.5');
  });
  it('reps step by 1', () => {
    expect(stepValue('reps', '8', 1)).toBe('9');
    expect(stepValue('reps', '', 1)).toBe('1');
  });
  it('never goes below 0', () => {
    expect(stepValue('weight', '1', -1)).toBe('0');
    expect(stepValue('reps', '0', -1)).toBe('0');
  });
  it('ignores steps that leave range', () => {
    expect(stepValue('weight', '999', 1)).toBe('999');
    expect(stepValue('reps', '100', 1)).toBe('100');
  });
  it('tolerates comma decimals', () => expect(stepValue('weight', '60,5', 1)).toBe('63'));
});
