# NextSet

Training tracker for Android, in closed testing on Google Play. React Native, TypeScript and Expo on Supabase (PostgreSQL and Auth).

## What it does

- Log sessions against program templates, with plates and timed exercises handled in the UI.
- 887 exercises bundled for offline search: 40 curated with coaching cues, the rest from free-exercise-db (yuhonas/free-exercise-db, Unlicense), merged by `scripts/exercises/build-library.mjs` with stable ids between builds.
- Account flows on Supabase Auth: sign up, email confirmation, forgot and update password.
- CSV export of workout history.

## How it is built

- Expo Router app in TypeScript; EAS builds for the Play Store.
- Supabase Postgres with row level security. Migrations in `supabase/migrations/`: initial schema, a trigger that creates a profile row on sign up, and update and delete policies for workout history.
- Brand assets rendered from source by `scripts/brand/render.mjs`; `node --test` suites cover the brand renderer and plate calculations (`npm run test:brand`, `npm run test:plates`).
- Store listing, privacy policy and account deletion pages live in `room12loading/nextset-legal`.

## Run it

```sh
npm install
cp .env.example .env    # Supabase URL and anon key
npx expo start
```
