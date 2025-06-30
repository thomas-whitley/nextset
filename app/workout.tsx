import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, Timer, Plus, Minus, X } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';
import { useTimer } from '@/contexts/TimerContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { useAuth } from '@/data/AuthContext';
import BrowseExercisesScreen from '@/components/browse-exercises';

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
  const { startTimer, setMode, setInitialTime } = useTimer();
  const { user } = useAuth();
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);

  useEffect(() => {
    if (isWorkoutActive && !workoutStartTime) {
      setWorkoutStartTime(new Date());
    }
  }, [isWorkoutActive]);

  const handleSetComplete = async (exerciseId: string, setId: string) => {
    await completeSet(exerciseId, setId);
    
    // Start rest timer automatically when set is completed
    const newCompletedSets = new Set(completedSets);
    if (!completedSets.has(setId)) {
      newCompletedSets.add(setId);
      setCompletedSets(newCompletedSets);
      
      // Auto-start rest timer
      setMode('countdown');
      setInitialTime(60); // 60 seconds default rest
      startTimer();
      
      router.push({
        pathname: '/timer',
        params: { 
          mode: 'rest',
          duration: '60',
          contextExercise: 'Rest between sets'
        }
      });
    } else {
      newCompletedSets.delete(setId);
      setCompletedSets(newCompletedSets);
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
    if (!currentWorkout || !workoutStartTime || !user) {
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
              // Save workout to history
              await WorkoutHistoryService.saveWorkoutHistory(
                user.id,
                currentWorkout,
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
        <View style={styles.headerContent}>
          <Text style={styles.workoutTitle}>{currentWorkout.name}</Text>
          <Text style={styles.workoutSubtitle}>{currentWorkout.description}</Text>
          {workoutStartTime && (
            <Text style={styles.workoutTimer}>
              Started: {workoutStartTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.finishButton} onPress={handleFinishWorkout}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </TouchableOpacity>
      </View>

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
            
            <View style={styles.setHeader}>
              <Text style={styles.setHeaderText}>Set</Text>
              <Text style={styles.setHeaderText}>Previous</Text>
              <Text style={styles.setHeaderText}>Weight</Text>
              <Text style={styles.setHeaderText}>Reps</Text>
              <Text style={styles.setHeaderText}>✓</Text>
            </View>

            {exercise.sets.map((set, setIndex) => (
              <View key={set.id}>
                <View style={styles.setRow}>
                  <Text style={styles.setNumber}>{setIndex + 1}</Text>
                  
                  <Text style={styles.previousData}>
                    {set.previousWeight}kg × {set.previousReps}
                  </Text>
                  
                  <TextInput
                    style={[styles.input, set.isComplete && styles.inputComplete]}
                    value={set.weight}
                    onChangeText={(value) => updateSet(exercise.id, set.id, 'weight', value)}
                    keyboardType="numeric"
                    placeholder="kg"
                    placeholderTextColor={Colors.light.textTertiary}
                    editable={!set.isComplete}
                  />
                  
                  <TextInput
                    style={[styles.input, set.isComplete && styles.inputComplete]}
                    value={set.reps}
                    onChangeText={(value) => updateSet(exercise.id, set.id, 'reps', value)}
                    keyboardType="numeric"
                    placeholder="reps"
                    placeholderTextColor={Colors.light.textTertiary}
                    editable={!set.isComplete}
                  />
                  
                  <TouchableOpacity
                    style={[styles.checkbox, set.isComplete && styles.checkboxComplete]}
                    onPress={() => handleSetComplete(exercise.id, set.id)}
                  >
                    {set.isComplete && <Check size={16} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
  },
  workoutTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  workoutSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  workoutTimer: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.success,
    marginTop: 4,
  },
  finishButton: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  finishButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
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
  setHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    marginBottom: 12,
  },
  setHeaderText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  setNumber: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  previousData: {
    fontSize: 14,
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
  inputComplete: {
    backgroundColor: Colors.light.primaryLight,
    borderColor: Colors.light.primary,
  },
  checkbox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.background,
    borderWidth: 2,
    borderColor: Colors.light.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  checkboxComplete: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
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
});