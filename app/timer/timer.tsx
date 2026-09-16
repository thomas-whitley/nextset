import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Clock, Zap, Timer } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, type } from '@/constants/theme';

export default function TimerTab() {
  const handleNavigateToTimers = () => {
    router.push('/timer-main');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Timers</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.timerCard}
          onPress={handleNavigateToTimers}
          accessibilityRole="button"
          accessibilityLabel="Workout timers"
        >
          <View style={styles.timerIconContainer}>
            <Clock size={48} color={Colors.light.primary} />
          </View>
          <Text style={styles.timerTitle}>Workout Timers</Text>
          <Text style={styles.timerDescription}>
            Interval, circuit, and HIIT timers for your workouts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.timerCard} accessibilityRole="button" accessibilityLabel="Rest timer">
          <View style={styles.timerIconContainer}>
            <Timer size={48} color={Colors.light.success} />
          </View>
          <Text style={styles.timerTitle}>Rest Timer</Text>
          <Text style={styles.timerDescription}>
            Simple countdown timer for between sets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.timerCard} accessibilityRole="button" accessibilityLabel="Tabata timer">
          <View style={[styles.timerIconContainer, styles.timerIconWarning]}>
            <Zap size={48} color={Colors.light.text} />
          </View>
          <Text style={styles.timerTitle}>Tabata Timer</Text>
          <Text style={styles.timerDescription}>
            Classic 20/10 Tabata interval timer
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  title: { ...type.title, color: Colors.light.text },
  content: { flex: 1, padding: spacing.lg },
  timerCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.xl,
    marginBottom: spacing.base,
    alignItems: 'center',
    ...shadow,
  },
  timerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  timerIconWarning: { backgroundColor: Colors.light.warning },
  timerTitle: { ...type.section, color: Colors.light.text, marginBottom: spacing.sm },
  timerDescription: { ...type.body, color: Colors.light.textTertiary, textAlign: 'center' },
});
