/**
 * Which plates go on each side of the bar.
 *
 * This is kept pure and separate from any component because getting it wrong
 * means somebody loads the wrong weight onto a bar they are about to put on
 * their back. It is the one piece of display logic in this app that is worth
 * unit testing: see services/plateMath.test.mjs, run with `npm run test:plates`.
 */

/** Standard gym denominations, heaviest first. Greedy fill depends on this order. */
export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

/** Tolerance for binary floating point, so 2.5 never becomes 2.4999999 and gets dropped. */
const EPSILON = 1e-9;

export type Plate = { kg: number };

export type Loading = {
  /** Plates for ONE side of the bar, heaviest first. */
  perSide: Plate[];
  /** What could not be made from the available denominations. 0 when exact. */
  remainderKg: number;
  /** True when the target is at or below the bar, so nothing is loaded. */
  barOnly: boolean;
};

/**
 * Greedy from the largest plate is optimal for this denomination set — every
 * plate is a multiple of the smallest, and each is at least the sum of the
 * gaps below it — so no search or dynamic programming is needed.
 */
export function loadPlates(totalKg: number, barKg: number): Loading {
  if (!Number.isFinite(totalKg) || !Number.isFinite(barKg) || totalKg <= barKg) {
    return { perSide: [], remainderKg: 0, barOnly: true };
  }

  let remaining = (totalKg - barKg) / 2;
  const perSide: Plate[] = [];

  for (const kg of PLATES) {
    while (remaining >= kg - EPSILON) {
      perSide.push({ kg });
      remaining -= kg;
    }
  }

  // Round away accumulated drift so an exact load reports exactly 0 left over.
  const remainderKg = Math.round(remaining * 100) / 100;

  return { perSide, remainderKg, barOnly: false };
}
