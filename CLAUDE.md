# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Expo dev server (telemetry disabled)
npm run start        # Start Expo dev server
npm run lint         # Run Expo linter
npm run build:web    # Export for web
eas build --profile development   # Dev client build (iOS/Android)
eas build --profile preview       # Internal preview build
eas build --profile production    # Production build (auto-increments version)
```

There is no test suite configured.

## Architecture

**NextSet** (package/slug still `momentum-gym-tracker`) is a React Native gym-logging app built with Expo Router v5, React 19, TypeScript and Supabase (auth + persistence).

**It is online-only.** There is no local SQLite tier — `expo-sqlite`, `services/localDatabase.ts`, `services/syncService.ts` and `hooks/useLocalDatabase.ts` were all removed in commit `70ff718` ("Remove non-functional offline-first layer, go online-only"). Do not write code against them. The one piece of offline behaviour that does exist is an **in-progress workout checkpoint in AsyncStorage** (`contexts/WorkoutContext.tsx`), keyed per user and restored on launch, so a session survives an app restart. Finishing a workout requires a connection; on failure the checkpoint is deliberately kept so the user can retry.

### Routing

Expo Router file-based routing under `app/`:
- `app/(auth)/` — unauthenticated flow: login (`index`), signup, confirm, forgot/update password. There is no `welcome` screen; login is the entry point.
- `app/(tabs)/` — main tab bar: home (`index`), programs, progress, profile
- Modal screens at root: `workout`, `timer-main`, `program-detail`, `settings`, `edit-profile`, `aboutus`, `help-faq`

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
| Timer presets | `services/timerPresetService.ts` |
| Rest-time preference (AsyncStorage) | `services/preferences.ts` |

**Volume is computed from completed sets only** — both in the finish sheet and in `saveWorkoutHistory`. These two must never diverge; when they did, a single 60 kg × 6 session stored 1,245,613,856 kg.

**Supabase tables** (defined in `supabase/migrations/0001_initial_schema.sql`):
- `profile` — mirrors `auth.users`; auto-created by DB trigger on signup; `role` enum: `user | admin | super_admin`
- `user_active_programs` — user's chosen program stored as JSONB (`program_data`)
- `workout_history` — completed workout records as JSONB
- `exercise_log` — per-session exercise log as JSONB (legacy; not written by the current app)
- `timer_presets` — interval timer configs, public or user-private

All tables have RLS; users can only access their own rows. `timer_presets` also allows SELECT of `is_public = true` rows.

**Exercise library** is bundled and local: `services/exerciseLibrary.data.json` (887 rows, built by `scripts/exercises/build-library.mjs` from free-exercise-db, Unlicense). `ExerciseService` reads it directly — there is no Supabase `exercises` table in play, and user-custom exercises are parked until after 1.0.

### Context providers

Nested in `_layout.tsx` as: `AuthProvider > TimerProvider > WorkoutProvider`

- `data/AuthContext.tsx` — `session`, `user`, `loading`, `signOut`, `refreshUser`; use `useAuth()`
- `contexts/TimerContext.tsx` — stopwatch/countdown/interval timer state; use `useTimer()`
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
- **Auth links arrive in the URL *fragment***, not the query string — `momentum://confirm#access_token=…`. `useLocalSearchParams` cannot see a fragment; use `useURL()` from `expo-linking` with `parseAuthFragment` (`data/authLink.ts`). Getting this wrong makes every valid confirmation link report "expired".
- **`(auth)` is a route group**, so its screens live at `/confirm`, `/updatepassword` — *not* `/auth/confirm`. Deep links must not include the group name.
- **Never use `{someNumber && <View/>}` in JSX.** When the value is `0` the expression evaluates to `0` and React renders a literal "0"; on native this can throw *"Text strings must be rendered within a `<Text>` component"*. Compare explicitly: `{(x ?? 0) > 0 && …}`.
- **Set weight and reps are bounded** (`sanitiseSetValue` in `app/workout.tsx`, 1000 kg / 100 reps). Out-of-range keystrokes are rejected, not truncated.
- **`npx expo start` fails on the dev VM** with `TypeError: fetch failed`; use `--offline`. A cold web bundle takes ~200s.
- **Use `hooks/useLocalDatabase.ts` in components**, not the service functions directly. The hook manages initialization state, auth binding, and sync triggers.
