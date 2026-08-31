import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Play, Dumbbell } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';
import { useWorkout } from '@/contexts/WorkoutContext';
import { Workout } from '@/services/exercise.types';
import DraggableList from '@/components/gestures/DraggableList';

export default function ProgramDetailScreen() {
  const { currentProgram, startWorkout, reorderWorkouts } = useWorkout();

  const handleStartWorkout = (workout: Workout) => {
    startWorkout(workout);
    router.dismiss();
    router.push('/workout');
  };

  const handleClose = () => {
    router.dismiss();
  };

  const handleReorder = async (orderedWorkoutIds: string[]) => {
    try {
      await reorderWorkouts(orderedWorkoutIds);
    } catch {
      Alert.alert('Could not reorder', 'Check your connection and try again.');
    }
  };

  if (!currentProgram) {
    return null;
  }

  const sortedWorkouts = [...currentProgram.workouts].sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentProgram.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.programBanner}>
          <Dumbbell size={40} color={Colors.light.onRubber} />
        </View>

        <View style={styles.programInfo}>
          <Text style={styles.programName}>{currentProgram.name}</Text>
          <Text style={styles.programCreator}>
            {currentProgram.schedule ? `${currentProgram.schedule} · ` : ''}by {currentProgram.creator}
          </Text>
          <Text style={styles.programDescription}>{currentProgram.description}</Text>

          {currentProgram.isTemplate === false && (
            <View style={styles.customizationBadge}>
              <Text style={styles.customizationBadgeText}>Your copy — edits are saved</Text>
            </View>
          )}
        </View>

        <View style={styles.workoutsList}>
          <Text style={styles.workoutsTitle}>
            {sortedWorkouts.length} {sortedWorkouts.length === 1 ? 'workout' : 'workouts'}
          </Text>
          <Text style={styles.workoutsHint}>Long-press a day to reorder.</Text>

          <DraggableList
            items={sortedWorkouts}
            keyExtractor={(workout) => workout.id}
            gap={spacing.md}
            enabled={sortedWorkouts.length > 1}
            onReorder={handleReorder}
            renderItem={(workout, index, isActive) => (
              <TouchableOpacity
                style={[styles.workoutCard, isActive && styles.workoutCardActive]}
                onPress={() => handleStartWorkout(workout)}
                accessibilityRole="button"
                accessibilityLabel={`Day ${index + 1}, ${workout.name}`}
                accessibilityHint="Double tap to start this workout. Long-press to reorder days."
              >
                <View style={styles.workoutInfo}>
                  <Text style={styles.dayEyebrow}>Day {index + 1}</Text>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  <Text style={styles.workoutDescription}>{workout.description}</Text>
                  <Text style={styles.exerciseCount}>
                    {workout.exercises.length} {workout.exercises.length === 1 ? 'exercise' : 'exercises'}
                    {workout.exercises.length > 0 ? ` · ${workout.exercises.map((e) => e.name).join(', ')}` : ''}
                  </Text>
                  {/* Same numeric-&& trap: a 0-minute estimate would render
                      a bare "0" rather than nothing. */}
                  {(workout.estimatedDuration ?? 0) > 0 && (
                    <Text style={styles.estimatedDuration}>~{workout.estimatedDuration} min</Text>
                  )}
                </View>

                <View style={styles.startButton}>
                  <Play size={20} color={Colors.light.primary} />
                </View>
              </TouchableOpacity>
            )}
          />
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: {
    ...type.section,
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
  },
  // Explicit box rather than relying on hitSlop alone: hitSlop pads the
  // existing 24px icon box by 8 each side (40x40), still short of the
  // 44x44 minimum. minWidth/minHeight + centering gets the real box there.
  closeButton: { minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  // Balances the close button on the left so the title actually sits
  // centred now that the arrow-reorder toggle on the right is gone.
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
  },
  programBanner: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.light.rubber,
    justifyContent: 'center',
    alignItems: 'center',
  },
  programInfo: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  programName: {
    ...type.title,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  programCreator: {
    ...type.bodyMedium,
    color: Colors.light.textTertiary,
    marginBottom: spacing.md,
  },
  programDescription: {
    ...type.body,
    color: Colors.light.textSecondary,
  },
  customizationBadge: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: radius.input,
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
  },
  customizationBadgeText: {
    ...type.label,
    color: Colors.light.primary,
  },
  workoutsList: {
    padding: spacing.lg,
  },
  workoutsTitle: {
    ...type.section,
    color: Colors.light.text,
    marginBottom: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  workoutsHint: {
    ...type.label,
    color: Colors.light.textTertiary,
    marginBottom: spacing.md,
  },
  workoutCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  // The wrapper already applies elevation.dragging and a slight scale while
  // an item is actually being dragged; this is the resting-state cue that a
  // card is the one currently active.
  workoutCardActive: {
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  workoutInfo: {
    flex: 1,
  },
  dayEyebrow: {
    ...type.eyebrow,
    color: Colors.light.textTertiary,
    marginBottom: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  workoutName: {
    ...type.section,
    color: Colors.light.text,
    marginBottom: spacing.xs,
  },
  workoutDescription: {
    ...type.label,
    color: Colors.light.textTertiary,
    marginBottom: spacing.xs,
  },
  exerciseCount: {
    ...type.label,
    color: Colors.light.textTertiary,
    fontVariant: ['tabular-nums'],
  },
  estimatedDuration: {
    ...type.label,
    color: Colors.light.success,
    marginTop: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
  startButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
});
