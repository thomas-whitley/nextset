import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { MailCheck } from 'lucide-react-native';
import { supabase } from '@/data/supabase-client';
import { parseAuthFragment } from '@/data/authLink';
import Colors from '@/constants/Colors';

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
          <View style={styles.iconContainer}>
            <View style={styles.icon}>
              <MailCheck size={48} color={Colors.light.primary} />
            </View>
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Link Invalid or Expired</Text>
            <Text style={styles.subtitle}>{errorMessage}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={() => router.replace('/(auth)')}>
            <Text style={styles.buttonText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <Text style={styles.verifyingText}>Verifying your email...</Text>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  button: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});
