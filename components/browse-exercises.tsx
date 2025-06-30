import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { useWorkout } from '../contexts/WorkoutContext';
import { Exercise as DetailedExercise } from '../services/exercise.types';
import Colors from '@/constants/Colors';

interface BrowseExercisesScreenProps {
  onExerciseSelect?: (exercise: DetailedExercise) => void;
}

export default function BrowseExercisesScreen({ onExerciseSelect }: BrowseExercisesScreenProps) {
  const {
    masterExercises,
    userCustomExercises,
    isLoadingMasterExercises,
    isLoadingUserCustomExercises,
    loadMasterExercises,
    loadUserCustomExercises,
  } = useWorkout();

  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMasterExercises, setFilteredMasterExercises] = useState<DetailedExercise[]>([]);
  const [filteredCustomExercises, setFilteredCustomExercises] = useState<DetailedExercise[]>([]);

  useEffect(() => {
    loadMasterExercises();
    loadUserCustomExercises();
  }, []);

  useEffect(() => {
    // Filter exercises based on search query
    const filterExercises = (exercises: DetailedExercise[]) => {
      if (!searchQuery.trim()) return exercises;
      
      return exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exercise.primary_muscle_group.toLowerCase().includes(searchQuery.toLowerCase())
      );
    };

    setFilteredMasterExercises(filterExercises(masterExercises));
    setFilteredCustomExercises(filterExercises(userCustomExercises));
  }, [searchQuery, masterExercises, userCustomExercises]);

  const handleExerciseSelect = (exercise: DetailedExercise) => {
    if (onExerciseSelect) {
      onExerciseSelect(exercise);
    }
  };

  const renderExerciseItem = ({ item }: { item: DetailedExercise }) => (
    <TouchableOpacity 
      style={styles.exerciseItem} 
      onPress={() => handleExerciseSelect(item)}
    >
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseDetail}>
          {item.primary_muscle_group}
          {item.secondary_muscle_groups && item.secondary_muscle_groups.length > 0 && 
            ` • ${item.secondary_muscle_groups.join(', ')}`
          }
        </Text>
        <Text style={styles.exerciseEquipment}>{item.equipment}</Text>
      </View>
      <View style={styles.exerciseBadge}>
        <Text style={styles.exerciseBadgeText}>
          {item.difficulty_level || 'Beginner'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = (title: string, count: number, isLoading: boolean) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.light.primary} />
      ) : (
        <Text style={styles.sectionCount}>{count} exercises</Text>
      )}
    </View>
  );

  const renderEmptyState = (message: string) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.light.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={Colors.light.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        style={styles.content}
        showsVerticalScrollIndicator={false}
        data={[]}
        renderItem={() => null}
        ListHeaderComponent={() => (
          <View>
            {/* Master Exercises Section */}
            {renderSectionHeader('Exercise Library', filteredMasterExercises.length, isLoadingMasterExercises)}
            
            {isLoadingMasterExercises ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
              </View>
            ) : filteredMasterExercises.length === 0 ? (
              renderEmptyState(
                searchQuery 
                  ? 'No exercises found matching your search.' 
                  : 'No exercises available in the library.'
              )
            ) : (
              <FlatList
                data={filteredMasterExercises}
                keyExtractor={(item) => `master-${item.id.toString()}`}
                renderItem={renderExerciseItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}

            {/* Custom Exercises Section */}
            <View style={styles.sectionSpacing} />
            {renderSectionHeader('My Custom Exercises', filteredCustomExercises.length, isLoadingUserCustomExercises)}
            
            {isLoadingUserCustomExercises ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.light.primary} />
              </View>
            ) : filteredCustomExercises.length === 0 ? (
              renderEmptyState(
                searchQuery 
                  ? 'No custom exercises found matching your search.' 
                  : 'No custom exercises created yet.'
              )
            ) : (
              <FlatList
                data={filteredCustomExercises}
                keyExtractor={(item) => `custom-${item.id.toString()}`}
                renderItem={renderExerciseItem}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    marginLeft: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  sectionCount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  sectionSpacing: {
    height: 24,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  exerciseDetail: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 2,
  },
  exerciseEquipment: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  exerciseBadge: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  exerciseBadgeText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
  separator: {
    height: 8,
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
});