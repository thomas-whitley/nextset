import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS, withDelay } from 'react-native-reanimated';
import { Svg, Path } from 'react-native-svg';
import { supabase } from '@/data/supabase-client';
import Colors from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/data/AuthContext';

// Create animated components
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Animated Dumbbell SVG Component
const AnimatedDumbbell = ({ size = 20, color = Colors.light.primary }) => (
  <Animated.View style={{ width: size, height: size }}>
    <AnimatedSvg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedPath
        d="M6.5 12L17.5 12M9 9L9 15M15 9L15 15M5 10L5 14M19 10L19 14M3 11L3 13M21 11L21 13"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </AnimatedSvg>
  </Animated.View>
);

export default function LoginScreen() {
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

  // Animation values
  const dumbbellX = useSharedValue(-30);
  const textOpacity = useSharedValue(0);
  const lastAnimationTime = useRef(Date.now());
  
  const { user, loading: authLoading } = useAuth();

  // Handle authentication state changes
  useEffect(() => {
    if (authLoading) return;
    if (user) {
      // Optional: show toast or trigger animation here
    }
  }, [user, authLoading]);

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
  
  
  // Start animation on mount and repeat every 30 seconds
  useEffect(() => {
    const startAnimation = () => {
      // Reset values
      dumbbellX.value = -30;
      textOpacity.value = 0;
      
      // Start the dumbbell roll animation
      dumbbellX.value = withSpring(120, {
        damping: 15,
        stiffness: 100,
      });

      // Animate text opacity as dumbbell moves
      textOpacity.value = withTiming(1, {
        duration: 750,
      });
    };

    // Initial animation
    startAnimation();
    lastAnimationTime.current = Date.now();

    // Set up interval for repeating animation every 30 seconds
    const interval = setInterval(() => {
      const now = Date.now();
      if (now - lastAnimationTime.current >= 30000) {
        startAnimation();
        lastAnimationTime.current = now;
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const dumbbellStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dumbbellX.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View> */}

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleSection}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Log in to your account</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              {error.includes('Invalid email or password') && (
                <TouchableOpacity 
                  style={styles.errorActionButton}
                  onPress={navigateToSignUp}
                >
                  <Text style={styles.errorActionText}>Create New Account</Text>
                </TouchableOpacity>
              )}
              {showResendEmail && error.includes('confirmation link') && (
                <TouchableOpacity 
                  style={[
                    styles.resendButton,
                    (resendCooldown > 0 || resendLoading) && styles.resendButtonDisabled
                  ]}
                  onPress={handleResendConfirmation}
                  disabled={resendCooldown > 0 || resendLoading}
                >
                  <Text style={[
                    styles.resendButtonText,
                    (resendCooldown > 0 || resendLoading) && styles.resendButtonTextDisabled
                  ]}>
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
                ✅ Confirmation email sent! Please check your inbox and spam folder.
              </Text>
            </View>
          )}

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
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
                  accessibilityLabel={showPassword ? "Hide password" : "Show password"}
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

            {/* Animated Forgot Password Button */}
            <View style={styles.forgotPasswordContainer}>
              <Animated.View style={[styles.dumbbellContainer, dumbbellStyle]}>
                <AnimatedDumbbell size={16} />
              </Animated.View>
              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={navigateToForgotPassword}
              >
                <Animated.Text style={[styles.forgotPasswordText, textStyle]}>
                  Forgot Password?
                </Animated.Text>
              </TouchableOpacity>
            </View>

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
                {loading ? 'Logging In...' : 'Log In'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <TouchableOpacity
              style={styles.SignInButton}
              onPress={navigateToSignUp}
              activeOpacity={0.6}
            >
              <Text style={styles.SignInButtonText}>
                Create account
              </Text>
            </TouchableOpacity>
          </View>

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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  titleSection: {
    marginBottom: 32,
    paddingTop: 16,
  },
  title: {
    fontSize: 32,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    lineHeight: 24,
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
    marginBottom: 8,
  },
  errorActionButton: {
    alignSelf: 'flex-start',
  },
  errorActionText: {
    fontSize: 14,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.primary,
    textDecorationLine: 'underline',
  },
  resendButton: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  resendButtonDisabled: {
    backgroundColor: Colors.light.border,
    opacity: 0.6,
  },
  resendButtonText: {
    fontSize: 12,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.primary,
  },
  resendButtonTextDisabled: {
    color: Colors.light.textTertiary,
  },
  successContainer: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  successText: {
    fontSize: 14,
    fontFamily: 'Archivo-Medium',
    color: '#15803D',
  },
  formSection: {
    marginBottom: 32,
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
  textInput: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputError: {
    borderColor: '#DC2626',
    borderWidth: 2,
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
  forgotPasswordContainer: {
    position: 'relative',
    alignSelf: 'flex-end',
    marginBottom: 24,
    height: 24,
    justifyContent: 'center',
  },
  dumbbellContainer: {
    position: 'absolute',
    top: 4,
    left: -30,
    zIndex: 1,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    fontSize: 14,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.primary,
  },
  loginButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: '#FFFFFF',
  },
  SignInButton: {
    backgroundColor: '#FFFFFF',
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
  SignInButtonText: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.primary,
  },
  socialSection: {
    marginBottom: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.border,
  },
  dividerText: {
    fontSize: 14,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    marginHorizontal: 16,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  socialButtonLoading: {
    opacity: 0.6,
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
    marginLeft: 12,
  },
  footerSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
  },
  footerLink: {
    color: Colors.light.primary,
    fontFamily: 'ArchivoNarrow-SemiBold',
  },
  debugSection: {
    marginTop: 8,
    alignItems: 'center',
    paddingBottom: 12,
  },
  debugDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    width: '100%',
    marginBottom: 12,
  },
  debugButton: {
    borderWidth: 1,
    borderColor: Colors.light.textTertiary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  debugButtonText: {
    fontSize: 14,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
  },
});