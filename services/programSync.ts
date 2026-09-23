import type { Program } from './exercise.types';

export type ProgramSync = {
  /** Remember the latest program and write it after the delay. */
  schedule: (program: Program) => void;
  /** Write whatever is pending now. Resolves after the write settles (success or failure). */
  flush: () => Promise<void>;
  /** Drop the pending program without writing it. */
  cancel: () => void;
  /** True while a program is waiting to be written or a write is in flight. Still true after a failed write (it is kept for retry). */
  hasPending: () => boolean;
};

/**
 * Coalesces program writes. Every keystroke in a set row edits the whole
 * program JSON; writing each one is a Supabase round-trip per character.
 * This keeps only the newest program, writes it after `delayMs` of quiet, and
 * writes at once on flush (set complete, blur, finish, app background).
 *
 * Failure is silent by design (spec Q24): the AsyncStorage checkpoint holds
 * the data, and the failed program stays pending, with no timer, so the next schedule or
 * flush retries it. One write is in flight at a time; a program scheduled
 * mid-flight is written afterwards rather than racing the first.
 */
export function createProgramSync(write: (program: Program) => Promise<unknown>, delayMs = 800): ProgramSync {
  let pending: Program | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  /**
   * Writes what is pending, after any write already in flight. Resolves true
   * on success or when there was nothing to write, false when the write failed.
   * A failure keeps the program pending but schedules nothing: retrying on a
   * timer hammered the server once a second while offline (device run T2-2).
   * The next schedule or flush sends it.
   */
  const run = async (): Promise<boolean> => {
    while (inFlight) await inFlight;
    if (!pending) return true;
    const program = pending;
    pending = null;
    let ok = true;
    inFlight = write(program)
      .then(() => undefined)
      .catch((error) => {
        ok = false;
        console.error('Program sync failed; kept for the next change or flush:', error);
        // Keep the failed program unless something newer arrived meanwhile.
        if (!pending) pending = program;
      })
      .finally(() => {
        inFlight = null;
      });
    await inFlight;
    return ok;
  };

  return {
    schedule(program) {
      pending = program;
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, delayMs);
    },
    async flush() {
      // Loop: another caller's write may still be in flight, and something may
      // be scheduled while we wait. Resolve only when all of it has settled, so
      // hasPending() right after means "unsaved", never "still writing" (review M8).
      while (pending || inFlight) {
        clearTimer();
        if (!(await run())) return;
      }
    },
    cancel() {
      clearTimer();
      pending = null;
    },
    hasPending() {
      return pending !== null || inFlight !== null;
    },
  };
}
