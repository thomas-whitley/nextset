import { Alert } from 'react-native';
import { router } from 'expo-router';
import { useWorkout } from '@/contexts/WorkoutContext';
import type { Workout } from '@/services/exercise.types';

/**
 * Every Start and Quick workout button goes through here. Starting over a
 * minimised workout would throw its logged sets away without a word, so a
 * running one is offered back instead.
 */
export function useStartWorkout() {
  const { isWorkoutActive, currentWorkout, startWorkout, startQuickWorkout } = useWorkout();

  const guard = (begin: () => void) => {
    if (isWorkoutActive) {
      Alert.alert('A workout is already running', `Finish or discard ${currentWorkout?.name ?? 'it'} before starting another.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => router.push('/workout') },
      ]);
      return;
    }
    begin();
    router.push('/workout');
  };

  return {
    start: (workout: Workout) => guard(() => startWorkout(workout)),
    startQuick: () => guard(startQuickWorkout),
  };
}
