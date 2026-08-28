import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, Trophy, Target, Calendar, Heart, Zap, User, FileText } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { formatKg } from '@/utils/format';
import Colors from '@/constants/Colors';
import { WorkoutHistoryService, ProgressStats } from '@/services/workoutHistoryService';
import { useAuth } from '@/data/AuthContext';

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y';

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundGradientFrom: Colors.light.card,
  backgroundGradientTo: Colors.light.card,
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(5, 82, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
  style: {
    borderRadius: 16,
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

  const formatBodyweightData = () => {
    if (!progressStats?.bodyweightProgress.length) {
      return {
        labels: ['No Data'],
        datasets: [{ data: [0] }],
      };
    }

    const last10Entries = progressStats.bodyweightProgress.slice(-10);
    return {
      labels: last10Entries.map(item => {
        const date = new Date(item.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
      }),
      datasets: [{
        data: last10Entries.map(item => item.bodyweight),
        color: () => Colors.light.success,
        strokeWidth: 3,
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

        {/* Health Stats */}
        {/* Compare, don't rely on truthiness: `0 && ...` evaluates to 0, which
            React renders as a literal "0" floating above the card. */}
        {progressStats != null && (progressStats.averageHeartRate ?? 0) > 0 && (
          <View style={styles.healthCard}>
            <View style={styles.healthHeader}>
              <Heart size={24} color={Colors.light.error} />
              <Text style={styles.healthTitle}>Health Insights</Text>
            </View>
            <View style={styles.healthStats}>
              <View style={styles.healthStat}>
                <Text style={styles.healthStatValue}>
                  {Math.round(progressStats.averageHeartRate)}
                </Text>
                <Text style={styles.healthStatLabel}>Avg Heart Rate</Text>
              </View>
              <View style={styles.healthStat}>
                <Text style={styles.healthStatValue}>
                  {formatKg(progressStats.totalVolume / progressStats.totalWorkouts)}
                </Text>
                <Text style={styles.healthStatLabel}>Avg Volume</Text>
              </View>
            </View>
          </View>
        )}

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

        {/* Bodyweight Progress */}
        {progressStats?.bodyweightProgress && progressStats.bodyweightProgress.length > 0 && (
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <User size={20} color={Colors.light.success} />
              <Text style={styles.chartTitle}>Bodyweight Progress</Text>
            </View>
            <LineChart
              data={formatBodyweightData()}
              width={screenWidth - 80}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
                propsForDots: {
                  ...chartConfig.propsForDots,
                  stroke: Colors.light.success,
                },
              }}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
              withVerticalLabels={true}
              withHorizontalLabels={true}
              fromZero={false}
            />
            <Text style={styles.chartSubtitle}>Weight in kg</Text>
          </View>
        )}

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

        {/* Exercise Progress */}
        {progressStats?.exerciseProgress && progressStats.exerciseProgress.length > 0 && (
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseTitle}>Personal Records</Text>
            {progressStats.exerciseProgress.slice(0, 5).map((exercise, index) => (
              <View key={index} style={styles.exerciseItem}>
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseName}>{exercise.exercise}</Text>
                  <Text style={styles.exerciseDate}>
                    {new Date(exercise.date).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={styles.exerciseWeight}>{exercise.maxWeight}kg</Text>
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
                    {new Date(note.date).toLocaleDateString()}
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
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
  },
  timeRanges: {
    flexDirection: 'row',
  },
  timeRange: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  activeTimeRange: {
    backgroundColor: Colors.light.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.textTertiary,
  },
  activeTimeRangeText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
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
  statValue: {
    fontSize: 24,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
  healthCard: {
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
  healthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  healthTitle: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginLeft: 12,
  },
  healthStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  healthStat: {
    alignItems: 'center',
  },
  healthStatValue: {
    fontSize: 20,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.error,
    marginBottom: 4,
  },
  healthStatLabel: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
  },
  chartCard: {
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
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 20,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginBottom: 16,
    marginLeft: 8,
  },
  chart: {
    borderRadius: 16,
    marginLeft: -20,
  },
  chartSubtitle: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    marginTop: 8,
  },
  chartEmpty: {
    fontSize: 14,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    paddingVertical: 48,
    paddingHorizontal: 16,
  },
  exerciseCard: {
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
  exerciseTitle: {
    fontSize: 20,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
  },
  exerciseDate: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  exerciseWeight: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.primary,
  },
  notesCard: {
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
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  notesTitle: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginLeft: 12,
  },
  noteItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteWorkoutName: {
    fontSize: 14,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
  },
  noteDate: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
  },
  noteText: {
    fontSize: 14,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  streakCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  streakTitle: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginLeft: 12,
  },
  streakStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  streakStat: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: 32,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.primary,
    marginBottom: 4,
  },
  streakLabel: {
    fontSize: 14,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});