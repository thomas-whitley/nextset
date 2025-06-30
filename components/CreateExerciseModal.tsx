// src/components/CreateExerciseModal.tsx

import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { ontologyService } from '../services/ontologyService';

interface Props {
  onClose: () => void; // A function to close the modal
}

export default function CreateExerciseModal({ onClose }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // This is the function for the save button
  const handleSave = async () => {
    if (!name) {
      Alert.alert("Validation Error", "Exercise name cannot be empty.");
      return;
    }

    setIsSaving(true);

    try {
      // This is the specific line where you call the service
      await ontologyService.createCustomExercise({ name, description });

      // If successful, show an alert and close the modal
      Alert.alert("Success", "Your new exercise has been saved!");
      onClose();

    } catch (error: any) {
      console.error("Failed to create exercise:", error);
      Alert.alert("Error", `Could not save exercise: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Exercise Name (e.g., 'Kettlebell Swings')"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        placeholder="Description (optional)"
        value={description}
        onChangeText={setDescription}
      />
      <Button
        title={isSaving ? "Saving..." : "Save Exercise"}
        onPress={handleSave} // The handler is attached here
        disabled={isSaving}
      />
      <Button
        title="Cancel"
        onPress={onClose}
        color="gray"
      />
    </View>
  );
}