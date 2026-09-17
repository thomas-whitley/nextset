// User preferences. AsyncStorage is the cache the UI reads synchronously-ish;
// profile.preferences (jsonb, migration 20260917100000) is the source of
// truth so settings follow the account to a new phone. Server wins for any
// key it holds; local values are uploaded for keys it lacks (spec Q18).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../data/supabase-client';

const KEY_DEFAULT_REST = 'nextset:default_rest_seconds';
const KEY_BAR_WEIGHT = 'nextset:bar_weight_kg';

export const DEFAULT_REST_SECONDS = 90;
export const DEFAULT_BAR_WEIGHT_KG = 20;

export type Preferences = { defaultRestSeconds?: number; barWeightKg?: number };

/** 15 s to 10 min. Anything else is a typo, not a training choice. */
export function clampRestSeconds(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : DEFAULT_REST_SECONDS;
  return Math.min(600, Math.max(15, v));
}

// The bar the loading strip assumes. 20 kg is a men's Olympic bar; women's
// are 15 and technique bars 10. One global value rather than per-exercise
// detection, so the strip always prints the bar it assumed — a wrong
// assumption should be visible, not silent.
/** 0 < kg ≤ 50 in 0.5 kg steps, or null when it is not a bar weight. */
export function clampBarKg(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  if (n <= 0 || n > 50) return null;
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9 ? n : null;
}

async function readNumber(key: string): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    const n = raw ? parseFloat(raw) : NaN;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function getDefaultRestSeconds(): Promise<number> {
  const n = await readNumber(KEY_DEFAULT_REST);
  return n === null ? DEFAULT_REST_SECONDS : clampRestSeconds(n);
}

export async function getBarWeightKg(): Promise<number> {
  const n = await readNumber(KEY_BAR_WEIGHT);
  return n === null ? DEFAULT_BAR_WEIGHT_KG : clampBarKg(n) ?? DEFAULT_BAR_WEIGHT_KG;
}

/** Fire-and-forget merge into profile.preferences; failure is logged, the local value stands. */
async function pushPreferences(userId: string, patch: Preferences): Promise<void> {
  try {
    const result = await supabase.from('profile').select('preferences').eq('id', userId).maybeSingle();
    const { data, error: readError } = result ?? {};
    if (readError) {
      console.error('Preference read failed; skipping sync:', readError.message);
      return;
    }
    const current = ((data as { preferences?: Preferences } | null)?.preferences ?? {}) as Preferences;
    const { error } = await supabase.from('profile').update({ preferences: { ...current, ...patch } }).eq('id', userId);
    if (error) console.error('Preference sync failed:', error.message);
  } catch (error) {
    console.error('Preference sync failed:', error);
  }
}

export async function setDefaultRestSeconds(seconds: number, userId?: string): Promise<void> {
  const v = clampRestSeconds(seconds);
  await AsyncStorage.setItem(KEY_DEFAULT_REST, String(v));
  if (userId) await pushPreferences(userId, { defaultRestSeconds: v });
}

export async function setBarWeightKg(kg: number, userId?: string): Promise<void> {
  const v = clampBarKg(kg);
  if (v === null) return;
  await AsyncStorage.setItem(KEY_BAR_WEIGHT, String(v));
  if (userId) await pushPreferences(userId, { barWeightKg: v });
}

/**
 * Called once per sign-in. Server keys overwrite local; local keys the server
 * lacks are uploaded. Values outside bounds are replaced by defaults.
 */
export async function syncPreferencesFromProfile(userId: string): Promise<void> {
  try {
    const { data, error } = await supabase.from('profile').select('preferences').eq('id', userId).maybeSingle();
    if (error) {
      console.error('Preference read failed:', error.message);
      return;
    }
    const server = ((data as { preferences?: Preferences } | null)?.preferences ?? {}) as Preferences;
    const upload: Preferences = {};

    if ('defaultRestSeconds' in server) {
      await AsyncStorage.setItem(KEY_DEFAULT_REST, String(clampRestSeconds(server.defaultRestSeconds)));
    } else {
      const local = await readNumber(KEY_DEFAULT_REST);
      if (local !== null) upload.defaultRestSeconds = clampRestSeconds(local);
    }

    if ('barWeightKg' in server) {
      await AsyncStorage.setItem(KEY_BAR_WEIGHT, String(clampBarKg(server.barWeightKg) ?? DEFAULT_BAR_WEIGHT_KG));
    } else {
      const local = await readNumber(KEY_BAR_WEIGHT);
      const v = local === null ? null : clampBarKg(local);
      if (v !== null) upload.barWeightKg = v;
    }

    if (Object.keys(upload).length > 0) {
      const { error: writeError } = await supabase
        .from('profile')
        .update({ preferences: { ...server, ...upload } })
        .eq('id', userId);
      if (writeError) console.error('Preference upload failed:', writeError.message);
    }
  } catch (error) {
    console.error('Preference sync failed:', error);
  }
}
