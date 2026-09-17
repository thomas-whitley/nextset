import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Play } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';

export default function CustomTimerConfigScreen() {
  const [circuitAmount, setCircuitAmount] = useState(1);
  const [circuitRestSeconds, setCircuitRestSeconds] = useState(120);
  const [roundAmount, setRoundAmount] = useState(3);
  const [roundRestSeconds, setRoundRestSeconds] = useState(60);
  const [exerciseAmount, setExerciseAmount] = useState(4);
  const [exerciseTimeSeconds, setExerciseTimeSeconds] = useState(45);
  const [exerciseRestSeconds, setExerciseRestSeconds] = useState(15);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBegin = () => {
    const timerConfig = {
      circuitAmount,
      circuitRestSeconds,
      roundAmount,
      roundRestSeconds,
      exerciseAmount,
      exerciseTimeSeconds,
      exerciseRestSeconds
    };

    router.push({
      pathname: '/timer/execution',
      params: { 
        preset: JSON.stringify(timerConfig),
        presetName: 'Custom timer'
      }
    });
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
        <Text style={styles.headerTitle}>Custom timer</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {/* CIRCUITS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CIRCUITS</Text>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Circuit Amount</Text>
              <Text style={styles.sliderValue}>{circuitAmount}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={circuitAmount}
              onValueChange={setCircuitAmount}
              minimumTrackTintColor={Colors.light.primary}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.rangeText}>1</Text>
              <Text style={styles.rangeText}>5</Text>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Circuit Rest</Text>
              <Text style={styles.sliderValue}>{formatTime(circuitRestSeconds)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={300}
              step={15}
              value={circuitRestSeconds}
              onValueChange={setCircuitRestSeconds}
              minimumTrackTintColor={Colors.light.primary}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.rangeText}>0:00</Text>
              <Text style={styles.rangeText}>5:00</Text>
            </View>
          </View>
        </View>

        {/* ROUNDS Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ROUNDS</Text>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Round Amount</Text>
              <Text style={styles.sliderValue}>{roundAmount}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={5}
              step={1}
              value={roundAmount}
              onValueChange={setRoundAmount}
              minimumTrackTintColor={Colors.light.primary}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.rangeText}>1</Text>
              <Text style={styles.rangeText}>5</Text>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Round Rest</Text>
              <Text style={styles.sliderValue}>{formatTime(roundRestSeconds)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={300}
              step={15}
              value={roundRestSeconds}
              onValueChange={setRoundRestSeconds}
              minimumTrackTintColor={Colors.light.primary}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.rangeText}>0:00</Text>
              <Text style={styles.rangeText}>5:00</Text>
            </View>
          </View>
        </View>

        {/* EXERCISES Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXERCISES</Text>
          
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Exercise Amount</Text>
              <Text style={styles.sliderValue}>{exerciseAmount}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={10}
              step={1}
              value={exerciseAmount}
              onValueChange={setExerciseAmount}
              minimumTrackTintColor={Colors.light.primary}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.rangeText}>1</Text>
              <Text style={styles.rangeText}>10</Text>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Exercise Time</Text>
              <Text style={styles.sliderValue}>{formatTime(exerciseTimeSeconds)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={10}
              maximumValue={300}
              step={5}
              value={exerciseTimeSeconds}
              onValueChange={setExerciseTimeSeconds}
              minimumTrackTintColor={Colors.light.primary}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.rangeText}>0:10</Text>
              <Text style={styles.rangeText}>5:00</Text>
            </View>
          </View>

          <View style={styles.sliderContainer}>
            <View style={styles.sliderLabelContainer}>
              <Text style={styles.sliderLabel}>Exercise Rest</Text>
              <Text style={styles.sliderValue}>{formatTime(exerciseRestSeconds)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={300}
              step={5}
              value={exerciseRestSeconds}
              onValueChange={setExerciseRestSeconds}
              minimumTrackTintColor={Colors.light.primary}
              maximumTrackTintColor={Colors.light.border}
              thumbTintColor={Colors.light.primary}
            />
            <View style={styles.sliderRange}>
              <Text style={styles.rangeText}>0:00</Text>
              <Text style={styles.rangeText}>5:00</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.beginButton} onPress={handleBegin} accessibilityRole="button" accessibilityLabel="Begin timer">
          <Text style={styles.beginButtonText}>Begin</Text>
          <Play size={20} color={Colors.light.card} />
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
  content: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  section: {
    marginBottom: spacing.xl,
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow,
  },
  // Eyebrow token uppercases; the source strings are already caps and stay readable either way.
  sectionTitle: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.lg },
  sliderContainer: { marginBottom: spacing.xl },
  sliderLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sliderLabel: { ...type.bodyMedium, color: Colors.light.text },
  // Tabular: the value changes as the thumb moves and must not reflow the row.
  sliderValue: { ...type.numeric, color: Colors.light.primary },
  slider: { width: '100%', height: 44 },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -spacing.sm,
  },
  rangeText: { ...type.label, color: Colors.light.textTertiary },
  beginButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.base,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.base,
  },
  beginButtonText: { ...type.section, color: Colors.light.card, marginRight: spacing.sm },
});