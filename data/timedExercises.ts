/**
 * Exercises measured in seconds held rather than repetitions.
 *
 * The bundled library carries no structured marker for this — no `isTimed`
 * flag, no unit — so a Plank's "45" sat under a column headed "Reps", which
 * simply is not true. Modelling duration properly means changing the exercise
 * type, the library build, the workout UI, volume, history and CSV together;
 * until that happens this at least stops the app asserting something false.
 *
 * Matched on name because that is the only signal available. Over-matching is
 * cheap (a mislabelled column), under-matching just leaves today's behaviour.
 */
const TIMED_PATTERNS: RegExp[] = [
  /\bplanks?\b/i,
  /\bwall sits?\b/i,
  /\bdead ?hangs?\b/i,
  /\bhollow holds?\b/i,
  /\bl-?sits?\b/i,
  /\bholds?\b/i,
  /\bcarry\b|\bcarries\b/i,
];

export function isTimedExercise(name: string | null | undefined): boolean {
  if (!name) return false;
  return TIMED_PATTERNS.some(pattern => pattern.test(name));
}
