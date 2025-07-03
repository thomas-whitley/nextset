import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Timer, Plus, Minus, X, Clock, User, FileText, MoreHorizontal, Play, Pause } from 'lucide-react-native';
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
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [activeRestTimer, setActiveRestTimer] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<WorkoutMetadata>({
    startTime: null,
    endTime: null,
    bodyweight: '',
    notes: ''
  });

  useEffect(() => {
    if (isWorkoutActive && !metadata.startTime) {
      setMetadata(prev => ({ ...prev, startTime: new Date() }));
    }
  }, [isWorkoutActive]);

  // Auto-start rest timer when set is completed
  useEffect(() => {
    if (activeRestTimer && !isRunning) {
      setMode('countdown');
      setInitialTime(90); // Default 90 seconds rest
      startTimer();
    }
  }, [activeRestTimer]);

  // Clear active rest timer when timer completes
  useEffect(() => {
    if (time === 0 && activeRestTimer) {
      setActiveRestTimer(null);
    }
  }, [time]);

  const handleSetComplete = async (exerciseId: string, setId: string, setType: 'warmup' | 'working') => {
    await completeSet(exerciseId, setId);
    
    const newCompletedSets = new Set(completedSets);
    if (!completedSets.has(setId)) {
      newCompletedSets.add(setId);
      setCompletedSets(newCompletedSets);
      
      // Only start rest timer for working sets, not warm-up sets
      if (setType === 'working') {
        setActiveRestTimer(setId);
      }
    } else {
      newCompletedSets.delete(setId);
      setCompletedSets(newCompletedSets);
      
      // Stop rest timer if uncompleting a set
      if (activeRestTimer === setId) {
        setActiveRestTimer(null);
        resetTimer();
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

  const handleFinishWorkout = async () => {
    if (!currentWorkout || !metadata.startTime || !user) {
      finishWorkout();
      router.push('/');
      return;
    }

    const endTime = new Date();
    const durationMinutes = Math.round((endTime.getTime() - metadata.startTime.getTime()) / (1000 * 60));

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
              // Save workout to history with metadata
              await WorkoutHistoryService.saveWorkoutHistory(
                user.id,
                {
                  ...currentWorkout,
                  metadata: {
                    ...metadata,
                    endTime,
                    duration: durationMinutes
                  }
                },
                durationMinutes,
                {} // Health stats would be populated here if HealthKit integration is available
              );

              finishWorkout();
              router.push('/');
              
              Alert.alert(
                'Workout Complete!',
                `Great job! Your workout has been saved to your progress.`,
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

  const renderSetRow = (set: any, setIndex: number, exerciseId: string, isWarmup: boolean = false) => {
    const setType = isWarmup ? 'warmup' : 'working';
    const setNumber = isWarmup ? '' : (setIndex + 1).toString();
    const isCompleted = set.isComplete;
    const isActiveRest = activeRestTimer === set.id;

    return (
      <View key={set.id} style={styles.setRow}>
        <TouchableOpacity
          style={[
            styles.setIndicator,
            isWarmup ? styles.warmupIndicator : styles.workingIndicator,
            isCompleted && styles.completedIndicator,
            isActiveRest && styles.activeRestIndicator
          ]}
          onPress={() => handleSetComplete(exerciseId, set.id, setType)}
        >
          {isCompleted ? (
            <Check size={16} color="#FFFFFF" />
          ) : (
            <Text style={[
              styles.setNumber,
              isWarmup && styles.warmupSetNumber,
              isCompleted && styles.completedSetNumber
            ]}>
              {setNumber}
            </Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.previousData}>
          {set.previousWeight}kg × {set.previousReps}
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

        <TextInput
          style={[styles.notesInput, isCompleted && styles.inputComplete]}
          value={set.notes || ''}
          onChangeText={(value) => updateSet(exerciseId, set.id, 'notes', value)}
          placeholder="Notes"
          placeholderTextColor={Colors.light.textTertiary}
          editable={!isCompleted}
        />

        {isActiveRest && (
          <View style={styles.restTimerBadge}>
            <Timer size={12} color={Colors.light.primary} />
            <Text style={styles.restTimerText}>{Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}</Text>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.workoutTitle}>{currentWorkout.name}</Text>
          {metadata.startTime && (
            <Text style={styles.workoutTimer}>
              Started: {metadata.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => setShowMetadataModal(true)}
          >
            <MoreHorizontal size={24} color={Colors.light.text} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
            <Text style={styles.finishButtonText}>Finish</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rest Timer Bar */}
      {activeRestTimer && (
        <View style={styles.restTimerBar}>
          <View style={styles.restTimerContent}>
            <Timer size={20} color={Colors.light.primary} />
            <Text style={styles.restTimerTitle}>Rest Timer</Text>
            <Text style={styles.restTimerTime}>
              {Math.floor(time / 60)}:{(time % 60).toString().padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.restTimerControls}>
            <TouchableOpacity onPress={isRunning ? pauseTimer : startTimer}>
              {isRunning ? <Pause size={16} color={Colors.light.primary} /> : <Play size={16} color={Colors.light.primary} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setActiveRestTimer(null);
              resetTimer();
            }}>
              <X size={16} color={Colors.light.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                    size={16} 
                    color={exercise.sets.length <= 1 ? Colors.light.border : Colors.light.primary} 
                  />
                </TouchableOpacity>
                <Text style={styles.setCount}>{exercise.sets.length}</Text>
                <TouchableOpacity
                  style={styles.setControlButton}
                  onPress={() => handleUpdateSets(exercise.id, 1)}
                >
                  <Plus size={16} color={Colors.light.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Warm-up guidance */}
            <View style={styles.warmupGuidance}>
              <Text style={styles.warmupTitle}>Warm up:</Text>
              <Text style={styles.warmupText}>- 50% for 6 reps</Text>
              <Text style={styles.warmupText}>- 70% for 5 reps</Text>
              <Text style={styles.warmupText}>- 80% for 3 reps</Text>
            </View>

            <View style={styles.workoutGuidance}>
              <Text style={styles.workoutTitle}>Workout</Text>
              <Text style={styles.workoutText}>- heaviest 4-6</Text>
              <Text style={styles.workoutText}>- (-10%)</Text>
              <Text style={styles.workoutText}>- (-10%)</Text>
            </View>
            
            <View style={styles.setHeader}>
              <Text style={styles.setHeaderText}>Set</Text>
              <Text style={styles.setHeaderText}>Previous</Text>
              <Text style={styles.setHeaderText}>Weight</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
              <Text style={styles.setHeaderText}>Notes</Text>
            </View>

            {/* Render warm-up sets (first 3 sets as warm-up) */}
            {exercise.sets.slice(0, Math.min(3, exercise.sets.length)).map((set, setIndex) => 
              renderSetRow(set, setIndex, exercise.id, true)
            )}

            {/* Render working sets */}
            {exercise.sets.slice(3).map((set, setIndex) => 
              renderSetRow(set, setIndex, exercise.id, false)
            )}
          </View>
        ))}

        <TouchableOpacity 
          style={styles.addExerciseButton}
          onPress={() => setShowExerciseModal(true)}
        >
          <Plus size={20} color={Colors.light.primary} />
          <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Workout Metadata Modal */}
      <Modal
        visible={showMetadataModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Workout Details</Text>
            <TouchableOpacity onPress={() => setShowMetadataModal(false)}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.metadataSection}>
              <View style={styles.metadataRow}>
                <Clock size={20} color={Colors.light.primary} />
                <Text style={styles.metadataLabel}>Start Time</Text>
                <Text style={styles.metadataValue}>
                  {metadata.startTime ? 
                    `${metadata.startTime.toLocaleDateString()} at ${metadata.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Not started'
                  }
                </Text>
              </View>

              <View style={styles.metadataRow}>
                <Clock size={20} color={Colors.light.primary} />
                <Text style={styles.metadataLabel}>End Time</Text>
                <Text style={styles.metadataValue}>
                  {metadata.endTime ? 
                    `${metadata.endTime.toLocaleDateString()} at ${metadata.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                    : 'In progress'
                  }
                </Text>
              </View>

              <View style={styles.metadataInputRow}>
                <User size={20} color={Colors.light.primary} />
                <Text style={styles.metadataLabel}>Bodyweight</Text>
                <TextInput
                  style={styles.metadataInput}
                  value={metadata.bodyweight}
                  onChangeText={(value) => setMetadata(prev => ({ ...prev, bodyweight: value }))}
                  placeholder="kg"
                  keyboardType="numeric"
                  placeholderTextColor={Colors.light.textTertiary}
                />
              </View>

              <View style={styles.metadataNotesRow}>
                <FileText size={20} color={Colors.light.primary} />
                <Text style={styles.metadataLabel}>Notes</Text>
              </View>
              <TextInput
                style={styles.metadataNotesInput}
                value={metadata.notes}
                onChangeText={(value) => setMetadata(prev => ({ ...prev, notes: value }))}
                placeholder="Add workout notes..."
                multiline
                numberOfLines={4}
                placeholderTextColor={Colors.light.textTertiary}
              />
            </View>
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
              <X size={24} color={Colors.light.text} />
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    marginRight: 12,
  },
  workoutTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  workoutTimer: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.success,
    marginTop: 2,
  },
  finishButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  finishButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  restTimerBar: {
    backgroundColor: Colors.light.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restTimerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restTimerTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
    marginLeft: 8,
    marginRight: 12,
  },
  restTimerTime: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
  },
  restTimerControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  exerciseCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    flex: 1,
  },
  setControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 4,
  },
  setControlButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  setCount: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  warmupGuidance: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  warmupTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  warmupText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 2,
  },
  workoutGuidance: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  workoutTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  workoutText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 2,
  },
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    marginBottom: 12,
  },
  setHeaderText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    position: 'relative',
  },
  setIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  warmupIndicator: {
    borderColor: Colors.light.textTertiary,
  },
  workingIndicator: {
    borderColor: Colors.light.primary,
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
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
  },
  warmupSetNumber: {
    color: Colors.light.textTertiary,
  },
  completedSetNumber: {
    color: '#FFFFFF',
  },
  previousData: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    flex: 1,
    textAlign: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    textAlign: 'center',
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  notesInput: {
    flex: 1.5,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  inputComplete: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  restTimerBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  restTimerText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginLeft: 4,
  },
  addExerciseButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
    marginLeft: 8,
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
  },
  metadataSection: {
    paddingTop: 20,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  metadataInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  metadataNotesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  metadataLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginLeft: 12,
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  metadataInput: {
    backgroundColor: Colors.light.card,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    minWidth: 80,
  },
  metadataNotesInput: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
});