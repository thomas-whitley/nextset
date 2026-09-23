import { useEffect, useState } from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Play } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';
import { useWorkout } from '@/contexts/WorkoutContext';

const mmss = (ms: number) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

export default function ResumeWorkoutBar() {
  const { isWorkoutActive, currentWorkout, workoutStartedAt } = useWorkout();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!isWorkoutActive) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isWorkoutActive]);
  if (!isWorkoutActive || !currentWorkout) return null;
  return (
    <TouchableOpacity style={styles.bar} onPress={() => router.push('/workout')} accessibilityRole="button" accessibilityLabel={`Resume ${currentWorkout.name}`}>
      <Play size={16} color="#FFFFFF" />
      {/* "Resume" first: a day named "Back" read as a back button (device run T2-13). */}
      <Text style={styles.name} numberOfLines={1}>Resume {currentWorkout.name}</Text>
      <Text style={styles.time}>{workoutStartedAt ? mmss(now - workoutStartedAt) : ''}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  name: { flex: 1, marginLeft: spacing.sm, color: '#FFFFFF', fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 15 },
  time: { color: '#FFFFFF', fontFamily: 'ArchivoNarrow-Bold', fontSize: 15, fontVariant: ['tabular-nums'] },
});
