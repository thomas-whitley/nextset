import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronRight } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
import { chartConfig } from '@/constants/chart';
import { useAuth } from '@/data/AuthContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { getExerciseChartMetric, setExerciseChartMetric } from '@/services/preferences';
import {
  bestSet,
  chartSeries,
  chartSummaryLabel,
  exerciseMode,
  exerciseName,
  exerciseRecord,
  exerciseSessions,
  libraryName,
  metricName,
  type ChartMetric,
  type ExerciseMode,
  type ExerciseSession,
  type HistorySource,
  type SeriesMetric,
} from '@/services/exerciseProgress';
import { formatDayDate, formatKg, formatSet, formatShortDate } from '@/utils/format';

type LoadState = 'loading' | 'ready' | 'error';

const METRICS: ChartMetric[] = ['e1rm', 'heaviest'];

/** One exercise over time (spec 2026-09-23): /exercise-progress?id=<exerciseId>. */
export default function ExerciseProgressScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const exerciseId = id ? Number(id) : NaN;
  const validId = Number.isFinite(exerciseId);
  const { user } = useAuth();
  const [entries, setEntries] = useState<HistorySource[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [metric, setMetric] = useState<ChartMetric>('e1rm');

  useEffect(() => {
    let cancelled = false;
    void getExerciseChartMetric().then((m) => {
      if (!cancelled) setMetric(m);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!user || !validId) {
      setState('ready');
      return;
    }
    setState('loading');
    try {
      setEntries(await WorkoutHistoryService.getExerciseHistory(user.id));
      setState('ready');
    } catch (error) {
      console.error('Failed to load exercise history:', error);
      setState('error');
    }
  }, [user, validId]);

  useEffect(() => {
    void load();
  }, [load]);

  const sessions = useMemo(() => (validId ? exerciseSessions(entries, exerciseId) : []), [entries, exerciseId, validId]);
  const mode = exerciseMode(sessions);
  const shown: SeriesMetric = mode === 'bodyweight' ? 'reps' : metric;
  const series = chartSeries(sessions, shown);
  const record = exerciseRecord(sessions);
  const title = validId ? exerciseName(entries, exerciseId, libraryName) : 'Exercise';

  const pickMetric = (m: ChartMetric) => {
    setMetric(m);
    void setExerciseChartMetric(m);
  };

  const header = (
    <View style={styles.top}>
      {mode === 'weighted' ? (
        <View style={styles.toggle}>
          {METRICS.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.segment, metric === m && styles.segmentOn]}
              onPress={() => pickMetric(m)}
              accessibilityRole="button"
              accessibilityState={{ selected: metric === m }}
            >
              <Text style={[styles.segmentText, metric === m && styles.segmentTextOn]}>{metricName[m]}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.label}>{metricName.reps}</Text>
      )}

      {series.values.length >= 2 ? (
        <View style={styles.chartCard} accessible accessibilityRole="image" accessibilityLabel={chartSummaryLabel(shown, series.values)}>
          <LineChart
            data={{ labels: series.labels, datasets: [{ data: series.values, color: () => Colors.light.primary, strokeWidth: 3 }] }}
            width={width - spacing.base * 2 - 2}
            height={200}
            chartConfig={chartConfig}
            withOuterLines={false}
            yAxisLabel=""
            yAxisSuffix=""
          />
        </View>
      ) : (
        <Text style={styles.note}>Log it once more to see a trend.</Text>
      )}

      <View style={styles.tiles}>
        {mode === 'weighted' ? (
          <>
            <RecordTile label="Heaviest" value={formatKg(record.heaviest?.value)} date={record.heaviest?.date} />
            <RecordTile label="Best est. 1RM" value={formatKg(record.e1rm ? Math.round(record.e1rm.value) : null)} date={record.e1rm?.date} />
          </>
        ) : (
          <RecordTile label="Most reps" value={record.mostReps ? `${record.mostReps.value} reps` : '—'} date={record.mostReps?.date} />
        )}
      </View>

      <Text style={styles.label}>Sessions</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.square} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      {state === 'loading' ? (
        <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
      ) : state === 'error' ? (
        <View style={styles.failed}>
          <Text style={styles.failedTitle}>Did not load</Text>
          <Text style={styles.failedBody}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retry} onPress={() => void load()} accessibilityRole="button">
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : sessions.length === 0 ? (
        <Text style={styles.note}>No sets logged for this exercise yet.</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.historyId}
          ListHeaderComponent={header}
          renderItem={({ item }) => <SessionRow session={item} mode={mode} />}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        />
      )}
    </SafeAreaView>
  );
}

function RecordTile({ label, value, date }: { label: string; value: string; date?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
      {date ? <Text style={styles.tileDate}>{formatShortDate(date)}</Text> : null}
    </View>
  );
}

function SessionRow({ session, mode }: { session: ExerciseSession; mode: ExerciseMode }) {
  const set = bestSet(session, mode);
  const setText = formatSet(set.weight, set.reps);
  const day = formatDayDate(session.completedAt);
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push({ pathname: '/workout-detail', params: { id: session.historyId } })}
      accessibilityRole="button"
      accessibilityHint={`${day}, best set ${setText}`}
    >
      <View style={styles.rowText}>
        <Text style={styles.rowDay}>{day}</Text>
        <Text style={styles.rowSet}>{setText}</Text>
      </View>
      <ChevronRight size={20} color={Colors.light.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  square: { width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center' },
  title: { ...type.section, fontSize: 22, color: Colors.light.text, flex: 1 },
  loader: { marginTop: spacing.xxl },
  note: { ...type.body, color: Colors.light.textSecondary, padding: spacing.lg },
  content: { padding: spacing.base },
  top: { gap: spacing.md, marginBottom: spacing.sm },
  toggle: { flexDirection: 'row', borderRadius: radius.input, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  segment: { flex: 1, minHeight: touch.min, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.card },
  segmentOn: { backgroundColor: Colors.light.primary },
  segmentText: { ...type.body, fontSize: 15, color: Colors.light.text },
  segmentTextOn: { color: Colors.light.card },
  chartCard: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, padding: spacing.base, gap: spacing.xs },
  tileValue: { ...type.title, color: Colors.light.text, fontVariant: ['tabular-nums'] },
  tileLabel: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  tileDate: { ...type.label, color: Colors.light.textTertiary },
  label: { ...type.eyebrow, color: Colors.light.textSecondary },
  row: { minHeight: touch.row, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  rowText: { flex: 1, paddingVertical: spacing.sm },
  rowDay: { ...type.body, color: Colors.light.text },
  rowSet: { ...type.numeric, color: Colors.light.textSecondary },
  failed: { padding: spacing.lg, gap: spacing.sm, alignItems: 'flex-start' },
  failedTitle: { ...type.section, color: Colors.light.text },
  failedBody: { ...type.body, color: Colors.light.textSecondary },
  retry: { minHeight: touch.min, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: Colors.light.primary },
  retryText: { ...type.body, fontSize: 16, color: Colors.light.card },
});
