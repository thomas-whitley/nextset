import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoreHorizontal, Play, Zap } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, elevation, type, touch } from '@/constants/theme';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useAuth } from '@/data/AuthContext';
import { useStartWorkout } from '@/hooks/useStartWorkout';
import { WorkoutHistoryEntry, WorkoutHistoryService } from '@/services/workoutHistoryService';
import { pickNextWorkout } from '@/services/upNext';
import { isBlankProgram } from '@/services/programEdits';
import { plural } from '@/utils/format';
import DraggableList from '@/components/gestures/DraggableList';
import ProgramPickerSheet from '@/components/ProgramPickerSheet';
import ProgramActionsSheet from '@/components/ProgramActionsSheet';
import RenameProgramSheet from '@/components/RenameProgramSheet';

export default function ProgramsScreen() {
  const {
    currentProgram, currentActiveProgram, isLoadingProgram, isProgramWorkoutRunning,
    reorderWorkouts, resetProgramToTemplate, renameCurrentProgram, deleteProgramCopy,
  } = useWorkout();
  const { user } = useAuth();
  const { start, startQuick } = useStartWorkout();
  const [recent, setRecent] = useState<WorkoutHistoryEntry[]>([]);
  const [picker, setPicker] = useState(false);
  const [actions, setActions] = useState(false);
  const [renaming, setRenaming] = useState(false);

  // Recent history only to mark "Up next"; reloaded on focus so it moves after a finish.
  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      WorkoutHistoryService.getWorkoutHistory(user.id, 30)
        .then(setRecent)
        .catch((error) => console.error('Failed to load recent workouts:', error));
    }, [user])
  );

  const blank = currentProgram ? isBlankProgram(currentProgram) : false;
  const days = currentProgram ? [...currentProgram.workouts].sort((a, b) => a.order - b.order) : [];
  const upNextId = pickNextWorkout(currentProgram, recent)?.id ?? null;

  const openEditor = (dayId: string) => router.push({ pathname: '/program-detail', params: { day: dayId } });

  const waitForWorkout = (what: string) =>
    Alert.alert('Finish your workout first', `You can ${what} once this workout is saved or discarded.`);

  const openPicker = () => (isProgramWorkoutRunning ? waitForWorkout('change program') : setPicker(true));

  const confirmReset = () => {
    setActions(false);
    if (!currentProgram) return;
    if (isProgramWorkoutRunning) return waitForWorkout('reset this program');
    Alert.alert('Reset to template?', `Your changes to ${currentProgram.name} are replaced with the original days, sets and reps.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          if (!(await resetProgramToTemplate())) Alert.alert('Could not reset', 'Check your connection and try again.');
        },
      },
    ]);
  };

  const confirmDelete = () => {
    setActions(false);
    if (!currentProgram || !currentActiveProgram) return;
    if (isProgramWorkoutRunning) return waitForWorkout('delete this program');
    Alert.alert(`Delete ${currentProgram.name}?`, 'The program and its days are removed. Workouts you logged with it stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProgramCopy(currentActiveProgram);
          } catch {
            Alert.alert('Could not delete', 'Check your connection and try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Programs</Text>

        {isLoadingProgram ? (
          <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
        ) : !currentProgram ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No program yet</Text>
            <Text style={styles.emptyBody}>Pick a program to follow, or log a quick workout.</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setPicker(true)} accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Choose a program</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineButton} onPress={startQuick} accessibilityRole="button" accessibilityLabel="Quick workout">
              <Zap size={20} color={Colors.light.text} />
              <Text style={styles.outlineButtonText}>Quick workout</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.slab}>
              <View style={styles.slabTop}>
                <View style={styles.slabText}>
                  <Text style={styles.slabLabel}>Active program</Text>
                  <Text style={styles.slabName}>{currentProgram.name}</Text>
                  <Text style={styles.slabMeta}>
                    {blank
                      ? `${plural(days.length, 'day')}, your own`
                      : `${currentProgram.schedule ?? plural(days.length, 'day')}, your edits kept`}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.slabMore}
                  onPress={() => setActions(true)}
                  accessibilityRole="button"
                  accessibilityLabel={blank ? `Rename or delete ${currentProgram.name}` : `More actions for ${currentProgram.name}: reset to template`}
                >
                  <MoreHorizontal size={24} color={Colors.light.onRubberSecondary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.slabButton} onPress={openPicker} accessibilityRole="button">
                <Text style={styles.slabButtonText}>Change program</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Days</Text>
            <DraggableList
              items={days}
              keyExtractor={(w) => w.id}
              gap={spacing.sm}
              enabled={days.length > 1}
              onReorder={(ids) => void reorderWorkouts(ids)}
              renderItem={(w, _index, isActive) => {
                const next = w.id === upNextId;
                return (
                  <View style={[styles.dayCard, next && styles.dayCardNext, isActive && styles.dayCardDragging]}>
                    <TouchableOpacity style={styles.dayOpen} onPress={() => openEditor(w.id)} accessibilityRole="button" accessibilityLabel={`Edit ${w.name}`}>
                      <View style={styles.dayTitleRow}>
                        <Text style={styles.dayName} numberOfLines={1}>{w.name}</Text>
                        {next ? <Text style={styles.upNext}>Up next</Text> : null}
                      </View>
                      <Text style={styles.dayMeta}>{plural(w.exercises.length, 'exercise')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.start, !next && styles.startQuiet]}
                      onPress={() => start(w)}
                      accessibilityRole="button"
                      accessibilityLabel={`Start ${w.name}`}
                    >
                      <Play size={16} color={next ? '#FFFFFF' : Colors.light.primary} fill={next ? '#FFFFFF' : Colors.light.primary} />
                      <Text style={[styles.startText, !next && styles.startTextQuiet]}>Start</Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
            <Text style={styles.hint}>Tap a day to change its exercises, sets and reps. Hold and drag to reorder.</Text>
          </>
        )}
      </ScrollView>

      <ProgramPickerSheet
        visible={picker}
        onDismiss={() => setPicker(false)}
        // One day: straight into its editor. Several: stay here, where each new day card opens its editor (grill Q14).
        onBlankCreated={(dayIds) => {
          if (dayIds.length === 1) openEditor(dayIds[0]);
        }}
      />
      <ProgramActionsSheet
        visible={actions}
        programName={currentProgram?.name ?? ''}
        blank={blank}
        onDismiss={() => setActions(false)}
        onReset={confirmReset}
        onRename={() => { setActions(false); setRenaming(true); }}
        onDelete={confirmDelete}
      />
      <RenameProgramSheet
        visible={renaming}
        initialName={currentProgram?.name ?? ''}
        onDismiss={() => setRenaming(false)}
        onSave={renameCurrentProgram}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  content: { paddingHorizontal: spacing.base, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, gap: spacing.base },
  title: { ...type.title, fontSize: 30, lineHeight: 36, color: Colors.light.text },
  loader: { marginVertical: spacing.xl },

  emptyCard: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, padding: spacing.lg, gap: spacing.md },
  emptyTitle: { ...type.section, color: Colors.light.text },
  emptyBody: { ...type.body, color: Colors.light.textSecondary },
  primaryButton: { minHeight: touch.row, borderRadius: radius.card, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center' },
  primaryButtonText: { fontFamily: 'Archivo-SemiBold', fontSize: 18, color: '#FFFFFF' },
  outlineButton: { minHeight: touch.min, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', alignItems: 'center' },
  outlineButtonText: { fontFamily: 'Archivo-Medium', fontSize: 16, color: Colors.light.text },

  slab: { backgroundColor: Colors.light.rubber, borderRadius: radius.slab, padding: spacing.lg, gap: spacing.base, ...elevation.slab },
  slabTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  slabText: { flex: 1, gap: spacing.xs },
  slabLabel: { ...type.label, fontSize: 15, color: Colors.light.onRubberSecondary },
  slabName: { ...type.title, fontSize: 30, lineHeight: 36, color: Colors.light.onRubber },
  slabMeta: { ...type.body, color: Colors.light.onRubberSecondary },
  slabMore: { width: touch.min, height: touch.min, marginTop: -spacing.sm, marginRight: -spacing.sm, justifyContent: 'center', alignItems: 'center' },
  slabButton: { minHeight: touch.min, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.borderOnRubber, justifyContent: 'center', alignItems: 'center' },
  slabButtonText: { fontFamily: 'Archivo-Medium', fontSize: 16, color: Colors.light.onRubber },

  label: { ...type.eyebrow, color: Colors.light.textSecondary, marginBottom: -spacing.sm },
  dayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: Colors.light.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
  },
  dayCardNext: { borderWidth: 2, borderColor: Colors.light.primary },
  dayCardDragging: { ...elevation.dragging },
  dayOpen: { flex: 1, minHeight: 64, justifyContent: 'center', gap: 2, paddingLeft: spacing.base, paddingRight: spacing.sm },
  dayTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayName: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 22, color: Colors.light.text, flexShrink: 1 },
  upNext: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 13,
    color: Colors.light.primary,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  dayMeta: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  start: { minHeight: touch.min, paddingHorizontal: 18, borderRadius: radius.card, backgroundColor: Colors.light.primary, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  startQuiet: { backgroundColor: Colors.light.primaryLight },
  startText: { fontFamily: 'Archivo-SemiBold', fontSize: 16, color: '#FFFFFF' },
  startTextQuiet: { color: Colors.light.primary },
  hint: { ...type.label, fontSize: 15, lineHeight: 22, color: Colors.light.textSecondary },
});
