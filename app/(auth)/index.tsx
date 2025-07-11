import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Zap, Mail, Lock } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';

export default function AuthIndexScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    } else if (!loading && !user) {
      // Redirect to login immediately instead of showing welcome
      router.replace('/(auth)/login');
    }
  }, [user, loading]);

  // Show a minimal loading state while redirecting
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logo}>
              <Zap size={32} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // This should rarely be seen since we redirect immediately
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Zap size={32} color="#FFFFFF" />
          </View>
        </View>
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
});