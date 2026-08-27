// Number and date formatting per the copy rules (spec §12.3):
// `6,240 kg` (full digits, thousands separator), `42 min`, dates as `Tue 26 Aug`,
// missing values shown as an em dash — never `0 kg × 0`.

export const formatKg = (kg: number | null | undefined): string => {
  if (kg === null || kg === undefined || !isFinite(kg) || kg <= 0) return '—';
  const rounded = Math.round(kg * 10) / 10;
  return `${rounded.toLocaleString('en-GB', { maximumFractionDigits: 1 })} kg`;
};

export const formatCount = (n: number): string => n.toLocaleString('en-GB');

export const formatMinutes = (minutes: number | null | undefined): string => {
  if (minutes === null || minutes === undefined || !isFinite(minutes) || minutes <= 0) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m ? `${h} h ${m} min` : `${h} h`;
};

export const formatShortDate = (iso: string | Date): string => {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

export const formatLongDate = (iso: string | Date): string => {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export const plural = (n: number, one: string, many = `${one}s`): string => `${formatCount(n)} ${n === 1 ? one : many}`;

/** `80 kg × 5` for a set; `—` when nothing was logged. */
export const formatSet = (weight: string | number | undefined, reps: string | number | undefined): string => {
  const w = typeof weight === 'number' ? weight : parseFloat(weight ?? '');
  const r = typeof reps === 'number' ? reps : parseInt(reps ?? '', 10);
  if (!w && !r) return '—';
  if (!w) return `${r} reps`;
  const kg = `${(Math.round(w * 10) / 10).toLocaleString('en-GB', { maximumFractionDigits: 1 })} kg`;
  return r ? `${kg} × ${r}` : kg;
};
