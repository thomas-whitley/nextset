// "Swap for a similar exercise" (spec R12). Pure, so the ranking is pinned by
// tests: the order a lifter sees when the rack they wanted is taken.
import type { Exercise } from './exercise.types';

const IGNORED = new Set(['with', 'the', 'and', 'dumbbell', 'barbell', 'cable', 'machine', 'db', 'grip', 'medium']);

/** Distinctive words of a name: lower-case, letters only, longer than two letters, equipment removed. */
export function nameWords(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z ]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !IGNORED.has(w))
  );
}

const isStrength = (e: Exercise) => (e.exercise_type ?? 'Strength') === 'Strength';

/**
 * Same primary muscle and movement pattern first (falling back to same muscle
 * when the pattern is missing or matches nothing), strength work only, never
 * the target itself. Ranked by shared name words, then same equipment, then
 * curated keystone lifts; ties by name so the order is stable.
 */
export function similarExercises(target: Exercise, library: Exercise[]): Exercise[] {
  const sameMuscle = library.filter(
    (e) => e.id !== target.id && e.primary_muscle_group === target.primary_muscle_group && isStrength(e)
  );
  const samePattern = target.movement_pattern
    ? sameMuscle.filter((e) => e.movement_pattern === target.movement_pattern)
    : [];
  const pool = samePattern.length > 0 ? samePattern : sameMuscle;

  const words = nameWords(target.name);
  const score = (e: Exercise) => {
    let shared = 0;
    nameWords(e.name).forEach((w) => {
      if (words.has(w)) shared++;
    });
    return shared * 2 + (e.equipment === target.equipment ? 0.8 : 0) + (e.isKeystone ? 0.5 : 0);
  };

  return pool
    .map((e) => ({ e, s: score(e) }))
    .sort((a, b) => b.s - a.s || a.e.name.localeCompare(b.e.name))
    .map((x) => x.e);
}
