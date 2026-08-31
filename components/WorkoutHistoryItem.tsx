import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, type } from '@/constants/theme';
import { WorkoutHistoryEntry } from '@/services/workoutHistoryService';
import { ExerciseService } from '@/services/exerciseService';
import BarLoadingStrip from '@/components/BarLoadingStrip';
import { formatKg, formatMinutes, formatShortDate } from '@/utils/format';

interface WorkoutHistoryItemProps {
  workout: WorkoutHistoryEntry;
}

/**
 * The completed set with the highest weight in this session. History rows
 * store exercises by name only, so the caller resolves equipment from the
 * name afterwards — never from the set itself.
 */
function getTopSet(workout: WorkoutHistoryEntry): { name: string; weightKg: number } | null {
  let best: { name: string; weightKg: number } | null = null;
  for (const exercise of workout.workout_data?.exercises ?? []) {
    for (const set of exercise.sets ?? []) {
      if (!set.isComplete) continue;
      const weightKg = parseFloat(set.weight) || 0;
      if (weightKg <= 0) continue;
      if (!best || weightKg > best.weightKg) {
        best = { name: exercise.name, weightKg };
      }
    }
  }
  return best;
}

const WorkoutHistoryItem = ({ workout }: WorkoutHistoryItemProps) => {
  // Count what was actually performed, not what the template listed: a
  // session where one exercise was ticked off should not read "4 exercises".
  const exerciseCount =
    workout.workout_data?.exercises?.filter((exercise: any) =>
      exercise?.sets?.some((set: any) => set?.isComplete)
    ).length ?? 0;

  const topSet = getTopSet(workout);
  // Name-only lookup against the bundled library — if it doesn't resolve,
  // no equipment is passed and the strip renders nothing (never guess).
  const topSetExercise = topSet ? ExerciseService.getByName(topSet.name) : undefined;

  return (
    <View style={styles.container} accessibilityRole="summary">
      <View style={styles.content}>
        <Text style={styles.title}>{workout.workout_data?.name ?? 'Workout'}</Text>
        <View style={styles.details}>
          <View style={styles.detail}>
            <Calendar size={14} color={Colors.light.textTertiary} />
            <Text style={styles.detailText}>{formatShortDate(workout.completed_at)}</Text>
          </View>
          <View style={styles.detail}>
            <Clock size={14} color={Colors.light.textTertiary} />
            <Text style={styles.detailText}>{formatMinutes(workout.duration_minutes)}</Text>
          </View>
          <Text style={styles.detailText}>
            {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>
        {topSet ? (
          <BarLoadingStrip totalKg={topSet.weightKg} equipment={topSetExercise?.equipment} />
        ) : null}
      </View>
      <Text style={styles.volume}>{formatKg(workout.total_volume)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: { flex: 1, marginRight: spacing.md },
  title: { ...type.bodyMedium, color: Colors.light.text, marginBottom: spacing.sm },
  details: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.md },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  detailText: { ...type.label, color: Colors.light.textTertiary, fontVariant: ['tabular-nums'] },
  volume: { ...type.numeric, color: Colors.light.primary },
});

export default WorkoutHistoryItem;
