import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, type } from '@/constants/theme';

/**
 * NextSet wordmark, rendered typographically. There is no image asset — the
 * brand work in scripts/brand/ shipped icons only — so the plate-ring glyph is
 * built from nested Views using the icon.svg proportions (rubber square,
 * plate-blue disc at ~69%, concrete centre at ~23%).
 */

const GLYPH = 28;
const DISC = 20;
const CENTRE = 6;

export default function Wordmark() {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="NextSet">
      <View style={styles.glyph}>
        <View style={styles.disc}>
          <View style={styles.centre} />
        </View>
      </View>
      <Text style={styles.text}>NEXTSET</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  glyph: {
    width: GLYPH,
    height: GLYPH,
    borderRadius: radius.input,
    backgroundColor: Colors.light.rubber,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disc: {
    width: DISC,
    height: DISC,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centre: {
    width: CENTRE,
    height: CENTRE,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.concrete,
  },
  text: {
    ...type.title,
    color: Colors.light.text,
    letterSpacing: 1.5,
  },
});
