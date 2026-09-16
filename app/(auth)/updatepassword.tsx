import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { supabase } from '@/data/supabase-client';
import { parseAuthFragment } from '@/data/authLink';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';

export default function UpdatePasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const params = useLocalSearchParams();
  const url = useURL();

  const accessParam = typeof params.access_token === 'string' ? params.access_token : undefined;
  const refreshParam = typeof params.refresh_token === 'string' ? params.refresh_token : undefined;

  useEffect(() => {
    // A valid recovery session can arrive either via the deep-link fragment
    // (native) or via Supabase auto-detecting the session in the URL (web).
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        settled = true;
        setSessionReady(true);
        setSessionError(false);
      }
    });

    const establishSession = async () => {
      const fragment = parseAuthFragment(url);

      // Only Supabase saying so makes "expired" the truth; anything else is
      // us failing to read the link, which must not be reported as expiry.
      if (fragment.error || fragment.error_code) {
        settled = true;
        setError(fragment.error_description || null);
        setSessionError(true);
        return;
      }

      const access_token = fragment.access_token ?? accessParam;
      const refresh_token = fragment.refresh_token ?? refreshParam;

      if (typeof access_token !== 'string' || typeof refresh_token !== 'string') {
        // Nothing actionable yet: the deep-link URL can land a tick after
        // mount, and on web the auto-detect listener fires instead.
        timer = setTimeout(() => {
          if (!settled) {
            setSessionError(true);
          }
        }, 2500);
        return;
      }

      const { error: establishError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (establishError) {
        console.error('Failed to establish recovery session:', establishError);
        settled = true;
        setSessionError(true);
        return;
      }

      settled = true;
      setSessionReady(true);
    };

    establishSession();

    return () => {
      if (timer) clearTimeout(timer);
      authListener.subscription.unsubscribe();
    };
  }, [accessParam, refreshParam, url]);

  const validateForm = () => {
    if (!password) {
      setError('Please enter a new password');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleUpdatePassword = async () => {
    if (!sessionReady) {
      setError('This reset link is invalid or has expired. Please request a new one.');
      return;
    }
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Password update error:', error);
        setError('Failed to update password. Please try again.');
      } else {
        Alert.alert(
          'Password Updated',
          'Your password has been successfully updated. You can now sign in with your new password.',
          [
            {
              text: 'OK',
              onPress: () => router.push('/(auth)'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.icon}>
            <Lock size={48} color={Colors.light.primary} />
          </View>
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title}>Update password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below. Make sure it's secure and easy for you to remember.
          </Text>
        </View>

        {(error || sessionError) && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error || 'This reset link is invalid or has expired. Please request a new one.'}
            </Text>
          </View>
        )}

        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>New password</Text>
            <View style={[styles.passwordContainer, error && error.includes('Password') && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (error) setError(null);
                }}
                placeholder="Enter new password"
                placeholderTextColor={Colors.light.textTertiary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.light.textTertiary} />
                ) : (
                  <Eye size={20} color={Colors.light.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>At least 6 characters</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm new password</Text>
            <View style={[styles.passwordContainer, error && error.includes('match') && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (error) setError(null);
                }}
                placeholder="Confirm new password"
                placeholderTextColor={Colors.light.textTertiary}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleUpdatePassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={Colors.light.textTertiary} />
                ) : (
                  <Eye size={20} color={Colors.light.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.updateButton, (loading || !sessionReady) && styles.updateButtonDisabled]}
            onPress={handleUpdatePassword}
            disabled={loading || !sessionReady}
            accessibilityRole="button"
          >
            <Text style={styles.updateButtonText}>
              {loading ? 'Updating...' : 'Update password'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerSection}>
          <TouchableOpacity onPress={() => router.push('/(auth)')} hitSlop={HIT_SLOP} accessibilityRole="button">
            <Text style={styles.footerLink}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: spacing.xxxl,
    justifyContent: 'space-between',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleSection: {
    marginBottom: spacing.xxxl,
    alignItems: 'center',
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
    paddingHorizontal: spacing.lg,
  },
  errorContainer: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.error,
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  errorText: {
    ...type.label,
    color: Colors.light.error,
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  inputLabel: {
    ...type.eyebrow,
    color: Colors.light.textTertiary,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  helperText: {
    ...type.label,
    color: Colors.light.textTertiary,
    marginTop: spacing.sm,
    marginLeft: spacing.xs,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  passwordInput: {
    ...type.body,
    flex: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + spacing.xs / 2,
    color: Colors.light.text,
  },
  eyeButton: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  updateButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: radius.input,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.base,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    ...type.bodyMedium,
    color: Colors.light.card,
  },
  footerSection: {
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
  footerLink: {
    ...type.bodyMedium,
    color: Colors.light.primary,
  },
});
