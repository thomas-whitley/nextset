import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Check, ChevronRight, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useAuth } from '@/data/AuthContext';
import { UserActiveProgramService } from '@/services/userActiveProgramService';
import { buildProgramChoices } from '@/services/programChoices';
import { plural } from '@/utils/format';
import type { UserActiveProgram } from '@/services/exercise.types';
import BlankDaysStep from '@/components/BlankDaysStep';

type Props = {
  visible: boolean;
  onDismiss: () => void;
  /** A blank program was just created with these days (in order). */
  onBlankCreated: (dayIds: string[]) => void;
};

/** "Choose a program" (Picker artboard): your copies, then a blank program and the templates you have not started. */
export default function ProgramPickerSheet({ visible, onDismiss, onBlankCreated }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { user } = useAuth();
  const { programs, currentActiveProgram, setCurrentProgram, selectProgramCopy, createBlankProgram, deleteProgramCopy } = useWorkout();
  const [copies, setCopies] = useState<UserActiveProgram[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Blank program swaps the lists for the "How many days?" step inside this same sheet.
  const [askingDays, setAskingDays] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setCopies(await UserActiveProgramService.getUserActivePrograms(user.id));
    } catch (error) {
      console.error('Failed to load program copies:', error);
      setCopies([]);
    }
  }, [user]);

  useEffect(() => {
    if (!visible) return;
    setCopies(null);
    setAskingDays(false);
    void load();
  }, [visible, load]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    try {
      await action();
      onDismiss();
    } catch {
      Alert.alert('Could not switch program', 'Check your connection and try again.');
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = (row: UserActiveProgram, blank: boolean) =>
    Alert.alert(
      blank ? `Delete ${row.program_data.name}?` : `Delete your copy of ${row.program_data.name}?`,
      blank
        ? 'The program and its days are removed. Workouts you logged with it stay in your history.'
        : 'Your changes to it are removed, and it goes back to Start something new. Workouts you logged stay in your history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (!(await deleteProgramCopy(row))) Alert.alert('Finish your workout first', 'This program has a workout running.');
              await load();
            } catch {
              Alert.alert('Could not delete', 'Check your connection and try again.');
            }
          },
        },
      ]
    );

  const choices = copies ? buildProgramChoices(programs, copies, currentActiveProgram?.id ?? null) : null;

  return (
    <DragDismissSheet visible={visible} onDismiss={onDismiss}>
      {/* Stops below the status bar, like the How-to sheet (redesign R6, device run T2-14). */}
      <View style={{ height: Math.min(height * 0.9, height - insets.top - insets.bottom - spacing.xxl - 48) }}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose a program</Text>
          <TouchableOpacity style={styles.close} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close">
            <X size={22} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>
          {askingDays ? (
            <BlankDaysStep
              busy={busy === 'blank'}
              onBack={() => setAskingDays(false)}
              onCreate={(days) =>
                run('blank', async () => {
                  const dayIds = await createBlankProgram(days);
                  onDismiss(); // close the sheet before any editor route opens over it
                  if (dayIds) onBlankCreated(dayIds);
                })
              }
            />
          ) : (
          <>
          <Text style={styles.intro}>Switching keeps your edits. Come back to a program and it is how you left it.</Text>

          {!choices ? (
            <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
          ) : (
            <>
              {choices.yours.length > 0 ? (
                <View style={styles.section}>
                  <Text style={styles.label}>Your programs</Text>
                  <View style={styles.list}>
                    {choices.yours.map((c, i) => (
                      <View key={c.row.id} style={[styles.item, i > 0 && styles.itemDivider]}>
                        <TouchableOpacity
                          style={styles.pick}
                          disabled={busy !== null}
                          onPress={() => (c.active ? onDismiss() : run(c.row.id, () => selectProgramCopy(c.row)))}
                          accessibilityRole="button"
                          accessibilityLabel={`${c.name}, ${c.meta}`}
                        >
                          <View style={styles.pickText}>
                            <Text style={styles.name}>{c.name}</Text>
                            <Text style={styles.meta}>{c.meta}</Text>
                          </View>
                          {busy === c.row.id ? (
                            <ActivityIndicator color={Colors.light.primary} />
                          ) : c.active ? (
                            <Check size={22} color={Colors.light.success} strokeWidth={3} />
                          ) : null}
                        </TouchableOpacity>
                        {/* Any copy but the active one; that one is deleted from the slab (review M10). */}
                        {!c.active ? (
                          <TouchableOpacity style={styles.more} onPress={() => confirmDelete(c.row, c.blank)} accessibilityRole="button" accessibilityLabel={`Delete ${c.name}`}>
                            <Trash2 size={22} color={Colors.light.textTertiary} />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.moreSpacer} />
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.section}>
                <Text style={styles.label}>Start something new</Text>
                <TouchableOpacity
                  style={styles.blank}
                  disabled={busy !== null}
                  onPress={() => setAskingDays(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Blank program, empty days you fill yourself"
                >
                  <View style={styles.blankIcon}>
                    <Plus size={22} color={Colors.light.primary} />
                  </View>
                  <View style={styles.pickText}>
                    <Text style={[styles.name, { color: Colors.light.primary }]}>Blank program</Text>
                    <Text style={styles.meta}>Empty days you fill yourself</Text>
                  </View>
                </TouchableOpacity>
                {choices.fresh.length > 0 ? (
                  <View style={styles.list}>
                    {choices.fresh.map((t, i) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[styles.pick, styles.freshPick, i > 0 && styles.itemDivider]}
                        disabled={busy !== null}
                        onPress={() => run(t.id, () => setCurrentProgram(t))}
                        accessibilityRole="button"
                        accessibilityLabel={`${t.name}, ${plural(t.workouts.length, 'day')}`}
                      >
                        <View style={styles.pickText}>
                          <Text style={styles.name}>{t.name}</Text>
                          <Text style={styles.meta}>{t.schedule ?? plural(t.workouts.length, 'day')}</Text>
                        </View>
                        {busy === t.id ? <ActivityIndicator color={Colors.light.primary} /> : <ChevronRight size={22} color={Colors.light.textTertiary} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            </>
          )}
          </>
          )}
        </ScrollView>
      </View>
    </DragDismissSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.base, paddingRight: spacing.sm },
  title: { ...type.title, flex: 1, color: Colors.light.text },
  close: {
    width: touch.min,
    height: touch.min,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: { paddingHorizontal: spacing.base, gap: spacing.base },
  intro: { ...type.body, color: Colors.light.textSecondary },
  loader: { marginVertical: spacing.xl },
  section: { gap: spacing.sm },
  label: { ...type.eyebrow, color: Colors.light.textSecondary },
  list: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border },
  item: { flexDirection: 'row', alignItems: 'center' },
  itemDivider: { borderTopWidth: 1, borderTopColor: Colors.light.background },
  pick: { flex: 1, minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingLeft: spacing.base, paddingRight: spacing.sm, paddingVertical: spacing.sm },
  freshPick: { paddingRight: spacing.base },
  pickText: { flex: 1, gap: 2 },
  name: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 20, color: Colors.light.text },
  meta: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  more: { width: touch.min, height: touch.min, marginRight: spacing.sm, justifyContent: 'center', alignItems: 'center' },
  moreSpacer: { width: touch.min + spacing.sm },
  blank: {
    minHeight: 64,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.light.textTertiary,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
  },
  blankIcon: { width: 40, height: 40, borderRadius: radius.card, backgroundColor: Colors.light.primaryLight, justifyContent: 'center', alignItems: 'center' },
});
