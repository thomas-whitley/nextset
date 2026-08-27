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
