import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Play } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import Colors from '@/constants/Colors';

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
        presetName: 'Custom Timer'
      }
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Timer</Text>
        <View style={{ width: 24 }} />
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

        <TouchableOpacity style={styles.beginButton} onPress={handleBegin}>
          <Text style={styles.beginButtonText}>Begin</Text>
          <Play size={20} color="#FFFFFF" />
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.primary,
    marginBottom: 20,
  },
  sliderContainer: {
    marginBottom: 24,
  },
  sliderLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sliderLabel: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
  },
  sliderValue: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  rangeText: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
  },
  beginButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  beginButtonText: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
});