import { View, Text, StyleSheet, TouchableOpacity, Platform, InputAccessoryView } from 'react-native';
import Colors from '@/constants/Colors';
import { spacing } from '@/constants/theme';

export const SET_ACCESSORY_ID = 'set-keyboard-bar';

function Bar({ field, onStep, onNext }: { field: 'weight' | 'reps'; onStep: (d: 1 | -1) => void; onNext: () => void }) {
  const step = field === 'weight' ? '2.5' : '1';
  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.btn} onPress={() => onStep(-1)} accessibilityRole="button" accessibilityLabel={`Minus ${step}`}><Text style={styles.btnText}>−{step}</Text></TouchableOpacity>
      <TouchableOpacity style={styles.btn} onPress={() => onStep(1)} accessibilityRole="button" accessibilityLabel={`Plus ${step}`}><Text style={styles.btnText}>+{step}</Text></TouchableOpacity>
      <View style={{ flex: 1 }} />
      <TouchableOpacity style={[styles.btn, styles.next]} onPress={onNext} accessibilityRole="button" accessibilityLabel={field === 'weight' ? 'Next: reps' : 'Done: tick set'}>
        <Text style={[styles.btnText, styles.nextText]}>{field === 'weight' ? 'Next' : 'Done ✓'}</Text>
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
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, backgroundColor: Colors.light.backgroundSecondary, borderTopWidth: 1, borderTopColor: Colors.light.border },
  btn: { paddingHorizontal: spacing.md, paddingVertical: 8, marginRight: spacing.sm, borderRadius: 8, backgroundColor: Colors.light.background, borderWidth: 1, borderColor: Colors.light.border },
  btnText: { fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 15, color: Colors.light.text },
  next: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary, marginRight: 0 },
  nextText: { color: '#FFFFFF' },
});
