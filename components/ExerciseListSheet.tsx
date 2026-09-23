import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';
import { useAuth } from '@/data/AuthContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { exerciseList, libraryName, recordText, type ExerciseListItem } from '@/services/exerciseProgress';
import { formatShortDate } from '@/utils/format';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  onPick: (exerciseId: number) => void;
};

/** Every lift you have logged, most recent first (spec Q10, Q17). */
export default function ExerciseListSheet({ visible, onDismiss, onPick }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user } = useAuth();
  const [items, setItems] = useState<ExerciseListItem[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setItems(null);
    setFailed(false);
    try {
      setItems(exerciseList(await WorkoutHistoryService.getExerciseHistory(user.id), libraryName));
    } catch (error) {
      console.error('Failed to load exercises:', error);
      setFailed(true);
    }
  }, [user]);

  useEffect(() => {
    if (visible) void load();
  }, [visible, load]);

  return (
    <DragDismissSheet visible={visible} onDismiss={onDismiss}>
      {/* Same cap as ProgramPickerSheet: the sheet's handle and bottom padding sit outside this box (device run T2-14). */}
      <View testID="exercise-list-sheet" style={{ height: Math.min(height * 0.9, height - insets.top - insets.bottom - spacing.xxl - 48) }}>
        <View style={styles.header}>
          <Text style={styles.title}>All exercises</Text>
          <TouchableOpacity style={styles.close} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close">
            <X size={22} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
          {failed ? (
            <View style={styles.failed}>
              <Text style={styles.failedTitle}>Did not load</Text>
              <Text style={styles.note}>Check your connection and try again.</Text>
              <TouchableOpacity style={styles.retry} onPress={() => void load()} accessibilityRole="button">
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : !items ? (
            <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
          ) : items.length === 0 ? (
            <Text style={styles.note}>Finish a workout to see your lifts here.</Text>
          ) : (
            <View style={styles.list}>
              {items.map((item, i) => (
                <TouchableOpacity
                  key={item.exerciseId}
                  style={[styles.row, i > 0 && styles.divider]}
                  onPress={() => onPick(item.exerciseId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${item.name}`}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.meta}>{`${recordText(item)} · ${formatShortDate(item.lastDoneAt)}`}</Text>
                  </View>
                  <ChevronRight size={20} color={Colors.light.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </DragDismissSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  title: { ...type.section, color: Colors.light.text },
  close: { width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: spacing.base, gap: spacing.md },
  loader: { marginTop: spacing.xxl },
  note: { ...type.body, color: Colors.light.textSecondary },
  list: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border },
  row: { minHeight: touch.row, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base },
  divider: { borderTopWidth: 1, borderTopColor: Colors.light.border },
  rowText: { flex: 1, paddingVertical: spacing.sm },
  name: { ...type.body, fontSize: 16, color: Colors.light.text },
  meta: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  failed: { gap: spacing.sm, alignItems: 'flex-start', paddingTop: spacing.base },
  failedTitle: { ...type.section, color: Colors.light.text },
  retry: { minHeight: touch.min, paddingHorizontal: spacing.lg, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: Colors.light.primary },
  retryText: { ...type.body, fontSize: 16, color: Colors.light.card },
});
