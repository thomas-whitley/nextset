import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Animated, useWindowDimensions, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, X, Clock, Dumbbell, Trophy } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { useAuth } from '@/data/AuthContext';
import BrowseExercisesScreen from '@/components/browse-exercises';
import { getDefaultRestSeconds, DEFAULT_REST_SECONDS } from '@/services/preferences';
import { formatKg, formatMinutes } from '@/utils/format';
import BarLoadingStrip from '@/components/BarLoadingStrip';
import * as Haptics from 'expo-haptics';
import { radius, elevation, spacing, motion, type, touch, HIT_SLOP } from '@/constants/theme';
import { useConnectivity } from '@/hooks/useConnectivity';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';
import DraggableList from '@/components/gestures/DraggableList';
import type { WorkoutExercise, ExerciseSet } from '@/services/exercise.types';
import { sanitiseSetValue, stepValue } from '@/services/setSteps';
import SetRow from '@/components/SetRow';
import ExerciseCard from '@/components/ExerciseCard';
import ExerciseActionsSheet from '@/components/ExerciseActionsSheet';
import SwapExerciseSheet from '@/components/SwapExerciseSheet';
import HowToSheet from '@/components/HowToSheet';
import { withoutPending, pendingKey, type PendingRemoval } from '@/services/pendingRemoval';
import { remainingSeconds } from '@/services/restTimer';
import { ensureRestPermission, hasAskedRestPermission, markRestPermissionAsked, scheduleRestNotification, cancelRestNotification, openExactAlarmSettingsOnce } from '@/services/restNotifications';
import RestBanner from '@/components/RestBanner';
import SetKeyboardBar from '@/components/SetKeyboardBar';
import { summariseWorkout, countLoggedSets } from '@/services/finishSummary';

interface WorkoutMetadata {
  startTime: Date | null;
  endTime: Date | null;
  notes: string;
}

export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const {
    currentWorkout, 
    updateSet, 
    completeSet, 
    isWorkoutActive, 
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    updateExerciseSets,
    reorderExercises,
    replaceExercise,
    finishWorkout,
    discardWorkout,
    flushProgramSync,
    rest,
    dispatchRest,
    workoutStartedAt,
    setExerciseCollapsed,
    removeSet
  } = useWorkout();
  const { user } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const { isOnline } = useConnectivity();

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [actionsFor, setActionsFor] = useState<WorkoutExercise | null>(null);
  const [swapFor, setSwapFor] = useState<WorkoutExercise | null>(null);
  const [howToFor, setHowToFor] = useState<WorkoutExercise | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const restRemaining = remainingSeconds(rest, now);
  const firedRef = useRef(false);
  // Mirrors context `rest` so adjustRest's scheduling math always reads the
  // latest endsAt rather than the render-closure value (item 8).
  const restRef = useRef(rest);
  useEffect(() => {
    restRef.current = rest;
  }, [rest]);
  const [defaultRestSeconds, setDefaultRestSecondsState] = useState(DEFAULT_REST_SECONDS);
  const [saving, setSaving] = useState(false);
  // A ref, not state: the retry button in the alert calls saveWorkout from the render
  // that built it, so state would read the old count and the cap would never trip.
  const saveAttemptsRef = useRef(0);
  // Duration is derived from WorkoutContext's workoutStartedAt (survives a
  // minimise/resume remount, unlike a locally-owned start Date would).
  const [workoutNow, setWorkoutNow] = useState(() => Date.now());
  const workoutDuration = workoutStartedAt ? Math.max(0, Math.floor((workoutNow - workoutStartedAt) / 1000)) : 0;
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});

  type Focused = { exerciseId: string; setId: string; field: 'weight' | 'reps' } | null;
  const [focused, setFocused] = useState<Focused>(null);
  const inputRefs = useRef<Map<string, TextInput | null>>(new Map()); // key `${setId}:${field}`
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const s = Keyboard.addListener('keyboardDidShow', () => setKeyboardOpen(true));
    const h = Keyboard.addListener('keyboardDidHide', () => { setKeyboardOpen(false); setFocused(null); });
    return () => { s.remove(); h.remove(); };
  }, []);

  const [metadata, setMetadata] = useState<WorkoutMetadata>({
    startTime: null,
    endTime: null,
    notes: ''
  });

  // Swipe-to-remove is optimistic: the card disappears immediately and the
  // actual removal (a write to the active program) is delayed behind an Undo
  // window, so Undo is just "never send the write" rather than trying to
  // reconstruct a completed one.
  const UNDO_WINDOW_MS = 4000;
  const [pendingRemoval, setPendingRemoval] = useState<PendingRemoval | null>(null);
  const pendingRemovalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const undoSnackbarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    getDefaultRestSeconds().then(setDefaultRestSecondsState);
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const pendingId = pendingRemoval ? pendingKey(pendingRemoval) : null;
  useEffect(() => {
    if (pendingRemoval) {
      undoSnackbarAnim.setValue(0);
      Animated.timing(undoSnackbarAnim, {
        toValue: 1,
        duration: motion.base,
        useNativeDriver: true,
      }).start();
    }
    // Only re-run when a different removal is queued (pendingId), not on
    // every render of pendingRemoval/undoSnackbarAnim.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingId]);

  // Tick the display clock while a workout is active; the duration itself is
  // derived from workoutStartedAt, so this survives a minimise/resume remount.
  useEffect(() => {
    if (!isWorkoutActive) return;
    const id = setInterval(() => setWorkoutNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isWorkoutActive]);

  // Seed metadata.startTime (saved with the workout history record) once from
  // context. Deliberately keyed only on workoutStartedAt — including
  // metadata.startTime would refire this every time it becomes set, which is
  // harmless (the guard below no-ops) but pointless.
  useEffect(() => {
    if (workoutStartedAt && !metadata.startTime) {
      setMetadata((prev) => ({ ...prev, startTime: new Date(workoutStartedAt) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workoutStartedAt]);

  // Rest timer: a plain interval just re-renders so `restRemaining` (derived
  // from the reducer's absolute `endsAt`) ticks; the reducer holds no clock.
  useEffect(() => {
    if (rest.endsAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [rest.endsAt]);

  // Fires once, right when the countdown reaches zero: haptic in the
  // foreground, the scheduled OS notification covers the backgrounded case.
  useEffect(() => {
    if (rest.endsAt === null) { firedRef.current = false; return; }
    if (restRemaining === 0 && !firedRef.current) {
      firedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      dispatchRest({ type: 'expire' });
    }
  }, [restRemaining, rest.endsAt, dispatchRest]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetComplete = async (exercise: WorkoutExercise, setId: string, setIndex: number) => {
    const wasComplete = exercise.sets.find((s) => s.id === setId)?.isComplete ?? false;
    await completeSet(exercise.id, setId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    const nowComplete = !wasComplete;
    if (nowComplete) {
      const t = Date.now();
      const endsAt = t + defaultRestSeconds * 1000;
      // The banner works regardless of notification permission, so the
      // reducer starts immediately; the notification itself is scheduled
      // separately below once permission is actually settled (item 4) —
      // scheduling it here while permission is still 'undetermined' would
      // silently no-op on the very first set of a user's first workout.
      dispatchRest({ type: 'start', setId, seconds: defaultRestSeconds, now: t, exerciseName: exercise.name, setNumber: setIndex + 1 });

      if (await hasAskedRestPermission()) {
        void scheduleRestNotification(endsAt, exercise.name, setIndex + 1);
      } else {
        Alert.alert('Rest alerts', 'NextSet can buzz your phone when rest is over, even when it is locked.', [
          // "Not now" only records that the explainer was shown — it must
          // never fire the real OS permission prompt (item 3).
          { text: 'Not now', style: 'cancel', onPress: () => void markRestPermissionAsked() },
          {
            text: 'Allow',
            onPress: () => {
              void ensureRestPermission().then((status) => {
                if (status === 'granted') {
                  void scheduleRestNotification(endsAt, exercise.name, setIndex + 1);
                  // Fire-and-forget: sending the user to the exact-alarm system
                  // page must never block or fail the rest banner itself.
                  void openExactAlarmSettingsOnce().catch(() => {});
                }
              });
            },
          },
        ]);
      }
    } else if (rest.setId === setId) {
      dispatchRest({ type: 'skip' });
      void cancelRestNotification();
    }
  };

  const handlePickExercise = async (exercise: any) => {
    if (!currentWorkout) return;

    try {
      await addExerciseToWorkout(currentWorkout.id, exercise);
      setShowExerciseModal(false);
    } catch {
      Alert.alert('Could not add exercise', 'Check your connection and try again.');
    }
  };

  const clearPendingRemovalFor = (p: PendingRemoval) => {
    setPendingRemoval((cur) => (cur && pendingKey(cur) === pendingKey(p) ? null : cur));
  };

  /** Sends the removal once the undo window has elapsed (or the screen closes with one still pending). */
  const commitRemoval = async (p: PendingRemoval) => {
    if (!currentWorkout) {
      if (isMountedRef.current) clearPendingRemovalFor(p);
      return;
    }
    try {
      if (p.kind === 'exercise') await removeExerciseFromWorkout(currentWorkout.id, p.exercise.id);
      else await removeSet(p.exerciseId, p.set.id);
    } catch {
      if (isMountedRef.current) Alert.alert(p.kind === 'exercise' ? 'Could not remove exercise' : 'Could not remove set', 'Check your connection and try again.');
    } finally {
      if (isMountedRef.current) clearPendingRemovalFor(p);
    }
  };

  const queueRemoval = (p: PendingRemoval) => {
    // One undo window at a time: a second removal commits the first.
    if (pendingRemovalTimer.current) {
      clearTimeout(pendingRemovalTimer.current);
      pendingRemovalTimer.current = null;
      if (pendingRemoval) commitRemoval(pendingRemoval);
    }
    setPendingRemoval(p);
    pendingRemovalTimer.current = setTimeout(() => {
      pendingRemovalTimer.current = null;
      commitRemoval(p);
    }, UNDO_WINDOW_MS);
  };

  const handleRemoveExercise = (exercise: WorkoutExercise) => queueRemoval({ kind: 'exercise', exercise });
  const handleRemoveSet = (exerciseId: string, set: ExerciseSet, setNumber: number) =>
    queueRemoval({ kind: 'set', exerciseId, set, setNumber });

  const handleUndoRemoval = () => {
    if (pendingRemovalTimer.current) {
      clearTimeout(pendingRemovalTimer.current);
      pendingRemovalTimer.current = null;
    }
    setPendingRemoval(null);
  };

  const handleUpdateSets = async (exerciseId: string, change: number) => {
    if (!currentWorkout) return;
    
    const exercise = currentWorkout.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    const newSetCount = Math.max(1, exercise.sets.length + change);
    
    try {
      await updateExerciseSets(currentWorkout.id, exerciseId, newSetCount);
    } catch {
      Alert.alert('Could not change sets', 'Check your connection and try again.');
    }
  };

  const handleReorderExercises = async (orderedExerciseIds: string[]) => {
    // DraggableList only ever sees visibleExercises, which is one shorter
    // than currentWorkout.exercises while a removal is mid-undo-window.
    // WorkoutContext.reorderExercises rejects any ordering that doesn't
    // account for every exercise (so it never silently drops one), so the
    // pending one has to be reinserted here — at its pre-drag position —
    // before persisting, or every drag would silently no-op for as long as
    // the undo snackbar is showing.
    let finalOrder = orderedExerciseIds;
    if (pendingRemoval?.kind === 'exercise' && currentWorkout) {
      const pendingId = pendingRemoval.exercise.id;
      const originalIndex = currentWorkout.exercises.findIndex((e) => e.id === pendingId);
      finalOrder = [...orderedExerciseIds];
      finalOrder.splice(Math.max(0, Math.min(originalIndex, finalOrder.length)), 0, pendingId);
    }

    try {
      await reorderExercises(finalOrder);
    } catch {
      Alert.alert('Could not reorder', 'Check your connection and try again.');
    }
  };

  const skipRest = () => { dispatchRest({ type: 'skip' }); void cancelRestNotification(); };
  const adjustRest = (delta: 15 | -15) => {
    const t = Date.now();
    dispatchRest({ type: 'adjust', deltaSeconds: delta, now: t });
    // Read the latest endsAt via the ref, not the render-closure `rest` —
    // two rapid taps before a re-render would otherwise both adjust from the
    // same stale value (item 8).
    const nextEndsAt = Math.max(t, (restRef.current.endsAt ?? t) + delta * 1000);
    void scheduleRestNotification(nextEndsAt, rest.exerciseName, rest.setNumber);
  };

  const stopTimers = () => {
    skipRest();
  };

  const handleClosePress = () => {
    Alert.alert(currentWorkout?.name ?? 'Workout', 'Minimise keeps it running. Discard throws this session away.', [
      { text: 'Minimise', onPress: () => router.back() },
      { text: 'Discard workout', style: 'destructive', onPress: () =>
        Alert.alert('Discard this workout?', 'Nothing from this session will be saved.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => { stopTimers(); discardWorkout(); router.back(); } },
        ]) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Excludes whatever is mid-swipe (an exercise, or one set) so the summary,
  // the finish sheet and the saved workout all agree (spec, Review Focus 1).
  const visibleExercises = currentWorkout ? withoutPending(currentWorkout.exercises, pendingRemoval) : [];

  const completedSetCount = countLoggedSets(visibleExercises);
  const sessionVolume = visibleExercises.reduce(
    (total, e) => total + e.sets.filter((st) => st.isComplete).reduce((t, st) => t + (parseFloat(st.weight) || 0) * (parseFloat(st.reps) || 0), 0),
    0
  );

  const handleFinishWorkout = () => {
    if (!currentWorkout) return;
    if (completedSetCount === 0) {
      Alert.alert('Nothing logged yet', 'Tick off at least one set, or close the workout without saving.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard workout', style: 'destructive', onPress: () => { stopTimers(); discardWorkout(); router.back(); } },
      ]);
      return;
    }
    saveAttemptsRef.current = 0;
    setShowMetadataModal(true);
  };

  const saveWorkout = async () => {
    if (!currentWorkout || saving) return;

    if (!user) {
      Alert.alert('Logged out', 'Your session expired. Log in again — the workout is kept on this device until it saves.');
      return;
    }

    setSaving(true);
    const endTime = new Date();
    const startedAt = metadata.startTime ?? (workoutStartedAt ? new Date(workoutStartedAt) : endTime);
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startedAt.getTime()) / 60000));

    // Match whatever the summary above showed: if a swipe is still inside
    // its undo window when the user saves, its sets must not be banked —
    // the delayed write and this save must never disagree about volume.
    const workoutToSave = { ...currentWorkout, exercises: withoutPending(currentWorkout.exercises, pendingRemoval) };

    try {
      await flushProgramSync();
      await WorkoutHistoryService.saveWorkoutHistory(
        user.id,
        {
          ...workoutToSave,
          metadata: { ...metadata, endTime, duration: workoutDuration, exerciseNotes },
        },
        durationMinutes
      );

      stopTimers();
      setShowMetadataModal(false);
      finishWorkout();
      router.back();
    } catch (error) {
      console.error('Failed to save workout:', error);
      const attempts = saveAttemptsRef.current + 1;
      saveAttemptsRef.current = attempts;
      const buttons: { text: string; style: 'cancel' | 'default'; onPress?: () => void }[] = [
        { text: 'Keep editing', style: 'cancel' },
      ];
      if (attempts < 3) {
        buttons.unshift({ text: 'Try again', style: 'default', onPress: () => { void saveWorkout(); } });
      }
      Alert.alert(
        'Could not save',
        attempts < 3
          ? 'The workout is still here. Check your connection and try again.'
          : 'Still no connection. The workout is kept on this phone; finish it once you are back online.',
        buttons
      );
    } finally {
      setSaving(false);
    }
  };

  // The exercise you are actually on: the first with a set still to do. Its
  // card gets the rubber slab, so "where am I" is answerable at arm's length.
  const activeExerciseId =
    visibleExercises.find((ex: any) => ex.sets.some((s: any) => !s.isComplete))?.id ?? null;

  /** The set the loading strip should answer for — the next one you will do. */
  const nextSetIdFor = (exercise: any): string | null =>
    exercise.sets.find((s: any) => !s.isComplete)?.id ?? null;

  const renderSetRow = (
    set: WorkoutExercise['sets'][number],
    setIndex: number,
    exercise: WorkoutExercise,
    showStrip = false,
    onSlab = false
  ) => {
    const isActiveRest = rest.setId === set.id;

    return (
      <View key={set.id}>
        <SetRow
          set={set}
          index={setIndex}
          exerciseId={exercise.id}
          libraryExerciseId={exercise.exerciseId}
          repsTarget={exercise.repsTarget}
          isActiveRest={isActiveRest}
          onSlab={onSlab}
          onToggleComplete={() => handleSetComplete(exercise, set.id, setIndex)}
          onChange={(field, value) => {
            const next = sanitiseSetValue(field, value);
            if (next !== null) updateSet(exercise.id, set.id, field, next);
          }}
          onBlur={() => { void flushProgramSync(); }}
          onFocus={(field) => setFocused({ exerciseId: exercise.id, setId: set.id, field })}
          weightRef={(r) => { inputRefs.current.set(`${set.id}:weight`, r); }}
          repsRef={(r) => { inputRefs.current.set(`${set.id}:reps`, r); }}
        />

        {showStrip ? (
          <BarLoadingStrip totalKg={parseFloat(set.weight)} exerciseId={exercise.exerciseId} onRubber={onSlab} />
        ) : null}
      </View>
    );
  };

  const currentSet = () => {
    if (!focused || !currentWorkout) return null;
    const ex = currentWorkout.exercises.find((e) => e.id === focused.exerciseId);
    const set = ex?.sets.find((s) => s.id === focused.setId);
    return ex && set ? { ex, set, index: ex.sets.indexOf(set) } : null;
  };
  const handleStep = (direction: 1 | -1) => {
    const cur = currentSet();
    if (!cur || !focused) return;
    const next = stepValue(focused.field, cur.set[focused.field], direction);
    void updateSet(cur.ex.id, cur.set.id, focused.field, next);
  };
  const handleNext = () => {
    const cur = currentSet();
    if (!cur || !focused) return;
    if (focused.field === 'weight') {
      inputRefs.current.get(`${cur.set.id}:reps`)?.focus();
      return;
    }
    if (!cur.set.isComplete) void handleSetComplete(cur.ex, cur.set.id, cur.index);
    // visibleExercises, not currentWorkout.exercises: the latter still
    // includes an exercise mid-swipe inside its undo window (item 10).
    const nextInSame = cur.ex.sets[cur.index + 1];
    const liveIndex = visibleExercises.findIndex((e) => e.id === cur.ex.id);
    const nextExercise = nextInSame ? null : visibleExercises[liveIndex + 1] ?? null;
    const nextSet = nextInSame ?? nextExercise?.sets[0];
    if (!nextSet) {
      Keyboard.dismiss();
      return;
    }
    if (nextExercise && (currentWorkout?.collapsedExerciseIds ?? []).includes(nextExercise.id)) {
      // Its inputs don't exist while folded: unfold, then focus after it renders (Review Focus 3).
      setExerciseCollapsed(nextExercise.id, false);
      requestAnimationFrame(() => inputRefs.current.get(`${nextSet.id}:weight`)?.focus());
      return;
    }
    inputRefs.current.get(`${nextSet.id}:weight`)?.focus();
  };

  if (!isWorkoutActive || !currentWorkout) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Dumbbell size={48} color={Colors.light.primary} />
          </View>
          <Text style={styles.emptyTitle}>No workout running</Text>
          <Text style={styles.emptySubtitle}>
            Start one from Home, or pick a program first.
          </Text>
          <TouchableOpacity 
            style={styles.startWorkoutButton} 
            onPress={() => router.replace('/(tabs)/programs')}
            accessibilityRole="button"
          >
            <Text style={styles.startWorkoutButtonText}>Go to Programs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIcon} onPress={handleClosePress} accessibilityRole="button" accessibilityLabel="Close or discard workout">
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.workoutTitle} numberOfLines={1}>{currentWorkout.name}</Text>
          <View style={styles.timerContainer}>
            <Clock size={14} color={Colors.light.success} />
            <Text style={styles.workoutTimer}>{formatTime(workoutDuration)}</Text>
          </View>
        </View>
        <View>
          <TouchableOpacity
            style={[styles.finishButton, (!isOnline || saving) && { opacity: 0.5 }]}
            onPress={handleFinishWorkout}
            disabled={!isOnline || saving}
            accessibilityRole="button"
            accessibilityLabel="Finish workout"
          >
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
          {!isOnline ? <Text style={styles.finishHelper}>Waiting for connection</Text> : null}
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        >
        {!isOnline && (
          <View style={styles.offlineBanner} accessibilityRole="alert">
            <Text style={styles.offlineText}>Offline — your sets are saved on this phone</Text>
          </View>
        )}
        {/* Exercises — drag the grip (folded cards only) to reorder. */}
        <DraggableList
          items={visibleExercises}
          keyExtractor={(exercise) => exercise.id}
          gap={spacing.md}
          enabled={visibleExercises.length > 1}
          handleOnly
          onReorder={handleReorderExercises}
          renderItem={(exercise, _index, isDragging, handle) => (
            <View style={isDragging ? styles.exerciseCardDragging : undefined}>
              <ExerciseCard
                exercise={exercise}
                active={exercise.id === activeExerciseId}
                collapsed={(currentWorkout.collapsedExerciseIds ?? []).includes(exercise.id)}
                onToggleCollapsed={() =>
                  setExerciseCollapsed(exercise.id, !(currentWorkout.collapsedExerciseIds ?? []).includes(exercise.id))
                }
                onOpenActions={() => setActionsFor(exercise)}
                onAddSet={() => handleUpdateSets(exercise.id, 1)}
                onRemoveSet={(setId, setNumber) => {
                  const set = exercise.sets.find((s) => s.id === setId);
                  if (set) handleRemoveSet(exercise.id, set, setNumber);
                }}
                notes={exerciseNotes[exercise.id] || ''}
                onChangeNotes={(value) => setExerciseNotes((prev) => ({ ...prev, [exercise.id]: value }))}
                renderSetRow={(set, i, showStrip) => renderSetRow(set, i, exercise, showStrip, exercise.id === activeExerciseId)}
                nextSetId={nextSetIdFor(exercise)}
                dragHandle={handle}
              />
            </View>
          )}
        />

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => setShowExerciseModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Add exercise to workout"
          accessibilityHint="Browse and add new exercises to your current workout"
        >
          <Plus size={22} color={Colors.light.primary} />
          <Text style={styles.addExerciseButtonText}>Add exercise</Text>
        </TouchableOpacity>
        </ScrollView>

        {/* Both bars live INSIDE the KeyboardAvoidingView: it is what lifts them
            clear of the on-screen keyboard. As siblings after it they sat at the
            bottom of the (unresized, edge-to-edge) screen, i.e. behind the keys. */}
        {rest.endsAt !== null && (
          <RestBanner
            remaining={restRemaining}
            exerciseName={rest.exerciseName}
            setNumber={rest.setNumber}
            onSkip={skipRest}
            onAdjust={adjustRest}
            keyboardBarVisible={keyboardOpen && focused !== null}
          />
        )}

        <SetKeyboardBar field={focused?.field ?? 'weight'} onStep={handleStep} onNext={handleNext} visible={keyboardOpen && focused !== null} />
      </KeyboardAvoidingView>

      {/* Undo snackbar for an optimistically-removed exercise or set */}
      {pendingRemoval && (
        <Animated.View
          style={[
            styles.undoSnackbar,
            { bottom: spacing.lg + insets.bottom },
            {
              opacity: undoSnackbarAnim,
              transform: [
                { translateY: undoSnackbarAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              ],
            },
          ]}
        >
          <Text style={styles.undoSnackbarText} numberOfLines={1}>
            {pendingRemoval.kind === 'exercise' ? `${pendingRemoval.exercise.name} removed` : `Set ${pendingRemoval.setNumber} removed`}
          </Text>
          <TouchableOpacity
            onPress={handleUndoRemoval}
            hitSlop={HIT_SLOP}
            style={styles.undoButton}
            accessibilityRole="button"
            accessibilityLabel={`Undo removing ${pendingRemoval.kind === 'exercise' ? pendingRemoval.exercise.name : `set ${pendingRemoval.setNumber}`}`}
          >
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Finish sheet */}
      <DragDismissSheet visible={showMetadataModal} onDismiss={() => setShowMetadataModal(false)}>
        <KeyboardAvoidingView behavior="padding">
          <View style={styles.sheetBody}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Finish workout</Text>
              <TouchableOpacity style={styles.headerIcon} onPress={() => setShowMetadataModal(false)} accessibilityRole="button" accessibilityLabel="Back to workout">
                <X size={22} color={Colors.light.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.statTiles}>
              <View style={styles.statTile}>
                <Text style={styles.statTileValue}>{completedSetCount}</Text>
                <Text style={styles.statTileLabel}>{completedSetCount === 1 ? 'set done' : 'sets done'}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statTileValue}>{formatKg(sessionVolume)}</Text>
                <Text style={styles.statTileLabel}>lifted in {formatMinutes(Math.max(1, Math.round(workoutDuration / 60)))}</Text>
              </View>
            </View>

            {(() => {
              // Summarise visibleExercises, not currentWorkout: an exercise
              // mid-swipe inside its undo window must not appear in the
              // recap (item 9) — it matches sessionVolume/completedSetCount
              // above, which already exclude it.
              const { lines, prs } = summariseWorkout({ ...currentWorkout, exercises: visibleExercises });
              return (
                <>
                  {prs.length > 0 && (
                    <View style={styles.prBlock}>
                      <Text style={styles.sheetLabel}>Personal records</Text>
                      {prs.map((p) => (
                        <View key={p.id} style={styles.prLineRow}>
                          <Trophy size={16} color={Colors.light.accent} />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.prName}>{p.name}</Text>
                            {p.kind === 'weight' || p.kind === 'e1rm' ? (
                              <Text style={styles.prQualifier}>{p.kind === 'weight' ? '(heaviest)' : '(best est. 1RM)'}</Text>
                            ) : null}
                          </View>
                          <Text style={styles.prValue}>{p.weight} × {p.reps}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {lines.map((l) => (
                    <View key={l.id} style={styles.recapRow}>
                      <View style={styles.recapRowTop}>
                        <Text style={styles.recapName}>{l.name}</Text>
                        <Text style={styles.recapSets}>{l.setsDone} {l.setsDone === 1 ? 'set' : 'sets'}</Text>
                      </View>
                      <Text style={styles.recapDetail}>{l.detail}</Text>
                    </View>
                  ))}
                </>
              );
            })()}

            <Text style={styles.sheetLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.sheetInput, styles.sheetNotes]}
              value={metadata.notes}
              onChangeText={(v) => setMetadata((prev) => ({ ...prev, notes: v }))}
              placeholder="How did it go?"
              placeholderTextColor={Colors.light.textTertiary}
              multiline
              accessibilityLabel="Workout notes"
            />

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={saveWorkout}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Save workout"
            >
              <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save workout'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backToWorkoutButton}
              onPress={() => setShowMetadataModal(false)}
              accessibilityRole="button"
              accessibilityLabel="Back to workout"
            >
              <Text style={styles.backToWorkoutText}>Back to workout</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </DragDismissSheet>

      {/* Exercise Selection sheet */}
      <DragDismissSheet visible={showExerciseModal} onDismiss={() => setShowExerciseModal(false)}>
        <View style={[styles.sheetPickerBody, { height: windowHeight * 0.85 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add exercise</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close">
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          <BrowseExercisesScreen
            onExerciseSelect={handlePickExercise}
            autoFocusSearch={false}
          />
        </View>
      </DragDismissSheet>

      <ExerciseActionsSheet
        visible={actionsFor !== null}
        exerciseName={actionsFor?.name ?? ''}
        onDismiss={() => setActionsFor(null)}
        onHowTo={() => { setHowToFor(actionsFor); setActionsFor(null); }}
        onSwap={() => { setSwapFor(actionsFor); setActionsFor(null); }}
        onRemove={() => { if (actionsFor) handleRemoveExercise(actionsFor); setActionsFor(null); }}
      />
      <SwapExerciseSheet
        key={swapFor?.id ?? 'none'}
        visible={swapFor !== null}
        libraryExerciseId={swapFor?.exerciseId ?? -1}
        currentName={swapFor?.name ?? ''}
        onDismiss={() => setSwapFor(null)}
        onPick={async (picked) => {
          if (!swapFor) return;
          try {
            await replaceExercise(swapFor.id, picked);
            setSwapFor(null);
          } catch {
            Alert.alert('Could not swap exercise', 'Check your connection and try again.');
          }
        }}
      />
      <HowToSheet visible={howToFor !== null} libraryExerciseId={howToFor?.exerciseId ?? -1} onDismiss={() => setHowToFor(null)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: Colors.light.background
  },
  header: { minHeight: 64, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: spacing.xs, paddingRight: spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.light.border, backgroundColor: Colors.light.card },
  headerIcon: { width: touch.min, height: touch.min, justifyContent: 'center', alignItems: 'center' },
  headerContent: { flex: 1 },
  workoutTitle: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 20, lineHeight: 24, color: Colors.light.text },
  timerContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  workoutTimer: { fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 15, color: Colors.light.success, fontVariant: ['tabular-nums'] },
  finishButton: { height: touch.min, paddingHorizontal: spacing.lg, borderRadius: 12, backgroundColor: Colors.light.accent, justifyContent: 'center' },
  finishButtonText: { fontFamily: 'Archivo-SemiBold', fontSize: 16, color: Colors.light.rubber },
  finishHelper: { ...type.label, color: Colors.light.textTertiary, textAlign: 'right', marginTop: 2 },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  offlineBanner: { backgroundColor: Colors.light.warning, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.input, marginBottom: spacing.md },
  offlineText: { ...type.label, fontSize: 15, color: Colors.light.rubber, textAlign: 'center' },
  // DraggableList already applies elevation.dragging + a scale bump while a
  // card is actually moving; this is the resting-state cue for which one.
  exerciseCardDragging: {
    borderRadius: radius.slab,
  },
  undoSnackbar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: Colors.light.rubber,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...elevation.dragging,
  },
  undoSnackbarText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.onRubber,
    marginRight: spacing.md,
  },
  undoButton: {
    minHeight: touch.min,
    minWidth: touch.min,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  undoButtonText: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.accent,
  },
  // Body content for the exercise-picker sheet: the sheet itself only hugs
  // content, so a bounded height here is what lets the long inner list
  // (BrowseExercisesScreen's FlatList uses flex: 1) size and scroll
  // correctly instead of collapsing to nothing.
  sheetPickerBody: {
    width: '100%',
  },
  sheetBody: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  statTiles: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statTile: { flex: 1, backgroundColor: Colors.light.background, borderRadius: radius.card, padding: spacing.base },
  statTileValue: { ...type.display, color: Colors.light.text },
  statTileLabel: { ...type.body, fontSize: 15, color: Colors.light.textSecondary },
  sheetLabel: { ...type.eyebrow, color: Colors.light.textSecondary, marginBottom: 6, marginTop: spacing.sm },
  prBlock: { marginBottom: spacing.md, backgroundColor: Colors.light.accentLight, borderRadius: radius.card, padding: spacing.base },
  prLineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  prName: { fontFamily: 'Archivo-Medium', fontSize: 17, color: Colors.light.text },
  prQualifier: { fontFamily: 'Archivo-Regular', fontSize: 14, color: Colors.light.textSecondary, marginTop: 2 },
  prValue: { fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 20, color: Colors.light.text },
  recapRow: { minHeight: 40, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: Colors.light.background, paddingVertical: spacing.xs },
  recapRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recapName: { fontFamily: 'Archivo-Regular', fontSize: 16, color: Colors.light.text, flex: 1 },
  recapSets: { fontFamily: 'ArchivoNarrow-SemiBold', fontSize: 17, color: Colors.light.textSecondary },
  recapDetail: { fontFamily: 'Archivo-Regular', fontSize: 14, color: Colors.light.textSecondary, marginTop: 2 },
  sheetInput: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    fontFamily: 'Archivo-Regular',
    color: Colors.light.text,
    marginBottom: 16,
  },
  sheetNotes: { minHeight: 96, textAlignVertical: 'top' },
  saveButton: { height: touch.row, backgroundColor: Colors.light.primary, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 18, fontFamily: 'Archivo-SemiBold', color: '#FFFFFF' },
  backToWorkoutButton: { height: touch.min, justifyContent: 'center', alignItems: 'center' },
  backToWorkoutText: { fontFamily: 'Archivo-SemiBold', fontSize: 16, color: Colors.light.primary },
  addExerciseButton: {
    minHeight: touch.row,
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.textTertiary,
    borderStyle: 'dashed'
  },
  addExerciseButtonText: {
    fontFamily: 'Archivo-SemiBold',
    fontSize: 16,
    color: Colors.light.primary,
    marginLeft: spacing.sm
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32
  },
  startWorkoutButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32
  },
  startWorkoutButtonText: {
    fontSize: 18,
    fontFamily: 'ArchivoNarrow-Bold',
    color: '#FFFFFF'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border
  },
  modalTitle: { fontSize: 18, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
});