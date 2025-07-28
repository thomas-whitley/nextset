import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import BrowseExercisesScreen from '@/components/browse-exercises';

export default function BrowseExercisesPage() {
  const handleExerciseSelect = (exercise: any) => {
    // Handle exercise selection - could navigate back or add to workout
    console.log('Exercise selected:', exercise.name);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <BrowseExercisesScreen 
        onExerciseSelect={handleExerciseSelect}
        autoFocusSearch={true}
        showBodyWheel={true}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});