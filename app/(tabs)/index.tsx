import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Play, ChevronRight, Flame, Zap } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, elevation, type, touch } from '@/constants/theme';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useAuth } from '@/data/AuthContext';
import WorkoutCalendarView from '@/components/WorkoutCalendarView';
import { WorkoutHistoryService, WorkoutHistoryEntry, toDateKey } from '@/services/workoutHistoryService';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { pickNextWorkout, exerciseListLine } from '@/services/upNext';
import type { Program } from '@/services/exercise.types';
import { formatKg, formatShortDate, plural } from '@/utils/format';
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
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [recent, setRecent] = useState<WorkoutHistoryEntry[]>([]);
  const [streak, setStreak] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const { programs, currentProgram, isLoadingProgram, setCurrentProgram, programLoadFailed, retryProgramLoad } = useWorkout();
  const { start, startQuick } = useStartWorkout();
  const [choosing, setChoosing] = useState<string | null>(null);
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

  const nextWorkout = pickNextWorkout(currentProgram, recent);

  const choose = async (program: Program) => {
    setChoosing(program.id);
    try {
      await setCurrentProgram(program);
    } catch {
      Alert.alert('Could not select program', 'Check your connection and try again.');
    } finally {
      setChoosing(null);
    }
  };

  const quickButton = (
    <TouchableOpacity style={styles.quickButton} onPress={startQuick} accessibilityRole="button" accessibilityLabel="Quick workout">
      <Zap size={20} color={Colors.light.onRubber} />
      <Text style={styles.quickButtonText}>Quick workout</Text>
    </TouchableOpacity>
  );

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

        {/* Up next — rubber slab */}
        {isLoadingProgram ? (
          <View style={[styles.mainCard, styles.mainCardLoading]}>
            <ActivityIndicator color={Colors.light.onRubber} />
          </View>
        ) : programLoadFailed ? (
          // A failed restore is not a first run (review M13).
          <View style={styles.mainCard}>
            <Text style={styles.workoutLabel}>Your program</Text>
            <Text style={styles.workoutName}>Did not load</Text>
            <Text style={styles.workoutExercises}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.startButton} onPress={retryProgramLoad} accessibilityRole="button" accessibilityLabel="Try loading your program again">
              <Text style={styles.startButtonText}>Try again</Text>
            </TouchableOpacity>
            {quickButton}
          </View>
        ) : nextWorkout && currentProgram ? (
          <View style={styles.mainCard}>
            <Text style={styles.workoutLabel}>Up next in {currentProgram.name}</Text>
            <Text style={styles.workoutName}>{nextWorkout.name}</Text>
            <Text style={styles.workoutExercises} numberOfLines={2}>
              {exerciseListLine(nextWorkout.exercises.map((e) => e.name))}
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => start(nextWorkout)}
              accessibilityRole="button"
              accessibilityLabel={`Start ${nextWorkout.name}`}
            >
              <Play size={18} color="#FFFFFF" fill="#FFFFFF" />
              <Text style={styles.startButtonText}>Start {nextWorkout.name}</Text>
            </TouchableOpacity>
            {quickButton}
          </View>
        ) : (
          // First run (spec §6.4): with no program the slab is the picker.
          <View style={styles.mainCard}>
            <Text style={styles.workoutLabel}>Get started</Text>
            <Text style={styles.workoutName}>Pick a program</Text>
            <Text style={styles.workoutExercises}>Follow one of these, or log a quick workout.</Text>
            <View style={styles.templateList}>
              {programs.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.templateRow}
                  onPress={() => choose(p)}
                  disabled={choosing !== null}
                  accessibilityRole="button"
                  accessibilityLabel={`Start with ${p.name}`}
                >
                  <View style={styles.templateText}>
                    <Text style={styles.templateName}>{p.name}</Text>
                    <Text style={styles.templateMeta}>{p.schedule ?? plural(p.workouts.length, 'day')}</Text>
                  </View>
                  {choosing === p.id ? (
                    <ActivityIndicator color={Colors.light.onRubber} />
                  ) : (
                    <ChevronRight size={20} color={Colors.light.onRubberSecondary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            {quickButton}
          </View>
        )}

        {/* This week */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
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
            {weekKeys.map((key, index) => {
              const done = doneKeys.has(key);
              const isToday = key === todayKey;
              return (
                <View
                  key={key}
                  style={[styles.dayDot, done && styles.dayDotActive, isToday && !done && styles.dayDotToday]}
                  accessibilityLabel={`${DAY_LABELS[index]}${isToday ? ', today' : ''}${done ? ', workout logged' : ''}`}
                >
                  <Text style={[styles.dayLabel, done && { color: '#FFFFFF' }, isToday && styles.dayLabelToday]}>
                    {DAY_LABELS[index]}
                  </Text>
                </View>
              );
            })}
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
            onPress={() => router.push('/(tabs)/progress')}
            accessibilityRole="button"
            accessibilityLabel="Last workout. Opens your history in Progress"
          >
            <Text style={styles.statValue} numberOfLines={1}>
              {loadingHistory ? '—' : lastWorkout ? formatKg(lastWorkout.total_volume) : '—'}
            </Text>
            <Text style={styles.statLabel} numberOfLines={2}>
              {lastWorkout ? `${lastWorkout.workout_data?.name ?? 'Last workout'} · ${formatShortDate(lastWorkout.completed_at)}` : 'Last workout'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

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
  content: { flex: 1, paddingHorizontal: spacing.lg },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  greeting: { ...type.title, color: Colors.light.text, marginBottom: spacing.xs },
  date: { ...type.body, color: Colors.light.textTertiary },

  // Up next — rubber slab.
  mainCard: {
    backgroundColor: Colors.light.rubber,
    borderRadius: radius.slab,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...elevation.slab,
  },
  mainCardLoading: { minHeight: 180, justifyContent: 'center', alignItems: 'center' },
  workoutLabel: { ...type.label, color: Colors.light.onRubberSecondary, marginBottom: spacing.xs },
  workoutName: { ...type.display, color: Colors.light.onRubber, marginBottom: spacing.sm },
  workoutExercises: { ...type.body, color: Colors.light.onRubberSecondary, marginBottom: spacing.lg },
  startButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: radius.card,
    minHeight: touch.row,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  startButtonText: { ...type.section, color: '#FFFFFF' },

  card: { backgroundColor: Colors.light.card, borderRadius: radius.card, padding: spacing.lg, marginBottom: spacing.base, ...shadow },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  cardTitle: { ...type.section, color: Colors.light.text },
  cardSubtitle: { ...type.label, fontSize: 15, color: Colors.light.textSecondary, marginTop: spacing.xs / 2 },
  calendarButton: {
    width: touch.min,
    height: touch.min,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Week dots — plate discs. The day letter sits inside the disc; done days
  // fill solid, today gets a quiet ring when not done.
  weekView: { flexDirection: 'row', justifyContent: 'space-between' },
  dayLabel: { fontFamily: 'Archivo-SemiBold', fontSize: 14, color: Colors.light.textSecondary },
  dayLabelToday: { color: Colors.light.text },
  dayDot: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotActive: { backgroundColor: Colors.light.primary },
  dayDotToday: { backgroundColor: Colors.light.card, borderWidth: 2, borderColor: Colors.light.text },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.base },
  statCard: { flex: 1, backgroundColor: Colors.light.card, borderRadius: radius.card, padding: spacing.base, alignItems: 'center', ...shadow },
  statValue: { ...type.title, color: Colors.light.text, marginTop: spacing.sm },
  statLabel: { ...type.label, fontSize: 15, color: Colors.light.textSecondary, textAlign: 'center' },

  quickButton: {
    minHeight: touch.min,
    marginTop: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: Colors.light.borderOnRubber,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  quickButtonText: { fontFamily: 'Archivo-Medium', fontSize: 16, color: Colors.light.onRubber },
  templateList: { gap: spacing.sm, marginBottom: spacing.xs },
  templateRow: {
    minHeight: 64,
    borderRadius: radius.card,
    backgroundColor: Colors.light.slabField,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  templateText: { flex: 1, gap: 2 },
  templateName: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 20, color: Colors.light.onRubber },
  templateMeta: { ...type.label, fontSize: 15, color: Colors.light.onRubberSecondary },
});
