import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Clock, Zap, ArrowLeft, Play } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';

type PresetConfig = {
  circuitAmount: number;
  circuitRestSeconds: number;
  roundAmount: number;
  roundRestSeconds: number;
  exerciseAmount: number;
  exerciseTimeSeconds: number;
  exerciseRestSeconds: number;
};

type Preset = {
  id: string;
  name: string;
  description: string;
  /** Plate colour for the icon disc. Yellow gets rubber text; everything else gets white. */
  color: string;
  config: PresetConfig;
};

/** Yellow is the one plate that white text fails on. */
const onPlate = (color: string) => (color === Colors.light.warning ? Colors.light.text : Colors.light.card);

const PRESETS: Preset[] = [
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
      exerciseRestSeconds: 15,
    },
  },
  {
    id: '10-min-blaster',
    name: '10 Min Blaster',
    description: 'Quick and effective workout',
    color: Colors.light.warning,
    config: {
      circuitAmount: 1,
      circuitRestSeconds: 0,
      roundAmount: 2,
      roundRestSeconds: 30,
      exerciseAmount: 5,
      exerciseTimeSeconds: 40,
      exerciseRestSeconds: 20,
    },
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
      exerciseRestSeconds: 30,
    },
  },
  {
    id: 'tabata-classic',
    name: 'Tabata Classic',
    description: '20 seconds on, 10 seconds off',
    color: Colors.light.error,
    config: {
      circuitAmount: 1,
      circuitRestSeconds: 0,
      roundAmount: 4,
      roundRestSeconds: 60,
      exerciseAmount: 2,
      exerciseTimeSeconds: 20,
      exerciseRestSeconds: 10,
    },
  },
  {
    id: 'endurance-builder',
    name: 'Endurance Builder',
    description: 'Long intervals with minimal rest',
    color: Colors.light.rubber,
    config: {
      circuitAmount: 2,
      circuitRestSeconds: 180,
      roundAmount: 2,
      roundRestSeconds: 90,
      exerciseAmount: 3,
      exerciseTimeSeconds: 90,
      exerciseRestSeconds: 30,
    },
  },
  {
    id: 'strength-focus',
    name: 'Strength Focus',
    description: 'Heavy lifting with ample recovery',
    color: Colors.light.textSecondary,
    config: {
      circuitAmount: 1,
      circuitRestSeconds: 0,
      roundAmount: 5,
      roundRestSeconds: 0,
      exerciseAmount: 1,
      exerciseTimeSeconds: 0, // No time limit for strength work
      exerciseRestSeconds: 180,
    },
  },
];

export default function PresetTimerScreen() {
  const handlePresetSelect = (preset: Preset) => {
    router.push({
      pathname: '/timer/execution',
      params: {
        preset: JSON.stringify(preset.config),
        presetName: preset.name,
      },
    });
  };

  const handleCustomTimer = () => {
    router.push('/timer/custom');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Timers</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionEyebrow}>Preset timers</Text>
        <Text style={styles.sectionDescription}>
          Choose from our collection of pre-configured workout timers
        </Text>

        <View style={styles.presetGrid}>
          {PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.presetCard}
              onPress={() => handlePresetSelect(preset)}
              accessibilityRole="button"
              accessibilityLabel={`Start ${preset.name}`}
            >
              <View style={[styles.presetIcon, { backgroundColor: preset.color }]}>
                <Zap size={24} color={onPlate(preset.color)} />
              </View>
              <Text style={styles.presetName}>{preset.name}</Text>
              <Text style={styles.presetDescription}>{preset.description}</Text>
              <View style={styles.startButton}>
                <Play size={16} color={Colors.light.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.customButton}
          onPress={handleCustomTimer}
          accessibilityRole="button"
          accessibilityLabel="Create custom timer"
        >
          <Clock size={24} color={Colors.light.primary} />
          <Text style={styles.customButtonText}>Create Custom Timer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 4,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...type.section, color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: spacing.xxxl },
  sectionEyebrow: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs },
  sectionDescription: { ...type.body, color: Colors.light.textSecondary, marginBottom: spacing.xl },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  presetCard: {
    width: '48%',
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.base,
    ...shadow,
  },
  presetIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  presetName: { ...type.section, color: Colors.light.text, marginBottom: spacing.xs },
  presetDescription: { ...type.label, color: Colors.light.textTertiary, marginBottom: spacing.md, height: 36 },
  startButton: {
    alignSelf: 'flex-end',
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primaryLight,
    borderRadius: radius.card,
    paddingVertical: spacing.base,
    minHeight: 44,
    marginTop: spacing.sm,
  },
  customButtonText: { ...type.bodyMedium, color: Colors.light.primary, marginLeft: spacing.md },
});
