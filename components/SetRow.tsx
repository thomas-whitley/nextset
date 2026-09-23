import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
// Gesture-handler's TextInput joins RNGH's touch system, so the row's
// SwipeToRemove pan can take over once a finger moves sideways. With the plain
// RN input, a swipe that started on kg/reps never reached the row (device run R7).
import { TextInput as GestureTextInput } from 'react-native-gesture-handler';
import { Check, Trophy } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, touch, type } from '@/constants/theme';
import type { ExerciseSet, RepsTarget } from '@/services/exercise.types';
import { formatRepsTarget } from '@/services/repsTarget';
import { formatSet } from '@/utils/format';
import { SET_ACCESSORY_ID } from '@/components/SetKeyboardBar';

// RNGH types its ref as a component, but its wrapper forwards the real RN
// TextInput instance (createNativeWrapper's useImperativeHandle), so .focus() works.
type GestureInputRef = React.ComponentProps<typeof GestureTextInput>['ref'];

export interface SetRowProps {
  set: ExerciseSet;
  index: number;
  exerciseId: string;
  libraryExerciseId: number;
  repsTarget?: RepsTarget;
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
  set, index, repsTarget, isActiveRest, onSlab, onToggleComplete, onChange, onBlur, onFocus, weightRef, repsRef,
}: SetRowProps) {
  const done = set.isComplete;
  const previousLabel = formatSet(set.previousWeight, set.previousReps);
  const field = [styles.input, onSlab ? styles.inputOnSlab : styles.inputOnCard, done && styles.inputComplete];

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.tick, onSlab ? styles.tickOnSlab : styles.tickOnCard, done && styles.tickDone, isActiveRest && styles.tickResting]}
        onPress={onToggleComplete}
        accessibilityRole="checkbox"
        accessibilityLabel={`Set ${index + 1} ${done ? 'completed' : 'incomplete'}`}
        accessibilityHint="Tap to mark this set as complete or incomplete"
        accessibilityState={{ checked: done }}
      >
        {done ? (
          <Check size={22} strokeWidth={3} color="#FFFFFF" />
        ) : (
          <Text style={[styles.setNumber, onSlab && styles.onSlabText]}>{index + 1}</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.previous}
        onPress={() => {
          onChange('weight', set.previousWeight ?? '');
          onChange('reps', set.previousReps ?? '');
        }}
        disabled={previousLabel === '—'}
        accessibilityRole="button"
        accessibilityLabel="Use last session's weight and reps"
      >
        <Text style={[styles.previousText, onSlab && styles.onSlabMuted]} numberOfLines={1}>{previousLabel}</Text>
      </TouchableOpacity>

      <GestureTextInput
        ref={weightRef as GestureInputRef}
        style={field}
        value={set.weight}
        onChangeText={(v) => onChange('weight', v)}
        onBlur={onBlur}
        onFocus={() => onFocus('weight')}
        keyboardType="numeric"
        placeholder="kg"
        placeholderTextColor={onSlab ? Colors.light.onRubberSecondary : Colors.light.textTertiary}
        maxFontSizeMultiplier={1.3}
        inputAccessoryViewID={SET_ACCESSORY_ID}
        accessibilityLabel={`Weight for set ${index + 1}`}
        accessibilityHint="Enter the weight used for this set"
      />

      <View>
        <GestureTextInput
          ref={repsRef as GestureInputRef}
          style={field}
          value={set.reps}
          onChangeText={(v) => onChange('reps', v)}
          onBlur={onBlur}
          onFocus={() => onFocus('reps')}
          keyboardType="numeric"
          placeholder={repsTarget ? formatRepsTarget(repsTarget) : 'reps'}
          placeholderTextColor={onSlab ? Colors.light.onRubberSecondary : Colors.light.textTertiary}
          maxFontSizeMultiplier={1.3}
          inputAccessoryViewID={SET_ACCESSORY_ID}
          accessibilityLabel={`Repetitions for set ${index + 1}`}
          accessibilityHint="Enter the number of repetitions completed"
        />
        {set.pr ? (
          <View style={styles.prBadge} accessibilityLabel="Personal record">
            <Trophy size={14} color={Colors.light.rubber} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: touch.row,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tick: {
    width: touch.min,
    height: touch.min,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tickOnCard: { backgroundColor: Colors.light.card, borderColor: Colors.light.border },
  tickOnSlab: { backgroundColor: Colors.light.rubber, borderColor: Colors.light.textSecondary },
  tickDone: { backgroundColor: Colors.light.success, borderColor: Colors.light.success },
  tickResting: { borderColor: Colors.light.accent },
  setNumber: { fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 17, color: Colors.light.textSecondary },
  onSlabText: { color: Colors.light.onRubber },
  onSlabMuted: { color: Colors.light.onRubberSecondary },
  previous: { flex: 1, minHeight: touch.min, justifyContent: 'center', paddingHorizontal: spacing.xs },
  previousText: { fontFamily: 'Archivo-Medium', fontSize: 15, color: Colors.light.textSecondary },
  input: {
    width: 88,
    height: touch.min,
    borderRadius: radius.input,
    borderWidth: 1,
    textAlign: 'center',
    // Android pads TextInputs vertically and top-aligns the text; centre it in the 48dp box.
    textAlignVertical: 'center',
    paddingVertical: 0,
    ...type.setInput,
  },
  inputOnCard: { backgroundColor: Colors.light.background, borderColor: Colors.light.border, color: Colors.light.text },
  inputOnSlab: { backgroundColor: Colors.light.slabField, borderColor: Colors.light.borderOnRubber, color: Colors.light.onRubber },
  inputComplete: { backgroundColor: 'rgba(47,125,79,0.22)' },
  prBadge: {
    position: 'absolute',
    top: -7,
    right: -7,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
