import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Eye, EyeOff, CircleCheck as CheckCircle } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence } from 'react-native-reanimated';
import { Svg, Path } from 'react-native-svg';
import { supabase } from '@/data/supabase-client';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';

// Create animated components
const AnimatedSvg = Animated.createAnimatedComponent(Svg);
const AnimatedPath = Animated.createAnimatedComponent(Path);

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

export default function SignUpScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Animation values
  const successScale = useSharedValue(0);
  const successOpacity = useSharedValue(0);
  const dot1Opacity = useSharedValue(0.4);
  const dot2Opacity = useSharedValue(0.4);
  const dot3Opacity = useSharedValue(0.4);

  // Animate loading dots and auto-navigate after success
  useEffect(() => {
    if (success) {
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
      
      // Auto-navigate to main app after 3 seconds
      const navigationTimeout = setTimeout(() => {
        // The AuthProvider should handle navigation automatically
        // But if it doesn't, we can force navigation to the main app
        console.log('Auto-navigating to main app...');
      }, 3000);
      
      return () => {
        clearInterval(interval);
        clearTimeout(navigationTimeout);
      };
    }
  }, [success]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Please enter a username');
      return false;
    }
    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return false;
    }
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
      setError('Please enter a password');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
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
          data: {
            full_name: formData.fullName.trim(),
            username: formData.username.trim(),
            phone: formData.phone.trim(),
          },
          // Disable email confirmation for immediate login
          emailRedirectTo: undefined,
        },
      });

      console.log('Signup response:', { data, error: signUpError });

      if (signUpError) {
        console.error('Sign up error:', signUpError);
        
        // Handle specific error cases
        if (signUpError.message.includes('User already registered') || 
            signUpError.message.includes('already registered') ||
            signUpError.message.includes('already exists')) {
          setError('An account with this email already exists. Please sign in instead.');
          return;
        }
        
        if (signUpError.message.includes('Invalid email')) {
          setError('Please enter a valid email address');
          return;
        }
        
        if (signUpError.message.includes('Password')) {
          setError('Password must be at least 6 characters long');
          return;
        }
        
        // Generic error handling
        setError(signUpError.message || 'Failed to create account. Please try again.');
        return;
      }

      console.log('Signup successful, checking session...');
      console.log('User:', data.user);
      console.log('Session:', data.session);

      if (data.user) {
        // Show success animation
        console.log('Showing success screen...');
        setSuccess(true);
        
        // Trigger success animation
        successScale.value = withSpring(1, { damping: 15, stiffness: 200 });
        successOpacity.value = withTiming(1, { duration: 300 });
        
        // The AuthProvider will handle navigation automatically when the session is established
        console.log('Waiting for auth state to update...');
        
      } else {
        console.error('No user returned from signup');
        setError('Failed to create account. Please try again.');
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

  const navigateToLogin = () => {
    router.push('/(auth)');
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

  // Success Screen
  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <Animated.View style={[styles.successContent, successAnimatedStyle]}>
            <View style={styles.successIcon}>
              <CheckCircle size={64} color={Colors.light.success} />
            </View>
            <Text style={styles.successTitle}>Welcome to Momentum!</Text>
            <Text style={styles.successMessage}>
              Your account has been created successfully. Get ready to transform your fitness journey!
            </Text>
            <View style={styles.loadingDots}>
              <Animated.View style={[styles.dot, dot1AnimatedStyle]} />
              <Animated.View style={[styles.dot, dot2AnimatedStyle]} />
              <Animated.View style={[styles.dot, dot3AnimatedStyle]} />
            </View>
            <Text style={styles.loadingText}>Setting up your account...</Text>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.titleSection}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Momentum and start your fitness transformation</Text>
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              {error.includes('already exists') && (
                <TouchableOpacity 
                  style={styles.errorActionButton}
                  onPress={navigateToLogin}
                >
                  <Text style={styles.errorActionText}>Go to Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={[styles.textInput, error && error.includes('full name') && styles.inputError]}
                value={formData.fullName}
                onChangeText={(value) => updateFormData('fullName', value)}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.light.textTertiary}
                autoCapitalize="words"
                returnKeyType="next"
                textContentType="name"
                autoComplete="name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Username</Text>
              <TextInput
                style={[styles.textInput, error && error.includes('username') && styles.inputError]}
                value={formData.username}
                onChangeText={(value) => updateFormData('username', value)}
                placeholder="Choose a username"
                placeholderTextColor={Colors.light.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                textContentType="username"
                autoComplete="username"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={[styles.textInput, error && error.includes('email') && styles.inputError]}
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
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={formData.phone}
                onChangeText={(value) => updateFormData('phone', value)}
                placeholder="Enter your phone number"
                placeholderTextColor={Colors.light.textTertiary}
                keyboardType="phone-pad"
                returnKeyType="next"
                textContentType="telephoneNumber"
                autoComplete="tel"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={[styles.passwordContainer, error && error.includes('Password') && styles.inputError]}>
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
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={[styles.passwordContainer, error && error.includes('match') && styles.inputError]}>
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
              style={[styles.signUpButton, loading && styles.signUpButtonDisabled]} 
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={styles.signUpButtonText}>
                {loading ? 'Creating Account...' : 'Create Account'}
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
            >
              <AppleIcon size={20} />
              <Text style={styles.socialButtonText}>
                {socialLoading === 'apple' ? 'Connecting...' : 'Continue with Apple'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text 
                style={styles.footerLink} 
                onPress={navigateToLogin}
              >
                Sign In
              </Text>
            </Text>
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
    paddingBottom: 40,
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
  signUpButton: {
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
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  socialSection: {
    marginBottom: 32,
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
  // Success Screen Styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: Colors.light.background,
  },
  successContent: {
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.light.primary,
    marginHorizontal: 4,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
});