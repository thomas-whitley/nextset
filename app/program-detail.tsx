import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Lock } from 'lucide-react-native';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
import { useWorkout } from '@/contexts/WorkoutContext';
import type { Exercise, Workout } from '@/services/exercise.types';
import { addExercise, removeExercise, reorderExercises, setRepsTarget, setSetCount } from '@/services/programEdits';
import DraggableList from '@/components/gestures/DraggableList';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';
import BrowseExercisesScreen from '@/components/browse-exercises';
import ProgramExerciseRow from '@/components/ProgramExerciseRow';

// The slice of the native-stack navigation object this screen uses. Typed
// here rather than imported, because @react-navigation/* must not be imported
// in app code (CLAUDE.md).
type BeforeRemoveEvent = { preventDefault: () => void; data: { action: unknown } };
type LeaveGuardNavigation = {
  addListener: (type: 'beforeRemove', listener: (e: BeforeRemoveEvent) => void) => () => void;
  dispatch: (action: unknown) => void;
};

/** Edit one day of the current program between workouts (spec §6.1): /program-detail?day=<workoutId>. */
export default function ProgramDayEditorScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { day: dayId } = useLocalSearchParams<{ day?: string }>();
  const navigation = useNavigation() as unknown as LeaveGuardNavigation;
  const { currentProgram, currentActiveProgram, editDay, isDayLocked, flushProgramSync, hasPendingProgramWrite } = useWorkout();
  const [picking, setPicking] = useState(false);
  const leavingRef = useRef(false);
  // A leave check is running: a second X or back tap waits for it (review M9).
  const checkingRef = useRef(false);
  // Each row's "commit what is typed", keyed by exercise id (review I5).
  const pendingCommits = useRef(new Map<string, () => void>());
  // Latest context functions, so the listener below is added once (review M9).
  const flushRef = useRef(flushProgramSync);
  flushRef.current = flushProgramSync;
  const hasPendingRef = useRef(hasPendingProgramWrite);
  hasPendingRef.current = hasPendingProgramWrite;

  const day = currentProgram?.workouts.find((w) => w.id === dayId) ?? null;
  const running = day ? isDayLocked(day.id) : false;
  const locked = !day || !currentActiveProgram || running;

  // Every way out (the X, Android back, the iOS swipe-down) passes through
  // here: write what is pending, and stay put if it could not be written.
  // The editor has no local checkpoint to fall back on (grill R2-Q2).
  useEffect(() => {
    // Try again runs this again instead of re-dispatching the action: expo-router
    // marks an action it has already shown to beforeRemove, so a replay skips
    // this listener and closes the editor unsaved (device run T2-1).
    const attemptLeave = async (action: unknown) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      try {
        // A reps value still being typed has not blurred yet: commit it first, so it is
        // part of what gets flushed and of what "Not saved yet" reports on.
        pendingCommits.current.forEach((commit) => commit());
        await flushRef.current();
        if (hasPendingRef.current()) {
          Alert.alert('Not saved yet', 'Your changes have not reached NextSet. Check your connection and try again.', [
            { text: 'Keep editing', style: 'cancel' },
            { text: 'Try again', onPress: () => void attemptLeave(action) },
          ]);
          return;
        }
        leavingRef.current = true;
        navigation.dispatch(action);
      } finally {
        checkingRef.current = false;
      }
    };
    return navigation.addListener('beforeRemove', (e) => {
      if (leavingRef.current) return;
      e.preventDefault();
      void attemptLeave(e.data.action);
    });
  }, [navigation]);

  const edit = (fn: (d: Workout) => Workout | null, immediate: boolean) => {
    if (day) editDay(day.id, fn, immediate);
  };

  const confirmRemove = (exerciseId: string, name: string) =>
    Alert.alert(`Remove ${name}?`, `It comes out of ${day?.name ?? 'this day'} for your next workouts.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => edit((d) => removeExercise(d, exerciseId), true) },
    ]);

  const handlePick = (exercise: Exercise) => {
    edit((d) => addExercise(d, { exerciseId: exercise.id, name: exercise.name }), true);
    setPicking(false);
  };

  const exercises = day ? [...day.exercises].sort((a, b) => a.order - b.order) : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/*
        No swipe-down on iOS: a native modal dismissal is not stopped by a
        beforeRemove listener, so the sheet would vanish before the leave check
        runs (review I4). The X and Android back both go through it.
      */}
      <Stack.Screen options={{ gestureEnabled: false }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.square} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close">
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title} numberOfLines={1}>{day?.name ?? 'Day not found'}</Text>
          {currentProgram ? <Text style={styles.subtitle} numberOfLines={1}>{currentProgram.name}</Text> : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        {!day ? (
          <Text style={styles.note}>This day is no longer in your program.</Text>
        ) : (
          <>
            {!currentActiveProgram ? (
              <Text style={styles.note}>Your copy of this program did not load. Check your connection and open it again.</Text>
            ) : running ? (
              <View style={styles.lockedNote}>
                <Lock size={20} color={Colors.light.text} />
                <Text style={styles.lockedText}>You are doing this workout now. Finish it to edit this day.</Text>
              </View>
            ) : null}

            {exercises.length === 0 ? <Text style={styles.note}>No exercises yet. Add the first one below.</Text> : null}

            <DraggableList
              items={exercises}
              keyExtractor={(e) => e.id}
              gap={spacing.md}
              handleOnly
              enabled={!locked && exercises.length > 1}
              onReorder={(ids) => edit((d) => reorderExercises(d, ids), true)}
              renderItem={(exercise, _index, _isActive, handle) => (
                <ProgramExerciseRow
                  exercise={exercise}
                  locked={locked}
                  onSetCount={(n) => edit((d) => setSetCount(d, exercise.id, n), false)}
                  onRepsTarget={(t) => edit((d) => setRepsTarget(d, exercise.id, t), false)}
                  onRemove={() => confirmRemove(exercise.id, exercise.name)}
                  dragHandle={handle}
                  registerCommit={(commit) => {
                    if (commit) pendingCommits.current.set(exercise.id, commit);
                    else pendingCommits.current.delete(exercise.id);
                  }}
                />
              )}
            />

            {!locked ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setPicking(true)}
                accessibilityRole="button"
                accessibilityLabel={`Add exercise to ${day.name}`}
              >
                <Plus size={22} color={Colors.light.primary} />
                <Text style={styles.addText}>Add exercise</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>

      <DragDismissSheet visible={picking} onDismiss={() => setPicking(false)}>
        <View style={{ height: windowHeight * 0.85 }}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Add exercise</Text>
            <TouchableOpacity style={styles.square} onPress={() => setPicking(false)} accessibilityRole="button" accessibilityLabel="Close">
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          <BrowseExercisesScreen onExerciseSelect={handlePick} autoFocusSearch={false} />
        </View>
      </DragDismissSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  square: { width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1 },
  title: { ...type.section, fontSize: 22, color: Colors.light.text },
  subtitle: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  content: { padding: spacing.base, gap: spacing.md },
  note: { ...type.body, color: Colors.light.textSecondary },
  lockedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    backgroundColor: Colors.light.primaryLight,
  },
  lockedText: { ...type.bodyMedium, color: Colors.light.text, flex: 1 },
  addButton: {
    minHeight: touch.row,
    borderRadius: radius.card,
    backgroundColor: Colors.light.primaryLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  addText: { fontFamily: 'Archivo-SemiBold', fontSize: 17, color: Colors.light.primary },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: spacing.lg, paddingRight: spacing.sm },
  sheetTitle: { ...type.section, color: Colors.light.text },
});
