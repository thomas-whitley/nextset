import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Trophy, Target, Calendar, Zap, FileText } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { formatKg, formatShortDate } from '@/utils/format';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
import { chartConfig } from '@/constants/chart';
import { WorkoutHistoryService, ProgressStats } from '@/services/workoutHistoryService';
import { useAuth } from '@/data/AuthContext';
import { router, useFocusEffect } from 'expo-router';
import HistoryRow from '@/components/HistoryRow';
import { historyRow, historyWindow } from '@/services/historySummary';
import type { WorkoutHistoryEntry } from '@/services/workoutHistoryService';

const HISTORY_PAGE = 20;

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

const screenWidth = Dimensions.get('window').width;

export default function ProgressScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [workoutStreak, setWorkoutStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Not tied to the range control: history is every workout, newest first, 20 at a time; a refresh keeps what is loaded.
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);

  // A ref, so the focus refresh below always sees how many rows are loaded.
  const loadedRef = useRef(0);
  loadedRef.current = history.length;

  const loadHistory = useCallback(
    async (fromStart: boolean) => {
      if (!user) return;
      setHistoryLoading(true);
      try {
        const { offset, limit } = historyWindow(loadedRef.current, fromStart, HISTORY_PAGE);
        const page = await WorkoutHistoryService.getWorkoutHistory(user.id, limit, offset);
        setHistory((prev) => (fromStart ? page : [...prev, ...page]));
        setHasMoreHistory(page.length === limit);
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setHistoryLoading(false);
      }
    },
    [user]
  );

  // Reload on focus so a workout finished a moment ago is at the top.
  useFocusEffect(
    useCallback(() => {
      void loadHistory(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])
  );

  useEffect(() => {
    loadProgressData();
  }, [timeRange, user]);

  const loadProgressData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const days = getTimeRangeDays(timeRange);
      const [stats, streak] = await Promise.all([
        WorkoutHistoryService.getProgressStats(user.id, days),
        WorkoutHistoryService.getWorkoutStreak(user.id),
      ]);

      setProgressStats(stats);
      setWorkoutStreak(streak);
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeDays = (range: TimeRange): number => {
    switch (range) {
      case '1W': return 7;
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
      case '1Y': return 365;
      default: return 30;
    }
  };

  const formatVolumeData = () => {
    if (!progressStats?.volumeProgress.length) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }

    // Group by week for better visualization
    const weeklyData: Record<string, number> = {};
    progressStats.volumeProgress.forEach(item => {
      const date = new Date(item.date);
      const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
      const weekKey = weekStart.toISOString().split('T')[0];
      weeklyData[weekKey] = (weeklyData[weekKey] || 0) + item.volume;
    });

    const sortedWeeks = Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-8); // Show last 8 weeks

    return {
      labels: sortedWeeks.map(([date]) => {
        const d = new Date(date);
        return `${d.getMonth() + 1}/${d.getDate()}`;
      }),
      datasets: [{
        // Plot real kilograms. Rounding to thousands flattened every early
        // user to 0 or 1 — a 960 kg week drew as "1" and a 400 kg week as a
        // flat zero, which is precisely the range a new lifter sits in.
        data: sortedWeeks.map(([, volume]) => Math.round(volume)),
        color: () => Colors.light.primary,
        strokeWidth: 3,
      }],
    };
  };

  /** One axis segment per whole workout, capped, so ticks stay distinct. */
  const peakWeeklyWorkouts = (progressStats?.workoutFrequency ?? [])
    .reduce((peak, day) => Math.max(peak, day.count), 1);
  const frequencySegments = Math.min(4, peakWeeklyWorkouts);

  const formatFrequencyData = () => {
    if (!progressStats?.workoutFrequency.length) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }

    const last7Days = progressStats.workoutFrequency.slice(-7);
    return {
      labels: last7Days.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      }),
      datasets: [{
        data: last7Days.map(item => item.count),
      }],
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
        <View style={styles.timeRanges}>
          {(['1W', '1M', '3M', '6M', '1Y'] as TimeRange[]).map((range) => (
            <TouchableOpacity
              key={range}
              style={[
                styles.timeRange,
                timeRange === range && styles.activeTimeRange
              ]}
              onPress={() => setTimeRange(range)}
              accessibilityRole="button"
              accessibilityLabel={`${range} range`}
              accessibilityState={{ selected: timeRange === range }}
            >
              <Text
                style={[
                  styles.timeRangeText,
                  timeRange === range && styles.activeTimeRangeText
                ]}
              >
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Key Stats */}
        {/* A third of the screen wide: past 1.3× single words break mid-word (device run T2-7). */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <TrendingUp size={24} color={Colors.light.success} />
            <Text style={styles.statValue} maxFontSizeMultiplier={1.3}>{progressStats?.totalWorkouts || 0}</Text>
            <Text style={styles.statLabel} maxFontSizeMultiplier={1.3}>Total Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Trophy size={24} color={Colors.light.accent} />
            <Text style={styles.statValue} maxFontSizeMultiplier={1.3}>{workoutStreak.currentStreak}</Text>
            <Text style={styles.statLabel} maxFontSizeMultiplier={1.3}>Current Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Target size={24} color={Colors.light.primary} />
            <Text style={styles.statValue} maxFontSizeMultiplier={1.3}>
              {formatKg(progressStats?.totalVolume)}
            </Text>
            <Text style={styles.statLabel} maxFontSizeMultiplier={1.3}>Total Volume</Text>
          </View>
        </View>

        {/* Volume Chart. One point is not a trend, and chart-kit misplaces an
            axis label outside the card when given a single value — so wait for
            a second week before drawing anything. */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Volume Trend</Text>
          {formatVolumeData().datasets[0].data.length < 2 ? (
            <Text style={styles.chartEmpty}>
              Log a workout in another week and your volume trend appears here.
            </Text>
          ) : (
          <LineChart
            data={formatVolumeData()}
            width={screenWidth - 80}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
            withInnerLines={false}
            withOuterLines={false}
            withVerticalLabels={true}
            withHorizontalLabels={true}
            fromZero={true}
          />
          )}
          {/* Points are labelled with the week's start date, which reads as
              plain wrong unless we say so — a Friday session showed "8/23". */}
          <Text style={styles.chartSubtitle}>Total volume (kg), by week commencing</Text>
        </View>

        {/* Workout Frequency */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Workout Frequency</Text>
          <BarChart
            data={formatFrequencyData()}
            width={screenWidth - 80}
            height={220}
            chartConfig={{
              ...chartConfig,
              barPercentage: 0.7,
              // Workout counts are small integers. The default four segments
              // divide a max of 1 into fractions that all format as whole
              // numbers, drawing the axis as "1, 1, 1, 0, 0".
              decimalPlaces: 0,
            }}
            segments={frequencySegments}
            style={styles.chart}
            withInnerLines={false}
            withHorizontalLabels={true}
            fromZero={true}
            showValuesOnTopOfBars={true} yAxisLabel={''} yAxisSuffix={''}          />
        </View>

        {/* Exercise Progress — leads with the weight, the loudest figure in
            the row, per the design ruling on PR lists. */}
        {progressStats?.exerciseProgress && progressStats.exerciseProgress.length > 0 && (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseTitle}>Personal Records</Text>
            {progressStats.exerciseProgress.slice(0, 5).map((exercise, index) => (
              <View key={index} style={styles.exerciseItem}>
                <Text style={styles.exerciseWeight}>{formatKg(exercise.maxWeight)}</Text>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.exercise}</Text>
                  <Text style={styles.exerciseDate}>
                    {formatShortDate(exercise.date)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.historyCard}>
          <Text style={[styles.chartTitle, styles.historyTitle]}>History</Text>
          {history.length === 0 && !historyLoading ? (
            <Text style={styles.historyEmpty}>Finished workouts show here.</Text>
          ) : null}
          {history.map((entry, i) => {
            const r = historyRow(entry);
            return (
              <HistoryRow
                key={r.id}
                title={r.title}
                completedAt={r.completedAt}
                sets={r.sets}
                volume={r.volume}
                first={i === 0}
                onPress={() => router.push({ pathname: '/workout-detail', params: { id: r.id } })}
              />
            );
          })}
          {historyLoading ? (
            <ActivityIndicator color={Colors.light.primary} style={styles.historyLoader} />
          ) : hasMoreHistory ? (
            <TouchableOpacity style={styles.moreButton} onPress={() => void loadHistory(false)} accessibilityRole="button">
              <Text style={styles.moreText}>Show older workouts</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Workout Notes */}
        {progressStats?.workoutNotes && progressStats.workoutNotes.length > 0 && (
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <FileText size={20} color={Colors.light.primary} />
              <Text style={styles.notesTitle}>Recent Workout Notes</Text>
            </View>
            {progressStats.workoutNotes.slice(0, 3).map((note, index) => (
              <View key={index} style={styles.noteItem}>
                <View style={styles.noteHeader}>
                  <Text style={styles.noteWorkoutName}>{note.workoutName}</Text>
                  <Text style={styles.noteDate}>
                    {formatShortDate(note.date)}
                  </Text>
                </View>
                <Text style={styles.noteText}>{note.notes}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <Calendar size={24} color={Colors.light.primary} />
            <Text style={styles.streakTitle}>Workout Streak</Text>
          </View>
          <View style={styles.streakStats}>
            <View style={styles.streakStat}>
              <Text style={styles.streakValue}>{workoutStreak.currentStreak}</Text>
              <Text style={styles.streakLabel}>Current Streak</Text>
            </View>
            <View style={styles.streakStat}>
              <Text style={styles.streakValue}>{workoutStreak.longestStreak}</Text>
              <Text style={styles.streakLabel}>Best Streak</Text>
            </View>
          </View>
        </View>

        {/* Empty State */}
        {!progressStats?.totalWorkouts && (
          <View style={styles.emptyState}>
            <Zap size={48} color={Colors.light.textTertiary} />
            <Text style={styles.emptyTitle}>Start Your Journey</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first workout to see your progress here!
            </Text>
          </View>
        )}
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
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...type.bodyMedium,
    color: Colors.light.textTertiary,
    marginTop: spacing.base,
  },
  header: {
    flexDirection: 'column',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  title: {
    ...type.title,
    color: Colors.light.text,
  },
  timeRanges: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: Colors.light.border,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  timeRange: {
    flex: 1,
    minHeight: touch.min,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTimeRange: {
    backgroundColor: Colors.light.card,
  },
  timeRangeText: {
    fontFamily: 'ArchivoNarrow-SemiBold',
    fontSize: 17,
    color: Colors.light.textSecondary,
  },
  activeTimeRangeText: {
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: spacing.xs,
    ...shadow,
  },
  statValue: {
    ...type.title,
    color: Colors.light.text,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...type.label,
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
  chartCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow,
  },
  chartTitle: {
    ...type.eyebrow,
    color: Colors.light.textSecondary,
    marginBottom: spacing.base,
  },
  chart: {
    borderRadius: radius.card,
    marginLeft: -spacing.lg,
  },
  chartSubtitle: {
    ...type.label,
    color: Colors.light.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  chartEmpty: {
    ...type.bodyMedium,
    color: Colors.light.textTertiary,
    textAlign: 'center',
    paddingVertical: spacing.xxxl + spacing.sm,
    paddingHorizontal: spacing.base,
  },
  exerciseCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow,
  },
  exerciseTitle: {
    ...type.section,
    color: Colors.light.text,
    marginBottom: spacing.base,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  exerciseInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  exerciseName: {
    ...type.section,
    color: Colors.light.text,
  },
  exerciseDate: {
    ...type.label,
    color: Colors.light.textTertiary,
    marginTop: spacing.xs / 2,
  },
  // The loudest figure on the screen, per the PR-list ruling. Tabular
  // numerals are already built into type.display.
  exerciseWeight: {
    ...type.display,
    color: Colors.light.primary,
  },
  notesCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadow,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  notesTitle: {
    ...type.section,
    color: Colors.light.text,
    marginLeft: spacing.md,
  },
  noteItem: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  noteWorkoutName: {
    ...type.bodyMedium,
    color: Colors.light.text,
  },
  noteDate: {
    ...type.label,
    color: Colors.light.textTertiary,
  },
  noteText: {
    ...type.body,
    color: Colors.light.textSecondary,
  },
  streakCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.xxxl,
    ...shadow,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  streakTitle: {
    ...type.section,
    color: Colors.light.text,
    marginLeft: spacing.md,
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakStat: {
    alignItems: 'center',
  },
  streakValue: {
    ...type.display,
    color: Colors.light.primary,
    marginBottom: spacing.xs,
  },
  streakLabel: {
    ...type.label,
    color: Colors.light.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxxl + spacing.xl,
  },
  emptyTitle: {
    ...type.title,
    color: Colors.light.text,
    marginTop: spacing.base,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...type.bodyMedium,
    color: Colors.light.textTertiary,
    textAlign: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  historyCard: { backgroundColor: Colors.light.card, borderRadius: radius.card, marginBottom: spacing.lg, paddingTop: spacing.lg, overflow: 'hidden', ...shadow },
  historyTitle: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  historyEmpty: { ...type.body, color: Colors.light.textTertiary, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  historyLoader: { marginVertical: spacing.base },
  moreButton: { minHeight: touch.min, justifyContent: 'center', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.light.background },
  moreText: { fontFamily: 'Archivo-SemiBold', fontSize: 16, color: Colors.light.primary },
});
