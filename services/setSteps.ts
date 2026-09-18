export const MAX_WEIGHT_KG = 1000;
export const MAX_REPS = 100;
const WEIGHT_STEP = 2.5;

// Guard rails on the two free-text numeric fields. Without them a slip on the
// keypad is persisted silently and then poisons lifetime volume, the PR list
// and the CSV export — a stray "17897 kg × 69592 reps" once banked a workout
// at 1,245,613,856 kg. Bounds are deliberately generous: the heaviest lift
// ever recorded is well under 1000 kg, and 100 reps covers any real set.

/** The value to store, or null to reject the keystroke and keep the old one. */
export function sanitiseSetValue(field: 'weight' | 'reps', raw: string): string | null {
  if (raw === '') return '';

  if (field === 'reps') {
    if (!/^\d{1,3}$/.test(raw)) return null;
    return Number(raw) <= MAX_REPS ? raw : null;
  }

  // Weight takes one decimal place or two (82.5), with either separator.
  // A trailing "." is allowed so the field can be typed through.
  const normalised = raw.replace(',', '.');
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(normalised)) return null;
  return Number(normalised) <= MAX_WEIGHT_KG ? normalised : null;
}

export function stepValue(field: 'weight' | 'reps', current: string, direction: 1 | -1): string {
  const base = parseFloat((current ?? '').replace(',', '.')) || 0;
  if (field === 'reps') {
    const next = Math.max(0, Math.round(base) + direction);
    return next > MAX_REPS ? current : String(next);
  }
  const next = Math.max(0, Math.round((base + direction * WEIGHT_STEP) * 10) / 10);
  if (next > MAX_WEIGHT_KG) return current;
  return Number.isInteger(next) ? String(next) : next.toFixed(1);
}
