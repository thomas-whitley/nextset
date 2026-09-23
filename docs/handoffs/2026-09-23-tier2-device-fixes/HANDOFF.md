# Handoff: NextSet — Tier 2 device fixes (PR #9), device Run 2 next

**Written** 2026-09-23 · **Repo** `thomas-whitley/nextset` · **Code branch** `tier2/device-fixes` (PR #9) · **This handoff** lives on branch `handoff/tier2-device-fixes`, in `docs/handoffs/2026-09-23-tier2-device-fixes/`

## Where it is

This session did three things:
- It ran the Tier 2 checklist on the owner's Pixel 8a, using the preview build of `main` @ `bdddbc0`, and recorded 14 findings, T2-1…T2-14.
- It wrote a fix plan covering those findings plus the ledger minors M7–M13.
- It implemented the plan inline, with one final Opus review.

The result is **PR #9**: https://github.com/thomas-whitley/nextset/pull/9. It holds 12 commits `bdddbc0..` on `tier2/device-fixes`. Gates were tsc 0, lint 0 errors (6 warnings), jest 224/224. CI should run on the PR; nobody has checked it yet.

**Nothing in PR #9 has been tried on the phone.** The next step is device **Run 2**:
1. Build an EAS preview from `tier2/device-fixes`.
2. Install it.
3. Work through the "Run 2 — to do" list in the QA doc.
4. Fix whatever fails, then the owner merges #9 (merge commit, not squash).

## Artifacts (copies in this folder, because `docs/superpowers/` is gitignored)

| File here | Original (this machine only) | What it is |
|---|---|---|
| `2026-09-tier2-device-run.md` | `docs/superpowers/qa/` | Run 1 results and findings T2-1…T2-14, plus the **Run 2 checklist** at the bottom |
| `2026-09-23-tier2-device-fixes.md` | `docs/superpowers/plans/` | The fix plan: open decisions D1–D7 (the owner accepted all the defaults), 11 tasks, Review Focus |
| `2026-09-23-tier2-ledger.md` | `docs/superpowers/plans/` | The earlier Tier 2 ledger. M7–M13 are at lines 42–48 |
| `tier2-fixes-pr-body.md` | `docs/superpowers/qa/` | The PR #9 body |

On a new machine, copy these back to their original paths so later sessions find them. Other context: the root `CLAUDE.md` Gotchas were updated in this PR (beforeRemove replay, keyboard avoidance in sheets, programSync, Discard). The Tier 2 plan and spec are `docs/superpowers/plans/2026-09-23-tier2-setup-and-orientation.md` and `docs/superpowers/specs/2026-09-18-ux-overhaul-design.md`. They are gitignored and **not copied**; ask the owner if you need them.

## Open items from the final review

- **I3, most important:** check it first in Run 2. `components/gestures/DragDismissSheet.tsx` has a new `avoidKeyboard` prop that lifts the sheet by `keyboardDidShow` `endCoordinates.height` using `marginBottom`. On Android inside a Modal, that height may leave out the nav-bar inset, so the sheet sits too low. Or the window may resize as well, so the sheet is lifted twice. Test the Rename sheet (Programs slab ⋯ → Rename, on a blank program) and the Finish sheet's Notes field, with both 3-button and gesture navigation. If the sheet is off by the nav bar, add `insets.bottom` on Android while the keyboard is up.
- **Deferred minors** (the owner hasn't ruled on them):
  - Offline Discard loses its restore if the app is killed before the next flush.
  - `applyNowOrRevert` can roll back an unrelated edit made during its second flush.
  - `fillLastTime` writes `previousWeight` into `program_data`.
  - The picker height uses an unnamed 48.
  - A sheet opened with the keyboard already up gets no lift.
- **A4** (fresh-account first screen): the owner does it by hand, because it needs a sign-up. **I4** (swipe-down): needs an iOS device.

## Things you won't find in the files

- **Ask the owner before driving the phone.** Only one session drives it at a time. In Run 1, Teams and Messenger notifications popped up over the app. Delete any screenshot that catches one, and never record its content.
- **Device bridge.** The host runs `adb -a -P 5037 nodaemon server`, and the VM connects with `adb -H 192.168.56.1`. The VM has no adb, so download platform-tools into your scratchpad. The device is a Pixel 8a, `53261JEKB17527`.
  - **Screenshots:** screencap, then a PIL resize to 540×1200, and tap at 2× those coordinates.
  - **Settings:** set `settings put global stay_on_while_plugged_in 7` for the run and put it back to `0` afterwards. Changing `font_scale` restarts the activity, so always restore `1.0`.
  - **Dragging:** use `input motionevent DOWN/MOVE/UP`.
  - **Offline:** airplane mode leaves Wi-Fi on, so also run `svc wifi disable`, and undo both afterwards.
  - **Blurring a field:** tapping empty space doesn't blur an RN input. Focus another input, or dismiss the keyboard, instead.
- **The owner's real data.** It is the owner's real account, and the active program is **Push / Pull / Legs**. Put back anything you change: day order Push / Pull / Legs, Bench 4×6, OHP 3×8, Deadlift 3 sets. Discard throwaway workouts. Run 1 left behind one test "Quick workout 23 Sept" (370 kg) in history and a **5-Day Split copy**. With PR #9, that copy can be deleted from the picker, which is a Run 2 check.
- **Builds.** Run `npx eas-cli build --profile preview --platform android --non-interactive --no-wait` (the classifier allows it), then `npx eas-cli build:view <id> --json` for `status` and `artifacts.applicationArchiveUrl`. `curl` the APK into your scratchpad and install it with `adb install -r`, which keeps app data. The last build, `a5c40a3a`, is from `main` and does NOT contain the fixes.
- **Git and GitHub.**
  - `git push`, `gh pr create` / `merge` and `rm -rf` are blocked by the classifier, so hand the owner `!` commands.
  - `gh` flips back to the work account: run `gh auth switch --user thomas-whitley` before every push. Never use the `thomasWhitley` account.
  - PRs are merged with merge commits.
- **Test and dev quirks.**
  - `contexts/__tests__/WorkoutContext.test.tsx` has flaked once under full load; rerun it alone before believing a failure.
  - The Supabase Free project auto-pauses. The symptom is "Failed to fetch" at login, and the owner unpauses it in the dashboard.
  - The VM's Bash has a command cap of about 8 KB, so write large files in chunks.
- **Owner rules.**
  - Planning turns: plan only, no building or verifying.
  - Lean tokens: one implementer at a time, and no reviewer agents except a single final whole-branch review.
  - The owner wants written docs with open-decision lists.
  - For a multi-step plan, track progress.

## Suggested skills

`run`, `superpowers:systematic-debugging` (for Run 2 failures), `superpowers:test-driven-development` (for any fix), `superpowers:verification-before-completion`, `superpowers:finishing-a-development-branch`, `handoff`, `log`
