# Handoff: NextSet per-exercise progress (Tier 3) — device run, 2026-09-24

Repo: `nextset` (Expo SDK 57 gym app). Read `CLAUDE.md` first; it is current.
Previous handoff (2026-09-23) lived in a temp dir on the old machine; everything still relevant from it is below.

## Where things stand

- **Branch `tier3/exercise-progress`**, pushed to `origin/tier3/exercise-progress`. **Stacked on PR #9** (`tier2/device-fixes`, still OPEN on 2026-09-24). No PR for this branch yet.
  - ⚠️ On the old machine this branch's upstream was `origin/tier2/device-fixes`, so a bare `git push` would have pushed into PR #9. On a fresh checkout, run `git switch tier3/exercise-progress`. That tracks `origin/tier3/exercise-progress`. Check with `git rev-parse --abbrev-ref @{u}`.
  - Once #9 merges: `git rebase main`, then PR against `main`. Until then the PR base is `tier2/device-fixes`.
- **Feature complete and reviewed** ("Ready to merge: With fixes"; the fixes are in `a6e434c`). Gates at `a6e434c`: tsc 0 · lint 0 errors / 11 warnings (all `require()` in `jest.mock`, the prescribed pattern) · jest 271/271.
- **The device run has NOT started.** Nothing on the checklist is ticked. See "What happened" below.

### Commits added this session
- `app.json`: EAS `owner` changed from `twhitley` to **`thomas-whitley`**, and `projectId` to `d9f2f4c3-2658-4eaf-8170-ed15a8ad784c`. The owner asked for this ("switch it"). The old owner account (`twhitley`) wasn't the one logged in to eas-cli. This is a new EAS project with a new cloud-generated Android keystore. **Not yet decided:** whether this switch is permanent or should be reverted before merge. Ask the owner.
- This handoff doc (`docs/handoffs/`). Delete it when the branch is finished.

## What happened on 2026-09-24 (so you don't repeat it)

1. **The phone had no dev client.** `com.twhitley.momentumgymtracker` on the Pixel 8a was a release/preview APK (not debuggable, no DevLauncher, JS embedded) that ignored Metro. The old handoff was wrong about this. Everything seen on it was old code.
2. **Expo Go can't run this app.** `expo-notifications` throws on import in Expo Go (SDK 53+ removed push); the only importer is `services/restNotifications.ts`.
3. **Built a real dev client on EAS:** build `10d4f58e-fe04-46ed-9695-d0c0ad260a9b` (profile `development`, Android, account `thomas-whitley`). It's **installed on the phone**. The old preview APK was uninstalled, with the owner's OK.
   APK: https://expo.dev/artifacts/eas/BX84nQNvpjBhKf8xSM7oBvB2C5Se7YGnLh9FJxi0DwU.apk
4. The dev client loaded this branch from Metro and reached the **login screen**. We stopped there, waiting for the owner to sign in. Never type their credentials or PIN.

## Setting up on the new machine

- **`.env`** is gitignored and must be recreated:
  ```
  EXPO_PUBLIC_SUPABASE_URL=https://rfyucjisdtpukabqhohc.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key: Supabase Dashboard → project rfyucjisdtpukabqhohc → Project Settings → API>
  ```
  On the old machine the key was taken from the old preview APK's embedded bundle, after checking the JWT payload says `role: anon` and `ref: rfyucjisdtpukabqhohc`. That APK is gone, so use the dashboard. The owner can paste the key.
- `npm ci`. Start Metro: `npx expo start --offline --port 8081 --clear` (on the old dev VM, plain `expo start` failed with `fetch failed`). A cold bundle takes about 200 s. Pre-warm it with
  `curl "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=android&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app" -o /dev/null`.
- `eas-cli` must be logged in as **`thomas-whitley`** for any further build (the project now belongs to that account).
- **adb**: the USB connection kept dropping, so use **wireless debugging**. `adb mdns services` lists the phone as `adb-53261JEKB17527-…` (serial `53261JEKB17527`), then run `adb connect <ip:port>`. The phone trusted the old PC (`T_Buckets`) without pairing. A new PC will need a one-time **pairing**: Developer options → Wireless debugging → Pair device with pairing code, then `adb pair <ip:port> <code>`.
  - Then: `adb reverse tcp:8081 tcp:8081`, and launch with
    `adb shell am start -a android.intent.action.VIEW -d "exp+momentum-gym-tracker://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081" com.twhitley.momentumgymtracker`
  - When more than one device is attached, pass `-s <ip:port>` to every adb call.
  - Screenshots: `adb exec-out screencap -p > file.png`, then Read it. Screenshots display at 900×2000 for a 1080×2400 screen, so multiply by 1.2 for `adb shell input tap`.
  - The phone sleeps and locks quickly. Ask the owner to raise the screen timeout. Check with `dumpsys window | grep isKeyguardShowing`.
- The owner needs to **sign in** in the dev client, and the owner does it themselves. Sign-in is per install.

## Next: the device checklist (plan Task 6 Step 8, plus handoff items)

1. The chart with 2 and with 12 points: labels readable, nothing drawn outside the card. (The account currently has 2 workouts; more sessions are needed to reach 12.)
2. The chart-metric toggle survives an app restart.
3. At the largest system font: PR rows, session rows and sheet rows stay ≥ 56 dp and nothing clips.
4. Airplane mode on the chart screen and on the sheet (`cmd connectivity airplane-mode enable` **and** `svc wifi disable`) shows "Did not load"; after reconnecting, Try again works. ⚠️ Disabling Wi-Fi **drops wireless adb.** Use USB for this step, or have the owner toggle it by hand.
5. Tap a Personal Records row (it opens `/exercise-progress`), then "See all exercises" → pick a lift. The sheet should close and push the modal route.
6. The sheet header sits **below the status bar** (a review fix, never seen on a device).
7. The single-session nudge; a bodyweight lift shows "Most reps" and no toggle.
8. PR #9's Run 2 checklist (`docs/superpowers/qa/2026-09-tier2-device-run.md` on the old machine, gitignored, **not available here**. Ask the owner, or check PR #9's description). Focus: the Android keyboard lift with 3-button and with gesture navigation; A4 (a fresh account).

**Already spotted, not yet investigated:** a LogBox error on launch, "expo-notifications: Custom sound 'default' not f…" (truncated). Suspect the channel/notification setup in `services/restNotifications.ts` passes `sound: 'default'`. Debug it with systematic-debugging and fix it test-first.

Also noticed, pre-existing and out of scope: the Progress volume chart's x-axis uses US dates (`8/23`), and the "1,330 kg" Total Volume tile wraps onto two lines.

## After the device run

- Fix any findings test-first. Then finish the branch: push and open the PR (base `tier2/device-fixes` until #9 merges).
- Tell the owner the **rulings and deferred minors** below. They haven't seen them yet.
- Delete this doc and `.superpowers/sdd/2026-09-23-exercise-progress/` (old machine only) when the branch is done.

### Rulings made during implementation (the owner hasn't seen these)
- The branch was based on `origin/tier2/device-fixes` rather than waiting for #9 to merge. Cost if wrong: a rebase.
- Task 3 test: the supabase mock's `__chain`/`__result` moved onto the `supabase` object (as `preferences.test.ts` does). Test-only.
- The final review's Minor #8 (13pt date on the now-tappable PR row) was re-graded to Important, since it breaks the 15pt tappable-text floor. Fixed.
- `insets.bottom` kept in the sheet's ScrollView padding, to match `ProgramPickerSheet`. Cost if wrong: about 34pt of extra bottom space.

### Deferred minors (from the final review)
- iOS: pushing a modal route while the sheet's Modal closes is unverified.
- `exerciseList` re-sorts all entries per exercise (perf on low-end Android).
- A stored chart metric can override a tap made before it loads.
- The "Log it once more" nudge misleads on a lift with one weighted session among many bodyweight ones.
- The PR card shows its title with only "See all" when the range has no weighted records.
- Spec wording drift (`loggedExercises`/`exerciseRecord` signature, one fetch per surface).

## Local-only artefacts (old machine, gitignored, NOT on the new machine)
Spec `docs/superpowers/specs/2026-09-23-exercise-progress-design.md` (decisions Q1–Q20), plan `docs/superpowers/plans/2026-09-23-exercise-progress.md`, ledger `.superpowers/sdd/2026-09-23-exercise-progress/progress.md`. What the next session needs from them is copied above. If you need the rest, ask the owner to copy them over.

## Tier 3 backlog (`docs/research/ux-gap-analysis.md`)
- Warm-up set tag: warm-ups must be excluded from volume (finish sheet and `saveWorkoutHistory`) and from per-exercise progress (spec Q8 deferred this).
- Per-exercise rest time.
- Still open for the owner: #1 (template write-back), #6 (which tier is the 1.0 bar; mid-October target), #7 (lb units).

## Owner preferences
- Grilling rounds: lettered options per question with one ⭐ recommendation. The owner replies "A" or "all⭐".
- Native (inline) execution, not subagent-driven.

## Suggested skills
- `superpowers:systematic-debugging`: the notification-sound error and anything the device run finds.
- `superpowers:test-driven-development`: every fix.
- `superpowers:verification-before-completion`: before claiming the device run or the branch is done.
- `superpowers:finishing-a-development-branch`: push and PR once the device run is clean.
- `superpowers:brainstorming` + `mattpocock-skills:grilling`: when starting the warm-up tag.
- Not `claude-in-chrome`: drive the phone with adb over Bash.
