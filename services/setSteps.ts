export const MAX_WEIGHT_KG = 1000;
export const MAX_REPS = 100;
const WEIGHT_STEP = 2.5;

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
