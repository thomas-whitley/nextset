import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import { supabase } from '@/data/supabase-client';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch, HIT_SLOP } from '@/constants/theme';
import { useAuth } from '@/data/AuthContext';
import Wordmark from '@/components/Wordmark';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResendEmail, setShowResendEmail] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState(false);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  const { user, loading: authLoading } = useAuth();

  // Redirect once authenticated
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/(tabs)');
    }
  }, [authLoading, user]);

  // Resend cooldown timer
  useEffect(() => {
    let interval: any;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [resendCooldown]);

  // Auto-hide resend success message
  useEffect(() => {
    if (resendSuccess) {
      const timeout = setTimeout(() => {
        setResendSuccess(false);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [resendSuccess]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.password) {
      setError('Please enter your password');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Starting login process...');
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      console.log('Login response:', { data, error: loginError });

      if (loginError) {
        console.error('Login error:', loginError);

        // Handle specific error cases
        if (loginError.message.includes('Invalid login credentials') ||
            loginError.message.includes('invalid credentials') ||
            loginError.message.includes('Invalid email or password')) {
          setError('Invalid email or password. Please check your credentials and try again.');
          return;
        }

        if (loginError.message.includes('Email not confirmed')) {
          setError('Please check your email and click the confirmation link before signing in.');
          setShowResendEmail(true);
          return;
        }

        if (loginError.message.includes('Too many requests')) {
          setError('Too many login attempts. Please wait a moment before trying again.');
          return;
        }

        if (loginError.message.includes('Invalid email')) {
          setError('Please enter a valid email address');
          return;
        }

        // Generic error handling
        setError(loginError.message || 'Failed to sign in. Please try again.');
        return;
      }

      if (data.user && data.session) {
        // Successfully logged in - navigation will be handled by auth state change
        console.log('Login successful');
        // The AuthProvider will handle navigation automatically
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignUp = () => {
    router.push('/(auth)/signup');
  };

  const navigateToForgotPassword = () => {
    router.push('/(auth)/forgotpassword');
  };

  const handleResendConfirmation = async () => {
    if (!formData.email.trim()) {
      setError('Please enter your email address first');
      return;
    }

    if (resendCooldown > 0) {
      return;
    }

    setResendLoading(true);
    setError(null);
    setResendSuccess(false);

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim(),
        options: {
          // `(auth)` is a route group, so the path is /confirm, not
          // /auth/confirm — the latter matches no route at all.
          emailRedirectTo: 'momentum://confirm',
        },
      });

      if (error) {
        console.error('Resend confirmation error:', error);

        if (error.message.includes('rate limit') || error.message.includes('too many')) {
          setError('Too many requests. Please wait before trying again.');
          setResendCooldown(120); // 2 minutes for rate limit
        } else if (error.message.includes('not found') || error.message.includes('invalid')) {
          setError('No unconfirmed account found with this email address.');
          setShowResendEmail(false);
        } else {
          setError('Failed to resend confirmation email. Please try again.');
        }
      } else {
        setResendSuccess(true);
        setResendCooldown(60); // 60 seconds normal cooldown
        setError(null);
      }
    } catch (error: any) {
      console.error('Unexpected resend error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const resendDisabled = resendCooldown > 0 || resendLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandSection}>
            <Wordmark />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.title}>Log in</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              {error.includes('Invalid email or password') && (
                <TouchableOpacity
                  style={styles.errorActionButton}
                  onPress={navigateToSignUp}
                  hitSlop={HIT_SLOP}
                >
                  <Text style={styles.errorActionText}>Create account</Text>
                </TouchableOpacity>
              )}
              {showResendEmail && error.includes('confirmation link') && (
                <TouchableOpacity
                  style={[styles.resendButton, resendDisabled && styles.resendButtonDisabled]}
                  onPress={handleResendConfirmation}
                  disabled={resendDisabled}
                  hitSlop={HIT_SLOP}
                >
                  <Text style={[styles.resendButtonText, resendDisabled && styles.resendButtonTextDisabled]}>
                    {resendLoading
                      ? 'Sending...'
                      : resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : 'Resend confirmation email'
                    }
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {resendSuccess && (
            <View style={styles.successContainer}>
              <Text style={styles.successText}>
                Confirmation email sent. Check your inbox and spam folder.
              </Text>
            </View>
          )}

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <TextInput
                style={[styles.textInput, error && error.includes('email') && styles.inputError]}
                ref={emailInputRef}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="Enter your email"
                placeholderTextColor={Colors.light.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                textContentType="emailAddress"
                autoComplete="email"
                accessibilityLabel="Email address"
                accessibilityHint="Enter your email address to sign in"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.passwordContainer, error && error.includes('password') && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  ref={passwordInputRef}
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.light.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  textContentType="password"
                  autoComplete="password"
                  accessibilityLabel="Password"
                  accessibilityHint="Enter your password to sign in"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  accessibilityHint="Toggle password visibility"
                >
                  {showPassword ? (
                    <EyeOff size={20} color={Colors.light.textTertiary} />
                  ) : (
                    <Eye size={20} color={Colors.light.textTertiary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordButton}
              onPress={navigateToForgotPassword}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Log in"
              accessibilityHint="Log in to your account"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={styles.loginButtonText}>
                {loading ? 'Logging in...' : 'Log in'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={navigateToSignUp}
            activeOpacity={0.6}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Create account</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  brandSection: {
    paddingTop: spacing.xl,
    marginBottom: spacing.xxxl,
  },
  titleSection: {
    marginBottom: spacing.xl,
  },
  title: {
    ...type.title,
    color: Colors.light.text,
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
  errorActionButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  errorActionText: {
    ...type.label,
    color: Colors.light.primary,
    textDecorationLine: 'underline',
  },
  resendButton: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: radius.input,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
  },
  resendButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
  resendButtonText: {
    ...type.label,
    color: Colors.light.primary,
  },
  resendButtonTextDisabled: {
    color: Colors.light.textTertiary,
  },
  successContainer: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.success,
    borderRadius: radius.input,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  successText: {
    ...type.label,
    color: Colors.light.success,
  },
  formSection: {
    marginBottom: spacing.base,
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
  textInput: {
    ...type.body,
    backgroundColor: Colors.light.card,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md + spacing.xs / 2,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputError: {
    borderColor: Colors.light.error,
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
    minWidth: touch.min,
    minHeight: touch.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.xl,
  },
  forgotPasswordText: {
    ...type.label,
    color: Colors.light.primary,
  },
  loginButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: radius.input,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    ...type.bodyMedium,
    color: Colors.light.card,
  },
  secondaryButton: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: radius.input,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  secondaryButtonText: {
    ...type.bodyMedium,
    color: Colors.light.primary,
  },
});
