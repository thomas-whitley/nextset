import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { MailCheck } from 'lucide-react-native';
import { supabase } from '@/data/supabase-client';
import { parseAuthFragment } from '@/data/authLink';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';

const DEFAULT_ERROR =
  'This confirmation link is invalid or has already been used. Please sign in, or request a new confirmation email.';

export default function ConfirmEmailScreen() {
  const [sessionError, setSessionError] = useState(false);
  const [errorMessage, setErrorMessage] = useState(DEFAULT_ERROR);
  const params = useLocalSearchParams();
  const url = useURL();

  const accessParam = typeof params.access_token === 'string' ? params.access_token : undefined;
  const refreshParam = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;

  useEffect(() => {
    // A confirmed session can arrive either via the deep-link fragment
    // (native) or via Supabase auto-detecting the session in the URL (web).
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const fail = (message: string) => {
      settled = true;
      setErrorMessage(message);
      setSessionError(true);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        settled = true;
        setSessionError(false);
      }
    });

    const establishSession = async () => {
      const fragment = parseAuthFragment(url);

      // Only Supabase saying so makes "expired" the truth; anything else is
      // us failing to read the link, which must not be reported as expiry.
      if (fragment.error || fragment.error_code) {
        fail(fragment.error_description || DEFAULT_ERROR);
        return;
      }

      const access_token = fragment.access_token ?? accessParam;
      const refresh_token = fragment.refresh_token ?? refreshParam;

      if (typeof access_token !== 'string' || typeof refresh_token !== 'string') {
        // Nothing actionable yet: the deep-link URL can land a tick after
        // mount, and on web the auto-detect listener fires instead.
        timer = setTimeout(() => {
          if (!settled) {
            setErrorMessage(DEFAULT_ERROR);
            setSessionError(true);
          }
        }, 2500);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        console.error('Failed to establish confirmation session:', error);
        fail(DEFAULT_ERROR);
        return;
      }

      settled = true;
    };

    establishSession();

    return () => {
      if (timer) clearTimeout(timer);
      authListener.subscription.unsubscribe();
    };
  }, [accessParam, refreshParam, url]);

  if (sessionError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.icon}>
              <MailCheck size={40} color={Colors.light.error} />
            </View>

            <Text style={styles.eyebrow}>Email confirmation</Text>
            <Text style={styles.title}>Link invalid or expired</Text>
            <Text style={styles.subtitle}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.button}
              hitSlop={HIT_SLOP}
              onPress={() => router.replace('/(auth)')}
              accessibilityRole="button"
            >
              <Text style={styles.buttonText}>Back to sign in</Text>
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
        <Text style={styles.verifyingText}>Verifying your email…</Text>
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
  eyebrow: {
    ...type.eyebrow,
    color: Colors.light.textTertiary,
    marginBottom: spacing.xs,
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
