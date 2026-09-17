import type { Program } from './exercise.types';

export type ProgramSync = {
  /** Remember the latest program and write it after the delay. */
  schedule: (program: Program) => void;
  /** Write whatever is pending now. Resolves after the write settles (success or failure). */
  flush: () => Promise<void>;
  /** Drop the pending program without writing it. */
  cancel: () => void;
};

/**
 * Coalesces program writes. Every keystroke in a set row edits the whole
 * program JSON; writing each one is a Supabase round-trip per character.
 * This keeps only the newest program, writes it after `delayMs` of quiet, and
 * writes at once on flush (set complete, blur, finish, app background).
 *
 * Failure is silent by design (spec Q24): the AsyncStorage checkpoint holds
 * the data, and the failed program stays pending so the next schedule or
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

  const run = async (): Promise<void> => {
    if (inFlight) {
      await inFlight;
    }
    if (!pending) return;
    const program = pending;
    pending = null;
    inFlight = write(program)
      .then(() => undefined)
      .catch((error) => {
        console.error('Program sync failed; will retry on next change:', error);
        // Keep the failed program unless something newer arrived meanwhile.
        if (!pending) pending = program;
      })
      .finally(() => {
        inFlight = null;
      });
    await inFlight;
    // Something was scheduled while we were writing.
    if (pending && !timer) {
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, delayMs);
    }
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
      clearTimer();
      await run();
    },
    cancel() {
      clearTimer();
      pending = null;
    },
  };
}
