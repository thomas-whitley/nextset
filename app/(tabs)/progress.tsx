import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Trophy, Target, Calendar, Zap, FileText } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { formatKg, formatShortDate } from '@/utils/format';
import Colors from '@/constants/Colors';
import { spacing, radius, type, fonts, touch } from '@/constants/theme';
import { WorkoutHistoryService, ProgressStats } from '@/services/workoutHistoryService';
import { useAuth } from '@/data/AuthContext';

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

const screenWidth = Dimensions.get('window').width;

/**
 * chart-kit wants `(opacity) => rgba(...)` colour functions, not hex. Every
 * chart colour still has to trace back to a `Colors.light.*` token, so this
 * converts one rather than letting a raw rgb literal creep in.
 */
const hexToRgba = (hex: string, opacity: number): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const chartConfig = {
  backgroundGradientFrom: Colors.light.card,
  backgroundGradientTo: Colors.light.card,
  decimalPlaces: 0,
  color: (opacity = 1) => hexToRgba(Colors.light.primary, opacity),
  labelColor: (opacity = 1) => hexToRgba(Colors.light.textTertiary, opacity),
  style: {
    borderRadius: radius.card,
  },
  propsForDots: {
    r: '6',
    strokeWidth: '3',
    stroke: Colors.light.primary,
    fill: Colors.light.card,
  },
  propsForBackgroundLines: {
    strokeWidth: 1,
    stroke: Colors.light.border,
  },
  // react-native-svg Text accepts fontFamily directly; this is the one place
  // chart-kit exposes label typography, so point it at the numeric face.
  propsForLabels: {
    fontFamily: fonts.numeric,
  },
};

export default function ProgressScreen() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [workoutStreak, setWorkoutStreak] = useState({ currentStreak: 0, longestStreak: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <TrendingUp size={24} color={Colors.light.success} />
            <Text style={styles.statValue}>{progressStats?.totalWorkouts || 0}</Text>
            <Text style={styles.statLabel}>Total Workouts</Text>
          </View>
          <View style={styles.statCard}>
            <Trophy size={24} color={Colors.light.accent} />
            <Text style={styles.statValue}>{workoutStreak.currentStreak}</Text>
            <Text style={styles.statLabel}>Current Streak</Text>
          </View>
          <View style={styles.statCard}>
            <Target size={24} color={Colors.light.primary} />
            <Text style={styles.statValue}>
              {formatKg(progressStats?.totalVolume)}
            </Text>
            <Text style={styles.statLabel}>Total Volume</Text>
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
});
