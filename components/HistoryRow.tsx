import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, type } from '@/constants/theme';
import { formatDayDate, formatKg, plural } from '@/utils/format';

type Props = { title: string; completedAt: string; sets: number; volume: number; first: boolean; onPress: () => void };

/** A 72dp row in Progress → History (Progress artboard). */
export default function HistoryRow({ title, completedAt, sets, volume, first, onPress }: Props) {
  const date = formatDayDate(completedAt);
  return (
    <TouchableOpacity
      style={[styles.row, !first && styles.divider]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${date}, ${formatKg(volume)}, ${plural(sets, 'set')}`}
    >
      <View style={styles.left}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.volume}>{formatKg(volume)}</Text>
        <Text style={styles.sets}>{plural(sets, 'set')}</Text>
      </View>
      <ChevronRight size={22} color={Colors.light.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.base, paddingRight: spacing.md },
  divider: { borderTopWidth: 1, borderTopColor: Colors.light.background },
  left: { flex: 1, gap: 2 },
  title: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 20, color: Colors.light.text },
  date: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  right: { alignItems: 'flex-end', gap: 2 },
  volume: { ...type.numeric, color: Colors.light.text },
  sets: { ...type.label, fontSize: 14, color: Colors.light.textSecondary, fontVariant: ['tabular-nums'] },
});
