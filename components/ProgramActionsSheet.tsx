import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, touch, radius } from '@/constants/theme';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';

type Props = {
  visible: boolean;
  programName: string;
  /** Blanks can be renamed and deleted (grill R2-Q3/Q4); template copies can be reset. */
  blank: boolean;
  onDismiss: () => void;
  onReset: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/** The ⋯ on the active-program slab. Same row shape as the exercise ⋯ sheet. */
export default function ProgramActionsSheet({ visible, programName, blank, onDismiss, onReset, onRename, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const Row = ({ icon, title, sub, onPress, danger }: { icon: React.ReactNode; title: string; sub: string; onPress: () => void; danger?: boolean }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {icon}
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, danger && { color: Colors.light.error }]}>{title}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </TouchableOpacity>
  );
  return (
    <DragDismissSheet visible={visible} onDismiss={onDismiss}>
      <View style={[styles.body, { paddingBottom: spacing.lg + insets.bottom }]}>
        <Text style={styles.heading} numberOfLines={2}>{programName}</Text>
        {blank ? (
          <>
            <Row icon={<Pencil size={24} color={Colors.light.primary} />} title="Rename" sub="Give it a name you will recognise" onPress={onRename} />
            <Row icon={<Trash2 size={24} color={Colors.light.error} />} title="Delete program" sub="Your logged workouts stay in your history" onPress={onDelete} danger />
          </>
        ) : (
          <Row icon={<RotateCcw size={24} color={Colors.light.error} />} title="Reset to template" sub="Put back the original days, sets and reps" onPress={onReset} danger />
        )}
        <TouchableOpacity style={styles.cancel} onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </DragDismissSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: spacing.sm },
  heading: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 24, color: Colors.light.text, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.base, paddingHorizontal: spacing.lg, borderTopWidth: 1, borderTopColor: Colors.light.background },
  title: { fontFamily: 'Archivo-Medium', fontSize: 17, color: Colors.light.text },
  sub: { fontFamily: 'Archivo-Regular', fontSize: 15, color: Colors.light.textSecondary, marginTop: 2 },
  cancel: { height: touch.row, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontFamily: 'Archivo-SemiBold', fontSize: 17, color: Colors.light.text },
});
