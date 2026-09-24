import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { spacing, type } from '@/constants/theme';

/** A rule with "or" in the middle, between Continue with Google and the email form. */
export default function OrDivider() {
  return (
    <View style={styles.row} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.rule} />
      <Text style={styles.text}>or</Text>
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.light.border,
  },
  text: {
    ...type.label,
    color: Colors.light.textTertiary,
  },
});
