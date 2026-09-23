import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { GripVertical, Minus, Plus, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
import type { RepsTarget, WorkoutExercise } from '@/services/exercise.types';
import { commitRepsDraft, formatRepsTarget } from '@/services/repsTarget';
import { planLine } from '@/services/exerciseSummary';
import { MAX_SETS } from '@/services/programEdits';

type Props = {
  exercise: WorkoutExercise;
  /** The day is the running workout: show the plan, offer nothing (spec §6.1). */
  locked: boolean;
  onSetCount: (count: number) => void;
  onRepsTarget: (target: RepsTarget | undefined) => void;
  onRemove: () => void;
  /** From DraggableList in handleOnly mode: wraps the grip so only it starts a drag. */
  dragHandle: (node: React.ReactNode) => React.ReactNode;
};

/** One exercise in the day editor: drag grip, name, remove; sets stepper and reps target underneath. */
export default function ProgramExerciseRow({ exercise, locked, onSetCount, onRepsTarget, onRemove, dragHandle }: Props) {
  const [draft, setDraft] = useState(formatRepsTarget(exercise.repsTarget));
  const min = exercise.repsTarget?.min;
  const max = exercise.repsTarget?.max;
  // Follow the stored target when it changes from outside (reset to template, another edit).
  useEffect(() => {
    setDraft(formatRepsTarget(min === undefined || max === undefined ? undefined : { min, max }));
  }, [min, max]);

  if (locked) {
    return (
      <View style={styles.card}>
        <Text style={styles.name}>{exercise.name}</Text>
        <Text style={styles.plan}>{planLine(exercise)}</Text>
      </View>
    );
  }

  const count = exercise.sets.length;
  const commit = () => {
    const { target, text } = commitRepsDraft(draft, exercise.repsTarget);
    setDraft(text);
    if (formatRepsTarget(target) !== formatRepsTarget(exercise.repsTarget)) onRepsTarget(target);
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        {dragHandle(
          <View style={styles.square} accessibilityRole="button" accessibilityLabel={`Drag to reorder ${exercise.name}`}>
            <GripVertical size={22} color={Colors.light.textTertiary} />
          </View>
        )}
        <Text style={styles.name} numberOfLines={2}>{exercise.name}</Text>
        <TouchableOpacity style={styles.square} onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${exercise.name}`}>
          <Trash2 size={22} color={Colors.light.error} />
        </TouchableOpacity>
      </View>

      <View style={styles.controls}>
        <View style={styles.control}>
          <Text style={styles.label}>Sets</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.step, count <= 1 && styles.disabled]}
              disabled={count <= 1}
              onPress={() => onSetCount(count - 1)}
              accessibilityRole="button"
              accessibilityLabel={`Fewer sets for ${exercise.name}`}
            >
              <Minus size={20} color={Colors.light.primary} />
            </TouchableOpacity>
            <Text style={styles.count} maxFontSizeMultiplier={1.3}>{count}</Text>
            <TouchableOpacity
              style={[styles.step, count >= MAX_SETS && styles.disabled]}
              disabled={count >= MAX_SETS}
              onPress={() => onSetCount(count + 1)}
              accessibilityRole="button"
              accessibilityLabel={`More sets for ${exercise.name}`}
            >
              <Plus size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.control}>
          <Text style={styles.label}>Reps</Text>
          <TextInput
            style={styles.reps}
            value={draft}
            onChangeText={setDraft}
            onBlur={commit}
            onSubmitEditing={commit}
            placeholder="8–12"
            placeholderTextColor={Colors.light.textTertiary}
            // A numeric pad has no hyphen for "8-12" (grill R2-Q1).
            keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
            returnKeyType="done"
            maxLength={7}
            maxFontSizeMultiplier={1.3}
            accessibilityLabel={`Reps target for ${exercise.name}`}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, padding: spacing.md, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  square: { width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center' },
  name: { ...type.section, color: Colors.light.text, flex: 1 },
  plan: { ...type.body, color: Colors.light.textSecondary },
  controls: { flexDirection: 'row', gap: spacing.lg, paddingLeft: touch.min + spacing.xs },
  control: { gap: spacing.xs },
  label: { ...type.eyebrow, color: Colors.light.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  step: { width: touch.min, height: touch.min, borderRadius: radius.card, backgroundColor: Colors.light.primaryLight, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.4 },
  count: { ...type.setInput, color: Colors.light.text, minWidth: 32, textAlign: 'center' },
  reps: {
    ...type.setInput,
    color: Colors.light.text,
    width: 88,
    height: touch.min,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },
});
