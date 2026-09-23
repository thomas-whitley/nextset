// Library muscle groups (services/exerciseLibrary.data.json, 17 groups) →
// regions of the body map (spec R13). Pure and tested.
export type Region =
  | 'neck' | 'traps' | 'shoulders' | 'chest' | 'biceps' | 'triceps' | 'forearms' | 'abs'
  | 'back' | 'lowerBack' | 'glutes' | 'abductors' | 'adductors' | 'quads' | 'hamstrings' | 'calves';

const REGION: Record<string, Region> = {
  Neck: 'neck', Traps: 'traps', Shoulders: 'shoulders', Chest: 'chest', Biceps: 'biceps',
  Triceps: 'triceps', Forearms: 'forearms', Abs: 'abs', Back: 'back', 'Lower Back': 'lowerBack',
  Glutes: 'glutes', Abductors: 'abductors', Adductors: 'adductors', Quads: 'quads',
  Hamstrings: 'hamstrings', Calves: 'calves',
};

export type Emphasis = 'primary' | 'helping';

export function highlightFor(primary: string, secondary: string[] = []): Partial<Record<Region, Emphasis>> {
  const out: Partial<Record<Region, Emphasis>> = {};
  for (const g of secondary) {
    const r = REGION[g];
    if (r) out[r] = 'helping';
  }
  const p = REGION[primary];
  if (p) out[p] = 'primary';
  return out;
}

const lower = (g: string) => g.toLowerCase();
const list = (xs: string[]) =>
  xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`;

/** "Works your chest, with shoulders and triceps helping." — null when the primary isn't on the map. */
export function worksSentence(primary: string, secondary: string[] = []): string | null {
  if (!REGION[primary]) return null;
  const helpers = [...new Set(secondary)].filter((g) => REGION[g] && g !== primary).map(lower);
  return helpers.length === 0
    ? `Works your ${lower(primary)}.`
    : `Works your ${lower(primary)}, with ${list(helpers)} helping.`;
}
