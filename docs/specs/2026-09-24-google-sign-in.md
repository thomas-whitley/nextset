# Google sign-in

Date: 2026-09-24 · Branch `feat/google-sign-in` (off `main`, with `000f7cc` cherry-picked for the EAS owner) · PR → `main`

## Goal

"Continue with Google" on the login and signup screens. For a Google account whose email matches no existing
confirmed user, this creates a new NextSet user. The immediate use is a fresh test account for the Tier 3 device run
and PR #9's A4 check.

## Decisions

| # | Decision |
|---|---|
| Flow | Browser OAuth. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } })`, then `WebBrowser.openAuthSessionAsync(url, redirectTo)`. The implicit flow is unchanged (no PKCE). Adds `expo-web-browser`, a native module, so a **new dev-client build** is needed. |
| Redirect | Native: `momentum://auth-callback`. Web: `${window.location.origin}/auth-callback`. |
| Session owner | The new route `app/(auth)/auth-callback.tsx` is the only place that calls `setSession`. On Android, expo-router receives the deep link as well as the `openAuthSessionAsync` promise, so there is exactly one owner and no double exchange. The login/signup button ignores the returned URL. On web, `detectSessionInUrl` establishes the session and the screen waits for `SIGNED_IN`. |
| Shared helper | The fragment → `setSession` logic moves from `confirm.tsx` into a tested helper in `data/authLink.ts`, which both screens use. |
| Cancel | `cancel` / `dismiss` from the browser: the spinner turns off and no error is shown. |
| Account linking | Supabase links automatically on a matching verified email. The test account is a **different** Google account. |
| UI | A white, outlined button, ≥ 48 dp (`touch.min`), with the multicolour Google "G" (inline `react-native-svg`) and the label "Continue with Google", above the email form with an "or" divider. Same component on login and signup. |
| Profile | No prefill and no migration: a Google user starts like an email user (the trigger inserts `id, email`). |
| Logging | A separate commit first removes the login path's `console.log` of the sign-in response (it contained access and refresh tokens) and the other chatty logs. The new code never logs URLs, because the fragment carries the tokens. |
| Consent screen | Google Cloud project `nextset-509606`, External, app name "NextSet", scopes `openid email profile`, no logo. **Still in Testing** (set up 2026-09-24): Google won't publish until the Branding page is complete (home page and privacy policy links), so only listed test users can sign in. Publish once those links exist; the Supabase site URL already points at a `nextset-legal` page. The chooser shows "to continue to rfyucjisdtpukabqhohc.supabase.co" until a custom domain is set up. |

## Owner steps (outside the code)

Steps 1–3 were done on 2026-09-24 (the Web client is "NextSet Supabase", one test user is added, and `momentum://auth-callback` is in the allow-list).

1. Google Cloud: set up the consent screen as above, then create an OAuth client of type **Web application** with the
   authorised redirect URI `https://rfyucjisdtpukabqhohc.supabase.co/auth/v1/callback`.
2. Supabase → Auth → Providers → Google: add the client ID and secret, then enable.
3. Supabase → Auth → URL Configuration → Redirect URLs: add `momentum://auth-callback` (and `<web origin>/auth-callback`).
4. `eas build --profile development`, then install the build.

## Tests

- `data/__tests__/authLink.test.ts`: the session helper handles tokens, an error fragment and a missing fragment.
- `components/__tests__/GoogleSignInButton.test.tsx`: it calls `signInWithOAuth` with the redirect and `skipBrowserRedirect`, then opens the browser. Cancel shows no error. An OAuth error shows a message.
- `app/__tests__/auth-callback.test.tsx`: tokens → `setSession`. An error fragment → the error view. No tokens → the error view after the timeout.

## Out of scope

The native Google sheet (`@react-native-google-signin`), iOS, prefilling the profile, a custom auth domain, and
linking or unlinking Google in Settings.
