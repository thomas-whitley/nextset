import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { WorkoutHistoryEntry } from '@/services/workoutHistoryService';
import { formatKg, formatMinutes, formatShortDate } from '@/utils/format';

interface WorkoutHistoryItemProps {
  workout: WorkoutHistoryEntry;
}

const WorkoutHistoryItem = ({ workout }: WorkoutHistoryItemProps) => {
  // Count what was actually performed, not what the template listed: a
  // session where one exercise was ticked off should not read "4 exercises".
  const exerciseCount =
    workout.workout_data?.exercises?.filter((exercise: any) =>
      exercise?.sets?.some((set: any) => set?.isComplete)
    ).length ?? 0;
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
      </View>
      <Text style={styles.volume}>{formatKg(workout.total_volume)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: { flex: 1, marginRight: 12 },
  title: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text, marginBottom: 6 },
  details: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailText: { fontSize: 13, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary },
  volume: { fontSize: 16, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.primary },
});

export default WorkoutHistoryItem;
