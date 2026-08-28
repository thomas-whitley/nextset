import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Clock, Zap, ArrowLeft, Play } from 'lucide-react-native';
import Colors from '@/constants/Colors';

export default function PresetTimerScreen() {
  const presets = [
    {
      id: 'sweaty-shredder',
      name: 'Sweaty Shredder',
      description: 'High-intensity full body workout',
      color: Colors.light.primary,
      config: {
        circuitAmount: 3,
        circuitRestSeconds: 120,
        roundAmount: 3,
        roundRestSeconds: 60,
        exerciseAmount: 4,
        exerciseTimeSeconds: 45,
        exerciseRestSeconds: 15
      }
    },
    {
      id: '10-min-blaster',
      name: '10 Min Blaster',
      description: 'Quick and effective workout',
      color: Colors.light.accent,
      config: {
        circuitAmount: 1,
        circuitRestSeconds: 0,
        roundAmount: 2,
        roundRestSeconds: 30,
        exerciseAmount: 5,
        exerciseTimeSeconds: 40,
        exerciseRestSeconds: 20
      }
    },
    {
      id: 'hiit-pilates',
      name: 'HIIT Pilates',
      description: 'Core-focused interval training',
      color: Colors.light.success,
      config: {
        circuitAmount: 2,
        circuitRestSeconds: 90,
        roundAmount: 2,
        roundRestSeconds: 45,
        exerciseAmount: 3,
        exerciseTimeSeconds: 60,
        exerciseRestSeconds: 30
      }
    },
    {
      id: 'tabata-classic',
      name: 'Tabata Classic',
      description: '20 seconds on, 10 seconds off',
      color: '#9333EA', // Purple
      config: {
        circuitAmount: 1,
        circuitRestSeconds: 0,
        roundAmount: 4,
        roundRestSeconds: 60,
        exerciseAmount: 2,
        exerciseTimeSeconds: 20,
        exerciseRestSeconds: 10
      }
    },
    {
      id: 'endurance-builder',
      name: 'Endurance Builder',
      description: 'Long intervals with minimal rest',
      color: '#F97316', // Orange
      config: {
        circuitAmount: 2,
        circuitRestSeconds: 180,
        roundAmount: 2,
        roundRestSeconds: 90,
        exerciseAmount: 3,
        exerciseTimeSeconds: 90,
        exerciseRestSeconds: 30
      }
    },
    {
      id: 'strength-focus',
      name: 'Strength Focus',
      description: 'Heavy lifting with ample recovery',
      color: '#2563EB', // Blue
      config: {
        circuitAmount: 1,
        circuitRestSeconds: 0,
        roundAmount: 5,
        roundRestSeconds: 0,
        exerciseAmount: 1,
        exerciseTimeSeconds: 0, // No time limit for strength work
        exerciseRestSeconds: 180
      }
    }
  ];

  const handlePresetSelect = (preset: any) => {
    router.push({
      pathname: '/timer/execution',
      params: { 
        preset: JSON.stringify(preset.config),
        presetName: preset.name
      }
    });
  };

  const handleCustomTimer = () => {
    router.push('/timer/custom');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Timers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Preset Timers</Text>
        <Text style={styles.sectionDescription}>
          Choose from our collection of pre-configured workout timers
        </Text>

        <View style={styles.presetGrid}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[styles.presetCard, { backgroundColor: preset.color + '10' }]}
              onPress={() => handlePresetSelect(preset)}
            >
              <View style={[styles.presetIcon, { backgroundColor: preset.color }]}>
                <Zap size={24} color="#FFFFFF" />
              </View>
              <Text style={styles.presetName}>{preset.name}</Text>
              <Text style={styles.presetDescription}>{preset.description}</Text>
              <View style={styles.startButton}>
                <Play size={16} color={preset.color} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.customButton}
          onPress={handleCustomTimer}

        >
          <Clock size={24} color={Colors.light.primary} />
          <Text style={styles.customButtonText}>Create Custom Timer</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 24,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  presetCard: {
    width: '48%',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  presetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  presetName: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  presetDescription: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 12,
    height: 32,
  },
  startButton: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 8,
  },
  customButtonText: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.primary,
    marginLeft: 12,
  },
});