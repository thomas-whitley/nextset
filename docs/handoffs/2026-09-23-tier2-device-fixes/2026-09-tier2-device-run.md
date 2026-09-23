# Tier 2 device run: owner checklist

Build: `eas build --profile preview` from `tier2/setup-and-orientation` (stacked on `redesign/fingers-first`; PR #7 not merged when this was written).

## Spec §6.6 acceptance
- [x] A1 Programs → tap a day → change a set count and a reps range (type `8-12`, see `8–12`) → close → Start that day → the cards show the new plan.
- [x] A2 Switch program A → B → A (Change program). A's edits are intact.
- [x] A3 Home → Quick workout → add two exercises → log sets → Finish → Save. It appears in Progress → History, opens in detail, and the streak counts it.
- [ ] A4 Fresh account: the first screen after login offers the templates and Quick workout on Home.

## Review Focus
- [x] F1 Edit a set count, then within a second tap Change program → pick another. Switch back: the edit is on the first program and not on the second.
- [x] F2 Start a workout, Minimise, tap Start on Home / on a Programs day / Quick workout → "A workout is already running" → Resume opens the same workout.
- [x] F3 Start day 1, Minimise, drag day 1 below day 2 on Programs, Resume, type a weight, back to Programs: the order holds.
- [x] F4 Reps field: `12-8`, `0`, `150`, `abc` each revert on blur; empty clears the ghost text on the workout cards.
- [ ] F5 Airplane mode → edit a day → X: "Not saved yet". Try again offline: still open. Airplane off → Try again: closes. Repeat with Android back.

## Also
- [x] Blank program, 1 day: picker → Blank program → set 1 → Create program → the editor opens on Day 1 → add exercises → Programs slab ⋯ → Rename → the name shows on Programs and Home.
- [x] Blank program, 4 days: picker → Blank program → 4 → Create program → you land on Programs with Day 1–Day 4 cards; each opens its editor. The stepper stops at 1 and 7; Back returns to the lists.
- [x] Delete a non-current blank from the picker; delete the current blank from the slab ⋯ (falls back to the previous program).
- [x] Reset to template on a template copy restores its exercises; it is refused while one of its days is running.
- [x] The running day's editor is read-only with the "You are doing this workout now" note.
- [ ] Largest font: day cards, picker rows, editor rows and history rows do not clip or overlap.

---
## Run 1 — 2026-09-23, EAS preview `a5c40a3a` (main @ bdddbc0), Pixel 8a, by Claude over adb

Installed with `install -r`; signed-in account, active program Push / Pull / Legs. No crashes.

Pass: A1 (5 sets and `8-12` → `8–12` reach the workout cards); A2 + F1 (Deadlift +1 set, X, Change program within ~1 s → Full Body A untouched, PPL kept the edit); A3 (quick workout, Squat 50×5 + Flye 10×12 → finish sheet 370 kg → History row, detail, streak 1, Wed disc filled); F2 (guard on Programs day Start, Home Start, Quick workout; Resume reopens the same session); F3 (dragged running Push below Pull, resumed, typed a weight; order held on screen and after force-stop + relaunch, checkpoint restored); F4 (`12-8`, `0`, `150`, `abcr` revert on blur; empty → workout shows `reps` placeholder, no ghost); I5 (type 7, X at once → kept); running day read-only with lock note; blank 1 day (editor opens on Day 1, add exercise, Rename → shows on Programs + Home); blank 4 days (Programs with Day 1–4, each opens; stepper stops at 1 and 7 with disabled ends; Back returns to lists); delete non-current blank from picker, delete current blank from slab → falls back to PPL; Reset to template refused while a day runs, then restores Chest 3 → 4 exercises; font 2.0× day cards, editor rows, history detail.

F5: first X and first Android back offline → "Not saved yet" pass. **"Try again" while still offline closes the editor — fail (T2-1).**

Not run: A4 (fresh account — needs a sign-up; owner call). I4 swipe-down: needs an iOS device.

Findings:
- T2-1 (high) **Day editor "Try again" leaves while still unsaved.** `app/program-detail.tsx:57` re-dispatches `e.data.action`; expo-router's `shouldPreventRemove` tags that action with `VISITED_ROUTE_KEYS` holding this route (`node_modules/expo-router/build/react-navigation/core/useOnPreventRemove.js:50-61`), so the second `beforeRemove` is skipped and the screen closes with the write still pending. Try again must re-run flush + check itself (or dispatch a fresh action, e.g. `navigation.goBack()`), not replay `e.data.action`.
- T2-2 (high) **Offline program sync retries every ~1 s forever.** `services/programSync.ts:56-61`: after a failed write `pending` is restored, then "Something was scheduled while we were writing" reschedules `run()` 800 ms later — a tight loop (logcat: one `Program sync failed` per second while offline). The comment says "will retry on next change". Retry on next schedule/flush only, or back off.
- T2-3 (med, pre-existing) **Discard does not discard.** Weights typed in a discarded workout are in the next start of that day (Push set 2 = 40 after "Nothing from this session will be saved"). `applyWorkoutUpdate` writes sets through to `program_data`; Discard (`finishWorkout`) never reverts. Either snapshot the day at start and restore on discard, or change the copy.
- T2-4 (med) **Day editor: focused reps field hides behind the keyboard.** Lateral Raise (4th card) reps focused → field under the keyboard, list doesn't scroll. Blind taps then typed into it. Also tapping empty space doesn't blur (commit only happens on focus change / X).
- T2-5 (med) **Rename sheet stays under the keyboard** — field and Save name hidden while typing (Programs slab ⋯ → Rename). Needs keyboard avoidance.
- T2-6 (med, 2.0×) **History row clips** — "Friday 28 August" and "2 sets" sit on the card's bottom edge (Progress → History). Picker rows are tight too (two-line subtitles touch dividers / dashed border).
- T2-7 (low, 2.0×, pre-Tier-2) Progress stat tiles break words mid-word: "Worko/uts", "Curr/ent", "Volum/e".
- T2-8 (low) Day editor reps input: digits sit high, not vertically centred (the workout set inputs were fixed in R8; the editor input wasn't).
- T2-9 (low) Empty reps field in the editor shows a grey `8–12` placeholder that reads like a value.
- T2-10 (low) "Last time" shows "—" for Barbell Back Squat added to a quick workout, though 28 Aug history has 60 kg × 8. Check `addExerciseToWorkout` lookup (`WorkoutContext.tsx:~585`, `exercise.id === exerciseId`) and `getLastPerformance`.
- T2-11 (low) Template copies can't be deleted (no trash in picker, slab ⋯ only has Reset) — a tried-once template stays in "Your programs" for good. Tapping a template row (with `>` chevron) starts it immediately, no preview.
- T2-12 (low) Minimise sheet on the workout X is a titled Alert with an empty body (big blank gap).
- T2-13 (low, copy) Resume bar for a day named "Back" reads "▷ Back" — looks like a back button. Home last-workout tile: "Quick workout 23 Sept · Wed 23 Sept" repeats the date.
- T2-14 (low) Program picker sheet runs under the status bar (same as R6 on How-to).

Data left behind: one saved Quick workout 23 Sept (370 kg) in history; a 5-Day Split copy in "Your programs" (can't be deleted in-app, see T2-11). PPL restored (order Push/Pull/Legs, Bench 4×6, OHP 3×8, Deadlift 3 sets); Push Bench set 1 still shows 60 kg (was there before this run). Active program PPL. Airplane off, Wi-Fi on, font 1.0, stay-on 0.

---
## Run 2 — to do (build from `tier2/device-fixes`)

- [ ] T2-1 Airplane + Wi-Fi off → edit a day → X → "Not saved yet" → Try again ×3: stays open. Network on → Try again: closes; reopen shows the edit. Same with Android back.
- [ ] T2-2 Offline 30 s with an unsaved edit: logcat shows one "Program sync failed" per attempt, not one per second.
- [ ] T2-3 Start Push, type 40 kg on a set, Discard → Start Push again: the 40 is gone. Force-stop mid-workout, relaunch, Discard: same.
- [ ] T2-4 Day editor: focus the 4th card's reps → field above the keyboard; drag the list → keyboard closes and the value commits.
- [ ] T2-5 Rename sheet: field and Save name visible above the keyboard, with no gap and not lifted twice. Finish sheet Notes: visible while typing. Check with 3-button nav as well as gesture nav (final review I3: keyboard height vs nav-bar inset in a Modal).
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
