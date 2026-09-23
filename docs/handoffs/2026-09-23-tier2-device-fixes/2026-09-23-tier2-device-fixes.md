# Tier 2 Device Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix what the Tier 2 phone run found (T2-1…T2-14) and the seven deferred review minors (M7–M13), so offline editing, discarding, keyboards and large fonts behave as the app claims.

**Architecture:** Most fixes are local. They touch `services/programSync.ts` (the single program write queue), `app/program-detail.tsx` (the day editor's leave guard), `contexts/WorkoutContext.tsx` (discard, last-time hints, all-or-nothing reset/rename, restore failure), and `components/gestures/DragDismissSheet.tsx` (one keyboard lift for every sheet that has an input). The layout and copy fixes are one-line style or text changes. Anything with logic gets a pure helper and a jest test.

**Tech Stack:** Expo SDK 57, React Native 0.86, React 19.2, TypeScript, expo-router 57, Reanimated, jest-expo with `@testing-library/react-native` 14 (async `render` / `fireEvent`, always `await`).

**Spec:** the findings are the spec. They live in `docs/superpowers/qa/2026-09-tier2-device-run.md`, section "Run 1" (T2-1…T2-14), and `docs/superpowers/plans/2026-09-23-tier2-ledger.md`, lines 42–48 (M7–M13). The Tier 2 behaviour they refer to is in `docs/superpowers/plans/2026-09-23-tier2-setup-and-orientation.md` and `docs/superpowers/specs/2026-09-18-ux-overhaul-design.md` §6.

**Branch:** `tier2/device-fixes`, from `main` @ `bdddbc0`. Before the first commit, run `git switch -c tier2/device-fixes` and `git branch --show-current`.

## Open decisions (owner, before execution)

Each one has a recommended default, and the tasks below are written to that default. If you change one, only the task it names needs editing.

| # | Decision | Default in this plan | Alternative | Task |
|---|---|---|---|---|
| D1 | What Discard means for a program day | **Revert the day to how it was at Start.** That covers weights, reps, added or removed exercises and set counts, so "Nothing from this session will be saved" becomes true. | Keep writing weights through as a prefill and change the copy to "Your ticks are not saved; weights you typed stay as next time's starting point." | 4 |
| D2 | Offline program writes | **No automatic retry.** A failed write stays pending and goes out on the next edit, flush, set tick, finish or app background. | Retry with backoff (for example 5 s, 30 s, 2 min) or on a NetInfo reconnect. | 1 |
| D3 | Deleting template copies (T2-11) | **Any copy that is not current** can be deleted from the picker, blank or template. The template then reappears under "Start something new". The current program is deleted from the slab ⋯, which only offers this for blanks, as today. | Leave template copies undeletable. | 8 |
| D4 | Empty reps field in the day editor (T2-9) | Placeholder **`reps`**, grey, the same word the workout set row uses. | `Any`, or no placeholder. | 3 |
| D5 | Tapping a template in the picker starts it straight away (T2-11, second half) | **No change in this plan.** The chevron stays. | A preview step. That is a separate small feature. | – |
| D6 | The finish sheet's Notes field | **Also gets the keyboard lift** from Task 7, because it uses the same KeyboardAvoidingView-in-Modal pattern that failed for Rename. | Rename sheet only. | 7 |
| D7 | A4 (fresh-account first screen) | Not in this plan. It needs a sign-up on the phone, which is the owner's call. It goes on the Task 11 device checklist. | – | 11 |

## Global Constraints

- Online-only app. The only offline store is the AsyncStorage workout checkpoint in `contexts/WorkoutContext.tsx`. Do not add a local database.
- Every write to `user_active_programs.program_data` goes through `programSync` (`applyProgramUpdate` / `applyWorkoutUpdate`). No fetch-modify-write helpers.
- Session-only workout fields (`startedAt`, `collapsedExerciseIds`, each set's `pr`, and the new `discardRestore`) never reach `program_data`. Strip them in `applyWorkoutUpdate`.
- Quick workouts (`Workout.isQuick`) never touch `program_data`.
- Do not import `@react-navigation/*` in app code.
- Android is edge-to-edge. Anything anchored to the bottom adds `useSafeAreaInsets().bottom`, and every `SafeAreaView` is `edges={['top']}`.
- Touch and type floors: visible tap size ≥ `touch.min` (48), set rows ≥ `touch.row` (56), no text below 13pt, tappable text ≥ 15pt. `type.eyebrow` is 15pt sentence case.
- Never write `{someNumber && <View/>}`. Compare explicitly.
- `@testing-library/react-native` 14: `await render(...)`, `await fireEvent.*(...)`. Screen tests need `jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)`.
- Known flake: `contexts/__tests__/WorkoutContext.test.tsx` has failed once under full `npm test` load. Rerun it alone before believing a failure.
- Commit messages end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- The owner runs `git push` and `gh pr create` (the classifier blocks them). Before pushing, run `gh auth switch --user thomas-whitley`.

## Review Focus

1. **Offline editor, repeated Try again.** Offline: X → "Not saved yet" → Try again, several times. The editor never closes. Back online → Try again closes it, and the write has landed. *(Task 2 test "Try again re-runs the check…")*
2. **Discard after a relaunch.** The checkpoint restored from AsyncStorage still carries `discardRestore`, so Discard after a restart still reverts the day. *(Task 4 test "a restored checkpoint can still be discarded…")*
3. **Old checkpoint without `discardRestore`.** A workout checkpointed by build `a5c40a3a` is restored under the new build and discarded. It behaves as today (finish without saving) and does not crash. *(Task 4 test "a checkpoint from before this change discards without a restore point")*
4. **A reverted reset must never land later.** Offline Reset → "Could not reset" → back online → edit a set count. The later write must not contain the reset. *(Task 6 test "reset that cannot be written is undone and never written later")*
5. **The keyboard lift must not stick.** Open the Rename sheet, type, close the keyboard, dismiss, reopen. The sheet sits at the bottom, with no stale gap. *(Task 7 test "keyboard hide or closing the sheet drops the lift")*

---

## File map

| File | Change | Why |
|---|---|---|
| `services/programSync.ts` | Rewrite `run`/`flush` | T2-2 retry loop, M8 early resolve |
| `services/__tests__/programSync.test.ts` | +3 tests | |
| `app/program-detail.tsx` | Leave guard rewrite; KeyboardAvoidingView around the list | T2-1, M9, T2-4 |
| `app/__tests__/program-detail.test.tsx` | +3 tests | |
| `components/ProgramExerciseRow.tsx` | Reps input centring and placeholder | T2-8, T2-9 |
| `components/__tests__/ProgramExerciseRow.test.tsx` | +1 test | |
| `services/exercise.types.ts` | `Workout.discardRestore?` | T2-3 |
| `contexts/WorkoutContext.tsx` | `discardWorkout`, `fillLastTime`, `applyNowOrRevert`, `programLoadFailed` / `retryProgramLoad`, delete rule | T2-3, T2-10, M7, M13, T2-11 |
| `contexts/__tests__/WorkoutContext.test.tsx` | New describes | |
| `app/workout.tsx` | Discard → `discardWorkout`; close-alert message; finish sheet `avoidKeyboard` | T2-3, T2-12, D6 |
| `app/(tabs)/index.tsx` | Restore-failed slab; last-workout tile line | M13, T2-13 |
| `components/gestures/DragDismissSheet.tsx` | `avoidKeyboard` prop | T2-5 |
| `components/__tests__/DragDismissSheet.test.tsx` | New | |
| `components/RenameProgramSheet.tsx` | Use `avoidKeyboard`, drop the inner KeyboardAvoidingView | T2-5 |
| `components/ProgramPickerSheet.tsx` | Height cap; row padding; delete rules | T2-14, T2-6, T2-11, M10 |
| `components/HistoryRow.tsx` | Padding, 15pt sets | T2-6, M11 |
| `components/__tests__/HistoryRow.test.tsx` | New | |
| `components/ProgramActionsSheet.tsx` | 15pt subtitle | M11 |
| `app/(tabs)/programs.tsx` | 15pt Up next badge | M11 |
| `app/(tabs)/progress.tsx` | Stat tile font cap; history reload window | T2-7, M12 |
| `services/historySummary.ts` | `historyWindow`, `lastWorkoutTitle` | M12, T2-13 |
| `services/__tests__/historySummary.test.ts` | +2 describes | |
| `components/ResumeWorkoutBar.tsx` | Visible "Resume …" | T2-13 |
| `CLAUDE.md`, `docs/superpowers/qa/2026-09-tier2-device-run.md` | Gotchas and the Run 2 checklist | |

---

### Task 1: programSync: no retry loop, and flush waits for everything (T2-2, M8)

**Files:**
- Modify: `services/programSync.ts` (whole file body, lines 25–85)
- Test: `services/__tests__/programSync.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: the same `ProgramSync` type (`schedule`, `flush`, `cancel`, `hasPending`), with two changed guarantees. **`flush()` resolves only once nothing is pending and nothing is in flight, or once a write has failed.** **A failed write is never retried by a timer.** Tasks 2 and 6 rely on both.

- [ ] **Step 1: Write the failing tests.** Append to `services/__tests__/programSync.test.ts`:

```ts
test('a failed flushed write is not retried on its own (device run T2-2)', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const write = jest.fn().mockRejectedValue(new Error('offline'));
  const sync = createProgramSync(write, 800);
  sync.schedule(program('a'));
  await sync.flush();
  for (let i = 0; i < 10; i++) {
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
  }
  expect(write).toHaveBeenCalledTimes(1);
  expect(sync.hasPending()).toBe(true);
});

test('a failed timer write is not retried on its own either (device run T2-2)', async () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const write = jest.fn().mockRejectedValue(new Error('offline'));
  const sync = createProgramSync(write, 800);
  sync.schedule(program('a'));
  jest.advanceTimersByTime(800);
  for (let i = 0; i < 5; i++) await Promise.resolve();
  for (let i = 0; i < 10; i++) {
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
  }
  expect(write).toHaveBeenCalledTimes(1);
  expect(sync.hasPending()).toBe(true);
});

test('every flush resolves only after a write scheduled while it waited has landed (review M8)', async () => {
  let resolveFirst: () => void = () => {};
  const write = jest
    .fn()
    .mockImplementationOnce(() => new Promise<void>((r) => { resolveFirst = r; }))
    .mockResolvedValue(undefined);
  const sync = createProgramSync(write, 800);
  sync.schedule(program('a'));
  const first = sync.flush(); // writes a
  const second = sync.flush(); // waits on a
  sync.schedule(program('b')); // arrives mid-flight
  resolveFirst();
  await first;
  expect(sync.hasPending()).toBe(false);
  await second;
  expect(sync.hasPending()).toBe(false);
  expect(write).toHaveBeenCalledTimes(2);
  expect(write.mock.calls[1][0].name).toBe('b');
});
```

- [ ] **Step 2: Run them to check they fail.**

Run: `npx jest services/__tests__/programSync.test.ts`
Expected: the two T2-2 tests FAIL with `toHaveBeenCalledTimes(1)` receiving about 11. The M8 test FAILS at the first `hasPending()` check (true).

- [ ] **Step 3: Implement.** Replace lines 25–85 of `services/programSync.ts` (from `export function createProgramSync` to the end) with:

```ts
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
```

Also update the header comment (lines 14–24). Replace "and the failed program stays pending so the next schedule or flush retries it" with "and the failed program stays pending, with no timer, so the next schedule or flush retries it".

- [ ] **Step 4: Run the whole file to check it passes.**

Run: `npx jest services/__tests__/programSync.test.ts`
Expected: all 12 tests PASS. The existing "a schedule during an in-flight write is written after it" test still passes, because `flush` now writes `b` inside its own loop.

- [ ] **Step 5: Run the context tests, which sit on top of programSync.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx`
Expected: PASS. If a test that waited for a timer-driven retry fails, it relied on the old loop: make it retry through a `flushProgramSync()` call instead, and note it in the commit message.

- [ ] **Step 6: Commit.**

```bash
git add services/programSync.ts services/__tests__/programSync.test.ts
git commit -m "fix(sync): no timer retry after a failed write; flush waits for all writes (T2-2, M8)"
```

---

### Task 2: Day editor leave guard: Try again really checks again (T2-1, M9)

**Files:**
- Modify: `app/program-detail.tsx:30-66`
- Test: `app/__tests__/program-detail.test.tsx`

**Interfaces:**
- Consumes: `flushProgramSync(): Promise<void>` and `hasPendingProgramWrite(): boolean` from `useWorkout()`, with Task 1's guarantee that after `flush` resolves, `hasPending` means unsaved.
- Produces: nothing new for other tasks.

**Why:** expo-router's `shouldPreventRemove` (`node_modules/expo-router/build/react-navigation/core/useOnPreventRemove.js:50-61`) stores a `VISITED_ROUTE_KEYS` set on the action it passes to `beforeRemove`. When `e.data.action` is dispatched again, this route is skipped, the listener never runs, and the screen closes unsaved. So Try again must re-run the check itself. Only the final, successful leave dispatches the action.

- [ ] **Step 1: Write the failing tests.** Append to `app/__tests__/program-detail.test.tsx`:

```tsx
type AlertButton = { text: string; onPress?: () => void };
const button = (call: unknown[], text: string) => (call[2] as AlertButton[]).find((b) => b.text === text)!;

test('Try again re-runs the check and stays while still unsaved (device run T2-1)', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockCtx.hasPendingProgramWrite.mockReturnValue(true);
  await render(<ProgramDayEditorScreen />);
  const event = { preventDefault: jest.fn(), data: { action: 'GO_BACK' } };
  await act(async () => {
    mockListeners.beforeRemove(event);
    await settle();
  });
  await act(async () => {
    button(alert.mock.calls[0], 'Try again').onPress!();
    await settle();
  });
  expect(mockCtx.flushProgramSync).toHaveBeenCalledTimes(2);
  expect(alert).toHaveBeenCalledTimes(2);
  expect(mockNav.dispatch).not.toHaveBeenCalled();

  mockCtx.hasPendingProgramWrite.mockReturnValue(false); // back online
  await act(async () => {
    button(alert.mock.calls[1], 'Try again').onPress!();
    await settle();
  });
  expect(mockCtx.flushProgramSync).toHaveBeenCalledTimes(3);
  expect(mockNav.dispatch).toHaveBeenCalledTimes(1);
  expect(mockNav.dispatch).toHaveBeenCalledWith('GO_BACK');
});

test('a second X while the first check is running does not leave twice (review M9)', async () => {
  let release: () => void = () => {};
  mockCtx.flushProgramSync.mockImplementationOnce(() => new Promise<void>((r) => { release = r; }));
  await render(<ProgramDayEditorScreen />);
  const first = { preventDefault: jest.fn(), data: { action: 'GO_BACK' } };
  const second = { preventDefault: jest.fn(), data: { action: 'GO_BACK' } };
  await act(async () => {
    mockListeners.beforeRemove(first);
    mockListeners.beforeRemove(second);
    await settle();
  });
  expect(second.preventDefault).toHaveBeenCalled();
  await act(async () => {
    release();
    await settle();
  });
  expect(mockCtx.flushProgramSync).toHaveBeenCalledTimes(1);
  expect(mockNav.dispatch).toHaveBeenCalledTimes(1);
});

test('the leave listener is added once, not on every render (review M9)', async () => {
  await render(<ProgramDayEditorScreen />);
  await fireEvent.press(screen.getByLabelText('More sets for Barbell Deadlift')); // any re-render
  await screen.rerender(<ProgramDayEditorScreen />);
  expect(mockNav.addListener.mock.calls.filter((c) => c[0] === 'beforeRemove')).toHaveLength(1);
});
```

`jest.clearAllMocks()` in `beforeEach` resets `mockNav.addListener`'s call count. `mockImplementationOnce` on `flushProgramSync` falls back to `async () => {}` afterwards.

- [ ] **Step 2: Run them to check they fail.**

Run: `npx jest app/__tests__/program-detail.test.tsx`
Expected: the T2-1 test FAILS, because `dispatch` is called on the first Try again. The double-X test FAILS with `flushProgramSync` called 2 times. The listener-once test may pass with the stable mocks. It still documents the contract, so keep it.

- [ ] **Step 3: Implement.** In `app/program-detail.tsx`, replace lines 31–66 (from the `useWorkout()` destructure through the end of the `useEffect`) with:

```tsx
  const { currentProgram, currentActiveProgram, editDay, isDayLocked, flushProgramSync, hasPendingProgramWrite } = useWorkout();
  const [picking, setPicking] = useState(false);
  const leavingRef = useRef(false);
  // A leave check is running: a second X or back tap waits for it (review M9).
  const checkingRef = useRef(false);
  // Each row's "commit what is typed", keyed by exercise id (review I5).
  const pendingCommits = useRef(new Map<string, () => void>());
  // Latest context functions, so the listener below is added once (review M9).
  const flushRef = useRef(flushProgramSync);
  flushRef.current = flushProgramSync;
  const hasPendingRef = useRef(hasPendingProgramWrite);
  hasPendingRef.current = hasPendingProgramWrite;

  const day = currentProgram?.workouts.find((w) => w.id === dayId) ?? null;
  const running = day ? isDayLocked(day.id) : false;
  const locked = !day || !currentActiveProgram || running;

  // Every way out (the X, Android back, the iOS swipe-down) passes through
  // here: write what is pending, and stay put if it could not be written.
  // The editor has no local checkpoint to fall back on (grill R2-Q2).
  useEffect(() => {
    // Try again runs this again instead of re-dispatching the action: expo-router
    // marks an action it has already shown to beforeRemove, so a replay skips
    // this listener and closes the editor unsaved (device run T2-1).
    const attemptLeave = async (action: unknown) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        // A reps value still being typed has not blurred yet: commit it first, so it is
        // part of what gets flushed and of what "Not saved yet" reports on.
        pendingCommits.current.forEach((commit) => commit());
        await flushRef.current();
        if (hasPendingRef.current()) {
          Alert.alert('Not saved yet', 'Your changes have not reached NextSet. Check your connection and try again.', [
            { text: 'Keep editing', style: 'cancel' },
            { text: 'Try again', onPress: () => void attemptLeave(action) },
          ]);
          return;
        }
        leavingRef.current = true;
        navigation.dispatch(action);
      } finally {
        checkingRef.current = false;
      }
    };
    return navigation.addListener('beforeRemove', (e) => {
      if (leavingRef.current) return;
      e.preventDefault();
      void attemptLeave(e.data.action);
    });
  }, [navigation]);
```

- [ ] **Step 4: Run to check they pass.**

Run: `npx jest app/__tests__/program-detail.test.tsx`
Expected: all 9 tests PASS, including the existing "leaving flushes…", "leaving with everything saved…" and I5 tests.

- [ ] **Step 5: Commit.**

```bash
git add app/program-detail.tsx app/__tests__/program-detail.test.tsx
git commit -m "fix(editor): Try again re-runs the save check instead of replaying the action (T2-1, M9)"
```

---

### Task 3: Day editor keyboard and reps field (T2-4, T2-8, T2-9)

**Files:**
- Modify: `app/program-detail.tsx`: imports (line 2), and the `ScrollView` block (lines 103–155)
- Modify: `components/ProgramExerciseRow.tsx`: `placeholder` (line 112), `styles.reps` (lines 138–149)
- Test: `app/__tests__/program-detail.test.tsx`, `components/__tests__/ProgramExerciseRow.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: testIDs `day-editor-keyboard` (KeyboardAvoidingView) and `day-editor-scroll` (ScrollView).

The workout screen already lifts its list with a non-modal `KeyboardAvoidingView behavior="padding"`, and the device run showed it scrolling the focused field into view (`app/workout.tsx:562`). The day editor had no KeyboardAvoidingView at all. `keyboardDismissMode="on-drag"` makes a scroll blur the field, which commits the reps value.

- [ ] **Step 1: Write the failing tests.** Append to `app/__tests__/program-detail.test.tsx`:

```tsx
test('the list lifts above the keyboard and a drag closes it (device run T2-4)', async () => {
  await render(<ProgramDayEditorScreen />);
  expect(screen.getByTestId('day-editor-keyboard')).toBeTruthy();
  const scroll = screen.getByTestId('day-editor-scroll');
  expect(scroll.props.keyboardDismissMode).toBe('on-drag');
  expect(scroll.props.keyboardShouldPersistTaps).toBe('handled');
});
```

Append to `components/__tests__/ProgramExerciseRow.test.tsx`. Use the imports and `exercise` fixture already at the top of that file. If it names the fixture differently, use that name.

```tsx
test('empty reps shows the word "reps", centred like the set inputs (device run T2-8, T2-9)', async () => {
  const { StyleSheet } = require('react-native');
  await render(
    <ProgramExerciseRow
      exercise={{ ...exercise, repsTarget: undefined }}
      locked={false}
      onSetCount={jest.fn()}
      onRepsTarget={jest.fn()}
      onRemove={jest.fn()}
      dragHandle={(n) => n}
    />
  );
  const input = screen.getByLabelText(`Reps target for ${exercise.name}`);
  expect(input.props.placeholder).toBe('reps');
  const style = StyleSheet.flatten(input.props.style);
  expect(style.textAlignVertical).toBe('center');
  expect(style.paddingVertical).toBe(0);
});
```

- [ ] **Step 2: Run to check they fail.**

Run: `npx jest app/__tests__/program-detail.test.tsx components/__tests__/ProgramExerciseRow.test.tsx`
Expected: FAIL with "Unable to find an element with testID: day-editor-keyboard", and placeholder `8–12` ≠ `reps`.

- [ ] **Step 3: Implement.**

In `app/program-detail.tsx`, line 2, add `KeyboardAvoidingView` to the `react-native` import:

```tsx
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, useWindowDimensions } from 'react-native';
```

Wrap the `ScrollView` (keep its children exactly as they are):

```tsx
      {/* Lifts the list so a focused reps field stays above the keyboard (device run T2-4). */}
      <KeyboardAvoidingView testID="day-editor-keyboard" style={styles.flex} behavior="padding">
        <ScrollView
          testID="day-editor-scroll"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        >
          {/* …existing children unchanged… */}
        </ScrollView>
      </KeyboardAvoidingView>
```

Add `flex: { flex: 1 },` to `styles`.

In `components/ProgramExerciseRow.tsx`, change `placeholder="8–12"` to `placeholder="reps"`. Change `styles.reps` to:

```ts
  reps: {
    ...type.setInput,
    color: Colors.light.text,
    width: 88,
    height: touch.min,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    textAlign: 'center',
    // Same as the set inputs (redesign R8): Android pads the top of a fixed-height input.
    textAlignVertical: 'center',
    paddingVertical: 0,
    paddingHorizontal: spacing.sm,
  },
```

- [ ] **Step 4: Run to check they pass.**

Run: `npx jest app/__tests__/program-detail.test.tsx components/__tests__/ProgramExerciseRow.test.tsx`
Expected: PASS. If an existing ProgramExerciseRow test found the field by `getByPlaceholderText('8–12')`, change it to `'reps'`.

- [ ] **Step 5: Commit.**

```bash
git add app/program-detail.tsx components/ProgramExerciseRow.tsx app/__tests__/program-detail.test.tsx components/__tests__/ProgramExerciseRow.test.tsx
git commit -m "fix(editor): keep focused reps above the keyboard; centred input, 'reps' placeholder (T2-4, T2-8, T2-9)"
```

---

### Task 4: Discard puts the day back (T2-3, T2-12)

**Files:**
- Modify: `services/exercise.types.ts:139` (next to `collapsedExerciseIds`)
- Modify: `contexts/WorkoutContext.tsx`: context type (near line 66), `startWorkout` (332–349), `applyWorkoutUpdate` (438), new `discardWorkout` after `finishWorkout` (640–653), provider value (670–700)
- Modify: `app/workout.tsx:337-365`
- Test: `contexts/__tests__/WorkoutContext.test.tsx`

**Interfaces:**
- Consumes: `applyProgramUpdate`, `finishWorkout` (existing, internal).
- Produces: `Workout.discardRestore?: Workout`, and `discardWorkout(): void` on `useWorkout()`.

Decision D1. `applyWorkoutUpdate` mirrors every set edit into `program_data` as it is typed, so the day as it stood at Start is kept in the checkpoint. Discard writes it back, keeping the day's current `order` in case days were reordered during the session.

- [ ] **Step 1: Write the failing tests.** Append to `contexts/__tests__/WorkoutContext.test.tsx`:

```tsx
describe('discard (device run T2-3)', () => {
  const ticks = async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };
  const lastWritten = () => {
    const calls = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls;
    return calls[calls.length - 1][1] as Program;
  };

  test('discarding puts the day back as it was at Start', async () => {
    const { result } = await setup();
    await act(async () => { await result.current.updateSet('e1', 's1', 'weight', '40'); });
    await act(async () => { await result.current.completeSet('e1', 's1'); });
    expect(lastWritten().workouts[0].exercises[0].sets[0].weight).toBe('40');
    await act(async () => { result.current.discardWorkout(); await ticks(); });
    expect(result.current.currentWorkout).toBeNull();
    expect(result.current.currentProgram!.workouts[0].exercises[0].sets[0].weight).toBe('');
    expect(lastWritten().workouts[0].exercises[0].sets[0].weight).toBe('');
  });

  test('the restore point is kept in the checkpoint but never reaches program_data', async () => {
    const { result } = await setup();
    await act(async () => { await result.current.completeSet('e1', 's1'); });
    expect('discardRestore' in lastWritten().workouts[0]).toBe(false);
    const stored = JSON.parse((await AsyncStorage.getItem('momentum:in_progress_workout:user-1'))!) as Workout;
    expect(stored.discardRestore?.id).toBe('w1');
  });

  test('a restored checkpoint can still be discarded back to its Start (Review Focus 2)', async () => {
    const started: Workout = {
      ...workout,
      startedAt: 1,
      exercises: [{ ...workout.exercises[0], sets: [{ id: 's1', weight: '40', reps: '5', isComplete: true }] }],
      discardRestore: workout,
    };
    await AsyncStorage.setItem('momentum:in_progress_workout:user-1', JSON.stringify(started));
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await ticks(); });
    expect(hook.result.current.currentWorkout?.id).toBe('w1');
    await act(async () => { hook.result.current.discardWorkout(); await ticks(); });
    expect(hook.result.current.currentWorkout).toBeNull();
    expect(lastWritten().workouts[0].exercises[0].sets[0].weight).toBe('');
  });

  test('a checkpoint from before this change discards without a restore point (Review Focus 3)', async () => {
    const old: Workout = { ...workout, startedAt: 1 }; // no discardRestore
    await AsyncStorage.setItem('momentum:in_progress_workout:user-1', JSON.stringify(old));
    const hook = await renderHook(() => useWorkout(), { wrapper });
    await act(async () => { await ticks(); });
    await act(async () => { hook.result.current.discardWorkout(); await ticks(); });
    expect(hook.result.current.currentWorkout).toBeNull();
  });

  test('a quick workout discards without touching the program', async () => {
    const { result } = await setup();
    await act(async () => { result.current.discardWorkout(); await ticks(); });
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockClear();
    await act(() => { result.current.startQuickWorkout(); });
    await act(async () => { result.current.discardWorkout(); await ticks(); });
    expect(UserActiveProgramService.updateActiveProgram).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to check they fail.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx -t "discard"`
Expected: FAIL with `result.current.discardWorkout is not a function` (and a TS error on `discardRestore`).

- [ ] **Step 3: Implement.**

`services/exercise.types.ts`, after `collapsedExerciseIds?: string[];`:

```ts
  /**
   * Session-only: the program day as it stood when this workout started. Discard
   * writes it back, because set edits mirror into program_data as they are typed
   * (device run T2-3). Lives in the checkpoint; never written to program_data.
   */
  discardRestore?: Workout;
```

`contexts/WorkoutContext.tsx`:

1. Context type: next to `finishWorkout: () => void;` add

```ts
  /** Throw the running workout away: nothing saved, and its program day restored to how it was at Start. */
  discardWorkout: () => void;
```

2. `startWorkout`: inside `const fresh: Workout = { ... }`, after `collapsedExerciseIds: [],` add

```ts
      // The day as it is now, for Discard. A quick workout has no day to restore.
      discardRestore: workout.isQuick ? undefined : withoutSessionFields(workout),
```

Add this module-level helper above `export function WorkoutProvider`:

```ts
/** A day as program_data holds it: none of a session's own fields. */
function withoutSessionFields(w: Workout): Workout {
  const { startedAt, collapsedExerciseIds, discardRestore, ...day } = w;
  return day;
}
```

3. `applyWorkoutUpdate`: change

```ts
    const { startedAt, collapsedExerciseIds, ...forProgram } = next;
```

to

```ts
    const { startedAt, collapsedExerciseIds, discardRestore, ...forProgram } = next;
```

and add "and discardRestore (T2-3), Discard's copy of the day at Start" to the comment above it.

4. After `finishWorkout`, add:

```ts
  const discardWorkout = () => {
    const live = currentWorkoutRef.current;
    // A checkpoint from an older build has no restore point: discard as before.
    const before = live && !live.isQuick ? live.discardRestore : undefined;
    if (before) {
      applyProgramUpdate(
        (program) => ({
          ...program,
          // Keep the day's current order: days can be reordered while it runs.
          workouts: program.workouts.map((w) => (w.id === before.id ? { ...before, order: w.order } : w)),
        }),
        true
      );
    }
    finishWorkout();
  };
```

5. Provider `value`: add `discardWorkout,` after `finishWorkout,`.

`app/workout.tsx`:

- Add `discardWorkout,` to the `useWorkout()` destructure next to `finishWorkout,` (line 51).
- Lines 343 and 364: replace `finishWorkout();` with `discardWorkout();` in both Discard handlers. Line 403 (after a successful save) keeps `finishWorkout()`.
- `handleClosePress` (line 338): give the first alert a body so it has no blank gap (T2-12):

```tsx
    Alert.alert(currentWorkout?.name ?? 'Workout', 'Minimise keeps it running. Discard throws this session away.', [
```

- [ ] **Step 4: Run to check they pass.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx`
Expected: PASS, the whole file (rerun alone if one unrelated test flakes).

- [ ] **Step 5: Commit.**

```bash
git add services/exercise.types.ts contexts/WorkoutContext.tsx app/workout.tsx contexts/__tests__/WorkoutContext.test.tsx
git commit -m "fix(workout): Discard restores the program day to how it was at Start (T2-3, T2-12)"
```

---

### Task 5: "Last time" for exercises added during a workout (T2-10)

**Files:**
- Modify: `contexts/WorkoutContext.tsx`: `replaceExercise` (563–615), `addExerciseToWorkout` (617–623)
- Test: `contexts/__tests__/WorkoutContext.test.tsx`

**Interfaces:**
- Consumes: `WorkoutHistoryService.getLastPerformance(userId, names): Promise<Record<string, { weight: string; reps: string }[]>>`.
- Produces: internal `fillLastTime(exerciseId: string, name: string): Promise<void>`.

Root cause: `addExerciseToWorkout` never asks history. Only `startWorkout` and `replaceExercise` do.

- [ ] **Step 1: Write the failing test.** Append inside `describe('bests and replaceExercise', …)`:

```tsx
  it('an exercise added mid-workout gets its last-time hints (device run T2-10)', async () => {
    const { WorkoutHistoryService } = require('../../services/workoutHistoryService');
    (WorkoutHistoryService.getLastPerformance as jest.Mock).mockImplementation(async (_u: string, names: string[]) =>
      names.includes('Barbell Back Squat') ? { 'Barbell Back Squat': [{ weight: '60', reps: '8' }] } : {}
    );
    const { result } = await setup();
    await act(() => { result.current.startQuickWorkout(); });
    const id = result.current.currentWorkout!.id;
    await act(async () => {
      await result.current.addExerciseToWorkout(id, { id: 3, name: 'Barbell Back Squat' } as any);
    });
    const added = result.current.currentWorkout!.exercises.find((e) => e.name === 'Barbell Back Squat')!;
    expect(added.sets[0].previousWeight).toBe('60');
    expect(added.sets[0].previousReps).toBe('8');
    (WorkoutHistoryService.getLastPerformance as jest.Mock).mockResolvedValue({});
  });
```

- [ ] **Step 2: Run to check it fails.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx -t "last-time hints"`
Expected: FAIL, `previousWeight` is `undefined`.

- [ ] **Step 3: Implement.** Add above `replaceExercise`:

```ts
  /** "Last time" hints for one exercise of the running workout, once history answers. */
  const fillLastTime = async (exerciseId: string, name: string) => {
    if (!user) return;
    const last = await WorkoutHistoryService.getLastPerformance(user.id, [name]).catch(
      () => ({} as Record<string, { weight: string; reps: string }[]>)
    );
    const prev = last[name];
    if (!prev || prev.length === 0) return;
    applyWorkoutUpdate(
      (current) =>
        current.exercises.some((e) => e.id === exerciseId)
          ? {
              ...current,
              exercises: current.exercises.map((exercise) =>
                exercise.id === exerciseId
                  ? {
                      ...exercise,
                      sets: exercise.sets.map((set, i) => {
                        const p = prev[Math.min(i, prev.length - 1)];
                        return { ...set, previousWeight: p.weight, previousReps: p.reps };
                      }),
                    }
                  : exercise
              ),
            }
          : null,
      false
    );
  };
```

In `replaceExercise`, replace everything after `await programSync.flush();` (the `if (!user) return;` through the final `applyWorkoutUpdate(...)`) with:

```ts
    await fillLastTime(exerciseId, next.name);
```

Replace `addExerciseToWorkout` with:

```ts
  const addExerciseToWorkout = async (workoutId: string, exercise: DetailedExercise) => {
    const before = new Set((currentWorkoutRef.current?.exercises ?? []).map((e) => e.id));
    applyWorkoutUpdate(
      (current) => (current.id === workoutId ? addExercise(current, { exerciseId: exercise.id, name: exercise.name }) : null),
      true
    );
    await programSync.flush();
    // It never asked history, so "Last time" stayed "—" (device run T2-10).
    const added = currentWorkoutRef.current?.exercises.find((e) => !before.has(e.id));
    if (added) await fillLastTime(added.id, added.name);
  };
```

- [ ] **Step 4: Run to check it passes.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx`
Expected: PASS, including the existing `replaceExercise` tests.

- [ ] **Step 5: Commit.**

```bash
git add contexts/WorkoutContext.tsx contexts/__tests__/WorkoutContext.test.tsx
git commit -m "fix(workout): exercises added mid-workout get last-time hints (T2-10)"
```

---

### Task 6: Reset and rename are all or nothing; a failed restore says so (M7, M13)

**Files:**
- Modify: `contexts/WorkoutContext.tsx`: `resetProgramToTemplate` (291–299), `renameCurrentProgram` (304–312), restore effect (176–197), context type and value
- Modify: `app/(tabs)/index.tsx:39` and the slab branch (115–166)
- Test: `contexts/__tests__/WorkoutContext.test.tsx`

**Interfaces:**
- Consumes: Task 1's `flush` / `hasPending` guarantee, and `programSync.cancel()`.
- Produces: `programLoadFailed: boolean` and `retryProgramLoad(): void` on `useWorkout()`.

M7: today, a reset or rename that cannot be written reports "Could not reset" or "Could not rename", but stays applied in memory and pending, so it lands later anyway. The fix is to settle earlier edits first (refuse if they are stuck), apply, flush, and if that fails, cancel and put the program back. M13: a restore that throws leaves `currentProgram` null, and Home shows the first-run picker to someone who has a program.

- [ ] **Step 1: Write the failing tests.** Add inside `describe('program copies', …)`:

```tsx
  test('a reset that cannot be written is undone and never written later (M7, Review Focus 4)', async () => {
    fakeDb();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    const firstId = pullDay(result.current.currentProgram).exercises[0].id;
    await act(async () => {
      result.current.editDay('ppl-pull', (d) => removeExercise(d, firstId), true);
      await result.current.flushProgramSync();
    });
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    let ok = true;
    await act(async () => { ok = await result.current.resetProgramToTemplate(); });
    expect(ok).toBe(false);
    expect(pullDay(result.current.currentProgram).exercises).toHaveLength(4);
    expect(result.current.hasPendingProgramWrite()).toBe(false);

    // Back online, a later edit must not carry the reset with it.
    const pushId = result.current.currentProgram!.workouts[0].id;
    const exId = result.current.currentProgram!.workouts[0].exercises[0].id;
    await act(async () => {
      result.current.editDay(pushId, (d) => setSetCount(d, exId, 5), true);
      await result.current.flushProgramSync();
    });
    const calls = (UserActiveProgramService.updateActiveProgram as jest.Mock).mock.calls;
    expect(pullDay(calls[calls.length - 1][1] as Program).exercises).toHaveLength(4);
  });

  test('a rename that cannot be written is undone (M7)', async () => {
    fakeDb();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await setupEmpty();
    await act(async () => { await result.current.createBlankProgram(1); });
    const before = result.current.currentProgram!.name;
    (UserActiveProgramService.updateActiveProgram as jest.Mock).mockRejectedValueOnce(new Error('offline'));
    let ok = true;
    await act(async () => { ok = await result.current.renameCurrentProgram('Arms'); });
    expect(ok).toBe(false);
    expect(result.current.currentProgram!.name).toBe(before);
    expect(result.current.hasPendingProgramWrite()).toBe(false);
  });

  test('a failed restore is reported, not shown as a first run, and can be retried (M13)', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (UserActiveProgramService.getMostRecentActiveProgram as jest.Mock)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(active);
    const { result } = await setupEmpty();
    expect(result.current.programLoadFailed).toBe(true);
    expect(result.current.currentProgram).toBeNull();
    await act(async () => {
      result.current.retryProgramLoad();
      for (let i = 0; i < 6; i++) await Promise.resolve();
    });
    expect(result.current.programLoadFailed).toBe(false);
    expect(result.current.currentProgram?.name).toBe('Test');
  });
```

- [ ] **Step 2: Run to check they fail.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx -t "M7|M13"`
Expected: the reset test FAILS (5 exercises after the failed reset), the rename test FAILS (name is 'Arms'), and the M13 test FAILS (`programLoadFailed` undefined).

- [ ] **Step 3: Implement.**

In `contexts/WorkoutContext.tsx`, add below `settleBeforeSwitch`:

```ts
  /**
   * For one-off actions that report "Could not …" (reset, rename): write now,
   * or undo it here too, so a failed one never lands later (review M7). Earlier
   * edits are settled first, so a cancel drops only this change.
   */
  const applyNowOrRevert = async (edit: (program: Program) => Program | null): Promise<boolean> => {
    await programSync.flush();
    if (programSync.hasPending()) return false; // earlier edits still unwritten: change nothing
    const before = currentProgramRef.current;
    if (!applyProgramUpdate(edit, false)) return false;
    await programSync.flush();
    if (!programSync.hasPending()) return true;
    programSync.cancel();
    currentProgramRef.current = before;
    setCurrentProgramState(before);
    return false;
  };
```

In `resetProgramToTemplate`, replace the last three lines (`applyProgramUpdate(...)`, `await programSync.flush();`, `return !programSync.hasPending();`) with:

```ts
    return applyNowOrRevert((p) => resetToTemplate(p, template));
```

In `renameCurrentProgram`, replace the same three lines with:

```ts
    return applyNowOrRevert((p) => ({ ...p, name }));
```

Restore effect (M13). Add state next to `isLoadingProgram`:

```ts
  const [programLoadFailed, setProgramLoadFailed] = useState(false);
  const [programLoadAttempt, setProgramLoadAttempt] = useState(0);
```

In the effect: after `setIsLoadingProgram(true);` add `setProgramLoadFailed(false);`. In the `catch`, after the `console.error`, add `if (!cancelled) setProgramLoadFailed(true);`. Change the dependency array from `[userId]` to `[userId, programLoadAttempt]`. Below the effect, add:

```ts
  const retryProgramLoad = () => setProgramLoadAttempt((n) => n + 1);
```

Context type: add

```ts
  /** The last try to restore the user's program failed (not "no program yet"). */
  programLoadFailed: boolean;
  retryProgramLoad: () => void;
```

and add `programLoadFailed, retryProgramLoad,` to the provider value.

`app/(tabs)/index.tsx`: destructure `programLoadFailed, retryProgramLoad` from `useWorkout()` (line 39). Insert this branch between the `isLoadingProgram ? (...)` branch and the `nextWorkout && currentProgram ? (...)` branch:

```tsx
        ) : programLoadFailed ? (
          // A failed restore is not a first run (review M13).
          <View style={styles.mainCard}>
            <Text style={styles.workoutLabel}>Your program</Text>
            <Text style={styles.workoutName}>Did not load</Text>
            <Text style={styles.workoutExercises}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.startButton} onPress={retryProgramLoad} accessibilityRole="button" accessibilityLabel="Try loading your program again">
              <Text style={styles.startButtonText}>Try again</Text>
            </TouchableOpacity>
            {quickButton}
          </View>
```

- [ ] **Step 4: Run to check they pass.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx`
Expected: PASS, including the existing "reset restores the template days…" and "rename: blanks only…" tests.

- [ ] **Step 5: Commit.**

```bash
git add contexts/WorkoutContext.tsx "app/(tabs)/index.tsx" contexts/__tests__/WorkoutContext.test.tsx
git commit -m "fix(programs): reset/rename are all-or-nothing; failed restore is not a first run (M7, M13)"
```

---

### Task 7: Sheets lift above the keyboard; picker stays below the status bar (T2-5, T2-14, D6)

**Files:**
- Modify: `components/gestures/DragDismissSheet.tsx`
- Modify: `components/RenameProgramSheet.tsx:31-61`
- Modify: `app/workout.tsx:669-758` (finish sheet)
- Modify: `components/ProgramPickerSheet.tsx:84` (height)
- Create: `components/__tests__/DragDismissSheet.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: the `DragDismissSheet` prop `avoidKeyboard?: boolean` (default `false`), and testID `drag-dismiss-sheet` on the sheet body.

A `KeyboardAvoidingView` inside a transparent `Modal` did nothing on the edge-to-edge Pixel (device run T2-5). Instead, the sheet reads the keyboard height from `Keyboard` events and adds it as `marginBottom`. The prop is opt-in, because the Add exercise sheet has a fixed 85% height and must not be pushed off the top.

- [ ] **Step 1: Write the failing tests.** Create `components/__tests__/DragDismissSheet.test.tsx`:

```tsx
import React from 'react';
import { Keyboard, StyleSheet, Text } from 'react-native';
import { render, screen, act } from '@testing-library/react-native';
import DragDismissSheet from '../gestures/DragDismissSheet';

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);

type Listener = (e: { endCoordinates: { height: number } }) => void;
let listeners: Record<string, Listener> = {};

beforeEach(() => {
  listeners = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((name: string, cb: Listener) => {
    listeners[name] = cb;
    return { remove: () => { delete listeners[name]; } };
  }) as any);
});
afterEach(() => jest.restoreAllMocks());

const show = (h: number) => Object.entries(listeners).find(([n]) => /Show$/.test(n))![1]({ endCoordinates: { height: h } });
const hide = () => Object.entries(listeners).find(([n]) => /Hide$/.test(n))![1]({ endCoordinates: { height: 0 } });
const lift = () => StyleSheet.flatten(screen.getByTestId('drag-dismiss-sheet').props.style).marginBottom ?? 0;

test('with avoidKeyboard the sheet rises by the keyboard height (device run T2-5)', async () => {
  await render(<DragDismissSheet visible avoidKeyboard onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  await act(async () => { show(300); });
  expect(lift()).toBe(300);
});

test('keyboard hide or closing the sheet drops the lift (Review Focus 5)', async () => {
  const { rerender } = await render(<DragDismissSheet visible avoidKeyboard onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  await act(async () => { show(300); });
  await act(async () => { hide(); });
  expect(lift()).toBe(0);
  await act(async () => { show(300); });
  await rerender(<DragDismissSheet visible={false} avoidKeyboard onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  await rerender(<DragDismissSheet visible avoidKeyboard onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  expect(lift()).toBe(0);
});

test('without avoidKeyboard the sheet ignores the keyboard', async () => {
  await render(<DragDismissSheet visible onDismiss={jest.fn()}><Text>Body</Text></DragDismissSheet>);
  expect(Object.keys(listeners)).toHaveLength(0);
});
```

- [ ] **Step 2: Run to check they fail.**

Run: `npx jest components/__tests__/DragDismissSheet.test.tsx`
Expected: FAIL with "Unable to find an element with testID: drag-dismiss-sheet" (or `show` finding no listener).

- [ ] **Step 3: Implement `DragDismissSheet`.**

Imports: `import { ReactNode, useEffect, useState } from 'react';` and add `Keyboard, Platform` to the `react-native` import.

Props type: add

```ts
  /**
   * Rise with the keyboard. For sheets with a text field (rename, finish notes).
   * A KeyboardAvoidingView inside this Modal did nothing on Android edge-to-edge
   * (device run T2-5).
   */
  avoidKeyboard?: boolean;
```

Destructure `avoidKeyboard = false`. After `const sheetHeight = …`, add:

```ts
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (!avoidKeyboard || !visible) return;
    // iOS reports before the animation, Android only after it.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const shown = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hidden = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
      setKeyboardHeight(0);
    };
  }, [avoidKeyboard, visible]);
```

On the sheet `Animated.View`, add `testID="drag-dismiss-sheet"` and change its style to:

```tsx
            style={[
              styles.sheet,
              // Over the keyboard the home-indicator inset is hidden anyway.
              { paddingBottom: keyboardHeight > 0 ? spacing.lg : spacing.xxl + insets.bottom, marginBottom: keyboardHeight },
              sheetStyle,
            ]}
```

- [ ] **Step 4: Use it.**

`components/RenameProgramSheet.tsx`: remove `KeyboardAvoidingView` from the import and the JSX (keep its child `View`), delete the "Inside the sheet…" comment, and change the opening tag to:

```tsx
    <DragDismissSheet visible={visible} onDismiss={onDismiss} avoidKeyboard>
```

`app/workout.tsx`, finish sheet (line 669): `<DragDismissSheet visible={showMetadataModal} onDismiss={() => setShowMetadataModal(false)} avoidKeyboard>`. Remove the inner `<KeyboardAvoidingView behavior="padding">` (line 670) and its closing tag (line 757). Keep the `KeyboardAvoidingView` import, because line 562 still uses it.

`components/ProgramPickerSheet.tsx` (T2-14): change `<View style={{ height: height * 0.9 }}>` to

```tsx
      {/* Stops below the status bar, like the How-to sheet (redesign R6, device run T2-14). */}
      <View style={{ height: Math.min(height * 0.9, height - insets.top - insets.bottom - spacing.xxl - 48) }}>
```

- [ ] **Step 5: Run to check they pass.**

Run: `npx jest components/__tests__/DragDismissSheet.test.tsx components/__tests__ app/__tests__`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add components/gestures/DragDismissSheet.tsx components/__tests__/DragDismissSheet.test.tsx components/RenameProgramSheet.tsx app/workout.tsx components/ProgramPickerSheet.tsx
git commit -m "fix(sheets): rename and finish sheets rise with the keyboard; picker below status bar (T2-5, T2-14)"
```

---

### Task 8: Delete any copy that is not current; never the current one from the picker (T2-11, M10)

**Files:**
- Modify: `contexts/WorkoutContext.tsx:314-316` (`deleteProgramCopy` guard)
- Modify: `components/ProgramPickerSheet.tsx:62-78` (confirm copy) and `:128-134` (trash condition)
- Test: `contexts/__tests__/WorkoutContext.test.tsx` (update the "delete: blanks only…" test)

**Interfaces:**
- Consumes: nothing new.
- Produces: `deleteProgramCopy(row)` now returns `true` for a **non-current** template copy. It still returns `false` for the current template copy.

Decision D3. The template reappears under "Start something new" because `buildProgramChoices` lists templates with no copy.

- [ ] **Step 1: Update the test.** Replace the test `'delete: blanks only; deleting the current one falls back to the most recent copy (grill R2-Q4)'` with:

```tsx
  test('delete: any copy that is not current; the current one only if blank, then falls back (T2-11, grill R2-Q4)', async () => {
    const rows = fakeDb();
    const { result } = await setupEmpty();
    await act(async () => { await result.current.setCurrentProgram(ppl); });
    const pplRow = result.current.currentActiveProgram!;
    let ok = true;
    await act(async () => { ok = await result.current.deleteProgramCopy(pplRow); });
    expect(ok).toBe(false); // current template copy: refused
    expect(rows.has(pplRow.id)).toBe(true);

    await act(async () => { await result.current.createBlankProgram(1); });
    const blank = result.current.currentActiveProgram!;
    await act(async () => { ok = await result.current.deleteProgramCopy(rows.get(pplRow.id)!); });
    expect(ok).toBe(true); // not current any more: allowed
    expect(rows.has(pplRow.id)).toBe(false);
    expect(result.current.currentActiveProgram!.id).toBe(blank.id);

    await act(async () => { await result.current.setCurrentProgram(ul); });
    const ulRow = result.current.currentActiveProgram!;
    await act(async () => { await result.current.selectProgramCopy(rows.get(blank.id)!); }); // blank current again
    (UserActiveProgramService.getMostRecentActiveProgram as jest.Mock).mockResolvedValue(rows.get(ulRow.id)!);
    await act(async () => { ok = await result.current.deleteProgramCopy(rows.get(blank.id)!); });
    expect(ok).toBe(true); // current blank: allowed, falls back
    expect(rows.has(blank.id)).toBe(false);
    expect(result.current.currentActiveProgram!.id).toBe(ulRow.id);
  });
```

- [ ] **Step 2: Run to check it fails.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx -t "T2-11"`
Expected: FAIL on the second `expect(ok).toBe(true)`, because the non-current ppl copy is refused.

- [ ] **Step 3: Implement.** In `deleteProgramCopy`, replace the first two lines:

```ts
    if (!user || !isBlankTemplateId(row.program_template_id)) return false;
    const isCurrent = row.id === currentActiveProgramRef.current?.id;
```

with:

```ts
    if (!user) return false;
    const isCurrent = row.id === currentActiveProgramRef.current?.id;
    // Any copy can go once it is not current (device run T2-11); the current one
    // only if it is a blank (the slab ⋯ offers nothing else).
    if (isCurrent && !isBlankTemplateId(row.program_template_id)) return false;
```

In `ProgramPickerSheet.tsx`, change the trash condition from `{c.blank ? (` to `{!c.active ? (`. The current row is deleted from the slab only (M10), and every other copy can be deleted here. Change `confirmDelete` so a template copy says what it loses:

```tsx
  const confirmDelete = (row: UserActiveProgram, blank: boolean) =>
    Alert.alert(
      blank ? `Delete ${row.program_data.name}?` : `Delete your copy of ${row.program_data.name}?`,
      blank
        ? 'The program and its days are removed. Workouts you logged with it stay in your history.'
        : 'Your changes to it are removed, and it goes back to Start something new. Workouts you logged stay in your history.',
      [
```

Keep the rest of `confirmDelete` unchanged. The call site becomes `onPress={() => confirmDelete(c.row, c.blank)}`.

- [ ] **Step 4: Run to check it passes.**

Run: `npx jest contexts/__tests__/WorkoutContext.test.tsx services/__tests__/programChoices.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add contexts/WorkoutContext.tsx components/ProgramPickerSheet.tsx contexts/__tests__/WorkoutContext.test.tsx
git commit -m "feat(picker): delete any copy that is not current; no delete on the current row (T2-11, M10)"
```

---

### Task 9: Large font and type floor (T2-6, T2-7, M11)

**Files:**
- Modify: `components/HistoryRow.tsx` (styles `row`, `sets`)
- Modify: `components/ProgramPickerSheet.tsx` (styles `pick`, `blank`)
- Modify: `components/ProgramActionsSheet.tsx:57` (`sub`)
- Modify: `app/(tabs)/programs.tsx:241` (`upNext` fontSize)
- Modify: `app/(tabs)/progress.tsx:242-255` (stat tile texts)
- Create: `components/__tests__/HistoryRow.test.tsx`

**Interfaces:** none.

At 2.0× font the rows grew to fit their text but had no vertical padding, so the text touched the edges, and `historyCard` clips with `overflow: 'hidden'`. The stat tiles are a third of the screen wide, so a single word longer than the tile breaks mid-word. They get the same 1.3× cap the numeric inputs already use.

- [ ] **Step 1: Write the failing test.** Create `components/__tests__/HistoryRow.test.tsx`:

```tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import HistoryRow from '../HistoryRow';

test('the row has breathing room and no text under 15pt (device run T2-6, M11)', async () => {
  await render(<HistoryRow title="Full Body A" completedAt="2026-08-28T10:00:00Z" sets={2} volume={960} first onPress={jest.fn()} />);
  const sets = StyleSheet.flatten(screen.getByText('2 sets').props.style);
  expect(sets.fontSize).toBeGreaterThanOrEqual(15);
  const row = StyleSheet.flatten(screen.getByRole('button').props.style);
  expect(row.paddingVertical).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run to check it fails.**

Run: `npx jest components/__tests__/HistoryRow.test.tsx`
Expected: FAIL, 14 is not ≥ 15.

- [ ] **Step 3: Implement.**

`components/HistoryRow.tsx`: in `row` add `paddingVertical: spacing.sm,`. In `sets` change `fontSize: 14` to `fontSize: 15`.

`components/ProgramPickerSheet.tsx`: in `pick` and in `blank` add `paddingVertical: spacing.sm,`.

`components/ProgramActionsSheet.tsx`: in `sub` change `fontSize: 14` to `fontSize: 15`.

`app/(tabs)/programs.tsx`: in `upNext` change `fontSize: 13` to `fontSize: 15` (tappable text floor). Leave `paddingVertical: 2`.

`app/(tabs)/progress.tsx`: add `maxFontSizeMultiplier={1.3}` to each of the six `statValue` / `statLabel` `<Text>` elements at lines 242–255, with one comment above the first:

```tsx
            {/* A third of the screen wide: past 1.3× single words break mid-word (device run T2-7). */}
```

- [ ] **Step 4: Run to check it passes.**

Run: `npx jest components/__tests__/HistoryRow.test.tsx services/__tests__/theme.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add components/HistoryRow.tsx components/__tests__/HistoryRow.test.tsx components/ProgramPickerSheet.tsx components/ProgramActionsSheet.tsx "app/(tabs)/programs.tsx" "app/(tabs)/progress.tsx"
git commit -m "fix(layout): rows pad at large font; 15pt floor on tappable text; stat tiles capped (T2-6, T2-7, M11)"
```

---

### Task 10: History keeps what was loaded; clearer names (M12, T2-13)

**Files:**
- Modify: `services/historySummary.ts` (add two exports)
- Modify: `app/(tabs)/progress.tsx:66-96` (history loading)
- Modify: `app/(tabs)/index.tsx:224` (last-workout tile line)
- Modify: `components/ResumeWorkoutBar.tsx:23`
- Test: `services/__tests__/historySummary.test.ts`

**Interfaces:**
- Produces:
  - `historyWindow(loaded: number, fromStart: boolean, page: number): { offset: number; limit: number }`
  - `lastWorkoutTitle(data: { name?: string; isQuick?: boolean } | null | undefined): string`

- [ ] **Step 1: Write the failing tests.** Append to `services/__tests__/historySummary.test.ts` and add `historyWindow, lastWorkoutTitle` to its import from `'../historySummary'`:

```ts
describe('historyWindow (review M12)', () => {
  test('a refresh reloads everything already shown, never less than a page', () => {
    expect(historyWindow(0, true, 20)).toEqual({ offset: 0, limit: 20 });
    expect(historyWindow(60, true, 20)).toEqual({ offset: 0, limit: 60 });
  });
  test('"more" continues after what is loaded', () => {
    expect(historyWindow(40, false, 20)).toEqual({ offset: 40, limit: 20 });
  });
});

describe('lastWorkoutTitle (device run T2-13)', () => {
  test('a quick workout is not dated twice', () => {
    expect(lastWorkoutTitle({ name: 'Quick workout 23 Sept', isQuick: true })).toBe('Quick workout');
  });
  test('a program day keeps its name; nothing saved falls back', () => {
    expect(lastWorkoutTitle({ name: 'Push' })).toBe('Push');
    expect(lastWorkoutTitle(null)).toBe('Last workout');
  });
});
```

- [ ] **Step 2: Run to check they fail.**

Run: `npx jest services/__tests__/historySummary.test.ts`
Expected: FAIL with "historyWindow is not a function".

- [ ] **Step 3: Implement.** Append to `services/historySummary.ts`:

```ts
/**
 * Which slice of history to fetch. A refresh on focus reloads everything
 * already on screen, so coming back does not cut the list to one page (review M12).
 */
export function historyWindow(loaded: number, fromStart: boolean, page: number): { offset: number; limit: number } {
  return fromStart ? { offset: 0, limit: Math.max(page, loaded) } : { offset: loaded, limit: page };
}

/** The last-workout tile's name. A quick workout's name already holds its date, and the tile adds one. */
export function lastWorkoutTitle(data: { name?: string; isQuick?: boolean } | null | undefined): string {
  if (data?.isQuick) return 'Quick workout';
  return data?.name || 'Last workout';
}
```

`app/(tabs)/progress.tsx`: import `historyWindow` alongside `historyRow`, and add `useRef` to the React import. Replace `loadHistory` with:

```tsx
  // A ref, so the focus refresh below always sees how many rows are loaded.
  const loadedRef = useRef(0);
  loadedRef.current = history.length;

  const loadHistory = useCallback(
    async (fromStart: boolean) => {
      if (!user) return;
      setHistoryLoading(true);
      try {
        const { offset, limit } = historyWindow(loadedRef.current, fromStart, HISTORY_PAGE);
        const page = await WorkoutHistoryService.getWorkoutHistory(user.id, limit, offset);
        setHistory((prev) => (fromStart ? page : [...prev, ...page]));
        setHasMoreHistory(page.length === limit);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setHistoryLoading(false);
      }
    },
    [user]
  );
```

Also update the comment "20 at a time" to "20 at a time; a refresh keeps what is loaded".

`app/(tabs)/index.tsx`, line 224: import `lastWorkoutTitle` from `'@/services/historySummary'` and change the tile text to:

```tsx
              {lastWorkout ? `${lastWorkoutTitle(lastWorkout.workout_data)} · ${formatShortDate(lastWorkout.completed_at)}` : 'Last workout'}
```

If TypeScript complains that `workout_data` lacks `isQuick`, widen the row type where `recent` is declared. The saved JSON does hold `isQuick` (CLAUDE.md, "Quick workouts").

`components/ResumeWorkoutBar.tsx`, line 23: a day named "Back" read as a back button (T2-13), so change the visible text to:

```tsx
      <Text style={styles.name} numberOfLines={1}>Resume {currentWorkout.name}</Text>
```

- [ ] **Step 4: Run to check they pass.**

Run: `npx jest services/__tests__/historySummary.test.ts contexts/__tests__/WorkoutContext.test.tsx -t "historyWindow|lastWorkoutTitle|ResumeWorkoutBar"`
Expected: PASS. The ResumeWorkoutBar test matches the label `/Resume Full Body A/`, which is unchanged.

- [ ] **Step 5: Commit.**

```bash
git add services/historySummary.ts services/__tests__/historySummary.test.ts "app/(tabs)/progress.tsx" "app/(tabs)/index.tsx" components/ResumeWorkoutBar.tsx
git commit -m "fix(history): refresh keeps loaded rows; quick workout tile and resume bar read clearly (M12, T2-13)"
```

---

### Task 11: Gates, docs and the device re-check list

**Files:**
- Modify: `CLAUDE.md` (Gotchas)
- Modify: `docs/superpowers/qa/2026-09-tier2-device-run.md` (append "Run 2 — to do")
- Modify: `docs/superpowers/plans/2026-09-23-tier2-ledger.md` (mark M7–M13)

**Interfaces:** none.

- [ ] **Step 1: Run the gates.**

Run: `npx tsc --noEmit` → expected 0 errors. Run: `npm run lint` → expected 0 errors (5 warnings existed before). Run: `npm test` → expected all green. Rerun `contexts/__tests__/WorkoutContext.test.tsx` alone if it flakes. Fix anything red before the next step.

- [ ] **Step 2: Add CLAUDE.md gotchas.** Append these bullets to the "Gotchas" list:

```markdown
- **Never re-dispatch `e.data.action` to retry a `beforeRemove` check.** expo-router tags the action with the routes it already asked, so the replay skips your listener and the screen closes. Re-run your own check; dispatch only on success (`app/program-detail.tsx`, device run T2-1).
- **A `KeyboardAvoidingView` inside a `DragDismissSheet` (a transparent Modal) does nothing on Android edge-to-edge.** Pass `avoidKeyboard` to the sheet instead. Plain screens still use KeyboardAvoidingView (`app/workout.tsx`, `app/program-detail.tsx`).
- **programSync never retries on a timer.** A failed write stays pending until the next schedule or flush (set tick, blur, finish, app background, editor X). `flush()` resolves only when nothing is pending or in flight, or after a failure.
- **Discard restores the day.** `Workout.discardRestore` (checkpoint only, stripped like `startedAt`) holds the day as it was at Start; `discardWorkout()` writes it back. Saving uses `finishWorkout()`.
- **Offline device testing:** `cmd connectivity airplane-mode enable` leaves Wi-Fi on; also run `svc wifi disable`.
```

Also change the existing line "Anything that counts sets…" only if it has drifted. Otherwise leave it.

- [ ] **Step 3: Append the device re-check list** to `docs/superpowers/qa/2026-09-tier2-device-run.md`:

```markdown
---
## Run 2 — to do (build from `tier2/device-fixes`)

- [ ] T2-1 Airplane + Wi-Fi off → edit a day → X → "Not saved yet" → Try again ×3: stays open. Network on → Try again: closes; reopen shows the edit. Same with Android back.
- [ ] T2-2 Offline 30 s with an unsaved edit: logcat shows one "Program sync failed" per attempt, not one per second.
- [ ] T2-3 Start Push, type 40 kg on a set, Discard → Start Push again: the 40 is gone. Force-stop mid-workout, relaunch, Discard: same.
- [ ] T2-4 Day editor: focus the 4th card's reps → field above the keyboard; drag the list → keyboard closes and the value commits.
- [ ] T2-5 Rename sheet: field and Save name visible above the keyboard. Finish sheet Notes: visible while typing.
- [ ] T2-6/T2-7 Font 2.0×: History rows, picker rows not touching edges; stat tiles no mid-word breaks.
- [ ] T2-8/T2-9 Editor reps digits centred; empty field shows grey "reps".
- [ ] T2-10 Quick workout → add Barbell Back Squat → "Last time" shows 60 × 8.
- [ ] T2-11/M10 Picker: trash on every non-current copy (delete the 5-Day Split copy left from Run 1); none on the active row.
- [ ] T2-12 Workout X: the Minimise/Discard alert has a line of text.
- [ ] T2-13 Resume bar reads "Resume Back"; Home tile "Quick workout · Wed 23 Sept".
- [ ] T2-14 Picker sheet stops below the status bar.
- [ ] M7 Offline Reset → "Could not reset" → online → the program is unchanged, and stays unchanged after the next edit.
- [ ] M12 Progress → More → switch tab and back: the longer list stays.
- [ ] M13 Offline cold start (Supabase unreachable): Home says "Did not load" with Try again, not "Pick a program".
- [ ] A4 (owner) Fresh account: first screen offers the templates and Quick workout.
- [ ] I4 (iOS device) Swipe-down on the day editor is off.
```

- [ ] **Step 4: Mark the ledger.** In `docs/superpowers/plans/2026-09-23-tier2-ledger.md`, append this line under the "Final: minor (deferred)" lines:

```markdown
Fix plan: M7–M13 are covered by docs/superpowers/plans/2026-09-23-tier2-device-fixes.md (Tasks 1, 2, 6, 8, 9, 10).
```

- [ ] **Step 5: Commit.** `docs/superpowers/` is gitignored, so only CLAUDE.md is committed:

```bash
git add CLAUDE.md
git commit -m "docs: gotchas from the Tier 2 device run"
```

- [ ] **Step 6: Hand the owner the push and PR commands.** Write the PR body to `docs/superpowers/qa/tier2-fixes-pr-body.md`: a list of T2-/M- ids with one line each, the gates, "Device run 2 to do", and the attribution line `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. Then give the owner:

```
! gh auth switch --user thomas-whitley
! git push -u origin tier2/device-fixes
! gh pr create --base main --head tier2/device-fixes --title "Tier 2 device fixes (T2-1..T2-14, M7..M13)" --body-file docs/superpowers/qa/tier2-fixes-pr-body.md
```

---

## Self-review

- **Coverage:**
  - T2-1 → Task 2
  - T2-2 → 1
  - T2-3 → 4
  - T2-4 → 3
  - T2-5 → 7
  - T2-6 → 9
  - T2-7 → 9
  - T2-8 → 3
  - T2-9 → 3
  - T2-10 → 5
  - T2-11 → 8 (preview part: D5, no change)
  - T2-12 → 4
  - T2-13 → 10
  - T2-14 → 7
  - M7 → 6
  - M8 → 1
  - M9 → 2
  - M10 → 8
  - M11 → 9
  - M12 → 10
  - M13 → 6
  - A4 and I4 are device-only → Task 11 list.
- **Names used across tasks:** `discardWorkout`, `discardRestore`, `fillLastTime`, `applyNowOrRevert`, `programLoadFailed`, `retryProgramLoad`, `avoidKeyboard`, `historyWindow`, `lastWorkoutTitle`. Each is defined in exactly one task and referenced with the same spelling.
- **Order:** Task 1 first, because Tasks 2 and 6 depend on its `flush` guarantee. Tasks 3–10 are independent of each other, and Task 11 goes last.
