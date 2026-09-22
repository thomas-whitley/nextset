import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, EyeOff, CircleCheck as CheckCircle, Mail } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { supabase } from '@/data/supabase-client';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';
import Wordmark from '@/components/Wordmark';

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<'email' | 'password' | 'confirm' | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Animation values
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);
  const dot1Opacity = useSharedValue(0.4);
  const dot2Opacity = useSharedValue(0.4);
  const dot3Opacity = useSharedValue(0.4);

  // Animate loading dots and auto-navigate after success
  useEffect(() => {
    if (success && !emailSent) {
      // Start the loading dots animation
      const animateDots = () => {
        dot1Opacity.value = withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 300 })
        );

        setTimeout(() => {
          dot2Opacity.value = withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.4, { duration: 300 })
          );
        }, 200);

        setTimeout(() => {
          dot3Opacity.value = withSequence(
            withTiming(1, { duration: 300 }),
            withTiming(0.4, { duration: 300 })
          );
        }, 400);
      };

      // Start animation and repeat
      animateDots();
      const interval = setInterval(animateDots, 1000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [success, emailSent]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) {
      setError(null);
      setErrorField(null);
    }
  };

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Please enter your email address');
      setErrorField('email');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError('Please enter a valid email address');
      setErrorField('email');
      return false;
    }
    if (!formData.password) {
      setError('Please enter a password');
      setErrorField('password');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      setErrorField('password');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setErrorField('confirm');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      console.log('Starting signup process...');

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          emailRedirectTo: 'momentum://confirm',
        },
      });

      if (signUpError) {
        console.error('Sign up error:', signUpError);

        // Handle specific error cases
        if (signUpError.message.includes('User already registered') ||
            signUpError.message.includes('already registered') ||
            signUpError.message.includes('already exists')) {
          setError('An account with this email already exists. Log in instead.');
          setErrorField('email');
          return;
        }

        if (signUpError.message.includes('Invalid email')) {
          setError('Please enter a valid email address');
          setErrorField('email');
          return;
        }

        if (signUpError.message.includes('Password')) {
          setError('Password must be at least 6 characters long');
          setErrorField('password');
          return;
        }

        // Generic error handling
        setError(signUpError.message || 'Failed to create account. Please try again.');
        setErrorField(null);
        return;
      }

      if (data.user) {
        if (data.session) {
          // User is immediately logged in (email confirmation disabled)
          setSuccess(true);

          // Trigger success animation
          successScale.value = withSpring(1, { damping: 15, stiffness: 200 });
          successOpacity.value = withTiming(1, { duration: 300 });
        } else {
          // User needs to verify email
          setEmailSent(true);
        }
      } else {
        setError('Failed to create account. Please try again.');
      }
    } catch (error: any) {
      console.error('Unexpected error:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.replace('/(auth)');
  };

  const handleResendEmail = async () => {
    if (!formData.email || resendCooldown > 0 || loading) return;

    setLoading(true);
    setResendSent(false);
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: formData.email.trim(),
        options: { emailRedirectTo: 'momentum://confirm' },
      });

      if (resendError) {
        const msg = resendError.message.toLowerCase();
        if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('Too many attempts. Wait two minutes and try again.');
          setResendCooldown(120);
        } else {
          setError('Could not resend the email. Try again.');
        }
      } else {
        setError(null);
        setResendSent(true);
        setResendCooldown(60);
      }
    } catch (resendException) {
      console.error('Unexpected resend error:', resendException);
      setError('Could not resend the email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const successAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
    opacity: successOpacity.value,
  }));

  const dot1AnimatedStyle = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2AnimatedStyle = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3AnimatedStyle = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  // Email verification screen
  const renderEmailVerificationScreen = () => (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.stateContainer}>
        <View style={styles.stateContent}>
          <View style={styles.stateIcon}>
            <Mail size={36} color={Colors.light.primary} />
          </View>
          <Text style={styles.stateTitle}>Check your email</Text>
          <Text style={styles.stateMessage}>
            We&apos;ve sent a verification link to{' '}
            <Text style={styles.emailAddress}>{formData.email}</Text>
          </Text>
          <Text style={styles.stateInstructions}>
            Open the link to activate your account, then come back here to log in. Check your spam folder if it hasn&apos;t arrived.
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleResendEmail}
            disabled={resendCooldown > 0 || loading}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>
              {resendCooldown > 0 ? `Resend in ${resendCooldown} s` : 'Resend email'}
            </Text>
          </TouchableOpacity>
          {resendSent && <Text style={styles.inputHelper}>Email sent. Check your inbox.</Text>}

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={navigateToLogin}
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Back to log in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  // Success Screen
  const renderSuccessScreen = () => (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.stateContainer}>
        <Animated.View style={[styles.stateContent, successAnimatedStyle]}>
          <View style={styles.stateIcon}>
            <CheckCircle size={36} color={Colors.light.success} />
          </View>
          <Text style={styles.stateTitle}>Account created</Text>
          <Text style={styles.stateMessage}>
            You&apos;re logged in. Setting things up.
          </Text>
          <View style={styles.loadingDots}>
            <Animated.View style={[styles.dot, dot1AnimatedStyle]} />
            <Animated.View style={[styles.dot, dot2AnimatedStyle]} />
            <Animated.View style={[styles.dot, dot3AnimatedStyle]} />
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );

  // Render appropriate screen based on state
  if (emailSent) {
    return renderEmailVerificationScreen();
  }

  if (success) {
    return renderSuccessScreen();
  }

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
            <Text style={styles.title}>Create account</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              {error.includes('already exists') && (
                <TouchableOpacity
                  style={styles.errorActionButton}
                  onPress={navigateToLogin}
                  hitSlop={HIT_SLOP}
                >
                  <Text style={styles.errorActionText}>Log in</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email address</Text>
              <TextInput
                style={[styles.textInput, errorField === 'email' && styles.inputError]}
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="Enter your email"
                placeholderTextColor={Colors.light.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                textContentType="emailAddress"
                autoComplete="email"
                accessibilityLabel="Email address"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.passwordContainer, errorField === 'password' && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.password}
                  onChangeText={(value) => updateFormData('password', value)}
                  placeholder="Create a password"
                  placeholderTextColor={Colors.light.textTertiary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  textContentType="newPassword"
                  autoComplete="password-new"
                  accessibilityLabel="Password"
                  accessibilityHint="At least 6 characters"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
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
              <Text style={styles.inputHelper}>At least 6 characters</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm password</Text>
              <View style={[styles.passwordContainer, errorField === 'confirm' && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  value={formData.confirmPassword}
                  onChangeText={(value) => updateFormData('confirmPassword', value)}
                  placeholder="Confirm your password"
                  placeholderTextColor={Colors.light.textTertiary}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSignUp}
                  textContentType="newPassword"
                  autoComplete="password-new"
                  accessibilityLabel="Confirm password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
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
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Create account"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Creating account...' : 'Create account'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={navigateToLogin}
            activeOpacity={0.6}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Log in</Text>
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
    paddingBottom: spacing.xxxl,
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
  inputHelper: {
    ...type.label,
    color: Colors.light.textTertiary,
    marginTop: spacing.sm,
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
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: radius.input,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    alignSelf: 'stretch',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...type.bodyMedium,
    color: Colors.light.card,
  },
  secondaryButton: {
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: radius.input,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    alignSelf: 'stretch',
    marginBottom: spacing.base,
  },
  secondaryButtonText: {
    ...type.bodyMedium,
    color: Colors.light.primary,
  },
  // Post-submit state screens (email sent / account created)
  stateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    backgroundColor: Colors.light.background,
  },
  stateContent: {
    alignItems: 'center',
    alignSelf: 'stretch',
    maxWidth: 400,
  },
  stateIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  stateTitle: {
    ...type.title,
    color: Colors.light.text,
    marginBottom: spacing.base,
    textAlign: 'center',
  },
  stateMessage: {
    ...type.body,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emailAddress: {
    ...type.bodyMedium,
    color: Colors.light.primary,
  },
  stateInstructions: {
    ...type.label,
    color: Colors.light.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.base,
  },
  dot: {
    width: spacing.sm,
    height: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primary,
    marginHorizontal: spacing.xs,
  },
});
