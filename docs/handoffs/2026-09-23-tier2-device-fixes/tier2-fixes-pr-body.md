Fixes from the Tier 2 phone run (docs/superpowers/qa/2026-09-tier2-device-run.md, Run 1) and the deferred review minors M7–M13.

## Fixes
- **T2-1** Day editor "Try again" re-runs the save check. Replaying `e.data.action` skipped `beforeRemove`, so the editor closed unsaved.
- **T2-2** programSync no longer retries a failed write every ~1 s while offline. It retries on the next edit or flush.
- **M8** `flush()` resolves only when nothing is pending or in flight.
- **M9** One leave listener; a double X doesn't leave twice.
- **T2-3** Discard restores the program day as it was at Start (`Workout.discardRestore`, checkpoint only).
- **T2-12** The close alert has a line of text.
- **T2-4** A focused reps field in the day editor stays above the keyboard; dragging the list closes the keyboard.
- **T2-8 / T2-9** Editor reps input is centred; an empty field shows "reps".
- **T2-10** An exercise added mid-workout gets its "Last time" hints.
- **M7** Reset and rename are all-or-nothing: a failed one is undone and never lands later.
- **M13** A failed launch restore shows "Did not load / Try again" on Home, not the first-run picker.
- **T2-5** The Rename and Finish sheets rise with the keyboard (new `DragDismissSheet` prop `avoidKeyboard`).
- **T2-14** The picker sheet stops below the status bar.
- **T2-11 / M10** Any program copy that is not current can be deleted from the picker; the active row has no delete.
- **T2-6 / T2-7 / M11** Row padding at large font; 15pt floor on tappable text; stat tiles capped at 1.3×.
- **M12** Progress history keeps the rows already loaded when you come back to it.
- **T2-13** The resume bar reads "Resume …"; the quick-workout tile shows its date once.
- **Final review I1** "Did not load" clears once a program is picked.
- **Final review I2** Saved `workout_data` no longer carries `discardRestore` or folds.

## Gates
tsc 0 errors · lint 0 errors (6 warnings) · jest 224/224

## Still to check on a device (Run 2 checklist in the QA doc)
Every item above. In particular, the keyboard lift on Android with both 3-button and gesture navigation (final review I3). Also A4 (fresh account) and I4 (iOS swipe-down).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
