import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Search } from 'lucide-react-native';
import { Exercise } from '../services/exercise.types';
import { ExerciseService } from '../services/exerciseService';
import Colors from '@/constants/Colors';

interface BrowseExercisesScreenProps {
  onExerciseSelect?: (exercise: Exercise) => void;
  autoFocusSearch?: boolean;
}

export default function BrowseExercisesScreen({ onExerciseSelect, autoFocusSearch = true }: BrowseExercisesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const results = useMemo(() => ExerciseService.search(searchQuery), [searchQuery]);

  const renderExerciseItem = ({ item }: { item: Exercise }) => (
    <TouchableOpacity
      style={styles.exerciseItem}
      onPress={() => onExerciseSelect?.(item)}
      accessibilityRole="button"
      accessibilityLabel={`Add ${item.name}`}
    >
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        <Text style={styles.exerciseDetail}>
          {item.primary_muscle_group}
          {item.secondary_muscle_groups && item.secondary_muscle_groups.length > 0 &&
            ` · ${item.secondary_muscle_groups.join(', ')}`}
        </Text>
        <Text style={styles.exerciseEquipment}>{item.equipment}</Text>
      </View>
      <View style={styles.exerciseBadge}>
        <Text style={styles.exerciseBadgeText}>{item.difficulty_level || 'Beginner'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color={Colors.light.textTertiary} />
        <TextInput
          autoFocus={autoFocusSearch}
          style={styles.searchInput}
          placeholder="Search by name, muscle or equipment"
          placeholderTextColor={Colors.light.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          accessibilityLabel="Search exercises"
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Exercise library</Text>
        <Text style={styles.sectionCount}>
          {results.length === ExerciseService.count
            ? `${results.length} exercises`
            : `${results.length} of ${ExerciseService.count}`}
        </Text>
      </View>

      <FlatList
        style={styles.content}
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderExerciseItem}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        windowSize={7}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No exercises match “{searchQuery.trim()}”.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: { flex: 1, fontSize: 16, fontFamily: 'Archivo-Regular', color: Colors.light.text, marginLeft: 12 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text },
  sectionCount: { fontSize: 14, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary },
  content: { flex: 1, paddingHorizontal: 20 },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 16,
  },
  exerciseInfo: { flex: 1, marginRight: 12 },
  exerciseName: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text, marginBottom: 2 },
  exerciseDetail: { fontSize: 13, fontFamily: 'Archivo-Regular', color: Colors.light.textSecondary, marginBottom: 2 },
  exerciseEquipment: { fontSize: 12, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary },
  exerciseBadge: { backgroundColor: Colors.light.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  exerciseBadgeText: { fontSize: 11, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.primary },
  separator: { height: 8 },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyStateText: { fontSize: 14, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, textAlign: 'center' },
});
