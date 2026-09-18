import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Check } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius } from '@/constants/theme';
import type { ExerciseSet, RepsTarget } from '@/services/exercise.types';
import { formatRepsTarget } from '@/services/repsTarget';
import { detectPr, type ExerciseBests } from '@/services/prMath';
import { formatSet } from '@/utils/format';
import { SET_ACCESSORY_ID } from '@/components/SetKeyboardBar';

export interface SetRowProps {
  set: ExerciseSet;
  index: number;
  exerciseId: string;
  libraryExerciseId: number;
  repsTarget?: RepsTarget;
  bests: ExerciseBests;
  isActiveRest: boolean;
  onSlab: boolean;
  onToggleComplete: () => void;
  onChange: (field: 'weight' | 'reps', value: string) => void;
  onBlur: () => void;
  onFocus: (field: 'weight' | 'reps') => void;
  weightRef?: React.Ref<TextInput>;
  repsRef?: React.Ref<TextInput>;
}

export default function SetRow({
  set,
  index,
  libraryExerciseId,
  repsTarget,
  bests,
  isActiveRest,
  onSlab,
  onToggleComplete,
  onChange,
  onBlur,
  onFocus,
  weightRef,
  repsRef,
}: SetRowProps) {
  const isCompleted = set.isComplete;
  const previousLabel = formatSet(set.previousWeight, set.previousReps);
  const pr = set.isComplete ? detectPr(bests, libraryExerciseId, set.weight, set.reps) : { weight: false, e1rm: false };

  return (
    <View style={styles.setBlock}>
      <View style={styles.setRow}>
        <TouchableOpacity
          style={[
            styles.setIndicator,
            onSlab && styles.setIndicatorOnSlab,
            isCompleted && styles.completedIndicator,
            isActiveRest && styles.activeRestIndicator,
          ]}
          onPress={onToggleComplete}
          accessibilityRole="checkbox"
          accessibilityLabel={`Set ${index + 1} ${isCompleted ? 'completed' : 'incomplete'}`}
          accessibilityHint="Tap to mark this set as complete or incomplete"
          accessibilityState={{ checked: isCompleted }}
        >
          {isCompleted ? (
            <Check size={12} color="#FFFFFF" />
          ) : (
            <Text style={[styles.setNumber, onSlab && styles.onSlabText]}>{index + 1}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.previousCell}
          onPress={() => {
            onChange('weight', set.previousWeight ?? '');
            onChange('reps', set.previousReps ?? '');
          }}
          disabled={previousLabel === '—'}
          accessibilityRole="button"
          accessibilityLabel="Use last session's weight and reps"
        >
          <Text style={[styles.previousData, onSlab && styles.onSlabMuted]}>{previousLabel}</Text>
        </TouchableOpacity>

        <TextInput
          ref={weightRef}
          style={[styles.input, isCompleted && styles.inputComplete]}
          value={set.weight}
          onChangeText={(value) => onChange('weight', value)}
          onBlur={onBlur}
          onFocus={() => onFocus('weight')}
          keyboardType="numeric"
          placeholder="kg"
          placeholderTextColor={Colors.light.textTertiary}
          inputAccessoryViewID={SET_ACCESSORY_ID}
          accessibilityLabel={`Weight for set ${index + 1}`}
          accessibilityHint="Enter the weight used for this set"
        />

        <TextInput
          ref={repsRef}
          style={[styles.input, isCompleted && styles.inputComplete]}
          value={set.reps}
          onChangeText={(value) => onChange('reps', value)}
          onBlur={onBlur}
          onFocus={() => onFocus('reps')}
          keyboardType="numeric"
          placeholder={repsTarget ? `×${formatRepsTarget(repsTarget)}` : 'reps'}
          placeholderTextColor={Colors.light.textTertiary}
          inputAccessoryViewID={SET_ACCESSORY_ID}
          accessibilityLabel={`Repetitions for set ${index + 1}`}
          accessibilityHint="Enter the number of repetitions completed"
        />

        {(pr.weight || pr.e1rm) && (
          <View style={styles.prChip}>
            <Text style={styles.prChipText}>PR</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  setBlock: {
    marginBottom: 2,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  setIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  // A white disc on a near-black slab swallowed its own number, so a pending
  // set becomes an outline instead of a fill.
  setIndicatorOnSlab: {
    backgroundColor: 'transparent',
    borderColor: Colors.light.onRubberSecondary,
  },
  completedIndicator: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  activeRestIndicator: {
    borderColor: Colors.light.accent,
    backgroundColor: Colors.light.accentLight,
  },
  setNumber: { fontSize: 10, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.primary },
  onSlabText: {
    color: Colors.light.onRubber,
  },
  onSlabMuted: {
    color: Colors.light.onRubberSecondary,
  },
  previousCell: {
    width: 50,
  },
  previousData: { fontSize: 10, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, width: 50, textAlign: 'center' },
  input: {
    width: 50,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 12,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
    textAlign: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputComplete: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  prChip: {
    marginLeft: spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill ?? 999,
    backgroundColor: Colors.light.accent,
  },
  prChipText: { fontSize: 10, fontFamily: 'ArchivoNarrow-Bold', color: '#FFFFFF' },
});
