/**
 * One source of truth for how a person is named in the UI.
 *
 * Home, Profile and Settings each derived this independently, which is how
 * Settings came to show "T" while Profile showed "TH" for the same account,
 * and why the greeting read "Hello, thomaswhitley1535".
 *
 * `full_name` is written by edit-profile to the `profile` table and mirrored
 * into auth user metadata, which is what these read.
 */
type UserLike =
  | {
      email?: string | null;
      user_metadata?: { full_name?: string | null; username?: string | null } | null;
    }
  | null
  | undefined;

/** The name the person chose, or null if they never set one. */
export function fullNameOf(user: UserLike): string | null {
  const name = user?.user_metadata?.full_name?.trim();
  return name ? name : null;
}

/** The part of an email before the @, or null. */
function emailLocalPart(user: UserLike): string | null {
  const local = user?.email?.split('@')[0]?.trim();
  return local ? local : null;
}

/**
 * A label identifying the account — chosen name first, else the email local
 * part. Use where an identity must be shown (Profile header, Settings row).
 */
export function displayNameOf(user: UserLike, fallback = 'Your profile'): string {
  return fullNameOf(user) ?? emailLocalPart(user) ?? fallback;
}

/**
 * The Home greeting. Nobody wants to be called "thomaswhitley1535", and
 * signup collects no name, so with no chosen name we greet without one.
 */
export function greetingFor(user: UserLike): string {
  const name = fullNameOf(user);
  return name ? `Hello, ${name}` : 'Welcome back';
}

/** One or two letters for the avatar. */
export function initialsOf(user: UserLike): string {
  const source = fullNameOf(user) ?? emailLocalPart(user);
  if (!source) return '?';

  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
