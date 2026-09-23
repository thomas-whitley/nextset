import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SkipForward } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, touch, type } from '@/constants/theme';

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
  // With the keyboard and its bar up, the full banner left almost no room for the
  // card being typed into (device run R9) — so it collapses to a single row.
  const compact = !!keyboardBarVisible;

  return (
    <View
      style={[styles.bar, compact ? styles.barCompact : { paddingBottom: bottomPad + spacing.xs }]}
      accessibilityRole="timer"
      accessibilityLabel={`Rest, ${mmss(remaining)} left`}
    >
      {compact ? (
        <View style={styles.compactCol}>
          <Text style={styles.timeCompact} maxFontSizeMultiplier={1.3}>{mmss(remaining)}</Text>
          <Text style={[styles.label, styles.labelCompact]} numberOfLines={1}>Rest · {exerciseName}</Text>
        </View>
      ) : (
        <View style={styles.textCol}>
          <Text style={styles.label} numberOfLines={1}>Rest · {exerciseName} set {setNumber}</Text>
          <Text style={styles.time} maxFontSizeMultiplier={1.3}>{mmss(remaining)}</Text>
        </View>
      )}
      <TouchableOpacity style={styles.adjust} onPress={() => onAdjust(-15)} accessibilityRole="button" accessibilityLabel="Fifteen seconds less"><Text style={styles.adjustText}>−15</Text></TouchableOpacity>
      <TouchableOpacity style={styles.adjust} onPress={() => onAdjust(15)} accessibilityRole="button" accessibilityLabel="Fifteen seconds more"><Text style={styles.adjustText}>+15</Text></TouchableOpacity>
      <TouchableOpacity style={styles.skip} onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip rest"><SkipForward size={24} color="#FFFFFF" /></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.lg, paddingRight: spacing.md, paddingTop: spacing.md, backgroundColor: Colors.light.primary, borderTopLeftRadius: radius.slab, borderTopRightRadius: radius.slab },
  textCol: { flex: 1 },
  barCompact: { paddingTop: spacing.xs, paddingBottom: spacing.xs, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  compactCol: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  timeCompact: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 24, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  labelCompact: { flexShrink: 1 },
  label: { ...type.label, color: 'rgba(255,255,255,0.85)' },
  time: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 34, lineHeight: 38, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  adjust: { width: 64, height: touch.min, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
  adjustText: { fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 18, color: '#FFFFFF' },
  skip: { width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center' },
});
