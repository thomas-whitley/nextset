import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { Calendar, Clock, TrendingUp, Target, X } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import WorkoutCalendarView from '@/components/WorkoutCalendarView';

export default function HomeScreen() {
  const [showCalendar, setShowCalendar] = useState(false);
  const [weeklyStreak, setWeeklyStreak] = useState(3);
  const [totalWorkouts, setTotalWorkouts] = useState(24);

  const quickStats = [
    {
      title: 'Weekly Streak',
      value: weeklyStreak,
      icon: TrendingUp,
      color: Colors.light.primary,
      onPress: () => setShowCalendar(true),
    },
    {
      title: 'Total Workouts',
      value: totalWorkouts,
      icon: Target,
      color: Colors.light.success,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning!</Text>
        <Text style={styles.subtitle}>Ready for today's workout?</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        {quickStats.map((stat, index) => (
          <Pressable
            key={index}
            style={[styles.statCard, { borderLeftColor: stat.color }]}
            onPress={stat.onPress}
          >
            <View style={styles.statHeader}>
              <stat.icon size={24} color={stat.color} />
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </Pressable>
        ))}
      </View>

      {/* Master Timer Section */}
      <View style={styles.timerSection}>
        <View style={styles.sectionHeader}>
          <Clock size={24} color={Colors.light.primary} />
          <Text style={styles.sectionTitle}>Master Timer</Text>
        </View>
        <Pressable
          style={styles.timerCard}
          onPress={() => router.push('/timer-main')}
        >
          <Text style={styles.timerTitle}>Workout Timer</Text>
          <Text style={styles.timerSubtitle}>Access full timer functionality</Text>
          <View style={styles.timerButton}>
            <Text style={styles.timerButtonText}>Open Timer</Text>
          </View>
        </Pressable>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.actionButton}
            onPress={() => router.push('/workout')}
          >
            <Text style={styles.actionButtonText}>Start Workout</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => router.push('/(tabs)/programs')}
          >
            <Text style={[styles.actionButtonText, styles.secondaryButtonText]}>
              View Programs
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Calendar Modal */}
      <Modal
        visible={showCalendar}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Workout Calendar</Text>
            <Pressable
              style={styles.closeButton}
              onPress={() => setShowCalendar(false)}
            >
              <X size={24} color={Colors.light.text} />
            </Pressable>
          </View>
          <WorkoutCalendarView onClose={() => setShowCalendar(false)} />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  statTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
  },
  timerSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  timerCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  timerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  timerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    marginBottom: 16,
  },
  timerButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  timerButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  actionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButtons: {
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: 'white',
  },
  secondaryButtonText: {
    color: Colors.light.primary,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 8,
  },
});