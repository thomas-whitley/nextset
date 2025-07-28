import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Plus, Info, MoveHorizontal as MoreHorizontal } from 'lucide-react-native'cide-react-native';
import Colors from '@/constants/Colors';
import { Exercise } from '@/services/exercise.types';
import { supabase } from '@/data/supabase-client';

interface ExerciseListScreenProps {
  selectedMuscleGroup: string;
  onBack: () => void;
  onExerciseSelect: (exercise: Exercise) => void;
  onAddCustomExercise: () => void;
  onShowExerciseDetails: (exercise: Exercise) => void;
}

interface CustomExercise {
  customId: string;
  customName: string;
  category: string;
}

export default function ExerciseListScreen({
  selectedMuscleGroup,
  onBack,
  onExerciseSelect,
  onAddCustomExercise,
  onShowExerciseDetails
}: ExerciseListScreenProps) {
  const [prepopulatedExercises, setPrepopulatedExercises] = useState<Exercise[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadExercises();
  }, [selectedMuscleGroup]);

  const loadExercises = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load prepopulated exercises from Supabase
      const { data: supabaseExercises, error: supabaseError } = await supabase
        .from('exercises')
        .select('*')
        .eq('primary_muscle_group', selectedMuscleGroup);

      if (supabaseError) {
        console.error('Error loading exercises from Supabase:', supabaseError);
        // Fall back to local data
        loadLocalExercises();
      } else {
        // Map Supabase data to our Exercise type
        const mappedExercises = supabaseExercises?.map(ex => ({
          id: ex.id,
          name: ex.name,
          isKeystone: ex.is_keystone,
          movementPattern: ex.movement_pattern,
          primaryMuscleGroup: ex.primary_muscle_group,
          secondaryMuscleGroups: ex.secondary_muscle_groups || [],
          equipment: ex.equipment,
          difficulty: ex.difficulty,
          executionCues: ex.execution_cues,
          commonMistakes: ex.common_mistakes || [],
          contraindications: ex.contraindications || [],
          progressionId: ex.progression_id,
          regressionId: ex.regression_id
        })) || [];
        
        setPrepopulatedExercises(mappedExercises);
      }

      // Load custom exercises (placeholder for now)
      // TODO: Implement custom exercise loading from database
      setCustomExercises([]);

    } catch (error) {
      console.error('Unexpected error loading exercises:', error);
      setError('Failed to load exercises');
      loadLocalExercises();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalExercises = () => {
    // Fallback to local exercise data
    try {
      const exerciseData = require('@/services/exercise.database.json');
      const filteredExercises = exerciseData.filter(
        (exercise: any) => exercise.primaryMuscleGroup === selectedMuscleGroup
      );
      
      const mappedExercises = filteredExercises.map((ex: any) => ({
        id: ex.id,
        name: ex.name,
        isKeystone: ex.isKeystone,
        movementPattern: ex.movementPattern,
        primaryMuscleGroup: ex.primaryMuscleGroup,
        secondaryMuscleGroups: ex.secondaryMuscleGroups || [],
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        executionCues: ex.executionCues,
        commonMistakes: ex.commonMistakes || [],
        contraindications: ex.contraindications || [],
        progressionId: ex.progressionId,
        regressionId: ex.regressionId
      }));
      
      setPrepopulatedExercises(mappedExercises);
    } catch (error) {
      console.error('Error loading local exercise data:', error);
      setError('Failed to load exercise data');
    }
  };

  const renderPrepopulatedExercise = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => onExerciseSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseContent}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseDetails}>
          {item.equipment} • {item.difficulty || 'Beginner'}
        </Text>
        {item.secondaryMuscleGroups && item.secondaryMuscleGroups.length > 0 && (
          <Text style={styles.secondaryMuscles}>
            Also works: {item.secondaryMuscleGroups.join(', ')}
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={styles.infoButton}
        onPress={() => onShowExerciseDetails(item)}
      >
        <Info size={20} color={Colors.light.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderCustomExercise = ({ item }: { item: CustomExercise }) => (
    <TouchableOpacity
      style={[styles.exerciseItem, styles.customExerciseItem]}
      onPress={() => {
        // Convert custom exercise to Exercise format for selection
        const exerciseForSelection: Exercise = {
          id: parseInt(item.customId.replace(/\D/g, '')) || 0,
          name: item.customName,
          primaryMuscleGroup: item.category,
          secondaryMuscleGroups: [],
          equipment: 'Custom',
          difficulty: 'Custom',
          executionCues: { setup: [], action: [], keyMentalCues: '' },
          commonMistakes: [],
          contraindications: []
        };
        onExerciseSelect(exerciseForSelection);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseContent}>
        <Text style={styles.exerciseName}>{item.customName}</Text>
        <Text style={styles.exerciseDetails}>Custom Exercise</Text>
      </View>
      <TouchableOpacity style={styles.menuButton}>
        <MoreHorizontal size={20} color={Colors.light.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No exercises found</Text>
      <Text style={styles.emptyStateSubtitle}>
        No exercises available for {selectedMuscleGroup}. Try adding a custom exercise.
      </Text>
      <TouchableOpacity style={styles.addCustomButton} onPress={onAddCustomExercise}>
        <Plus size={20} color={Colors.light.primary} />
        <Text style={styles.addCustomButtonText}>Add Custom Exercise</Text>
      </TouchableOpacity>
    </View>
  );

  const allExercises = [
    ...prepopulatedExercises.map(ex => ({ ...ex, type: 'prepopulated' })),
    ...customExercises.map(ex => ({ ...ex, type: 'custom' }))
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedMuscleGroup}</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddCustomExercise}>
          <Plus size={24} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.primary} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadExercises}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : allExercises.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          style={styles.exerciseList}
          data={allExercises}
          keyExtractor={(item) => 
            item.type === 'prepopulated' 
              ? `prep-${item.id}` 
              : `custom-${item.customId}`
          }
          renderItem={({ item }) =>
            item.type === 'prepopulated'
              ? renderPrepopulatedExercise({ item: item as Exercise })
              : renderCustomExercise({ item: item as CustomExercise })
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  exerciseList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  customExerciseItem: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.light.accent,
  },
  exerciseContent: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  secondaryMuscles: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  addCustomButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
    marginLeft: 8,
  },
});