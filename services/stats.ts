/** Local-calendar day key, YYYY-MM-DD. Streaks are counted in the user's day, not UTC. */
export const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (d: Date, n: number): Date => {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
};

/**
 * Current streak: consecutive days ending today or yesterday (a workout five
 * days ago with nothing since is not a streak of 1). Longest: the longest run
 * of consecutive day keys anywhere in the set. Pure, so it is testable.
 */
export function computeStreaks(dateKeys: Iterable<string>, today: Date): { currentStreak: number; longestStreak: number } {
  const days = new Set(dateKeys);
  if (days.size === 0) return { currentStreak: 0, longestStreak: 0 };

  let cursor = new Date(today);
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(toDateKey(cursor))) cursor = addDays(cursor, -1);
  let currentStreak = 0;
  for (let i = 0; i < 365 && days.has(toDateKey(cursor)); i++) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  let longestStreak = 0;
  for (const key of days) {
    const [y, m, d] = key.split('-').map(Number);
    const prev = toDateKey(addDays(new Date(y, m - 1, d), -1));
    if (days.has(prev)) continue; // not the start of a run
    let run = 1;
    let next = addDays(new Date(y, m - 1, d), 1);
    while (days.has(toDateKey(next))) {
      run++;
      next = addDays(next, 1);
    }
    longestStreak = Math.max(longestStreak, run);
  }

  return { currentStreak, longestStreak };
}
