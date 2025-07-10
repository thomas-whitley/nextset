import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Timer, Plus, Minus, X, Clock, User, FileText, Play, Pause, Dumbbell } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useTimer } from '@/contexts/TimerContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { useAuth } from '@/data/AuthContext';
import BrowseExercisesScreen from '@/components/browse-exercises';

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
  const { 
    currentWorkout, 
    updateSet, 
    completeSet, 
    isWorkoutActive, 
    addExerciseToWorkout,
    updateExerciseSets,
    finishWorkout 
  } = useWorkout();
  const { startTimer, setMode, setInitialTime, time, isRunning, pauseTimer, resetTimer } = useTimer();
  const { user } = useAuth();
  
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showWarmupModal, setShowWarmupModal] = useState(false);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [activeRestTimer, setActiveRestTimer] = useState<string | null>(null);
  const [restTime, setRestTime] = useState(0);
  const [restTimerInterval, setRestTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(0);
  const [workoutTimerInterval, setWorkoutTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [selectedWarmup, setSelectedWarmup] = useState<WarmupOption | null>(null);
  const [exerciseNotes, setExerciseNotes] = useState<Record<string, string>>({});
  const [metadata, setMetadata] = useState<WorkoutMetadata>({
    startTime: null,
    endTime: null,
    bodyweight: '',
    notes: ''
  });

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
      setWorkoutTimerInterval(interval);
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
      setRestTimerInterval(interval);
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
      
      // Start rest timer (90 seconds default)
      setActiveRestTimer(setId);
      setRestTime(90);
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
    } catch (error) {
      Alert.alert('Error', 'Failed to add exercise. Please try again.');
    }
  };

  const handleUpdateSets = async (exerciseId: string, change: number) => {
    if (!currentWorkout) return;
    
    const exercise = currentWorkout.exercises.find(e => e.id === exerciseId);
    if (!exercise) return;
    
    const newSetCount = Math.max(1, exercise.sets.length + change);
    
    try {
      await updateExerciseSets(currentWorkout.id, exerciseId, newSetCount);
    } catch (error) {
      Alert.alert('Error', 'Failed to update sets. Please try again.');
    }
  };

  const handleWarmupSelect = (warmup: WarmupOption) => {
    setSelectedWarmup(warmup);
    setShowWarmupModal(false);
  };

  const handleFinishWorkout = async () => {
    if (!currentWorkout || !workoutStartTime || !user) {
      // Clear timers
      if (workoutTimerInterval) clearInterval(workoutTimerInterval);
      if (restTimerInterval) clearInterval(restTimerInterval);
      
      finishWorkout();
      router.push('/');
      return;
    }

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - workoutStartTime.getTime()) / (1000 * 60));

    Alert.alert(
      'Finish Workout',
      'Are you sure you want to finish this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Finish', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear timers
              if (workoutTimerInterval) clearInterval(workoutTimerInterval);
              if (restTimerInterval) clearInterval(restTimerInterval);

              // Save workout to history with metadata
              await WorkoutHistoryService.saveWorkoutHistory(
                user.id,
                {
                  ...currentWorkout,
                  metadata: {
                    ...metadata,
                    endTime,
                    duration: durationMinutes,
                    exerciseNotes
                  }
                },
                durationMinutes,
                {} // Health stats would be populated here if HealthKit integration is available
              );

              finishWorkout();
              router.push('/');
              
              Alert.alert(
                'Workout Complete!',
                `Great job! Your workout lasted ${formatTime(workoutDuration)}.`,
                [{ text: 'OK' }]
              );
            } catch (error) {
              console.error('Failed to save workout:', error);
              finishWorkout();
              router.push('/');
            }
          }
        }
      ]
    );
  };

  const renderSetRow = (set: any, setIndex: number, exerciseId: string) => {
    const isCompleted = set.isComplete;
    const isActiveRest = activeRestTimer === set.id;

    return (
      <View key={set.id} style={styles.setRow}>
        <TouchableOpacity
          style={[
            styles.setIndicator,
            isCompleted && styles.completedIndicator,
            isActiveRest && styles.activeRestIndicator
          ]}
          onPress={() => handleSetComplete(exerciseId, set.id)}
        >
          {isCompleted ? (
            <Check size={12} color="#FFFFFF" />
          ) : (
            <Text style={styles.setNumber}>{setIndex + 1}</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.previousData}>
          {set.previousWeight || '0'}kg × {set.previousReps || '0'}
        </Text>
        
        <TextInput
          style={[styles.input, isCompleted && styles.inputComplete]}
          value={set.weight}
          onChangeText={(value) => updateSet(exerciseId, set.id, 'weight', value)}
          keyboardType="numeric"
          placeholder="kg"
          placeholderTextColor={Colors.light.textTertiary}
          editable={!isCompleted}
        />
        
        <TextInput
          style={[styles.input, isCompleted && styles.inputComplete]}
          value={set.reps}
          onChangeText={(value) => updateSet(exerciseId, set.id, 'reps', value)}
          keyboardType="numeric"
          placeholder="reps"
          placeholderTextColor={Colors.light.textTertiary}
          editable={!isCompleted}
        />

        {isActiveRest && (
          <View style={styles.restTimerBadge}>
            <Timer size={10} color={Colors.light.primary} />
            <Text style={styles.restTimerText}>{formatTime(restTime)}</Text>
          </View>
        )}
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
          <Text style={styles.emptyTitle}>Ready to Train?</Text>
          <Text style={styles.emptySubtitle}>
            Choose a workout program to start logging your sets and tracking your progress.
          </Text>
          <TouchableOpacity 
            style={styles.startWorkoutButton} 
            onPress={() => router.push('/programs')}
          >
            <Text style={styles.startWorkoutButtonText}>Browse Programs</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Workout Timer */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={20} color={Colors.light.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.workoutTitle}>{currentWorkout.name}</Text>
          <View style={styles.timerContainer}>
            <Clock size={14} color={Colors.light.success} />
            <Text style={styles.workoutTimer}>{formatTime(workoutDuration)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Warmup Section */}
        <View style={styles.warmupCard}>
          <View style={styles.warmupHeader}>
            <Dumbbell size={16} color={Colors.light.primary} />
            <Text style={styles.warmupTitle}>Warmup</Text>
          </View>
          {selectedWarmup ? (
            <View style={styles.selectedWarmup}>
              <Text style={styles.selectedWarmupName}>{selectedWarmup.name}</Text>
              <Text style={styles.selectedWarmupDuration}>{selectedWarmup.duration}</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.chooseWarmupButton}
              onPress={() => setShowWarmupModal(true)}
            >
              <Text style={styles.chooseWarmupText}>Choose Warmup</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Exercises */}
        {currentWorkout.exercises.map((exercise, exerciseIndex) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
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
            <View style={styles.notesSection}>
              <Text style={styles.notesLabel}>Notes for this session:</Text>
              <TextInput
                style={styles.notesInput}
                value={exerciseNotes[exercise.id] || ''}
                onChangeText={(value) => setExerciseNotes(prev => ({ ...prev, [exercise.id]: value }))}
                placeholder="Add notes about form, weight progression, etc..."
                placeholderTextColor={Colors.light.textTertiary}
                multiline
                numberOfLines={2}
              />
            </View>
            
            <View style={styles.setHeader}>
              <Text style={styles.setHeaderText}>Set</Text>
              <Text style={styles.setHeaderText}>Previous</Text>
              <Text style={styles.setHeaderText}>Weight</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
            </View>

            {exercise.sets.map((set, setIndex) => 
              renderSetRow(set, setIndex, exercise.id)
            )}
          </View>
        ))}

        <TouchableOpacity 
          style={styles.addExerciseButton}
          onPress={() => setShowExerciseModal(true)}
        >
          <Plus size={16} color={Colors.light.primary} />
          <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

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
              <X size={20} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          <BrowseExercisesScreen onExerciseSelect={handleAddExercise} />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.card,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  workoutTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  workoutTimer: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
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
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  warmupCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  warmupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warmupTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginLeft: 6,
  },
  chooseWarmupButton: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  chooseWarmupText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
  selectedWarmup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedWarmupName: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
  },
  selectedWarmupDuration: {
    fontSize: 11,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  exerciseCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    flex: 1,
  },
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
  setCount: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginHorizontal: 8,
    minWidth: 16,
    textAlign: 'center',
  },
  notesSection: {
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  notesInput: {
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    textAlignVertical: 'top',
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    marginBottom: 6,
  },
  setHeaderText: {
    fontSize: 10,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
    flex: 1,
    textAlign: 'center',
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
    marginRight: 6,
  },
  completedIndicator: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  activeRestIndicator: {
    borderColor: Colors.light.accent,
    backgroundColor: Colors.light.accentLight,
  },
  setNumber: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
  },
  previousData: {
    fontSize: 10,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    flex: 1,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    textAlign: 'center',
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputComplete: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
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
    alignItems: 'center',
  },
  restTimerText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 2,
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
    borderStyle: 'dashed',
  },
  addExerciseButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
    marginLeft: 6,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  startWorkoutButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  startWorkoutButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  warmupOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  warmupOptionContent: {
    flex: 1,
    marginRight: 12,
  },
  warmupOptionName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  warmupOptionDescription: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    lineHeight: 16,
  },
  warmupOptionDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
  },
});