import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timer, X, Calendar, Play, ChevronRight, Flame } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useAuth } from '@/data/AuthContext';
import WorkoutCalendarView from '@/components/WorkoutCalendarView';
import { WorkoutHistoryService, WorkoutHistoryEntry, toDateKey } from '@/services/workoutHistoryService';
import { Workout } from '@/services/exercise.types';
import { formatKg, formatShortDate, formatMinutes } from '@/utils/format';
import { greetingFor } from '@/data/userDisplay';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Monday-first dates of the current week, as local YYYY-MM-DD keys. */
const thisWeekKeys = (): string[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toDateKey(d);
  });
};

export default function HomeScreen() {
  const [recentModalVisible, setRecentModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [recent, setRecent] = useState<WorkoutHistoryEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { currentProgram, isLoadingProgram, startWorkout } = useWorkout();
  const { user, loading } = useAuth();

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const [rows, streakInfo] = await Promise.all([
        WorkoutHistoryService.getWorkoutHistory(user.id, 30),
        WorkoutHistoryService.getWorkoutStreak(user.id),
      ]);
      setRecent(rows);
      setStreak(streakInfo.currentStreak);
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoadingHistory(false);
    }
  }, [user]);

  // Reload whenever the tab regains focus (e.g. after finishing a workout).
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const weekKeys = thisWeekKeys();
  const doneKeys = new Set(recent.map((r) => toDateKey(new Date(r.completed_at))));
  const workoutsThisWeek = weekKeys.filter((k) => doneKeys.has(k)).length;
  const todayKey = toDateKey(new Date());
  const lastWorkout = recent[0] ?? null;

  // Up next: the workout after the most recently completed one in this program,
  // wrapping round; the first workout if nothing has been logged yet.
  const nextWorkout: Workout | null = (() => {
    if (!currentProgram || currentProgram.workouts.length === 0) return null;
    const ordered = [...currentProgram.workouts].sort((a, b) => a.order - b.order);
    const lastFromProgram = recent.find((r) => ordered.some((w) => w.id === r.workout_data?.id));
    if (!lastFromProgram) return ordered[0];
    const idx = ordered.findIndex((w) => w.id === lastFromProgram.workout_data.id);
    return ordered[(idx + 1) % ordered.length];
  })();

  const handleStart = () => {
    if (!nextWorkout) {
      router.push('/(tabs)/programs');
      return;
    }
    startWorkout(nextWorkout);
    router.push('/workout');
  };

  const greeting = greetingFor(user);
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>

        {/* Up next */}
        {isLoadingProgram ? (
          <View style={[styles.mainCard, styles.mainCardLoading]}>
            <ActivityIndicator color={Colors.light.primary} />
          </View>
        ) : nextWorkout && currentProgram ? (
          <View style={styles.mainCard}>
            <Text style={styles.workoutLabel}>Up next · {currentProgram.name}</Text>
            <Text style={styles.workoutName}>{nextWorkout.name}</Text>
            <Text style={styles.workoutExercises} numberOfLines={2}>
              {nextWorkout.exercises.length === 0
                ? 'No exercises yet — add some when you start.'
                : nextWorkout.exercises.map((e) => e.name).join(' · ')}
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={handleStart}
              accessibilityRole="button"
              accessibilityLabel={`Start ${nextWorkout.name}`}
            >
              <Play size={18} color="#FFFFFF" />
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mainCard}>
            <Text style={styles.workoutLabel}>No program yet</Text>
            <Text style={styles.workoutName}>Pick a program</Text>
            <Text style={styles.workoutExercises}>
              Choose a template in Programs, then start your first workout from here.
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => router.push('/(tabs)/programs')}
              accessibilityRole="button"
              accessibilityLabel="Choose a program"
            >
              <Text style={styles.startButtonText}>Choose a program</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* This week */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.cardTitle}>This week</Text>
              <Text style={styles.cardSubtitle}>
                {loadingHistory ? 'Loading…' : workoutsThisWeek === 0 ? 'No workouts yet this week' : `${workoutsThisWeek} ${workoutsThisWeek === 1 ? 'workout' : 'workouts'}`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => setCalendarModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Open workout calendar"
            >
              <Calendar size={18} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekView}>
            {weekKeys.map((key, index) => (
              <View key={key} style={styles.dayContainer}>
                <Text style={[styles.dayLabel, key === todayKey && styles.dayLabelToday]}>{DAY_LABELS[index]}</Text>
                <View style={[styles.dayDot, doneKeys.has(key) && styles.dayDotActive]} />
              </View>
            ))}
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Flame size={20} color={streak > 0 ? Colors.light.accent : Colors.light.textTertiary} />
            <Text style={styles.statValue}>{loadingHistory ? '—' : streak}</Text>
            <Text style={styles.statLabel}>{streak === 1 ? 'Day streak' : 'Day streak'}</Text>
          </View>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => setRecentModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Last workout"
          >
            <Text style={styles.statValue} numberOfLines={1}>
              {loadingHistory ? '—' : lastWorkout ? formatKg(lastWorkout.total_volume) : '—'}
            </Text>
            <Text style={styles.statLabel} numberOfLines={1}>
              {lastWorkout ? `${lastWorkout.workout_data?.name ?? 'Last workout'} · ${formatShortDate(lastWorkout.completed_at)}` : 'Last workout'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.quickTimer}
          onPress={() => router.push('/timer')}
          accessibilityRole="button"
          accessibilityLabel="Timer"
          accessibilityHint="Interval and rest timers"
        >
          <Timer size={24} color={Colors.light.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.quickTimerText}>Timer</Text>
            <Text style={styles.quickTimerSubtext}>Intervals and rest between sets</Text>
          </View>
          <ChevronRight size={18} color={Colors.light.textTertiary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Recent workouts */}
      <Modal animationType="fade" transparent visible={recentModalVisible} onRequestClose={() => setRecentModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRecentModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Recent workouts</Text>
              <TouchableOpacity onPress={() => setRecentModalVisible(false)} accessibilityRole="button" accessibilityLabel="Close">
                <X size={24} color={Colors.light.textTertiary} />
              </TouchableOpacity>
            </View>
            {recent.length === 0 ? (
              <Text style={styles.modalEmpty}>Nothing logged yet. Finish a workout and it shows here.</Text>
            ) : (
              recent.slice(0, 6).map((row) => (
                <View key={row.id} style={styles.workoutItem}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.workoutItemName}>{row.workout_data?.name ?? 'Workout'}</Text>
                    <Text style={styles.workoutItemDate}>
                      {formatShortDate(row.completed_at)} · {formatMinutes(row.duration_minutes)}
                    </Text>
                  </View>
                  <Text style={styles.workoutItemVolume}>{formatKg(row.total_volume)}</Text>
                </View>
              ))
            )}
          </View>
        </Pressable>
      </Modal>

      <WorkoutCalendarView visible={calendarModalVisible} onClose={() => setCalendarModalVisible(false)} />
    </SafeAreaView>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { flex: 1, paddingHorizontal: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 20, paddingBottom: 24 },
  greeting: { fontSize: 28, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, marginBottom: 4 },
  date: { fontSize: 16, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary },
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
  mainCardLoading: { minHeight: 180, justifyContent: 'center', alignItems: 'center' },
  workoutLabel: { fontSize: 14, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, marginBottom: 4 },
  workoutName: { fontSize: 26, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, marginBottom: 8 },
  workoutExercises: { fontSize: 14, fontFamily: 'Archivo-Regular', color: Colors.light.textSecondary, lineHeight: 20, marginBottom: 20 },
  startButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonText: { fontSize: 18, fontFamily: 'ArchivoNarrow-Bold', color: '#FFFFFF' },
  card: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, marginBottom: 16, ...shadow },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  cardSubtitle: { fontSize: 14, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, marginTop: 2 },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekView: { flexDirection: 'row', justifyContent: 'space-between' },
  dayContainer: { alignItems: 'center' },
  dayLabel: { fontSize: 12, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, marginBottom: 8 },
  dayLabelToday: { color: Colors.light.primary, fontFamily: 'ArchivoNarrow-Bold' },
  dayDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.light.border },
  dayDotActive: { backgroundColor: Colors.light.primary },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, alignItems: 'center', ...shadow },
  statValue: { fontSize: 20, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, marginTop: 8, marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, textAlign: 'center' },
  quickTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
  },
  quickTimerText: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text },
  quickTimerSubtext: { fontSize: 12, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: Colors.light.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 20, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  modalEmpty: { fontSize: 14, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, paddingVertical: 12 },
  workoutItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  workoutItemName: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text },
  workoutItemDate: { fontSize: 13, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, marginTop: 2 },
  workoutItemVolume: { fontSize: 16, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.primary },
});
