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

// Google Icon SVG Component
const GoogleIcon = ({ size = 20 }) => (
  <View style={{ width: size, height: size }}>
    <AnimatedSvg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <AnimatedPath
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <AnimatedPath
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <AnimatedPath
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <AnimatedPath
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </AnimatedSvg>
  </View>
);

// Apple Icon SVG Component
const AppleIcon = ({ size = 20, color = Colors.light.text }) => (
  <View style={{ width: size, height: size }}>
    <AnimatedSvg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <AnimatedPath d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </AnimatedSvg>
  </View>
);

export default function LoginScreen() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
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

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setSocialLoading(provider);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: Platform.OS === 'web' ? window.location.origin : 'momentum://auth',
        },
      });

      if (error) {
        console.error(`${provider} login error:`, error);
        setError(`Failed to sign in with ${provider}. Please try again.`);
      }
    } catch (error: any) {
      console.error(`Unexpected ${provider} login error:`, error);
      setError(`An unexpected error occurred with ${provider} login. Please try again.`);
    } finally {
      setSocialLoading(null);
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
          emailRedirectTo: 'momentum://auth/confirm',
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
            <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
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

          {/* Social Login Buttons */}
          <View style={styles.socialSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity 
              style={[styles.socialButton, socialLoading === 'google' && styles.socialButtonLoading]}
              onPress={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
              accessibilityHint="Sign in using your Google account"
              accessibilityState={{ disabled: socialLoading !== null }}
            >
              <GoogleIcon size={20} />
              <Text style={styles.socialButtonText}>
                {socialLoading === 'google' ? 'Connecting...' : 'Continue with Google'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.socialButton, socialLoading === 'apple' && styles.socialButtonLoading]}
              onPress={() => handleSocialLogin('apple')}
              disabled={socialLoading !== null}
              accessibilityRole="button"
              accessibilityLabel="Continue with Apple"
              accessibilityHint="Sign in using your Apple ID"
              accessibilityState={{ disabled: socialLoading !== null }}
            >
              <AppleIcon size={20} />
              <Text style={styles.socialButtonText}>
                {socialLoading === 'apple' ? 'Connecting...' : 'Continue with Apple'}
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
                Sign Up
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
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
    marginBottom: 8,
  },
  errorActionButton: {
    alignSelf: 'flex-start',
  },
  errorActionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Bold',
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
    fontFamily: 'Inter-Medium',
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
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  footerLink: {
    color: Colors.light.primary,
    fontFamily: 'Inter-SemiBold',
  },
});