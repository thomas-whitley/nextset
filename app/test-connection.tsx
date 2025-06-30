import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { testDatabaseConnection } from '@/data/supabase-client';
import { useAuth } from '@/data/AuthContext';
import Colors from '@/constants/Colors';

export default function TestConnectionScreen() {
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const runConnectionTest = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const result = await testDatabaseConnection();
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Database Connection Test</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connection Details</Text>
          <Text style={styles.detail}>URL: https://wdwrzowmsinuqtgohgay.supabase.co</Text>
          <Text style={styles.detail}>User: {user ? user.email : 'Not authenticated'}</Text>
          <Text style={styles.detail}>User ID: {user ? user.id : 'N/A'}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.testButton, loading && styles.testButtonDisabled]} 
          onPress={runConnectionTest}
          disabled={loading}
        >
          <Text style={styles.testButtonText}>
            {loading ? 'Testing Connection...' : 'Test Database Connection'}
          </Text>
        </TouchableOpacity>

        {testResult && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Test Result:</Text>
            <View style={[
              styles.resultBox, 
              testResult.success ? styles.successBox : styles.errorBox
            ]}>
              <Text style={[
                styles.resultText,
                testResult.success ? styles.successText : styles.errorText
              ]}>
                {testResult.success ? 'SUCCESS' : 'FAILED'}
              </Text>
              
              {testResult.error && (
                <Text style={styles.errorDetails}>
                  Error: {JSON.stringify(testResult.error, null, 2)}
                </Text>
              )}
              
              {testResult.data && (
                <Text style={styles.successDetails}>
                  Data: {JSON.stringify(testResult.data, null, 2)}
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Tables</Text>
          {[
            'profile',
            'admin_log',
            'timer_preset', 
            'program_enrollment',
            'workout_log',
            'workout_log_sharing',
            'friendship'
          ].map((table, index) => (
            <Text key={index} style={styles.tableItem}>• {table}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  detail: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 4,
  },
  testButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  resultContainer: {
    marginBottom: 24,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  resultBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
  },
  successBox: {
    backgroundColor: '#F0FDF4',
    borderColor: '#10B981',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  resultText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  successText: {
    color: '#10B981',
  },
  errorText: {
    color: '#EF4444',
  },
  errorDetails: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  successDetails: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#10B981',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  tableItem: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
});