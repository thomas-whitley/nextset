/**
 * Supabase hands auth results back in the URL *fragment* — e.g.
 * `momentum://confirm#access_token=...&refresh_token=...`, or
 * `momentum://updatepassword#error=access_denied&error_code=otp_expired`.
 *
 * expo-router's `useLocalSearchParams` only parses the query string, so a
 * fragment is invisible to it. Screens handling an emailed auth link must
 * read the raw deep-link URL (via `useURL()` from expo-linking) and pull the
 * values out with `parseAuthFragment`, or the tokens never arrive on native
 * and the link looks expired when it is perfectly valid.
 */
export type AuthFragment = {
  access_token?: string;
  refresh_token?: string;
  error?: string;
  error_code?: string;
  error_description?: string;
  [key: string]: string | undefined;
};

export function parseAuthFragment(url: string | null): AuthFragment {
  const hashIndex = url ? url.indexOf('#') : -1;
  if (!url || hashIndex === -1) return {};

  const parsed: AuthFragment = {};
  for (const pair of url.slice(hashIndex + 1).split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const rawKey = eq === -1 ? pair : pair.slice(0, eq);
    const rawValue = eq === -1 ? '' : pair.slice(eq + 1);
    parsed[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
  }
  return parsed;
}

export type AuthLinkResult =
  | { kind: 'session' }
  /** Supabase itself put an error in the link: the only case that may be called "expired". */
  | { kind: 'link-error'; description?: string }
  /** No tokens yet: the deep link can land a tick after mount, and on web the auto-detect listener fires instead. */
  | { kind: 'no-tokens' }
  | { kind: 'failed' };

type SetSession = (tokens: { access_token: string; refresh_token: string }) => Promise<{ error: unknown }>;

/**
 * Turns an auth-link fragment into a session. Shared by every screen an auth
 * redirect lands on (email confirmation, Google sign-in), so there is one
 * place that decides what the fragment means.
 */
export async function sessionFromAuthFragment(
  fragment: AuthFragment,
  setSession: SetSession,
): Promise<AuthLinkResult> {
  if (fragment.error || fragment.error_code) {
    return { kind: 'link-error', description: fragment.error_description };
  }

  const { access_token, refresh_token } = fragment;
  if (!access_token || !refresh_token) return { kind: 'no-tokens' };

  const { error } = await setSession({ access_token, refresh_token });
  return error ? { kind: 'failed' } : { kind: 'session' };
}
