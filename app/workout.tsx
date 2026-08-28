import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Timer, Plus, Minus, X, Clock, Dumbbell, ChevronDown, ChevronUp, Watch, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { useAuth } from '@/data/AuthContext';
import BrowseExercisesScreen from '@/components/browse-exercises';
import { getDefaultRestSeconds, DEFAULT_REST_SECONDS } from '@/services/preferences';
import { formatKg, formatMinutes, formatSet } from '@/utils/format';
import BarLoadingStrip from '@/components/BarLoadingStrip';
import { isTimedExercise } from '@/data/timedExercises';

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

// Guard rails on the two free-text numeric fields. Without them a slip on the
// keypad is persisted silently and then poisons lifetime volume, the PR list
// and the CSV export — a stray "17897 kg × 69592 reps" once banked a workout
// at 1,245,613,856 kg. Bounds are deliberately generous: the heaviest lift
// ever recorded is well under 1000 kg, and 100 reps covers any real set.
const MAX_WEIGHT_KG = 1000;
const MAX_REPS = 100;

/** The value to store, or null to reject the keystroke and keep the old one. */
function sanitiseSetValue(field: 'weight' | 'reps', raw: string): string | null {
  if (raw === '') return '';

  if (field === 'reps') {
    if (!/^\d{1,3}$/.test(raw)) return null;
    return Number(raw) <= MAX_REPS ? raw : null;
  }

  // Weight takes one decimal place or two (82.5), with either separator.
  // A trailing "." is allowed so the field can be typed through.
  const normalised = raw.replace(',', '.');
  if (!/^\d{1,4}(\.\d{0,2})?$/.test(normalised)) return null;
  return Number(normalised) <= MAX_WEIGHT_KG ? normalised : null;
}

export default function WorkoutScreen() {
  const { 
    currentWorkout, 
    updateSet, 
    completeSet, 
    isWorkoutActive, 
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    updateExerciseSets,
    finishWorkout 
  } = useWorkout();
  const { user } = useAuth();
  
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showWarmupModal, setShowWarmupModal] = useState(false);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [activeRestTimer, setActiveRestTimer] = useState<string | null>(null);
  const [restTime, setRestTime] = useState(0);
  const [defaultRestSeconds, setDefaultRestSecondsState] = useState(DEFAULT_REST_SECONDS);
  const [saving, setSaving] = useState(false);
  const [restTimerInterval, setRestTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [workoutTimerInterval, setWorkoutTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [isWarmupCollapsed, setIsWarmupCollapsed] = useState(false);
  const [selectedWarmup, setSelectedWarmup] = useState<WarmupOption | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState<WorkoutMetadata>({
    startTime: null,
    endTime: null,
    bodyweight: '',
    notes: ''
  });

  useEffect(() => {
    getDefaultRestSeconds().then(setDefaultRestSecondsState);
  }, []);

  // Start workout timer when workout becomes active
  useEffect(() => {
    if (isWorkoutActive && !workoutStartTime) {
      const startTime = new Date();
      setWorkoutStartTime(startTime);
      setMetadata(prev => ({ ...prev, startTime }));
      
      // Start the workout duration timer
      const interval = setInterval(() => {
        setWorkoutDuration(prev => prev + 1);
      }, 1000);
      setWorkoutTimerInterval(interval as unknown as NodeJS.Timeout);
    }

    return () => {
      if (workoutTimerInterval) {
        clearInterval(workoutTimerInterval);
      }
    };
  }, [isWorkoutActive]);

  // Rest timer effect
  useEffect(() => {
    if (activeRestTimer && restTime > 0) {
      const interval = setInterval(() => {
        setRestTime(prev => {
          if (prev <= 1) {
            setActiveRestTimer(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setRestTimerInterval(interval as unknown as NodeJS.Timeout);
    } else if (restTimerInterval) {
      clearInterval(restTimerInterval);
      setRestTimerInterval(null);
    }

    return () => {
      if (restTimerInterval) {
        clearInterval(restTimerInterval);
      }
    };
  }, [activeRestTimer, restTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSetComplete = async (exerciseId: string, setId: string) => {
    await completeSet(exerciseId, setId);
    
    const newCompletedSets = new Set(completedSets);
    if (!completedSets.has(setId)) {
      newCompletedSets.add(setId);
      setCompletedSets(newCompletedSets);
      
      // Start the rest timer using the length chosen in Settings
      setActiveRestTimer(setId);
      setRestTime(defaultRestSeconds);
    } else {
      newCompletedSets.delete(setId);
      setCompletedSets(newCompletedSets);
      
      // Stop rest timer if uncompleting a set
      if (activeRestTimer === setId) {
        setActiveRestTimer(null);
        setRestTime(0);
      }
    }
  };

  const handleAddExercise = async (exercise: any) => {
    if (!currentWorkout) return;
    
    try {
      await addExerciseToWorkout(currentWorkout.id, exercise);
      setShowExerciseModal(false);
    } catch {
      Alert.alert('Could not add exercise', 'Check your connection and try again.');
    }
  };

  const handleRemoveExercise = (exerciseId: string, name: string) => {
    if (!currentWorkout) return;
    Alert.alert('Remove exercise', `Remove ${name} from this workout? It stays in the exercise library.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeExerciseFromWorkout(currentWorkout.id, exerciseId);
          } catch {
            Alert.alert('Could not remove exercise', 'Check your connection and try again.');
          }
        },
      },
    ]);
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

  const stopTimers = () => {
    if (workoutTimerInterval) clearInterval(workoutTimerInterval);
    if (restTimerInterval) clearInterval(restTimerInterval);
  };

  const completedSetCount = currentWorkout
    ? currentWorkout.exercises.reduce((n, e) => n + e.sets.filter((st) => st.isComplete).length, 0)
    : 0;
  const sessionVolume = currentWorkout
    ? currentWorkout.exercises.reduce(
        (total, e) => total + e.sets.filter((st) => st.isComplete).reduce((t, st) => t + (parseFloat(st.weight) || 0) * (parseFloat(st.reps) || 0), 0),
        0
      )
    : 0;

  const handleFinishWorkout = () => {
    if (!currentWorkout) return;
    if (completedSetCount === 0) {
      Alert.alert('Nothing logged yet', 'Tick off at least one set, or close the workout without saving.', [
        { text: 'Keep going', style: 'cancel' },
        { text: 'Discard workout', style: 'destructive', onPress: () => { stopTimers(); finishWorkout(); router.back(); } },
      ]);
      return;
    }
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
    const durationMinutes = Math.max(1, Math.round(workoutDuration / 60));

    try {
      await WorkoutHistoryService.saveWorkoutHistory(
        user.id,
        {
          ...currentWorkout,
          metadata: { ...metadata, endTime, duration: workoutDuration, exerciseNotes },
        },
        durationMinutes
      );

      stopTimers();
      setShowMetadataModal(false);
      finishWorkout();
      router.back();
      Alert.alert('Workout saved', `${formatMinutes(durationMinutes)} · ${completedSetCount} ${completedSetCount === 1 ? 'set' : 'sets'} · ${formatKg(sessionVolume)}`);
    } catch (error) {
      console.error('Failed to save workout:', error);
      Alert.alert(
        'Could not save',
        'The workout is still here. Check your connection and try again.',
        [
          { text: 'Try again', onPress: () => { setSaving(false); saveWorkout(); } },
          { text: 'Keep editing', style: 'cancel' },
        ]
      );
    } finally {
      setSaving(false);
    }
  };

  const renderSetRow = (set: any, setIndex: number, exerciseId: string, libraryExerciseId?: number) => {
    const isCompleted = set.isComplete;
    const isActiveRest = activeRestTimer === set.id;

    return (
      <View key={set.id} style={styles.setBlock}>
      <View style={styles.setRow}>
        <TouchableOpacity
          style={[
            styles.setIndicator,
            isCompleted && styles.completedIndicator,
            isActiveRest && styles.activeRestIndicator
          ]}
          onPress={() => handleSetComplete(exerciseId, set.id)}
          accessibilityRole="checkbox"
          accessibilityLabel={`Set ${setIndex + 1} ${isCompleted ? 'completed' : 'incomplete'}`}
          accessibilityHint="Tap to mark this set as complete or incomplete"
          accessibilityState={{ checked: isCompleted }}
        >
          {isCompleted ? (
            <Check size={12} color="#FFFFFF" />
          ) : (
            <Text style={styles.setNumber}>{setIndex + 1}</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.previousData}>{formatSet(set.previousWeight, set.previousReps)}</Text>
        
        <TextInput
          style={[styles.input, isCompleted && styles.inputComplete]}
          value={set.weight}
          onChangeText={(value) => {
            const next = sanitiseSetValue('weight', value);
            if (next !== null) updateSet(exerciseId, set.id, 'weight', next);
          }}
          keyboardType="numeric"
          placeholder="kg"
          placeholderTextColor={Colors.light.textTertiary}
          editable={!isCompleted}
          accessibilityLabel={`Weight for set ${setIndex + 1}`}
          accessibilityHint="Enter the weight used for this set"
        />
        
        <TextInput
          style={[styles.input, isCompleted && styles.inputComplete]}
          value={set.reps}
          onChangeText={(value) => {
            const next = sanitiseSetValue('reps', value);
            if (next !== null) updateSet(exerciseId, set.id, 'reps', next);
          }}
          keyboardType="numeric"
          placeholder="reps"
          placeholderTextColor={Colors.light.textTertiary}
          editable={!isCompleted}
          accessibilityLabel={`Repetitions for set ${setIndex + 1}`}
          accessibilityHint="Enter the number of repetitions completed"
        />

        {isActiveRest && (
          <View style={styles.restTimerBadge}>
            <Timer size={10} color={Colors.light.primary} />
            <Text style={styles.restTimerText}>{formatTime(restTime)}</Text>
          </View>
        )}
      </View>

      <BarLoadingStrip totalKg={parseFloat(set.weight)} exerciseId={libraryExerciseId} />
      </View>
    );
  };

  if (!isWorkoutActive || !currentWorkout) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Timer size={48} color={Colors.light.primary} />
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
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Close workout"
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
          <TouchableOpacity 
            style={styles.timerButton} 
            onPress={() => router.push('/timer')}
            accessibilityRole="button"
            accessibilityLabel="Open timer"
            accessibilityHint="Access workout timers and intervals"
          >
            <Watch size={20} color={Colors.light.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.finishButton} 
            onPress={handleFinishWorkout}
            accessibilityRole="button"
            accessibilityLabel="Finish workout"
            accessibilityHint="Complete and save your workout session"
          >
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Exercises */}
        {currentWorkout.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveExercise(exercise.id, exercise.name)}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${exercise.name}`}
              >
                <Trash2 size={16} color={Colors.light.textTertiary} />
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
              style={styles.notesInput}
              value={exerciseNotes[exercise.id] || ''}
              onChangeText={(value) => setExerciseNotes(prev => ({ ...prev, [exercise.id]: value }))}
              placeholder="Notes for this session..."
              placeholderTextColor={Colors.light.textTertiary}
              multiline
              numberOfLines={2}
            />
            
            <View style={styles.setHeader}>
              <Text style={styles.setHeaderText}>Set</Text>
              <Text style={styles.setHeaderText}>Last time</Text>
              <Text style={styles.setHeaderText}>Weight</Text>
              <Text style={styles.setHeaderText}>
                {isTimedExercise(exercise.name) ? 'Secs' : 'Reps'}
              </Text>
            </View>

            <View style={styles.setsContainer}>
              {exercise.sets.map((set, setIndex) => 
                renderSetRow(set, setIndex, exercise.id, exercise.exerciseId)
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.addExerciseButton}
          onPress={() => setShowExerciseModal(true)}
          accessibilityRole="button"
          accessibilityLabel="Add exercise to workout"
          accessibilityHint="Browse and add new exercises to your current workout"
        >
          <Plus size={16} color={Colors.light.primary} />
          <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Warmup Selection Modal */}
      <Modal
        visible={showWarmupModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Choose Warmup</Text>
            <TouchableOpacity onPress={() => setShowWarmupModal(false)}>
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
        </SafeAreaView>
      </Modal>

      {/* Finish sheet */}
      <Modal visible={showMetadataModal} transparent animationType="slide" onRequestClose={() => setShowMetadataModal(false)}>
        <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Finish workout</Text>
              <TouchableOpacity onPress={() => setShowMetadataModal(false)} accessibilityRole="button" accessibilityLabel="Back to workout">
                <X size={22} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.sheetSummary}>
              {formatMinutes(Math.max(1, Math.round(workoutDuration / 60)))} · {completedSetCount} {completedSetCount === 1 ? 'set' : 'sets'} · {formatKg(sessionVolume)}
            </Text>

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
      </Modal>

      {/* Exercise Selection Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <TouchableOpacity onPress={() => setShowExerciseModal(false)}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          <BrowseExercisesScreen 
            onExerciseSelect={handleAddExercise} 
            autoFocusSearch={false}
          />
        </SafeAreaView>
      </Modal>
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
  timerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
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
  exerciseCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: { fontSize: 16, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, flex: 1 },
  removeButton: { padding: 6, marginRight: 4 },
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.light.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 20, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  sheetSummary: { fontSize: 15, fontFamily: 'Archivo-Medium', color: Colors.light.textSecondary, marginBottom: 20 },
  sheetLabel: { fontSize: 13, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, marginBottom: 6 },
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
  setBlock: {
    marginBottom: 2,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  setIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4
  },
  completedIndicator: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary
  },
  activeRestIndicator: {
    borderColor: Colors.light.accent,
    backgroundColor: Colors.light.accentLight
  },
  setNumber: { fontSize: 10, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.primary },
  previousData: { fontSize: 10, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, width: 50, textAlign: 'center' },
  input: {
    width: 50,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 12,
    fontFamily: 'ArchivoNarrow-SemiBold',
    color: Colors.light.text,
    textAlign: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.light.border
  },
  inputComplete: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary
  },
  restTimerBadge: {
    position: 'absolute',
    top: -6,
    right: 6,
    backgroundColor: Colors.light.primary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center'
  },
  restTimerText: { fontSize: 10, fontFamily: 'ArchivoNarrow-Bold', color: '#FFFFFF', marginLeft: 2 },
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
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background
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