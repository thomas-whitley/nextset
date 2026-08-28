import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useURL } from 'expo-linking';
import { Eye, EyeOff, Lock } from 'lucide-react-native';
import { supabase } from '@/data/supabase-client';
import { parseAuthFragment } from '@/data/authLink';
import Colors from '@/constants/Colors';

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
          <Text style={styles.title}>Update Password</Text>
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
            <Text style={styles.inputLabel}>New Password</Text>
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
              >
                {showPassword ? (
                  <EyeOff size={20} color={Colors.light.textTertiary} />
                ) : (
                  <Eye size={20} color={Colors.light.textTertiary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Confirm New Password</Text>
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
          >
            <Text style={styles.updateButtonText}>
              {loading ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footerSection}>
          <TouchableOpacity onPress={() => router.push('/(auth)')}>
            <Text style={styles.footerLink}>Back to Sign In</Text>
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
    paddingHorizontal: 24,
    paddingTop: 60,
    justifyContent: 'space-between',
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
    marginBottom: 48,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Archivo-Medium',
    color: '#DC2626',
  },
  formSection: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.text,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputError: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  updateButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonText: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: '#FFFFFF',
  },
  footerSection: {
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerLink: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.primary,
  },
});