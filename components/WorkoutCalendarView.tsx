import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';
import { WorkoutHistoryService, WorkoutHistoryEntry, toDateKey } from '@/services/workoutHistoryService';
import { formatKg, formatLongDate, formatMinutes } from '@/utils/format';

interface WorkoutCalendarViewProps {
  visible: boolean;
  onClose: () => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function WorkoutCalendarView({ visible, onClose }: WorkoutCalendarViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completed, setCompleted] = useState<WorkoutHistoryEntry[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !user) return;
    let cancelled = false;
    setLoading(true);
    WorkoutHistoryService.getAllWorkoutHistory(user.id)
      .then((rows) => { if (!cancelled) setCompleted(rows); })
      .catch((error) => console.error('Error loading workout history:', error))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, user]);

  const byDay = completed.reduce<Record<string, WorkoutHistoryEntry[]>>((acc, row) => {
    const key = toDateKey(new Date(row.completed_at));
    (acc[key] ||= []).push(row);
    return acc;
  }, {});

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const keyFor = (day: number) => toDateKey(new Date(year, month, day));
  const todayKey = toDateKey(new Date());
  const selected = selectedKey ? byDay[selectedKey] ?? [] : [];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const next = new Date(currentDate);
    next.setMonth(next.getMonth() + (direction === 'prev' ? -1 : 1));
    setCurrentDate(next);
    setSelectedKey(null);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout calendar</Text>
          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close calendar">
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => navigateMonth('prev')} accessibilityRole="button" accessibilityLabel="Previous month">
              <ChevronLeft size={24} color={Colors.light.primary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={() => navigateMonth('next')} accessibilityRole="button" accessibilityLabel="Next month">
              <ChevronRight size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.dayHeaders}>
            {DAYS.map((d) => <Text key={d} style={styles.dayHeader}>{d}</Text>)}
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.light.primary} style={{ marginVertical: 40 }} />
          ) : (
            <View style={styles.calendarGrid}>
              {cells.map((day, index) => {
                if (day === null) return <View key={`empty-${index}`} style={[styles.dayCell, styles.emptyDay]} />;
                const key = keyFor(day);
                const done = !!byDay[key];
                const isSelected = key === selectedKey;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.dayCell, done && styles.completedDay, isSelected && styles.selectedDay]}
                    onPress={() => setSelectedKey(done ? key : null)}
                    disabled={!done}
                    accessibilityRole="button"
                    accessibilityLabel={`${day} ${MONTHS[month]}${done ? ', workout logged' : ''}`}
                  >
                    <Text style={[styles.dayText, done && styles.completedDayText, key === todayKey && styles.todayText]}>{day}</Text>
                    {done && <View style={styles.completedIndicator} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.legend}>
            <View style={styles.legendDot} />
            <Text style={styles.legendText}>Workout logged · tap a day for details</Text>
          </View>

          {selectedKey && selected.length > 0 && (
            <View style={styles.workoutDetails}>
              <Text style={styles.workoutDetailsTitle}>{formatLongDate(new Date(selectedKey))}</Text>
              {selected.map((row) => (
                <View key={row.id} style={styles.workoutSummary}>
                  <Text style={styles.workoutName}>{row.workout_data?.name ?? 'Workout'}</Text>
                  <Text style={styles.workoutMeta}>
                    {formatMinutes(row.duration_minutes)} · {row.workout_data?.exercises?.length ?? 0}{' '}
                    {(row.workout_data?.exercises?.length ?? 0) === 1 ? 'exercise' : 'exercises'} · {formatKg(row.total_volume)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: { fontSize: 20, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: 20 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  monthTitle: { fontSize: 18, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  dayHeaders: { flexDirection: 'row', marginBottom: 8 },
  dayHeader: { flex: 1, textAlign: 'center', fontSize: 12, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100 / 7}%`, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  emptyDay: { opacity: 0 },
  completedDay: { backgroundColor: Colors.light.primaryLight },
  selectedDay: { borderWidth: 2, borderColor: Colors.light.primary },
  dayText: { fontSize: 14, fontFamily: 'Archivo-Regular', color: Colors.light.text },
  completedDayText: { fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.primary },
  todayText: { textDecorationLine: 'underline' },
  completedIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: Colors.light.primary, marginTop: 2 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16 },
  legendDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.light.primary },
  legendText: { fontSize: 13, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary },
  workoutDetails: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 16, marginBottom: 24 },
  workoutDetailsTitle: { fontSize: 14, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, marginBottom: 8 },
  workoutSummary: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.light.border },
  workoutName: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text },
  workoutMeta: { fontSize: 13, fontFamily: 'Archivo-Regular', color: Colors.light.textSecondary, marginTop: 2 },
});
