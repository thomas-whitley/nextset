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

**Momentum** is an offline-first React Native fitness app built with Expo Router v5, React 19, TypeScript, Supabase (auth + cloud backend), and `expo-sqlite` (local storage).

### Routing

Expo Router file-based routing under `app/`:
- `app/(auth)/` — unauthenticated flow: welcome, login, signup, forgot/update password
- `app/(tabs)/` — main tab bar: home (`index`), programs, progress, profile
- Modal screens at root: `workout`, `timer-main`, `program-detail`, `create-program`, `settings`, `edit-profile`, `aboutus`

Auth gating is in `app/_layout.tsx` via `AppNavigator`: if `session` is null, only `(auth)` screens are mounted; otherwise `(tabs)` and modal screens.

### Initialization sequence (`app/_layout.tsx`)

1. Fonts loaded via `@expo-google-fonts/inter`
2. `initializeLocalDatabase()` creates/migrates the SQLite DB (`momentum_fitness.db`)
3. `SplashScreen` hidden once both complete
4. `AuthProvider` wraps `AppNavigator`, which reads Supabase session state

### Data layer

**Two storage tiers:**

| Layer | Location | Purpose |
|-------|----------|---------|
| Local SQLite | `services/localDatabase.ts` | Offline-first workout recording; rows marked `needs_sync = 1` |
| Supabase | `data/supabase-dal.ts` | Cloud persistence, auth, profiles, timer presets |

`services/syncService.ts` pushes local rows to Supabase `workout_log`. All sync paths currently short-circuit on web (`if (true) return`) — sync only runs natively over Wi-Fi.

**Supabase tables** (defined in `supabase/migrations/0001_initial_schema.sql`):
- `profile` — mirrors `auth.users`; auto-created by DB trigger on signup; `role` enum: `user | admin | super_admin`
- `user_active_programs` — user's chosen program stored as JSONB (`program_data`)
- `workout_history` — completed workout records as JSONB
- `exercise_log` — per-session exercise log as JSONB
- `timer_presets` — interval timer configs, public or user-private

All tables have RLS; users can only access their own rows. `timer_presets` also allows SELECT of `is_public = true` rows.

**Exercise library** lives in `services/exercise.database.json` (bundled static JSON). `ExerciseService` (`services/exerciseService.ts`) also queries a Supabase `exercises` table for master exercises (`user_id IS NULL`) and user-custom exercises.

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
- **`updateWorkoutSession`** (`services/localDatabase.ts:254`) only writes fields listed in `WORKOUT_SESSION_UPDATABLE_FIELDS`; anything else passed in `updates` is silently dropped rather than erroring.
- **Use `hooks/useLocalDatabase.ts` in components**, not the service functions directly. The hook manages initialization state, auth binding, and sync triggers.
