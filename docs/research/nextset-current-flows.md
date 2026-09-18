# NextSet — current UX flows (as of 2026-09-18, commit 635c52c)

Read directly from the screens under `app/`. Companion to `competitor-ux-teardown.md`.

## Navigation model

- 4 tabs: Home, Programs, Progress, Profile (`app/(tabs)/_layout.tsx`).
- Active workout is a **root modal** (`app/workout.tsx`, `presentation: 'modal'`). Closing it (X / back) leaves the workout in progress in context + AsyncStorage checkpoint.
- **No "workout in progress" indicator anywhere outside the modal.** Home does not read `isWorkoutActive`; a restored checkpoint is invisible until the user taps Start again.
- Standalone interval/rest timer at `/timer` (presets, custom, execution) reachable from Home card and from the workout header. It is separate from the in-row rest timer.

## 1. First launch & onboarding

Login → Home. Home shows "No program yet → Choose a program" slab. Programs tab lists 5 bundled templates (PPL, Upper/Lower, Full Body 3×, 5×5, 5-Day Split). Selecting one copies it to `user_active_programs`. Back to Home → "Up next · <program> / <workout>" → Start.
Minimum taps to first logged set: login, Programs tab, pick template, Home tab, Start, type weight, type reps, tick. No onboarding, no empty-workout / "just start lifting" path.

## 2. Programs

- Exactly **one active program** at a time; switching asks for confirmation and clears the current one.
- `program-detail` (modal): shows days, long-press to reorder days, Start per day. **No exercise editing outside a live workout** (no add/remove/replace exercise on the template screen).
- No build-your-own program; no favourite/recent programs; no per-exercise target sets×reps display before starting.
- History section on Programs tab duplicates Home's recent list.

## 3. Active workout (`app/workout.tsx`, 1318 lines)

Header: X (close), workout name, running duration, timer icon → `/timer`, Finish button (disabled when offline: "Waiting for connection").

Warmup section (optional picker sheet). Exercise cards: the first card with an incomplete set gets the "rubber slab" highlight. Card header: name, trash (with undo toast), set-count −/+ stepper. Per-card session notes field. Long-press to reorder cards. "Add Exercise" at bottom opens picker sheet (search by name/muscle/equipment; no filters/chips, no recents).

Set row: [n / ✓ checkbox] [previous "60×8" muted] [kg input] [reps input] [rest badge when active]. Values pre-filled from last session of the same exercise name. Weight/reps bounded (1000 kg / 100 reps). Inputs locked once ticked. `BarLoadingStrip` (plate breakdown) under the next set of the active exercise.

Missing vs. common patterns: no set-type (warm-up/drop/failure), no RPE/RIR, no per-set target ("3×8 @ 60"), no replace-exercise, no superset grouping, no "previous" tap-to-copy, no keyboard accessory (+/− increments, next-field), no PR flag on the row.

## 4. Rest timer

Starts automatically on tick using the **global** default from Settings. Shows only as a 10-px badge inside the completed row — no sticky banner, no skip/+30s, no notification/lock-screen, no per-exercise rest, no sound/vibration at zero. Standalone `/timer` is a separate feature.

## 5. Finish

Finish → sheet: "12 min · 9 sets · 540 kg", optional bodyweight, optional notes, Save. Save requires connection; up to 3 retries then "kept on phone". Finishing with 0 sets offers Discard. No PR list, no per-exercise recap, no share card. Discard is only reachable via the 0-set path or by never finishing.

## 6. History & progress

- Home: this-week dots, streak, last-workout volume, "Recent workouts" modal (name, date, volume), calendar modal.
- Progress tab: range picker, totals (workouts / streak / volume), weekly volume chart, bodyweight chart, frequency chart. **No per-exercise history or 1RM/weight-over-time chart; no PR detection beyond Profile's "Personal records" list.**
- Tapping a past workout does not open a detail view of its sets.

## 7. Settings

Default rest time, barbell weight, CSV export, privacy, delete account, help, feedback, about. No units toggle (kg only), no theme, no per-exercise defaults.

## Friction candidates (my read, unverified with users)

1. Rest timer is nearly invisible and unadjustable mid-set.
2. Program → Home → Start round trip; no start-from-Programs-day shortcut except via detail modal.
3. Template cannot be edited except while a workout is live.
4. No resume affordance for an in-progress workout after closing the modal or relaunching.
5. Set row has no target, so the user must remember the plan; "previous" column is the only cue.
6. Two unrelated timers (in-row rest vs `/timer` screen) share one icon in the header.
7. Progress has no per-exercise view, which is the question most lifters ask ("am I getting stronger on X?").
