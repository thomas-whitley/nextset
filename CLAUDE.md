# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Expo dev server (telemetry disabled)
npm run start        # Start Expo dev server
npm run lint         # Run Expo linter
npm test             # jest (jest-expo preset); suites under **/__tests__/
npx supabase db push --dry-run   # preview pending migrations (user-only; then without --dry-run)
npm run build:web    # Export for web
eas build --profile development   # Dev client build (iOS/Android)
eas build --profile preview       # Internal preview build
eas build --profile production    # Production build (auto-increments version)
```

Tests: jest via `jest-expo` (`npm test`). CI (`.github/workflows/ci.yml`) runs lint, tsc and jest on push to main and on PRs. Test files: `services/__tests__/*.test.ts`, `contexts/__tests__/*.test.tsx`, `components/__tests__/*.test.tsx`; `jest.setup.ts` mocks AsyncStorage, NetInfo, expo-notifications, gesture-handler and Reanimated/worklets.

## Architecture

**NextSet** (package/slug still `momentum-gym-tracker`) is a React Native gym-logging app built with Expo SDK 57 (React Native 0.86, React 19.2, Expo Router 57), TypeScript and Supabase (auth + persistence).

**It is online-only.** There is no local SQLite tier — `expo-sqlite`, `services/localDatabase.ts`, `services/syncService.ts` and `hooks/useLocalDatabase.ts` were all removed in commit `70ff718` ("Remove non-functional offline-first layer, go online-only"). Do not write code against them. The one piece of offline behaviour that does exist is an **in-progress workout checkpoint in AsyncStorage** (`contexts/WorkoutContext.tsx`), keyed per user and restored on launch, so a session survives an app restart. Finishing a workout requires a connection; on failure the checkpoint is deliberately kept so the user can retry.

### Routing

Expo Router file-based routing under `app/`:
- `app/(auth)/` — unauthenticated flow: login (`index`), signup, confirm, forgot/update password, `auth-callback` (where Google sign-in lands). There is no `welcome` screen; login is the entry point.
- `app/(tabs)/` — main tab bar: home (`index`), programs, progress, profile
- Modal screens at root: `workout`, `program-detail` (the day editor, `/program-detail?day=<workoutId>`), `workout-detail` (a saved workout, read-only, `/workout-detail?id=<historyId>`), `settings`, `edit-profile`, `aboutus`, `help-faq`. `/timer` (the standalone interval timer) was deleted 2026-09 (spec D2); the rest timer inside `workout.tsx` is the only timer now.

Every file under `app/` becomes a route, so an orphaned screen still ships as a reachable page — `app/-settings.tsx` did exactly that, exposing controls that had been removed elsewhere. Delete dead screens, don't just unlink them.

Auth gating is in `app/_layout.tsx` via `AppNavigator`: if `session` is null, only `(auth)` screens are mounted; otherwise `(tabs)` and modal screens.

### Initialization sequence (`app/_layout.tsx`)

1. Fonts loaded via `@expo-google-fonts/inter`
2. `SplashScreen` hidden once fonts are ready
3. `AuthProvider` wraps `AppNavigator`, which reads Supabase session state

### Data layer

Supabase is the only persistence tier. Reads and writes go through the services in `services/`:

| Concern | Location |
|---|---|
| Finished workouts + progress stats | `services/workoutHistoryService.ts` |
| Active program | `services/userActiveProgramService.ts` |
| Exercise library (bundled, local) | `services/exerciseService.ts` |
| Preferences: rest time + bar weight (AsyncStorage cache, mirrored to `profile.preferences`; server wins on sign-in) | `services/preferences.ts` |
| Debounced program sync (≈800 ms, flushed on set complete / blur / finish / app background) | `services/programSync.ts` |
| Pure program/day edits, blank-program ids (`blank-…`), name cleaning (pure, tested) | `services/programEdits.ts` |
| Up next (skips quick workouts), quick-workout name (pure, tested) | `services/upNext.ts` |
| Program picker lists: your copies + templates not yet started (pure, tested) | `services/programChoices.ts` |
| History row / workout-detail data from a saved workout (pure, tested) | `services/historySummary.ts` |
| Start guard for every Start / Quick workout button | `hooks/useStartWorkout.ts` |
| Streak maths (pure, tested) | `services/stats.ts` |
| PR maths: best weight / e1RM per exercise, PR detection (pure, tested) | `services/prMath.ts` |
| Rest timer state (reducer, pure, tested) | `services/restTimer.ts` |
| Rest-over local notification (asks permission once) | `services/restNotifications.ts` |
| Per-exercise reps target (ghost text, backfill from templates) | `services/repsTarget.ts` |
| Weight/rep keyboard-bar step sizes and bounds | `services/setSteps.ts` |
| Similar-exercise ranking (pure, tested) | `services/similarExercises.ts` |
| Muscle group → body map (pure, tested) | `services/muscleMap.ts` |
| Exercise card text (pure, tested) | `services/exerciseSummary.ts` |
| Undo-window filtering (pure, tested) | `services/pendingRemoval.ts` |

**Volume is computed from completed sets only** — both in the finish sheet and in `saveWorkoutHistory`. These two must never diverge; when they did, a single 60 kg × 6 session stored 1,245,613,856 kg.

**Supabase tables** (defined by the sum of `supabase/migrations/*.sql`, CLI timestamp-named; three tables after migration `20260917100100`):
- `profile` — mirrors `auth.users`; auto-created by DB trigger on signup; `role` enum: `user | admin | super_admin`; `preferences jsonb` (`{ defaultRestSeconds, barWeightKg }`); authenticated may UPDATE only `full_name, username, phone, avatar_url, updated_at, preferences`
- `user_active_programs` — user's editable copy of a template as JSONB (`program_data`); **unique per `(user_id, program_template_id)`**; `updated_at` set by trigger; a blank program is its own row with program_template_id = 'blank-<id>'
- `workout_history` — completed workout records as JSONB; `total_volume` must be `0 ≤ v < 10,000,000` (check constraint); index on `(user_id, completed_at desc)`

`exercise_log` and `timer_presets` were dropped in `20260917100100`. All tables have RLS; policies are `to authenticated` and use `(select auth.uid())`; `anon` has no table grants.

**Exercise library** is bundled and local: `services/exerciseLibrary.data.json` (887 rows, built by `scripts/exercises/build-library.mjs` from free-exercise-db, Unlicense). `ExerciseService` reads it directly — there is no Supabase `exercises` table in play, and user-custom exercises are parked until after 1.0.

### Context providers

Nested in `_layout.tsx` as: `AuthProvider > WorkoutProvider`

- `data/AuthContext.tsx` — `session`, `user`, `loading`, `signOut`, `refreshUser`; use `useAuth()`
- `contexts/WorkoutContext.tsx` — active program, current workout, exercise/set mutations; persists program state to `user_active_programs` via Supabase; use `useWorkout()`

### Path alias

`@/` maps to the project root (configured in `tsconfig.json`). Use `@/services/...`, `@/data/...`, etc.

### Environment

Requires `.env` with:
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Supabase client is initialized in `data/supabase-client.ts` and throws if either variable is missing.

## Gotchas

- **Dark mode is not implemented.** `Colors.ts` has a `dark` palette but every screen hardcodes `Colors.light.*`. `app.json` sets `userInterfaceStyle: "automatic"`, so don't assume dark mode is live — it isn't.
- **Auth links arrive in the URL *fragment***, not the query string — `momentum://confirm#access_token=…`. `useLocalSearchParams` cannot see a fragment; use `useLinkingURL()` from `expo-linking` (not `useURL()`, which returns the launch URL in a screen the link just mounted) with `parseAuthFragment` (`data/authLink.ts`). Getting this wrong makes every valid confirmation link report "expired".
- **`(auth)` is a route group**, so its screens live at `/confirm`, `/updatepassword` — *not* `/auth/confirm`. Deep links must not include the group name.
- **Never use `{someNumber && <View/>}` in JSX.** When the value is `0` the expression evaluates to `0` and React renders a literal "0"; on native this can throw *"Text strings must be rendered within a `<Text>` component"*. Compare explicitly: `{(x ?? 0) > 0 && …}`.
- **Set weight and reps are bounded** (`sanitiseSetValue` in `services/setSteps.ts`, alongside `stepValue`; 1000 kg / 100 reps). Out-of-range keystrokes are rejected, not truncated.
- **`npx expo start` fails on the dev VM** with `TypeError: fetch failed`; use `--offline`. A cold web bundle takes ~200s.
- **A migration in git is not a migration in production.** `0005` sat committed but unapplied for three weeks. After adding one, run `npx supabase migration list` and check the Remote column, or the repo lies about the live schema.
- **The Supabase Free project auto-pauses.** Symptom: the hostname stops resolving, the app shows the loading spinner ~30 s, then "Failed to fetch". Unpause in the dashboard; nothing in the code is wrong.
- **Auth is implicit flow on purpose** (Plan B, 2026-09-17). Don't set `flowType: 'pkce'` without redoing the confirm / update-password link handling.
- **Google sign-in is the browser flow, and `/auth-callback` alone sets the session** (spec `docs/specs/2026-09-24-google-sign-in.md`). On Android the `momentum://auth-callback#…` deep link reaches both the router and `openAuthSessionAsync`; `GoogleSignInButton` ignores the returned URL so the tokens are exchanged once. Any auth-link fragment goes through `sessionFromAuthFragment` (`data/authLink.ts`). Never log these URLs: the fragment holds the tokens. A Google account whose email matches a confirmed user signs into that user (Supabase auto-links); it does not create a second account.
- **Set edits are debounced to the cloud, checkpointed locally at once.** `contexts/WorkoutContext.tsx` mutations read `currentWorkoutRef`, never the render closure; cloud writes go through `services/programSync.ts`. Call `flushProgramSync()` before anything that must see the latest program on the server.
- **Rest notifications need a dev-client build.** `expo-notifications` is not in Expo Go; the banner works everywhere, the lock-screen alert only on a dev/preview build.
- **Templates no longer prefill reps.** The target is `exercise.repsTarget` shown as ghost text; `set.reps` starts empty.
- **Do not import `@react-navigation/*` in app code.** expo-router 56+ removed the dependency; use `expo-router/js-tabs` (bottom tabs, `BottomTabBar`) or `expo-router/react-navigation`. The Android bundle fails to export otherwise.
- **Android is edge-to-edge and cannot be disabled (SDK 54+).** Anything anchored to the bottom must add `useSafeAreaInsets().bottom`; every `SafeAreaView` in the app is `edges={['top']}` on purpose. Pattern: `app/(tabs)/_layout.tsx`, `components/gestures/DragDismissSheet.tsx`, the undo snackbar in `app/workout.tsx`.
- **`expo-file-system` is on the `File`/`Paths` API (SDK 54+).** The old functions live at `expo-file-system/legacy`; don't add new callers. Only `services/csvExport.ts` writes files.
- **eslint-config-expo 57 ships the React Compiler hook rules.** They are switched off in `eslint.config.js` because they flag Reanimated `.value` writes and existing effects; the two classic hooks rules still run. Re-enable one at a time if wanted.
- **Touch and type floors (redesign, 2026-09).** Visible tap size ≥ `touch.min` (48) and set rows ≥ `touch.row` (56) from `constants/theme.ts`; `HIT_SLOP` is extra, not a way to reach 48. No text below 13pt, tappable text ≥ 15pt. `type.eyebrow` is now a 15pt sentence-case section label — never uppercase.
- **Folded exercises are session-only.** `Workout.collapsedExerciseIds` lives in the AsyncStorage checkpoint and is stripped in `applyWorkoutUpdate` like `startedAt`; never let it reach `program_data`. Folding goes through `setExerciseCollapsed`, which deliberately skips the cloud write.
- **Anything that counts sets or volume goes through `withoutPending`** (`services/pendingRemoval.ts`): an exercise or a set inside its 4 s undo window must be gone from the finish sheet and the saved workout alike.
- **No card-level swipe on the workout screen.** Set rows swipe to remove; nesting a second horizontal swipe on the card conflicts. Exercise removal is in the `⋯` sheet.
- **`@testing-library/react-native` 14 is async.** `render` and every `fireEvent.*` return a Promise — `await` them. An unawaited `fireEvent` leaves an act open and the *next* test in the file renders `null`.
- **Every write to `user_active_programs.program_data` goes through `programSync`** (`applyProgramUpdate` / `applyWorkoutUpdate` in `WorkoutContext`). `UserActiveProgramService` no longer has fetch-modify-write helpers. They raced the debounced write and lost edits. Structural edits flush at once; set count and reps target are debounced.
- **Switching program flushes first and refuses if the flush fails** (`settleBeforeSwitch`). The sync writes to whatever row is current *when it fires*, so a pending edit left behind would land on the next program.
- **`updated_at` is set by a trigger and defines the current program.** Writing any row makes it the one the app reopens on launch. That is why only the current program can be renamed.
- **Quick workouts (`Workout.isQuick`) never touch `program_data`.** `applyWorkoutUpdate` returns after the checkpoint. The saved `workout_data` keeps `isQuick`, and `pickNextWorkout` skips it.
- **The day editor guards every exit with `beforeRemove`** (X, Android back, iOS swipe-down): it flushes, and stays open with "Not saved yet" if `hasPendingProgramWrite()`. The running day is read-only (`isDayLocked`).
- **Start buttons go through `useStartWorkout`.** Calling `startWorkout` directly over a minimised workout discards its sets.
- **Screen tests need the safe-area mock.** There is no `SafeAreaProvider` in a unit render and `useSafeAreaInsets` throws; add `jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default)` (see `app/__tests__/program-detail.test.tsx`). A new route also needs `expo start` once before local `tsc` accepts it in `router.push`: typed routes live in the gitignored `.expo/types/router.d.ts`.
