import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Play, ArrowUp, ArrowDown, GripVertical, Move } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useAnimatedGestureHandler, 
  runOnJS,
  withSpring 
} from 'react-native-reanimated';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';

export default function ProgramDetailScreen() {
  const params = useLocalSearchParams();
  const { currentProgram, startWorkout, reorderWorkouts } = useWorkout();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [workoutOrder, setWorkoutOrder] = useState<string[]>([]);

  // Initialize workout order when program loads
  React.useEffect(() => {
    if (currentProgram) {
      const sortedWorkouts = [...currentProgram.workouts].sort((a, b) => a.order - b.order);
      setWorkoutOrder(sortedWorkouts.map(w => w.id));
    }
  }, [currentProgram]);
  const handleStartWorkout = (workout: any) => {
    startWorkout(workout);
    router.dismiss();
    router.push('/workout');
  };

  const handleClose = () => {
    router.dismiss();
  };

  const handleReorderComplete = async (newOrder: string[]) => {
    try {
      await reorderWorkouts(newOrder);
      setWorkoutOrder(newOrder);
    } catch (error) {
      Alert.alert('Error', 'Failed to reorder workouts. Please try again.');
    }
  };

  const moveWorkout = (fromIndex: number, toIndex: number) => {
    const newOrder = [...workoutOrder];
    const [movedItem] = newOrder.splice(fromIndex, 1);
    newOrder.splice(toIndex, 0, movedItem);
    setWorkoutOrder(newOrder);
    handleReorderComplete(newOrder);
  };

  if (!currentProgram) {
    return null;
  }

  // Get workouts in the current order
  const orderedWorkouts = workoutOrder.map(id => 
    currentProgram.workouts.find(w => w.id === id)
  ).filter(Boolean);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{currentProgram.name}</Text>
          {/* <View style={styles.dragHint}>
            <Move size={16} color={Colors.light.textTertiary} />
            <Text style={styles.dragHintText}>Hold to drag</Text>
          </View> */}
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
              Workouts ({orderedWorkouts.length})
            </Text>
            
            {orderedWorkouts.map((workout: any, index: number) => (
              <DraggableWorkoutCard
                key={workout.id}
                workout={workout}
                index={index}
                onStartWorkout={handleStartWorkout}
                onMove={moveWorkout}
                isDragging={draggedIndex === index}
                onDragStart={() => setDraggedIndex(index)}
                onDragEnd={() => setDraggedIndex(null)}
              />
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

// Draggable Workout Card Component
function DraggableWorkoutCard({ 
  workout, 
  index, 
  onStartWorkout, 
  onMove, 
  isDragging,
  onDragStart,
  onDragEnd 
}: {
  workout: any;
  index: number;
  onStartWorkout: (workout: any) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: () => {
      runOnJS(onDragStart)();
      scale.value = withSpring(1.05);
      opacity.value = withSpring(0.9);
    },
    onActive: (event) => {
      translateY.value = event.translationY;
    },
    onEnd: (event) => {
      const moveThreshold = 80; // Minimum distance to trigger reorder
      const direction = event.translationY > 0 ? 1 : -1;
      const shouldMove = Math.abs(event.translationY) > moveThreshold;
      
      if (shouldMove) {
        const newIndex = index + direction;
        if (newIndex >= 0) {
          runOnJS(onMove)(index, newIndex);
        }
      }
      
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      opacity.value = withSpring(1);
      runOnJS(onDragEnd)();
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    opacity: opacity.value,
    zIndex: isDragging ? 1000 : 1,
  }));

  return (
    <Animated.View style={[styles.workoutCardContainer, animatedStyle]}>
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View>
          <TouchableOpacity 
            style={[
              styles.workoutCard,
              isDragging && styles.workoutCardDragging
            ]}
            onPress={() => !isDragging && onStartWorkout(workout)}
            activeOpacity={isDragging ? 1 : 0.7}
          >
            <View style={styles.dragHandle}>
              <GripVertical size={20} color={Colors.light.textTertiary} />
            </View>
            
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
            
            {/* <View style={styles.startButton}>
              <Play size={20} color={Colors.light.primary} />
            </View> */}
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </Animated.View>
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
  },
  dragHint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dragHintText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginLeft: 4,
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
  workoutCardDragging: {
    backgroundColor: Colors.light.card,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: Colors.light.primaryLight,
  },
  dragHandle: {
    marginRight: 12,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
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
});