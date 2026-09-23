import React, { ReactNode } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Check, ChevronDown, Ellipsis, GripVertical, Plus } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { radius, spacing, touch, type, elevation } from '@/constants/theme';
import SwipeToRemove from '@/components/gestures/SwipeToRemove';
import { isTimedExercise } from '@/data/timedExercises';
import { planLine, foldedSummary, allSetsDone } from '@/services/exerciseSummary';
import type { ExerciseSet, WorkoutExercise } from '@/services/exercise.types';

type Props = {
  exercise: WorkoutExercise;
  active: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenActions: () => void;
  onAddSet: () => void;
  onRemoveSet: (setId: string, setNumber: number) => void;
  notes: string;
  onChangeNotes: (v: string) => void;
  renderSetRow: (set: ExerciseSet, index: number, showStrip: boolean) => ReactNode;
  nextSetId: string | null;
  dragHandle: (node: ReactNode) => ReactNode;
};

/**
 * One exercise on the workout screen (spec R6–R11). The header is a single
 * 56dp button that folds the card — manual only, the app never folds for you.
 * Rare actions live behind ⋯; adding a set is the common one, so it gets the
 * full-width button.
 */
export default function ExerciseCard({
  exercise, active, collapsed, onToggleCollapsed, onOpenActions, onAddSet, onRemoveSet,
  notes, onChangeNotes, renderSetRow, nextSetId, dragHandle,
}: Props) {
  const timed = isTimedExercise(exercise.name);
  const summary = collapsed ? foldedSummary(exercise) : planLine(exercise, timed);
  const done = allSetsDone(exercise);
  const muted = active ? Colors.light.onRubberSecondary : Colors.light.textSecondary;
  const canRemoveSet = exercise.sets.length > 1;

  return (
    <View style={[styles.card, active ? styles.slab : styles.plain]}>
      <View style={styles.header}>
        {collapsed
          ? dragHandle(
              <View style={styles.grip} accessibilityRole="adjustable" accessibilityLabel={`Drag to reorder ${exercise.name}`}>
                <GripVertical size={22} color={muted} />
              </View>
            )
          : null}
        <TouchableOpacity
          style={styles.fold}
          onPress={onToggleCollapsed}
          accessibilityRole="button"
          accessibilityState={{ expanded: !collapsed }}
          accessibilityLabel={`${exercise.name}, ${summary}. ${collapsed ? 'Tap to open' : 'Tap to fold'}`}
        >
          <View style={styles.titleCol}>
            <View style={styles.nameRow}>
              <Text style={[styles.name, active && styles.onSlab]} numberOfLines={2}>{exercise.name}</Text>
              {done ? (
                <View style={styles.doneBadge} accessibilityLabel="All sets done">
                  <Check size={14} strokeWidth={3} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
            <Text style={[styles.summary, { color: muted }]}>{summary}</Text>
          </View>
          <ChevronDown size={22} color={muted} style={{ transform: [{ rotate: collapsed ? '0deg' : '180deg' }] }} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.more}
          onPress={onOpenActions}
          accessibilityRole="button"
          accessibilityLabel={`More actions for ${exercise.name}`}
        >
          <Ellipsis size={22} color={muted} />
        </TouchableOpacity>
      </View>

      {collapsed ? null : (
        <View style={styles.body}>
          <View style={styles.columns}>
            <Text style={[styles.colHead, styles.colSet, { color: muted }]}>Set</Text>
            <Text style={[styles.colHead, styles.colLast, { color: muted }]}>Last time</Text>
            <Text style={[styles.colHead, styles.colField, { color: muted }]}>kg</Text>
            <Text style={[styles.colHead, styles.colField, { color: muted }]}>{timed ? 'Secs' : 'Reps'}</Text>
          </View>

          {exercise.sets.map((set, i) => (
            <SwipeToRemove
              key={set.id}
              enabled={canRemoveSet}
              onRemove={() => onRemoveSet(set.id, i + 1)}
              label={canRemoveSet ? `Remove set ${i + 1}` : undefined}
              cornerRadius={radius.input}
            >
              <View style={active ? styles.rowBgSlab : styles.rowBgCard}>
                {renderSetRow(set, i, set.id === nextSetId)}
              </View>
            </SwipeToRemove>
          ))}

          <TouchableOpacity
            style={[styles.addSet, active ? styles.addSetSlab : styles.addSetCard]}
            onPress={onAddSet}
            accessibilityRole="button"
            accessibilityLabel={`Add set to ${exercise.name}`}
          >
            <Plus size={22} color={active ? Colors.light.onRubber : Colors.light.primary} />
            <Text style={[styles.addSetText, { color: active ? Colors.light.onRubber : Colors.light.primary }]}>Add set</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.notes, active ? styles.notesSlab : styles.notesCard]}
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="Notes for this exercise"
            placeholderTextColor={muted}
            multiline
            accessibilityLabel={`Notes for ${exercise.name}`}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, paddingTop: spacing.sm },
  slab: { backgroundColor: Colors.light.rubber, borderRadius: radius.slab, ...elevation.slab },
  plain: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border },
  header: { flexDirection: 'row', alignItems: 'center' },
  grip: { width: 40, height: touch.min, justifyContent: 'center', alignItems: 'center', marginLeft: -spacing.sm },
  fold: { flex: 1, minHeight: touch.row, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs },
  titleCol: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 22, lineHeight: 28, color: Colors.light.text, flexShrink: 1 },
  onSlab: { color: Colors.light.onRubber },
  summary: { fontFamily: 'Archivo-Regular', fontSize: 15, lineHeight: 20 },
  doneBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.light.success, justifyContent: 'center', alignItems: 'center' },
  more: { width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  body: { gap: spacing.sm, marginTop: spacing.xs },
  columns: { flexDirection: 'row', gap: spacing.sm, paddingTop: spacing.xs },
  colHead: { ...type.label },
  colSet: { width: touch.min, textAlign: 'center' },
  colLast: { flex: 1, paddingLeft: spacing.xs },
  colField: { width: 88, textAlign: 'center' },
  rowBgSlab: { backgroundColor: Colors.light.rubber },
  rowBgCard: { backgroundColor: Colors.light.card },
  addSet: { height: touch.min, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  addSetSlab: { borderColor: Colors.light.borderOnRubber, backgroundColor: 'rgba(255,255,255,0.04)' },
  addSetCard: { borderColor: Colors.light.border, backgroundColor: Colors.light.card },
  addSetText: { fontFamily: 'Archivo-Medium', fontSize: 16 },
  notes: { minHeight: touch.min, borderRadius: radius.input, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Archivo-Regular', fontSize: 15 },
  notesSlab: { backgroundColor: Colors.light.slabField, borderColor: Colors.light.borderOnRubber, color: Colors.light.onRubber },
  notesCard: { backgroundColor: Colors.light.background, borderColor: Colors.light.border, color: Colors.light.text },
});
