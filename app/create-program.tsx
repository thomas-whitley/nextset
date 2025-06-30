import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';

export default function CreateProgramScreen() {
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [workouts, setWorkouts] = useState([{ name: '', description: '' }]);

  const handleClose = () => {
    router.dismiss();
  };

  const addWorkout = () => {
    setWorkouts([...workouts, { name: '', description: '' }]);
  };

  const updateWorkout = (index: number, field: 'name' | 'description', value: string) => {
    const updatedWorkouts = [...workouts];
    updatedWorkouts[index][field] = value;
    setWorkouts(updatedWorkouts);
  };

  const handleSave = () => {
    // Logic to save program
    router.dismiss();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Program</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveButton}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Program Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Program Name</Text>
            <TextInput
              style={styles.textInput}
              value={programName}
              onChangeText={setProgramName}
              placeholder="e.g., 5-Day Split"
              placeholderTextColor={Colors.light.textTertiary}
            />
          </View>
      
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={programDescription}
            onChangeText={setProgramDescription}
            placeholder="Describe your program..."
            placeholderTextColor={Colors.light.textTertiary}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workouts</Text>
            <TouchableOpacity style={styles.addButton} onPress={addWorkout}>
              <Plus size={20} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          {workouts.map((workout, index) => (
            <View key={index} style={styles.workoutCard}>
              <Text style={styles.workoutNumber}>Day {index + 1}</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Workout Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={workout.name}
                  onChangeText={(value) => updateWorkout(index, 'name', value)}
                  placeholder="e.g., Push Day"
                  placeholderTextColor={Colors.light.textTertiary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={styles.textInput}
                  value={workout.description}
                  onChangeText={(value) => updateWorkout(index, 'description', value)}
                  placeholder="e.g., Chest, Shoulders, Triceps"
                  placeholderTextColor={Colors.light.textTertiary}
                />
              </View>
              <TouchableOpacity style={styles.addExerciseButton} onPress={() => router.push('/workout')}>
                <Text style={styles.addExerciseButtonText}>Browse Exercises to Add</Text>
              </TouchableOpacity>
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
  },
  saveButton: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  workoutCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  workoutNumber: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
    marginBottom: 16,
  },
  addExerciseButton: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8, // Added to give some space
  },
  addExerciseButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
});