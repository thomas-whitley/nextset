import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../data/supabase-client';
import {
  clampBarKg,
  clampRestSeconds,
  getBarWeightKg,
  getDefaultRestSeconds,
  getExerciseChartMetric,
  setDefaultRestSeconds,
  setExerciseChartMetric,
  syncPreferencesFromProfile,
} from '../preferences';

jest.mock('../../data/supabase-client', () => {
  const single = jest.fn();
  const update = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }));
  const select = jest.fn(() => ({ eq: jest.fn(() => ({ maybeSingle: single })) }));
  return { supabase: { from: jest.fn(() => ({ select, update })), __single: single, __update: update } };
});

const mocked = supabase as unknown as { __single: jest.Mock; __update: jest.Mock };

beforeEach(async () => {
  await AsyncStorage.clear();
  mocked.__single.mockReset();
  mocked.__update.mockClear();
});

test('bounds: rest 15–600 s, bar 0 < kg ≤ 50 in 0.5 steps', () => {
  expect(clampRestSeconds(5)).toBe(15);
  expect(clampRestSeconds(90)).toBe(90);
  expect(clampRestSeconds(9999)).toBe(600);
  expect(clampBarKg(20)).toBe(20);
  expect(clampBarKg(17.5)).toBe(17.5);
  expect(clampBarKg(17.3)).toBeNull();
  expect(clampBarKg(0)).toBeNull();
  expect(clampBarKg(60)).toBeNull();
});

test('setting a preference with a user id writes the patch to profile.preferences', async () => {
  await setDefaultRestSeconds(120, 'user-1');
  expect(await getDefaultRestSeconds()).toBe(120);
  expect(mocked.__update).toHaveBeenCalledWith({ preferences: { defaultRestSeconds: 120 } });
});

test('sync: server value wins for keys it has', async () => {
  await AsyncStorage.setItem('nextset:default_rest_seconds', '60');
  mocked.__single.mockResolvedValue({ data: { preferences: { defaultRestSeconds: 180 } }, error: null });
  await syncPreferencesFromProfile('user-1');
  expect(await getDefaultRestSeconds()).toBe(180);
});

test('sync: local values are uploaded for keys the server lacks', async () => {
  await AsyncStorage.setItem('nextset:bar_weight_kg', '15');
  mocked.__single.mockResolvedValue({ data: { preferences: { defaultRestSeconds: 180 } }, error: null });
  await syncPreferencesFromProfile('user-1');
  expect(await getBarWeightKg()).toBe(15);
  expect(mocked.__update).toHaveBeenCalledWith({ preferences: { defaultRestSeconds: 180, barWeightKg: 15 } });
});

test('sync: out-of-range server values fall back to defaults', async () => {
  mocked.__single.mockResolvedValue({ data: { preferences: { defaultRestSeconds: 5, barWeightKg: 999 } }, error: null });
  await syncPreferencesFromProfile('user-1');
  expect(await getDefaultRestSeconds()).toBe(15);
  expect(await getBarWeightKg()).toBe(20);
});

test('a failed profile read skips the write instead of overwriting preferences', async () => {
  mocked.__single.mockResolvedValue({ data: null, error: { message: 'boom' } });
  await setDefaultRestSeconds(120, 'user-1');
  expect(await getDefaultRestSeconds()).toBe(120);
  expect(mocked.__update).not.toHaveBeenCalled();
});

describe('exercise chart metric', () => {
  test('defaults to e1rm and remembers a choice', async () => {
    expect(await getExerciseChartMetric()).toBe('e1rm');
    await setExerciseChartMetric('heaviest');
    expect(await AsyncStorage.getItem('nextset:exercise_chart_metric')).toBe('heaviest');
    expect(await getExerciseChartMetric()).toBe('heaviest');
  });

  test('junk or a storage failure falls back to e1rm; a failed write does not throw', async () => {
    await AsyncStorage.setItem('nextset:exercise_chart_metric', 'volume');
    expect(await getExerciseChartMetric()).toBe('e1rm');
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('disk'));
    expect(await getExerciseChartMetric()).toBe('e1rm');
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('disk'));
    await expect(setExerciseChartMetric('heaviest')).resolves.toBeUndefined();
  });
});
