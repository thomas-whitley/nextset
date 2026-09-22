import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkipForward } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, HIT_SLOP } from '@/constants/theme';

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function RestBanner({ remaining, exerciseName, setNumber, onSkip, onAdjust, keyboardBarVisible }: {
  remaining: number; exerciseName: string; setNumber: number; onSkip: () => void; onAdjust: (delta: 15 | -15) => void; keyboardBarVisible?: boolean;
}) {
  const insets = useSafeAreaInsets();
  // SetKeyboardBar renders as our sibling below us when the keyboard is open, and the
  // on-screen keyboard already covers the nav bar in that case — so only add the inset
  // ourselves when we're the bottom-most element, or the extra padding shows as a gap
  // above the keyboard bar.
  const bottomPad = spacing.sm + (keyboardBarVisible ? 0 : insets.bottom);

  return (
    <View style={[styles.bar, { paddingBottom: bottomPad }]} accessibilityRole="timer" accessibilityLabel={`Rest, ${mmss(remaining)} left`}>
      <View style={styles.textCol}>
        <Text style={styles.eyebrow}>Rest · {exerciseName} set {setNumber}</Text>
        <Text style={styles.time}>{mmss(remaining)}</Text>
      </View>
      <TouchableOpacity style={styles.adjust} onPress={() => onAdjust(-15)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Fifteen seconds less"><Text style={styles.adjustText}>−15</Text></TouchableOpacity>
      <TouchableOpacity style={styles.adjust} onPress={() => onAdjust(15)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Fifteen seconds more"><Text style={styles.adjustText}>+15</Text></TouchableOpacity>
      <TouchableOpacity style={styles.skip} onPress={onSkip} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Skip rest"><SkipForward size={18} color="#FFFFFF" /></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: Colors.light.primary, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  textCol: { flex: 1 },
  eyebrow: { fontSize: 11, fontFamily: 'Archivo-Medium', color: 'rgba(255,255,255,0.8)' },
  time: { fontSize: 22, fontFamily: 'ArchivoNarrow-Bold', color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  adjust: { paddingHorizontal: spacing.sm, paddingVertical: 6, marginLeft: spacing.xs, borderRadius: radius.card, backgroundColor: 'rgba(255,255,255,0.18)' },
  adjustText: { color: '#FFFFFF', fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 14 },
  skip: { marginLeft: spacing.sm, padding: 8 },
});
