// Local user preferences. The `profile.preferences` column does not exist yet
// (spec Phase 2 adds it), so settings live on the device for now.

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_DEFAULT_REST = 'nextset:default_rest_seconds';
export const DEFAULT_REST_SECONDS = 90;

export async function getDefaultRestSeconds(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_DEFAULT_REST);
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_REST_SECONDS;
  } catch {
    return DEFAULT_REST_SECONDS;
  }
}

export async function setDefaultRestSeconds(seconds: number): Promise<void> {
  await AsyncStorage.setItem(KEY_DEFAULT_REST, String(seconds));
}

// The bar the loading strip assumes. 20 kg is a men's Olympic bar; women's
// are 15 and technique bars 10. One global value rather than per-exercise
// detection, so the strip always prints the bar it assumed — a wrong
// assumption should be visible, not silent.
const KEY_BAR_WEIGHT = 'nextset:bar_weight_kg';
export const DEFAULT_BAR_WEIGHT_KG = 20;

export async function getBarWeightKg(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(KEY_BAR_WEIGHT);
    const n = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_BAR_WEIGHT_KG;
  } catch {
    return DEFAULT_BAR_WEIGHT_KG;
  }
}

export async function setBarWeightKg(kg: number): Promise<void> {
  await AsyncStorage.setItem(KEY_BAR_WEIGHT, String(kg));
}
