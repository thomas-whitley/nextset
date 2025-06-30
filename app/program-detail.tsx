import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Play, ArrowUp, ArrowDown, GripVertical } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';

export default function ProgramDetailScreen() {
  const params = useLocalSearchParams();
  const { currentProgram, startWorkout, reorderWorkouts } = useWorkout();
  const [isReordering, setIsReordering] = useState(false);

  const handleStartWorkout = (workout: any) => {
    startWorkout(workout);
    router.dismiss();
    router.push('/workout');
  };

  const handleClose = () => {
    router.dismiss();
  };

  const handleMoveWorkout = async (workoutId: string, direction: 'up' | 'down') => {
    if (!currentProgram) return;

    const workouts = [...currentProgram.workouts].sort((a, b) => a.order - b.order);
    const currentIndex = workouts.findIndex(w => w.id === workoutId);
    
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= workouts.length) return;

    // Swap the workouts
    [workouts[currentIndex], workouts[newIndex]] = [workouts[newIndex], workouts[currentIndex]];
    
    // Get the new order of workout IDs
    const newWorkoutOrder = workouts.map(w => w.id);
    
    try {
      await reorderWorkouts(newWorkoutOrder);
    } catch (error) {
      Alert.alert('Error', 'Failed to reorder workouts. Please try again.');
    }
  };

  if (!currentProgram) {
    return null;
  }

  const sortedWorkouts = [...currentProgram.workouts].sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentProgram.name}</Text>
        <TouchableOpacity onPress={() => setIsReordering(!isReordering)}>
          <Text style={styles.reorderButton}>
            {isReordering ? 'Done' : 'Reorder'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Image source={{ uri: currentProgram.imageUrl }} style={styles.programImage} />
        
        <View style={styles.programInfo}>
          <Text style={styles.programName}>{currentProgram.name}</Text>
          <Text style={styles.programCreator}>by {currentProgram.creator}</Text>
          <Text style={styles.programDescription}>{currentProgram.description}</Text>
          
          {currentProgram.isTemplate === false && (
            <View style={styles.customizationBadge}>
              <Text style={styles.customizationBadgeText}>Customized Program</Text>
            </View>
          )}
        </View>

        <View style={styles.workoutsList}>
          <Text style={styles.workoutsTitle}>
            Workouts ({sortedWorkouts.length})
          </Text>
          
          {sortedWorkouts.map((workout: any, index: number) => (
            <View key={workout.id} style={styles.workoutCardContainer}>
              <TouchableOpacity 
                style={[
                  styles.workoutCard,
                  isReordering && styles.workoutCardReordering
                ]}
                onPress={() => !isReordering && handleStartWorkout(workout)}
                disabled={isReordering}
              >
                {isReordering && (
                  <View style={styles.reorderControls}>
                    <GripVertical size={20} color={Colors.light.textTertiary} />
                  </View>
                )}
                
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutName}>
                    Day {index + 1}: {workout.name}
                  </Text>
                  <Text style={styles.workoutDescription}>{workout.description}</Text>
                  <Text style={styles.exerciseCount}>
                    {workout.exercises.length} exercises
                  </Text>
                  {workout.estimatedDuration && (
                    <Text style={styles.estimatedDuration}>
                      ~{workout.estimatedDuration} min
                    </Text>
                  )}
                </View>
                
                {!isReordering && (
                  <View style={styles.startButton}>
                    <Play size={20} color={Colors.light.primary} />
                  </View>
                )}
              </TouchableOpacity>

              {isReordering && (
                <View style={styles.moveButtons}>
                  <TouchableOpacity
                    style={[
                      styles.moveButton,
                      index === 0 && styles.moveButtonDisabled
                    ]}
                    onPress={() => handleMoveWorkout(workout.id, 'up')}
                    disabled={index === 0}
                  >
                    <ArrowUp 
                      size={16} 
                      color={index === 0 ? Colors.light.border : Colors.light.primary} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.moveButton,
                      index === sortedWorkouts.length - 1 && styles.moveButtonDisabled
                    ]}
                    onPress={() => handleMoveWorkout(workout.id, 'down')}
                    disabled={index === sortedWorkouts.length - 1}
                  >
                    <ArrowDown 
                      size={16} 
                      color={index === sortedWorkouts.length - 1 ? Colors.light.border : Colors.light.primary} 
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
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
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  reorderButton: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
  content: {
    flex: 1,
  },
  programImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  programInfo: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  programName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  programCreator: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 12,
  },
  programDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    lineHeight: 24,
  },
  customizationBadge: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  customizationBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
  workoutsList: {
    padding: 20,
  },
  workoutsTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  workoutCardContainer: {
    marginBottom: 12,
  },
  workoutCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  workoutCardReordering: {
    backgroundColor: Colors.light.primaryLight,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  reorderControls: {
    marginRight: 12,
    padding: 4,
  },
  workoutInfo: {
    flex: 1,
  },
  workoutName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  workoutDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  estimatedDuration: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.success,
    marginTop: 2,
  },
  startButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moveButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  moveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  moveButtonDisabled: {
    backgroundColor: Colors.light.border,
  },
});