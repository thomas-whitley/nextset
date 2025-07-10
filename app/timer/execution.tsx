import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Play, Pause, RotateCcw, Clock, Watch } from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import Colors from '@/constants/Colors';
import { useIntervalTimer, TimerConfig } from '@/hooks/useIntervalTimer';

const { width } = Dimensions.get('window');
const TIMER_SIZE = width * 0.7;
const STROKE_WIDTH = 10;
const RADIUS = (TIMER_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TimerExecutionScreen() {
  const params = useLocalSearchParams();
  const presetName = params.presetName as string || 'Timer';
  const presetConfig = params.preset ? JSON.parse(params.preset as string) as TimerConfig : null;
  
  const [isDigitalClock, setIsDigitalClock] = useState(true);
  const [animatedValue] = useState(new Animated.Value(0));
  
  // Default config if none provided
  const defaultConfig: TimerConfig = {
    circuitAmount: 1,
    circuitRestSeconds: 60,
    roundAmount: 3,
    roundRestSeconds: 30,
    exerciseAmount: 4,
    exerciseTimeSeconds: 45,
    exerciseRestSeconds: 15
  };
  
  const config = presetConfig || defaultConfig;
  
  const { state, startTimer, pauseTimer, resetTimer } = useIntervalTimer(config);
  
  // Start animation when progress changes
  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: 1 - state.progress,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.linear
    }).start();
  }, [state.progress]);
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getStatusColor = () => {
    switch (state.currentStatus) {
      case 'Work':
        return Colors.light.primary;
      case 'Rest':
        return Colors.light.accent;
      case 'Round Rest':
        return Colors.light.success;
      case 'Circuit Rest':
        return '#9333EA'; // Purple
      case 'Finished':
        return Colors.light.error;
      default:
        return Colors.light.primary;
    }
  };
  
  const statusColor = getStatusColor();
  
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, CIRCUMFERENCE]
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{presetName}</Text>
        <TouchableOpacity onPress={() => setIsDigitalClock(!isDigitalClock)} style={styles.clockToggle}>
          {isDigitalClock ? (
            <Watch size={24} color={Colors.light.text} />
          ) : (
            <Clock size={24} color={Colors.light.text} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.timerContainer}>
        {/* Progress Ring */}
        <View style={styles.progressRingContainer}>
          <Svg width={TIMER_SIZE} height={TIMER_SIZE}>
            {/* Background Circle */}
            <Circle
              cx={TIMER_SIZE / 2}
              cy={TIMER_SIZE / 2}
              r={RADIUS}
              stroke={Colors.light.border}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
            />
            
            {/* Progress Circle */}
            <AnimatedCircle
              cx={TIMER_SIZE / 2}
              cy={TIMER_SIZE / 2}
              r={RADIUS}
              stroke={statusColor}
              strokeWidth={STROKE_WIDTH}
              fill="transparent"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
          
          {/* Timer Display */}
          <View style={styles.timerDisplay}>
            {isDigitalClock ? (
              <Text style={styles.timerText}>{formatTime(state.timeRemaining)}</Text>
            ) : (
              <AnalogClock seconds={state.timeRemaining} color={statusColor} />
            )}
            <Text style={[styles.statusText, { color: statusColor }]}>
              {state.currentStatus}
            </Text>
          </View>
        </View>
        
        {/* Status Bar */}
        <View style={styles.statusBar}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Circuit</Text>
            <Text style={styles.statusValue}>{state.currentCircuit}/{state.totalCircuits}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Round</Text>
            <Text style={styles.statusValue}>{state.currentRound}/{state.totalRounds}</Text>
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Exercise</Text>
            <Text style={styles.statusValue}>{state.currentExercise}/{state.totalExercises}</Text>
          </View>
        </View>
        
        {/* Controls */}
        <View style={styles.controls}>
          {state.isRunning ? (
            <TouchableOpacity style={styles.controlButton} onPress={pauseTimer}>
              <Pause size={32} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: state.currentStatus === 'Finished' ? Colors.light.textTertiary : Colors.light.primary }]} 
              onPress={startTimer}
              disabled={state.currentStatus === 'Finished'}
            >
              <Play size={32} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.controlButton, styles.resetButton]} onPress={resetTimer}>
            <RotateCcw size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Animated Circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Analog Clock Component
function AnalogClock({ seconds, color }: { seconds: number, color: string }) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  // Calculate angles
  const minuteAngle = (minutes / 60) * 360;
  const secondAngle = (remainingSeconds / 60) * 360;
  
  return (
    <View style={styles.analogClock}>
      <View style={styles.clockFace}>
        {/* Hour markers */}
        {[...Array(12)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.hourMarker,
              {
                transform: [
                  { rotate: `${i * 30}deg` },
                  { translateY: -RADIUS + STROKE_WIDTH + 20 }
                ]
              }
            ]}
          />
        ))}
        
        {/* Minute hand */}
        <View
          style={[
            styles.minuteHand,
            {
              backgroundColor: color,
              transform: [
                { rotate: `${minuteAngle}deg` }
              ]
            }
          ]}
        />
        
        {/* Second hand */}
        <View
          style={[
            styles.secondHand,
            {
              backgroundColor: color,
              transform: [
                { rotate: `${secondAngle}deg` }
              ]
            }
          ]}
        />
        
        {/* Center dot */}
        <View style={[styles.centerDot, { backgroundColor: color }]} />
      </View>
      
      <Text style={[styles.analogTimeText, { color }]}>
        {minutes}:{remainingSeconds.toString().padStart(2, '0')}
      </Text>
    </View>
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
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  clockToggle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  progressRingContainer: {
    width: TIMER_SIZE,
    height: TIMER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerDisplay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  statusText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 8,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  statusItem: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 40,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  resetButton: {
    backgroundColor: Colors.light.textTertiary,
  },
  analogClock: {
    alignItems: 'center',
  },
  clockFace: {
    width: TIMER_SIZE - 80,
    height: TIMER_SIZE - 80,
    borderRadius: (TIMER_SIZE - 80) / 2,
    borderWidth: 2,
    borderColor: Colors.light.text,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  hourMarker: {
    position: 'absolute',
    width: 4,
    height: 12,
    backgroundColor: Colors.light.text,
    borderRadius: 2,
  },
  minuteHand: {
    position: 'absolute',
    width: 4,
    height: '40%',
    borderRadius: 4,
    bottom: '50%',
    transformOrigin: 'bottom',
  },
  secondHand: {
    position: 'absolute',
    width: 2,
    height: '45%',
    borderRadius: 2,
    bottom: '50%',
    transformOrigin: 'bottom',
  },
  centerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    position: 'absolute',
  },
  analogTimeText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginTop: 16,
  },
});