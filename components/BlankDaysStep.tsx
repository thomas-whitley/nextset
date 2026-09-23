import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
import { DEFAULT_BLANK_DAYS, MAX_BLANK_DAYS } from '@/services/programEdits';
import { plural } from '@/utils/format';

type Props = { busy: boolean; onCreate: (days: number) => void; onBack: () => void };

/**
 * Asked once, when a blank program is created (grill Q4(c), Q12). Days are
 * "Day 1".."Day N" and fixed afterwards, so this is the only place the count
 * is chosen. Rendered inside the picker sheet, not as a second Modal.
 */
export default function BlankDaysStep({ busy, onCreate, onBack }: Props) {
  const [days, setDays] = useState(DEFAULT_BLANK_DAYS);
  const label = plural(days, 'day');
  return (
    <View style={styles.body}>
      <Text style={styles.title}>How many days?</Text>
      <Text style={styles.intro}>Each day starts empty. You add the exercises. The number of days is fixed once the program is made.</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          style={[styles.step, days <= 1 && styles.disabled]}
          disabled={days <= 1}
          onPress={() => setDays((d) => d - 1)}
          accessibilityRole="button"
          accessibilityLabel="Fewer days"
        >
          <Minus size={24} color={Colors.light.primary} />
        </TouchableOpacity>
        <View style={styles.valueBox}>
          <Text style={styles.value} maxFontSizeMultiplier={1.3}>{days}</Text>
          <Text style={styles.unit}>{days === 1 ? 'day' : 'days'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.step, days >= MAX_BLANK_DAYS && styles.disabled]}
          disabled={days >= MAX_BLANK_DAYS}
          onPress={() => setDays((d) => d + 1)}
          accessibilityRole="button"
          accessibilityLabel="More days"
        >
          <Plus size={24} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.create, busy && styles.disabled]}
        disabled={busy}
        onPress={() => onCreate(days)}
        accessibilityRole="button"
        accessibilityLabel={`Create program with ${label}`}
      >
        {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createText}>Create program</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.back} onPress={onBack} accessibilityRole="button" accessibilityLabel="Back to programs">
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.base },
  title: { ...type.section, fontSize: 24, color: Colors.light.text },
  intro: { ...type.body, color: Colors.light.textSecondary },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, paddingVertical: spacing.sm },
  step: { width: 64, height: touch.min + 8, borderRadius: radius.card, backgroundColor: Colors.light.primaryLight, justifyContent: 'center', alignItems: 'center' },
  valueBox: { alignItems: 'center', minWidth: 64 },
  value: { ...type.display, color: Colors.light.text },
  unit: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  disabled: { opacity: 0.4 },
  create: { minHeight: touch.row, borderRadius: radius.card, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center' },
  createText: { fontFamily: 'Archivo-SemiBold', fontSize: 18, color: '#FFFFFF' },
  back: { minHeight: touch.min, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center' },
  backText: { fontFamily: 'Archivo-SemiBold', fontSize: 17, color: Colors.light.text },
});
