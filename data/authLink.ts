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
