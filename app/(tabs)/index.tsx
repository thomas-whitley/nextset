import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Target, Timer, Trophy, TrendingUp, X, Clock, Calendar } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useAuth } from '@/data/AuthContext';
import WorkoutCalendarView from '@/components/WorkoutCalendarView';
import MotivationalQuote from '@/components/MotivationalQuote';

export default function HomeScreen() {
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const { currentProgram, startWorkout } = useWorkout();
  const { user, loading } = useAuth();
  
  const currentDate = new Date();
  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const weeklyStreak = 3;
  const recentWorkouts = [
    { name: 'Push Day', date: 'Yesterday', volume: '8,500kg' },
    { name: 'Pull Day', date: '2 days ago', volume: '7,200kg' },
    { name: 'Legs Day', date: '4 days ago', volume: '9,800kg' },
    { name: 'Upper Body', date: '6 days ago', volume: '6,900kg' },
  ];

  const activeGoals = [
    { exercise: 'Squat', current: '100kg', target: '120kg', progress: 0.83 },
    { exercise: 'Bench Press', current: '80kg', target: '90kg', progress: 0.89 },
    { exercise: '5K Run', current: '26:30', target: '25:00', progress: 0.94 },
  ];

  const handleStartWorkout = () => {
    if (currentProgram) {
      startWorkout(currentProgram.workouts[0]);
      router.push('/workout');
    }
  };

  const handleQuickTimer = () => {
    // Navigate to the comprehensive timer screen instead of a simple timer
    router.push('/timer');
  };

  // Show loading state while auth is loading
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>Hello, {user?.user_metadata?.full_name || user?.email || 'Alex'}</Text>
          <Text style={styles.date}>{formatDate(currentDate)}</Text>
        </View>

        {/* Motivational Quote */}
        <MotivationalQuote />

        {/* Main Workout Card */}
        <TouchableOpacity style={styles.mainCard} onPress={handleStartWorkout}>
          accessibilityRole="button"
          accessibilityLabel={`Start ${currentProgram ? currentProgram.workouts[0].name : 'Push Day'} workout`}
          accessibilityHint="Begin your scheduled workout session"
        >
          <View style={styles.mainCardHeader}>
            <View style={styles.workoutInfo}>
              <Text style={styles.workoutLabel}>Today's Workout</Text>
              <Text style={styles.workoutName}>
                {currentProgram ? currentProgram.workouts[0].name : 'Push Day'}
              </Text>
            </View>
            <View style={styles.workoutIcon}>
              <Zap size={24} color={Colors.light.primary} />
            </View>
          </View>
          
          <View style={styles.workoutStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>8,500kg</Text>
              <Text style={styles.statLabel}>Last Volume</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>3 PRs</Text>
              <Text style={styles.statLabel}>To Beat</Text>
            </View>
          </View>

          <View style={styles.startButton}>
            <Text style={styles.startButtonText}>Start Workout</Text>
            <Zap size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* Streak Tile */}
        <TouchableOpacity 
          style={styles.streakCard}
          onLongPress={() => setStreakModalVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Weekly streak: ${weeklyStreak} weeks`}
          accessibilityHint="Long press to view recent workouts, or tap calendar icon to view workout calendar"
        >
          <View style={styles.streakHeader}>
            <View>
              <Text style={styles.streakTitle}>Weekly Streak</Text>
              <Text style={styles.streakSubtitle}>{weeklyStreak} weeks with 2+ workouts</Text>
            </View>
            <Pressable 
              style={styles.streakBadge}
              onPress={() => setCalendarModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="View workout calendar"
              accessibilityHint="Open calendar view to see workout history and schedule"
            >
              <Calendar size={16} color="#FFFFFF" />
              <Text style={styles.streakNumber}>{weeklyStreak}</Text>
            </Pressable>
          </View>
          
          <View style={styles.weekView}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <View key={index} style={styles.dayContainer}>
                <Text style={styles.dayLabel}>{day}</Text>
                <View style={[
                  styles.dayDot,
                  [true, false, true, false, true, false, false][index] && styles.dayDotActive
                ]} />
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Active Goals */}
        <View style={styles.goalsCard}>
          <Text style={styles.goalsTitle}>Active Goals</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.goalsList}>
            {activeGoals.map((goal, index) => (
              <View key={index} style={styles.goalItem}>
                <Text style={styles.goalExercise}>{goal.exercise}</Text>
                <Text style={styles.goalProgress}>{goal.current} → {goal.target}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${goal.progress * 100}%` }]} />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <View style={styles.quickActionRow}>
            <TouchableOpacity 
              style={styles.quickTimer}
              onPress={handleQuickTimer}
             accessibilityRole="button"
             accessibilityLabel="Quick Timer"
             accessibilityHint="Open timer for rest periods between sets"
            >
              <Timer size={32} color={Colors.light.primary} />
              <Text style={styles.quickTimerText}>Quick Timer</Text>
              <Text style={styles.quickTimerSubtext}>Rest between sets</Text>
            </TouchableOpacity>
            
            <View style={styles.quickStats}>
              <View style={styles.quickStatItem}>
                <TrendingUp size={20} color={Colors.light.success} />
                <Text style={styles.quickStatValue}>+12%</Text>
                <Text style={styles.quickStatLabel}>This Month</Text>
              </View>
              <View style={styles.quickStatItem}>
                <Trophy size={20} color={Colors.light.accent} />
                <Text style={styles.quickStatValue}>47</Text>
                <Text style={styles.quickStatLabel}>Total PRs</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.quickActionRow}>
            {/* Empty space to maintain layout after removing Timer Presets */}
            <View style={styles.timerPresetsContainer} />
          </View>
        </View>
      </ScrollView>

      {/* Streak Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={streakModalVisible}
        onRequestClose={() => setStreakModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setStreakModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recent Workouts</Text>
              <TouchableOpacity onPress={() => setStreakModalVisible(false)}>
                <X size={24} color={Colors.light.textTertiary} />
              </TouchableOpacity>
            </View>
            {recentWorkouts.map((workout, index) => (
              <View key={index} style={styles.workoutItem}>
                <View>
                  <Text style={styles.workoutItemName}>{workout.name}</Text>
                  <Text style={styles.workoutItemDate}>{workout.date}</Text>
                </View>
                <Text style={styles.workoutItemVolume}>{workout.volume}</Text>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Workout Calendar Modal */}
      <WorkoutCalendarView 
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  mainCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 4,
  },
  workoutName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  workoutIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  workoutStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
    marginHorizontal: 20,
  },
  startButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginRight: 8,
  },
  streakCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  streakSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  streakBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  streakNumber: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  weekView: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayContainer: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 8,
  },
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.light.border,
  },
  dayDotActive: {
    backgroundColor: Colors.light.primary,
  },
  goalsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  goalsTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  goalsList: {
    flexDirection: 'row',
  },
  goalItem: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 140,
  },
  goalExercise: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  goalProgress: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.primary,
    borderRadius: 2,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quickActions: {
    marginBottom: 40,
  },
  quickTimer: {
    flex: 1,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  quickTimerText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  quickTimerSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
  timerPresetsContainer: {
    flex: 1,
  },
  timerPresetsButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  timerPresetsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  timerPresetsSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
  quickStats: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 8,
  },
  quickStatItem: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  quickStatValue: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  workoutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  workoutItemName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
  },
  workoutItemDate: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  workoutItemVolume: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
  },
});