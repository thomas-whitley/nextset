
// =============================================================================
// - This component will fetch, display, and handle searching of exercises. 
// - The component will use useState and useEffect to manage its state and fetch data from your ExerciseService.
// - A FlatList will render the list of exercises, and a TextInput will handle search functionality.
// - It will also include a search input to filter exercises by name.
// - Validation: The ExerciseSelector component renders correctly and displays data fetched from Supabase.
// =============================================================================
// src/components/ExerciseSelector.tsx

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Button } from 'react-native';
import { Exercise } from '../engine/ontology';
import { ontologyService } from '../services/ontologyService';
import CreateExerciseModal from './CreateExerciseModal'; // The modal from step 2
import { Modal } from 'react-native';

export default function ExerciseSelector({ onExerciseSelect }) {
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<Exercise[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  // Function to load or refresh data from the service
  const loadData = () => {
      try {
        // This line gets the already-loaded data from the service
        const data = ontologyService.getAllExercises();
        setAllExercises(data);
        setFilteredExercises(data); // Initially, show all exercises
      } catch (error) {
        console.error('Failed to load exercises from ontology service:', error);
      }
  }

  // Load the data when the component first appears
  useEffect(() => {
    loadData();
  }, []);

  // When the modal for creating an exercise closes, we should refresh our list
  const handleModalClose = () => {
    setModalVisible(false);
    loadData(); // Re-load data in case a new exercise was added
  }

  // ... (handleSearch function would go here) ...

  return (
    <View>
      <Button title="Create New Exercise" onPress={() => setModalVisible(true)} />

      <TextInput placeholder="Search exercises..." /* ... */ />

      { filteredExercises && (<FlatList
        data={filteredExercises}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => onExerciseSelect(item)}>
            <Text>{item.name}</Text>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
      />)}

      <Modal visible={modalVisible} animationType="slide">
        <CreateExerciseModal onClose={handleModalClose} />
      </Modal>
    </View>
  );
}