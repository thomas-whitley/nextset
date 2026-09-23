import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trophy } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
import { useAuth } from '@/data/AuthContext';
import { WorkoutHistoryService, WorkoutHistoryEntry } from '@/services/workoutHistoryService';
import { historyRow, loggedExercises } from '@/services/historySummary';
import { formatDayDate, formatKg, formatMinutes, formatSet, formatCount } from '@/utils/format';

type LoadState = 'loading' | 'ready' | 'missing' | 'error';

/** A finished workout, read-only (spec §6.5, Q4 R3): /workout-detail?id=<workout_history.id>. */
export default function WorkoutDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuth();
  const [entry, setEntry] = useState<WorkoutHistoryEntry | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    if (!user || !id) {
      setState('missing');
      return;
    }
    let cancelled = false;
    setState('loading');
    WorkoutHistoryService.getWorkoutById(user.id, id)
      .then((row) => {
        if (cancelled) return;
        setEntry(row);
        setState(row ? 'ready' : 'missing');
      })
      .catch((error) => {
        console.error('Failed to load workout:', error);
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [user, id]);

  const summary = entry ? historyRow(entry) : null;
  const exercises = loggedExercises(entry?.workout_data);
  const notes = entry?.workout_data?.metadata?.notes?.trim();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.square} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{summary?.title ?? 'Workout'}</Text>
      </View>

      {state === 'loading' ? (
        <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
      ) : state === 'error' ? (
        <Text style={styles.note}>Could not load this workout. Check your connection and try again.</Text>
      ) : state === 'missing' || !entry || !summary ? (
        <Text style={styles.note}>This workout is no longer in your history.</Text>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
          <Text style={styles.when}>
            {formatDayDate(summary.completedAt)} · {formatMinutes(entry.duration_minutes)}
          </Text>
          <View style={styles.tiles}>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{formatCount(summary.sets)}</Text>
              <Text style={styles.tileLabel}>{summary.sets === 1 ? 'Set done' : 'Sets done'}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{formatKg(summary.volume)}</Text>
              <Text style={styles.tileLabel}>Lifted</Text>
            </View>
          </View>

          {exercises.map((ex) => (
            <View key={ex.id} style={styles.card}>
              <Text style={styles.exerciseName}>{ex.name}</Text>
              {ex.sets.map((s) => (
                <View key={s.id} style={styles.setRow}>
                  <Text style={styles.setNumber}>{s.n}</Text>
                  <Text style={styles.setText}>{formatSet(s.weight, s.reps)}</Text>
                  {s.pr ? (
                    <View accessibilityLabel="Personal record">
                      <Trophy size={20} color={Colors.light.accent} />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          ))}

          {notes ? (
            <View style={styles.card}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.notes}>{notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  square: { width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center' },
  title: { ...type.section, fontSize: 22, color: Colors.light.text, flex: 1 },
  loader: { marginTop: spacing.xxl },
  note: { ...type.body, color: Colors.light.textSecondary, padding: spacing.lg },
  content: { padding: spacing.base, gap: spacing.md },
  when: { ...type.body, color: Colors.light.textSecondary },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1, backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, padding: spacing.base, gap: spacing.xs },
  tileValue: { ...type.title, color: Colors.light.text, fontVariant: ['tabular-nums'] },
  tileLabel: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  card: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, padding: spacing.base, gap: spacing.xs },
  exerciseName: { ...type.section, color: Colors.light.text, marginBottom: spacing.xs },
  setRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  setNumber: { ...type.numeric, color: Colors.light.textTertiary, width: 24 },
  setText: { ...type.numeric, color: Colors.light.text, flex: 1 },
  label: { ...type.eyebrow, color: Colors.light.textSecondary },
  notes: { ...type.body, color: Colors.light.text },
});
