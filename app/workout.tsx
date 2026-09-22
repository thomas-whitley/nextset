import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, Animated, useWindowDimensions, Keyboard } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Minus, X, Clock, Dumbbell, ChevronDown, ChevronUp, Trash2, RefreshCw } from 'lucide-react-native';
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
import { radius, elevation, spacing, motion, type, HIT_SLOP } from '@/constants/theme';
import { useConnectivity } from '@/hooks/useConnectivity';
import { isTimedExercise } from '@/data/timedExercises';
import SwipeToRemove from '@/components/gestures/SwipeToRemove';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';
import DraggableList from '@/components/gestures/DraggableList';
import type { WorkoutExercise } from '@/services/exercise.types';
import { sanitiseSetValue, stepValue } from '@/services/setSteps';
import SetRow from '@/components/SetRow';
import { formatRepsTarget } from '@/services/repsTarget';
import { remainingSeconds } from '@/services/restTimer';
import { ensureRestPermission, hasAskedRestPermission, markRestPermissionAsked, scheduleRestNotification, cancelRestNotification, openExactAlarmSettingsOnce } from '@/services/restNotifications';
import RestBanner from '@/components/RestBanner';
import SetKeyboardBar from '@/components/SetKeyboardBar';
import { summariseWorkout, countLoggedSets } from '@/services/finishSummary';

interface WorkoutMetadata {
  startTime: Date | null;
  endTime: Date | null;
  bodyweight: string;
  notes: string;
}

interface WarmupOption {
  id: string;
  name: string;
  duration: string;
  description: string;
}

const warmupOptions: WarmupOption[] = [
  { id: '1', name: 'Leg Swings', duration: '5 min', description: 'Dynamic leg movements to activate hip flexors' },
  { id: '2', name: 'Dynamic Stretches', duration: '8 min', description: 'Full body dynamic stretching routine' },
  { id: '3', name: 'Yoga Flow', duration: '10 min', description: 'Gentle yoga sequence for mobility' },
  { id: '4', name: 'Joint Mobility', duration: '6 min', description: 'Targeted joint activation exercises' },
];

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
    flushProgramSync,
    rest,
    dispatchRest,
    workoutStartedAt
  } = useWorkout();
  const { user } = useAuth();
  const { height: windowHeight } = useWindowDimensions();
  const { isOnline } = useConnectivity();

  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [pickerMode, setPickerMode] = useState<{ kind: 'add' } | { kind: 'replace'; exerciseId: string }>({ kind: 'add' });
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showWarmupModal, setShowWarmupModal] = useState(false);
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
  const [isWarmupCollapsed, setIsWarmupCollapsed] = useState(false);
  const [selectedWarmup, setSelectedWarmup] = useState<WarmupOption | null>(null);
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
    bodyweight: '',
    notes: ''
  });

  // Swipe-to-remove is optimistic: the card disappears immediately and the
  // actual removal (a write to the active program) is delayed behind an Undo
  // window, so Undo is just "never send the write" rather than trying to
  // reconstruct a completed one.
  const UNDO_WINDOW_MS = 4000;
  const [pendingRemoval, setPendingRemoval] = useState<{ exercise: WorkoutExercise } | null>(null);
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

  useEffect(() => {
    if (pendingRemoval) {
      undoSnackbarAnim.setValue(0);
      Animated.timing(undoSnackbarAnim, {
        toValue: 1,
        duration: motion.base,
        useNativeDriver: true,
      }).start();
    }
  }, [pendingRemoval?.exercise.id]);

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
      if (pickerMode.kind === 'replace') await replaceExercise(pickerMode.exerciseId, exercise);
      else await addExerciseToWorkout(currentWorkout.id, exercise);
      setShowExerciseModal(false);
    } catch {
      Alert.alert(pickerMode.kind === 'replace' ? 'Could not replace exercise' : 'Could not add exercise', 'Check your connection and try again.');
    }
  };

  // Only clears pendingRemoval if it's still the one this commit was for:
  // committing exercise A (because B got swiped before A's undo window
  // closed) must not wipe B's still-pending state out from under it once
  // A's write resolves.
  const clearPendingRemovalFor = (exercise: WorkoutExercise) => {
    setPendingRemoval((p) => (p?.exercise.id === exercise.id ? null : p));
  };

  /** Actually sends the removal once the undo window has elapsed (or the screen closes with one still pending). */
  const commitRemoval = async (exercise: WorkoutExercise) => {
    if (!currentWorkout) {
      if (isMountedRef.current) clearPendingRemovalFor(exercise);
      return;
    }
    try {
      await removeExerciseFromWorkout(currentWorkout.id, exercise.id);
    } catch {
      if (isMountedRef.current) Alert.alert('Could not remove exercise', 'Check your connection and try again.');
    } finally {
      if (isMountedRef.current) clearPendingRemovalFor(exercise);
    }
  };

  const handleRemoveExercise = (exercise: WorkoutExercise) => {
    // Only one undo window open at a time: swiping a second row commits
    // whichever removal was already pending, so "removed" stays meaningful.
    if (pendingRemovalTimer.current) {
      clearTimeout(pendingRemovalTimer.current);
      pendingRemovalTimer.current = null;
      if (pendingRemoval) commitRemoval(pendingRemoval.exercise);
    }

    setPendingRemoval({ exercise });
    pendingRemovalTimer.current = setTimeout(() => {
      pendingRemovalTimer.current = null;
      commitRemoval(exercise);
    }, UNDO_WINDOW_MS);
  };

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

  const handleWarmupSelect = (warmup: WarmupOption) => {
    setSelectedWarmup(warmup);
    setShowWarmupModal(false);
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
    if (pendingRemoval && currentWorkout) {
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
    Alert.alert(currentWorkout?.name ?? 'Workout', undefined, [
      { text: 'Minimise', onPress: () => router.back() },
      { text: 'Discard workout', style: 'destructive', onPress: () =>
        Alert.alert('Discard this workout?', 'Nothing from this session will be saved.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => { stopTimers(); finishWorkout(); router.back(); } },
        ]) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Excludes whichever exercise is mid-swipe: once removed from view it
  // should stop counting toward the summary too, even before the delayed
  // write actually lands.
  const visibleExercises = currentWorkout
    ? currentWorkout.exercises.filter((e) => e.id !== pendingRemoval?.exercise.id)
    : [];

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
        { text: 'Discard workout', style: 'destructive', onPress: () => { stopTimers(); finishWorkout(); router.back(); } },
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
    const workoutToSave = {
      ...currentWorkout,
      exercises: currentWorkout.exercises.filter((e) => e.id !== pendingRemoval?.exercise.id),
    };

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
    const nextSet = cur.ex.sets[cur.index + 1] ?? visibleExercises[visibleExercises.indexOf(cur.ex) + 1]?.sets[0];
    if (nextSet) inputRefs.current.get(`${nextSet.id}:weight`)?.focus();
    else Keyboard.dismiss();
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
      {/* Header with Workout Timer */}
      <View style={[styles.header, { height: 60 }]}>
        <TouchableOpacity
          onPress={handleClosePress}
          accessibilityRole="button"
          accessibilityLabel="Close or discard workout"
          accessibilityHint="Exit current workout session"
        >
          <X size={20} color={Colors.light.text} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.workoutTitle}>{currentWorkout.name}</Text>
          <View style={styles.timerContainer}>
            <Clock size={14} color={Colors.light.success} />
            <Text style={styles.workoutTimer}>{formatTime(workoutDuration)}</Text>
          </View>
        </View>
        
        <View style={styles.headerButtons}>
          <View>
            <TouchableOpacity
              style={styles.finishButton}
              onPress={handleFinishWorkout}
              disabled={!isOnline || saving}
              accessibilityRole="button"
              accessibilityLabel="Finish workout"
              accessibilityHint="Complete and save your workout session"
            >
              <Text style={styles.finishButtonText}>Finish</Text>
            </TouchableOpacity>
            {!isOnline && (
              <Text style={styles.finishHelper}>Waiting for connection</Text>
            )}
          </View>
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
        {/* Warmup Section */}
        <TouchableOpacity 
          style={styles.warmupCard} 
          onPress={() => setIsWarmupCollapsed(!isWarmupCollapsed)}
          accessibilityRole="button"
          accessibilityLabel={`Warmup section ${isWarmupCollapsed ? 'collapsed' : 'expanded'}`}
          accessibilityHint="Tap to expand or collapse warmup options"
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Dumbbell size={16} color={Colors.light.primary} />
              <Text style={styles.sectionTitle}>Warmup</Text>
            </View>
            {isWarmupCollapsed ? 
              <ChevronDown size={20} color={Colors.light.textTertiary} /> : 
              <ChevronUp size={20} color={Colors.light.textTertiary} />
            }
          </View>
          
          {!isWarmupCollapsed && (
            <>
              {selectedWarmup ? (
                <View style={styles.selectedWarmup}>
                  <Text style={styles.selectedWarmupName}>{selectedWarmup.name}</Text>
                  <Text style={styles.selectedWarmupDescription}>{selectedWarmup.description}</Text>
                  <Text style={styles.selectedWarmupDuration}>{selectedWarmup.duration}</Text>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.chooseWarmupButton}
                  onPress={() => setShowWarmupModal(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Choose warmup exercise"
                  accessibilityHint="Select a warmup routine for your workout"
                >
                  <Text style={styles.chooseWarmupText}>Choose Warmup</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </TouchableOpacity>

        {/* Exercises — long-press a card to pick it up and reorder. */}
        <DraggableList
          items={visibleExercises}
          keyExtractor={(exercise) => exercise.id}
          gap={spacing.md}
          enabled={visibleExercises.length > 1}
          onReorder={handleReorderExercises}
          renderItem={(exercise, exerciseIndex, isDragging) => (
            <View
              style={[
                styles.exerciseCardOuter,
                exercise.id === activeExerciseId && styles.exerciseCardOuterActive,
                isDragging && styles.exerciseCardDragging,
                isDragging && { borderRadius: exercise.id === activeExerciseId ? radius.slab : radius.card },
              ]}
            >
              <SwipeToRemove
                onRemove={() => handleRemoveExercise(exercise)}
                label={`Remove ${exercise.name}`}
                cornerRadius={exercise.id === activeExerciseId ? radius.slab : radius.card}
              >
                <View
                  style={[styles.exerciseCard, exercise.id === activeExerciseId && styles.exerciseCardActive]}
                >
                  <View style={styles.exerciseHeader}>
                    <Text
                      style={[styles.exerciseName, exercise.id === activeExerciseId && styles.onSlabText]}
                    >
                      {exercise.name}
                    </Text>
                    <Text style={[styles.planText, exercise.id === activeExerciseId && styles.onSlabMuted]}>
                      {exercise.sets.length} × {formatRepsTarget(exercise.repsTarget) || '—'}
                    </Text>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => { setPickerMode({ kind: 'replace', exerciseId: exercise.id }); setShowExerciseModal(true); }}
                      hitSlop={HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={`Replace ${exercise.name}`}
                    >
                      <RefreshCw
                        size={16}
                        color={
                          exercise.id === activeExerciseId
                            ? Colors.light.onRubberSecondary
                            : Colors.light.textTertiary
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveExercise(exercise)}
                      hitSlop={HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${exercise.name}`}
                    >
                      <Trash2
                        size={16}
                        color={
                          exercise.id === activeExerciseId
                            ? Colors.light.onRubberSecondary
                            : Colors.light.textTertiary
                        }
                      />
                    </TouchableOpacity>
                    <View style={styles.setControls}>
                      <TouchableOpacity
                        style={styles.setControlButton}
                        onPress={() => handleUpdateSets(exercise.id, -1)}
                        disabled={exercise.sets.length <= 1}
                      >
                        <Minus
                          size={12}
                          color={exercise.sets.length <= 1 ? Colors.light.border : Colors.light.primary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.setCount}>{exercise.sets.length}</Text>
                      <TouchableOpacity
                        style={styles.setControlButton}
                        onPress={() => handleUpdateSets(exercise.id, 1)}
                      >
                        <Plus size={12} color={Colors.light.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Exercise Notes */}
                  <TextInput
                    style={[styles.notesInput, exercise.id === activeExerciseId && styles.notesInputOnSlab]}
                    value={exerciseNotes[exercise.id] || ''}
                    onChangeText={(value) => setExerciseNotes(prev => ({ ...prev, [exercise.id]: value }))}
                    placeholder="Notes for this session..."
                    placeholderTextColor={
                      exercise.id === activeExerciseId
                        ? Colors.light.onRubberSecondary
                        : Colors.light.textTertiary
                    }
                    multiline
                    numberOfLines={2}
                  />

                  <View style={styles.setHeader}>
                    {['Set', 'Last time', 'Weight', isTimedExercise(exercise.name) ? 'Secs' : 'Reps'].map(
                      (heading) => (
                        <Text
                          key={heading}
                          style={[
                            styles.setHeaderText,
                            exercise.id === activeExerciseId && styles.onSlabMuted,
                          ]}
                        >
                          {heading}
                        </Text>
                      )
                    )}
                  </View>

                  <View style={styles.setsContainer}>
                    {exercise.sets.map((set, setIndex) =>
                      renderSetRow(
                        set,
                        setIndex,
                        exercise,
                        set.id === nextSetIdFor(exercise),
                        exercise.id === activeExerciseId
                      )
                    )}
                  </View>
                </View>
              </SwipeToRemove>
            </View>
          )}
        />

        <TouchableOpacity
          style={styles.addExerciseButton}
          onPress={() => { setPickerMode({ kind: 'add' }); setShowExerciseModal(true); }}
          accessibilityRole="button"
          accessibilityLabel="Add exercise to workout"
          accessibilityHint="Browse and add new exercises to your current workout"
        >
          <Plus size={16} color={Colors.light.primary} />
          <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

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

      {/* Undo snackbar for an optimistically-removed exercise */}
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
            {pendingRemoval.exercise.name} removed
          </Text>
          <TouchableOpacity
            onPress={handleUndoRemoval}
            hitSlop={HIT_SLOP}
            style={styles.undoButton}
            accessibilityRole="button"
            accessibilityLabel={`Undo removing ${pendingRemoval.exercise.name}`}
          >
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Warmup Selection sheet */}
      <DragDismissSheet visible={showWarmupModal} onDismiss={() => setShowWarmupModal(false)}>
        <View style={[styles.sheetPickerBody, { maxHeight: windowHeight * 0.7 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Warmup</Text>
            <TouchableOpacity onPress={() => setShowWarmupModal(false)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close">
              <X size={20} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            {warmupOptions.map((warmup) => (
              <TouchableOpacity
                key={warmup.id}
                style={styles.warmupOption}
                onPress={() => handleWarmupSelect(warmup)}
              >
                <View style={styles.warmupOptionContent}>
                  <Text style={styles.warmupOptionName}>{warmup.name}</Text>
                  <Text style={styles.warmupOptionDescription}>{warmup.description}</Text>
                </View>
                <Text style={styles.warmupOptionDuration}>{warmup.duration}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </DragDismissSheet>

      {/* Finish sheet */}
      <DragDismissSheet visible={showMetadataModal} onDismiss={() => setShowMetadataModal(false)}>
        <KeyboardAvoidingView behavior="padding">
          <View style={styles.sheetBody}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Finish workout</Text>
              <TouchableOpacity onPress={() => setShowMetadataModal(false)} accessibilityRole="button" accessibilityLabel="Back to workout">
                <X size={22} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSummary}>
              {formatMinutes(Math.max(1, Math.round(workoutDuration / 60)))} · {completedSetCount} {completedSetCount === 1 ? 'set' : 'sets'} · {formatKg(sessionVolume)}
            </Text>

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
                      {prs.map((p) => <Text key={p.id} style={styles.prLine}>🏅 {p.name} — {p.weight} kg × {p.reps}{p.kind === 'weight' ? ' (heaviest)' : p.kind === 'e1rm' ? ' (best est. 1RM)' : ''}</Text>)}
                    </View>
                  )}
                  {lines.map((l) => <Text key={l.id} style={styles.recapLine}>{l.name} · {l.setsDone} {l.setsDone === 1 ? 'set' : 'sets'} · {l.detail}</Text>)}
                </>
              );
            })()}

            <Text style={styles.sheetLabel}>Bodyweight (kg, optional)</Text>
            <TextInput
              style={styles.sheetInput}
              value={metadata.bodyweight}
              onChangeText={(v) => setMetadata((prev) => ({ ...prev, bodyweight: v }))}
              keyboardType="decimal-pad"
              placeholder="e.g. 82.5"
              placeholderTextColor={Colors.light.textTertiary}
              accessibilityLabel="Bodyweight in kilograms"
            />

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
          </View>
        </KeyboardAvoidingView>
      </DragDismissSheet>

      {/* Exercise Selection sheet */}
      <DragDismissSheet visible={showExerciseModal} onDismiss={() => setShowExerciseModal(false)}>
        <View style={[styles.sheetPickerBody, { height: windowHeight * 0.85 }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{pickerMode.kind === 'replace' ? 'Replace exercise' : 'Add Exercise'}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: Colors.light.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border, 
    backgroundColor: Colors.light.card
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.text,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  workoutTimer: {
    fontSize: 14,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.success,
    marginLeft: 4,
  },
  finishButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  finishButtonText: {
    fontSize: 12,
    fontFamily: 'ArchivoNarrow-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  offlineBanner: { backgroundColor: Colors.light.warning, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.input, marginBottom: spacing.md },
  offlineText: { ...type.label, color: Colors.light.rubber, textAlign: 'center' },
  finishHelper: { ...type.label, color: Colors.light.textSecondary, textAlign: 'center', marginTop: spacing.xs },
  warmupCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
    marginLeft: 8
  },
  chooseWarmupButton: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  chooseWarmupText: {
    fontSize: 12,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.primary
  },
  selectedWarmup: {
    marginTop: 8
  },
  selectedWarmupName: {
    fontSize: 14,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text
  },
  selectedWarmupDescription: {
    fontSize: 12,
    fontFamily: 'Archivo-Regular',
    color: Colors.light.textTertiary,
    marginTop: 2
  },
  selectedWarmupDuration: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    marginTop: 4
  },
  // The shadow lives on this outer, non-clipping wrapper rather than on the
  // card itself: SwipeToRemove's container clips to its own bounds so it can
  // mask the row sliding past its edge, and that clip would otherwise cut
  // the slab's drop shadow off along with it.
  exerciseCardOuter: {
    marginBottom: 12,
    elevation: 2,
  },
  exerciseCardOuterActive: {
    ...elevation.slab,
  },
  // DraggableList already applies elevation.dragging + a scale bump while a
  // card is actually moving; this is the resting-state cue for which one.
  // Radius is set inline at the call site so it matches radius.slab when the
  // dragged card is also the active one.
  exerciseCardDragging: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  exerciseCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: { fontSize: 16, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, flex: 1 },
  planText: { fontSize: 12, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, marginLeft: spacing.sm },
  removeButton: { padding: 6, marginRight: 4 },
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
    fontSize: 14,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.onRubber,
    marginRight: spacing.md,
  },
  undoButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  undoButtonText: {
    fontSize: 13,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.accent,
    textTransform: 'uppercase',
  },
  // Body content for the two full-picker sheets (warmup, exercise): the
  // sheet itself only hugs content, so a bounded height here is what lets a
  // long inner list (BrowseExercisesScreen's FlatList uses flex: 1) size and
  // scroll correctly instead of collapsing to nothing.
  sheetPickerBody: {
    width: '100%',
  },
  sheetBody: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 8 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  sheetSummary: { fontSize: 15, fontFamily: 'Archivo-Medium', color: Colors.light.textSecondary, marginBottom: 20 },
  sheetLabel: { fontSize: 13, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, marginBottom: 6 },
  prBlock: { marginBottom: spacing.md },
  prLine: { fontFamily: 'Archivo-Medium', fontSize: 14, color: Colors.light.text, marginTop: 4 },
  recapLine: { fontFamily: 'Archivo-Regular', fontSize: 13, color: Colors.light.textSecondary, marginTop: 2 },
  sheetInput: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Archivo-Regular',
    color: Colors.light.text,
    marginBottom: 16,
  },
  sheetNotes: { minHeight: 72, textAlignVertical: 'top' },
  saveButton: { backgroundColor: Colors.light.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 17, fontFamily: 'ArchivoNarrow-Bold', color: '#FFFFFF' },
  setControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    padding: 2,
  },
  setControlButton: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setCount: { fontSize: 12, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, marginHorizontal: 8, minWidth: 16, textAlign: 'center' },
  notesInput: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    textAlignVertical: 'top',
    marginBottom: 8,
    minHeight: 60
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    marginBottom: 6,
    paddingHorizontal: 4
  },
  setHeaderText: {
    fontSize: 10,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.textTertiary,
    width: 50,
    textAlign: 'center'
  },
  setsContainer: {
    marginBottom: 4
  },
  exerciseCardActive: {
    backgroundColor: Colors.light.rubber,
    borderRadius: radius.slab,
  },
  onSlabText: {
    color: Colors.light.onRubber,
  },
  onSlabMuted: {
    color: Colors.light.onRubberSecondary,
  },
  notesInputOnSlab: {
    backgroundColor: Colors.light.slabField,
    color: Colors.light.onRubber,
    borderColor: Colors.light.borderOnRubber,
  },
  addExerciseButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderStyle: 'dashed'
  },
  addExerciseButtonText: {
    fontSize: 14,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.primary,
    marginLeft: 6
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
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  warmupOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2
  },
  warmupOptionContent: {
    flex: 1,
    marginRight: 12
  },
  warmupOptionName: {
    fontSize: 16,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
    marginBottom: 4
  },
  warmupOptionDescription: {
    fontSize: 12,
    fontFamily: 'Archivo-Medium',
    color: Colors.light.textTertiary,
    lineHeight: 16
  },
  warmupOptionDuration: {
    fontSize: 14,
    fontFamily: 'ArchivoNarrow-Bold',
    color: Colors.light.primary
  },
});