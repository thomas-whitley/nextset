import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/data/supabase-client';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';

const START_ERROR = "Couldn't start Google sign-in. Check your connection and try again.";

// `(auth)` is a route group, so the path is /auth-callback. That route owns
// the session; see app/(auth)/auth-callback.tsx.
const NATIVE_REDIRECT = 'momentum://auth-callback';

/**
 * "Continue with Google": sign-in and sign-up are the same action for a
 * Google account, so login and signup show the same button.
 *
 * The browser's return URL carries the tokens, but it is ignored here on
 * purpose. On Android the router receives the same deep link and mounts
 * /auth-callback, which sets the session; doing it here too would exchange
 * the tokens twice. Never log that URL.
 */
export default function GoogleSignInButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePress = async () => {
    setBusy(true);
    setError(null);

    try {
      if (Platform.OS === 'web') {
        // A full-page redirect; detectSessionInUrl picks the session up on /auth-callback.
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/auth-callback`,
            queryParams: { prompt: 'select_account' },
          },
        });
        if (oauthError) throw oauthError;
        return;
      }

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: NATIVE_REDIRECT,
          skipBrowserRedirect: true,
          // Otherwise the browser silently reuses the last Google account.
          queryParams: { prompt: 'select_account' },
        },
      });
      if (oauthError || !data.url) throw oauthError ?? new Error('No authorize URL');

      // 'cancel' / 'dismiss' just mean the user closed the browser.
      await WebBrowser.openAuthSessionAsync(data.url, NATIVE_REDIRECT);
    } catch (e) {
      console.error('Google sign-in failed to start:', e instanceof Error ? e.message : 'unknown error');
      setError(START_ERROR);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.button, busy && styles.buttonBusy]}
        onPress={handlePress}
        disabled={busy}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: busy }}
      >
        {busy ? (
          <ActivityIndicator color={Colors.light.textSecondary} />
        ) : (
          <>
            <GoogleMark />
            <Text style={styles.label}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

/** Google's standard multicolour "G". Brand rules: don't recolour it. */
function GoogleMark() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48" accessibilityElementsHidden importantForAccessibility="no">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: touch.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  buttonBusy: {
    opacity: 0.7,
  },
  label: {
    ...type.bodyMedium,
    color: Colors.light.text,
  },
  error: {
    ...type.label,
    color: Colors.light.error,
    marginTop: spacing.sm,
  },
});
