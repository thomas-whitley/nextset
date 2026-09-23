import { View, Text, StyleSheet, TouchableOpacity, Platform, InputAccessoryView } from 'react-native';
import { Check, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, touch } from '@/constants/theme';

export const SET_ACCESSORY_ID = 'set-keyboard-bar';

function Bar({ field, onStep, onNext }: { field: 'weight' | 'reps'; onStep: (d: 1 | -1) => void; onNext: () => void }) {
  const step = field === 'weight' ? '2.5' : '1';
  const onReps = field === 'reps';
  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.btn} onPress={() => onStep(-1)} accessibilityRole="button" accessibilityLabel={`Minus ${step}`}><Text style={styles.btnText}>−{step}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => onStep(1)} accessibilityRole="button" accessibilityLabel={`Plus ${step}`}><Text style={styles.btnText}>+{step}</Text></TouchableOpacity>
      <View style={{ flex: 1 }} />
      <TouchableOpacity
        style={[styles.go, onReps && styles.goTick]}
        onPress={onNext}
        accessibilityRole="button"
        accessibilityLabel={onReps ? 'Tick set' : 'Next: reps'}
      >
        {onReps ? <Check size={22} strokeWidth={3} color="#FFFFFF" /> : null}
        <Text style={styles.goText}>{onReps ? 'Tick set' : 'Next'}</Text>
        {onReps ? null : <ChevronRight size={22} color="#FFFFFF" />}
      </TouchableOpacity>
    </View>
  );
}

/** iOS: real keyboard accessory. Android: rendered inline by the screen above the keyboard. */
export default function SetKeyboardBar(props: { field: 'weight' | 'reps'; onStep: (d: 1 | -1) => void; onNext: () => void; visible: boolean }) {
  if (Platform.OS === 'ios') return <InputAccessoryView nativeID={SET_ACCESSORY_ID}><Bar {...props} /></InputAccessoryView>;
  return props.visible ? <Bar {...props} /> : null;
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: Colors.light.backgroundSecondary, borderTopWidth: 1, borderTopColor: Colors.light.border },
  btn: { minWidth: 72, height: touch.min, borderRadius: 12, backgroundColor: Colors.light.card, borderWidth: 1, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md },
  btnText: { fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 20, color: Colors.light.text },
  go: { minWidth: 112, height: touch.min, borderRadius: 12, backgroundColor: Colors.light.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.base },
  goTick: { backgroundColor: Colors.light.success },
  goText: { fontFamily: 'Archivo-SemiBold', fontSize: 17, color: '#FFFFFF' },
});
