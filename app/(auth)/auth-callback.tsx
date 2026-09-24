import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useURL } from 'expo-linking';
import { CircleAlert } from 'lucide-react-native';
import { supabase } from '@/data/supabase-client';
import { parseAuthFragment, sessionFromAuthFragment } from '@/data/authLink';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';

const DEFAULT_ERROR = "Google sign-in didn't finish. Go back and try again.";

/**
 * Where Google sign-in lands: `momentum://auth-callback#access_token=…`.
 *
 * This screen is the only place that turns the redirect into a session. On
 * Android expo-router receives the deep link as well as the
 * `openAuthSessionAsync` promise in GoogleSignInButton, which deliberately
 * ignores the URL so the tokens are exchanged once. On web
 * `detectSessionInUrl` sets the session and this screen waits for SIGNED_IN.
 * Once a session exists the root layout's guard swaps to the tabs.
 */
export default function AuthCallbackScreen() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const url = useURL();

  useEffect(() => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fail = (message: string) => {
      settled = true;
      setErrorMessage(message);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        settled = true;
        setErrorMessage(null);
      }
    });

    const establishSession = async () => {
      const result = await sessionFromAuthFragment(parseAuthFragment(url), (tokens) =>
        supabase.auth.setSession(tokens),
      );

      switch (result.kind) {
        case 'session':
          settled = true;
          return;
        case 'link-error':
          fail(result.description || DEFAULT_ERROR);
          return;
        case 'failed':
          console.error('Failed to establish the Google sign-in session');
          fail(DEFAULT_ERROR);
          return;
        case 'no-tokens':
          timer = setTimeout(() => {
            if (!settled) fail(DEFAULT_ERROR);
          }, 2500);
      }
    };

    establishSession();

    return () => {
      if (timer) clearTimeout(timer);
      authListener.subscription.unsubscribe();
    };
  }, [url]);

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.icon}>
              <CircleAlert size={40} color={Colors.light.error} />
            </View>

            <Text style={styles.title}>Couldn&apos;t sign in with Google</Text>
            <Text style={styles.subtitle}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.button}
              hitSlop={HIT_SLOP}
              onPress={() => router.replace('/(auth)')}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Back to log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.verifyingText}>Signing you in…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...type.title,
    color: Colors.light.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...type.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  verifyingText: {
    ...type.bodyMedium,
    color: Colors.light.textTertiary,
    marginTop: spacing.base,
  },
  button: {
    alignSelf: 'stretch',
    backgroundColor: Colors.light.primary,
    borderRadius: radius.input,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonText: {
    ...type.bodyMedium,
    color: Colors.light.card,
  },
});
