import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, ChevronRight } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';
import { supabase } from '@/data/supabase-client';

interface CustomExerciseData {
  customName: string;
  category: string;
  exerciseType: string;
  isSingleArmOrLeg: boolean;
  bodyweightPercentage?: number;
}

const categories = [
  'Abs', 'Back', 'Biceps', 'Cardio', 'Chest', 
  'Forearms', 'Glutes', 'Legs', 'Shoulders', 'Triceps'
];

const exerciseTypes = [
  { 
    category: 'STRENGTH',
    options: [
      { value: 'Weight, Reps', description: 'Bench Press, Dumbbell Row, Cable Crossovers' },
      { value: 'Weight, Time', description: 'Weighted Static Holds' }
    ]
  },
  {
    category: 'BODYWEIGHT STRENGTH TRAINING',
    options: [
      { value: 'Weight, Reps', description: 'Dips, Pull Up, Chin Up' },
      { value: 'Assisted bodyweight, Reps', description: 'Assisted Dips, Assisted Chin Up' },
      { value: 'Reps', description: 'Push Ups, Bodyweight Squat' },
      { value: 'Time', description: 'Front Plank, Wall Sits' }
    ]
  },
  {
    category: 'CARDIO',
    options: [
      { value: 'Time, Distance, Kcal', description: 'Running, Stationary Bike' }
    ]
  },
  {
    category: 'OTHER',
    options: [
      { value: 'Notes', description: 'Stretching' }
    ]
  }
];

const singleArmLegOptions = [
  { value: 'Yes', description: '' },
  { value: 'No', description: '' },
  { value: 'Default(No)', description: 'Count weight twice in statistics' }
];

export default function CreateCustomExerciseScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams();
  const isEditMode = params.editMode === 'true';
  const exerciseId = params.exerciseId as string;
  
  const [formData, setFormData] = useState<CustomExerciseData>({
    customName: (params.customName as string) || '',
    category: (params.category as string) || '',
    exerciseType: (params.exerciseType as string) || '',
    isSingleArmOrLeg: params.isSingleArmOrLeg === 'true',
    bodyweightPercentage: params.bodyweightPercentage ? parseInt(params.bodyweightPercentage as string) : undefined
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showExerciseTypeModal, setShowExerciseTypeModal] = useState(false);
  const [showSingleArmLegModal, setShowSingleArmLegModal] = useState(false);
  const [showBodyweightModal, setShowBodyweightModal] = useState(false);
  const [bodyweightPercentage, setBodyweightPercentage] = useState(
    formData.bodyweightPercentage || 100
  );

  const handleClose = () => {
    router.back();
  };

  const handleCategorySelect = (category: string) => {
    setFormData(prev => ({ ...prev, category }));
    setShowCategoryModal(false);
  };

  const handleExerciseTypeSelect = (exerciseType: string) => {
    setFormData(prev => ({ ...prev, exerciseType }));
    setShowExerciseTypeModal(false);
  };

  const handleSingleArmLegSelect = (option: string) => {
    const isSingle = option === 'Yes';
    setFormData(prev => ({ ...prev, isSingleArmOrLeg: isSingle }));
    setShowSingleArmLegModal(false);
  };

  const handleSave = async () => {
    // Validation
    if (!formData.customName.trim()) {
      Alert.alert('Error', 'Please enter a custom exercise name');
      return;
    }
    if (!formData.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.exerciseType) {
      Alert.alert('Error', 'Please select an exercise type');
      return;
    }

    // Check if we need to show bodyweight percentage screen
    if (formData.exerciseType === 'Assisted bodyweight, Reps') {
      setShowBodyweightModal(true);
      return;
    }

    await saveCustomExercise();
  };

  const saveCustomExercise = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to save custom exercises');
      return;
    }

    try {
      const customExercise = {
        user_id: user.id,
        name: formData.customName.trim(),
        primary_muscle_group: formData.category,
        equipment: 'Custom',
        difficulty: 'Custom',
        execution_cues: {
          setup: [],
          action: [],
          keyMentalCues: 'Custom exercise'
        },
        common_mistakes: [],
        contraindications: [],
        // Store custom exercise metadata
        custom_data: {
          exerciseType: formData.exerciseType,
          isSingleArmOrLeg: formData.isSingleArmOrLeg,
          bodyweightPercentage: formData.bodyweightPercentage
        }
      };

      let error;
      if (isEditMode && exerciseId) {
        // Update existing exercise
        const { error: updateError } = await supabase
          .from('exercises')
          .update(customExercise)
          .eq('id', parseInt(exerciseId));
        error = updateError;
      } else {
        // Insert new exercise
        const { error: insertError } = await supabase
          .from('exercises')
          .insert(customExercise);
        error = insertError;
      }

      if (error) {
        console.error(`Error ${isEditMode ? 'updating' : 'saving'} custom exercise:`, error);
        Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'save'} custom exercise. Please try again.`);
        return;
      }

      Alert.alert(
        'Success',
        `Custom exercise ${isEditMode ? 'updated' : 'created'} successfully!`,
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error(`Unexpected error ${isEditMode ? 'updating' : 'saving'} custom exercise:`, error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    }
  };

  const handleBodyweightConfirm = () => {
    setFormData(prev => ({ ...prev, bodyweightPercentage }));
    setShowBodyweightModal(false);
    saveCustomExercise();
  };

  const getSingleArmLegDisplayText = () => {
    if (formData.isSingleArmOrLeg) return 'Yes';
    return 'Default(No)';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditMode ? 'Edit Exercise' : 'Add Exercise'}</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.doneButton}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Custom Name Input */}
        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Custom</Text>
          <TextInput
            style={styles.textInput}
            value={formData.customName}
            onChangeText={(value) => setFormData(prev => ({ ...prev, customName: value }))}
            placeholder="Enter exercise name"
            placeholderTextColor={Colors.light.textTertiary}
          />
        </View>

        {/* Category Selection */}
        <TouchableOpacity 
          style={styles.selectionRow}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.selectionLabel}>Category</Text>
          <View style={styles.selectionValue}>
            <Text style={[styles.selectionText, !formData.category && styles.placeholderText]}>
              {formData.category || 'Select category'}
            </Text>
            <ChevronRight size={20} color={Colors.light.textTertiary} />
          </View>
        </TouchableOpacity>

        {/* Exercise Type Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>EXERCISE TYPE</Text>
        </View>

        <TouchableOpacity 
          style={styles.selectionRow}
          onPress={() => setShowExerciseTypeModal(true)}
        >
          <View style={styles.selectionContent}>
            <Text style={styles.selectionLabel}>
              {formData.exerciseType || 'Select exercise type'}
            </Text>
            {formData.exerciseType && (
              <Text style={styles.selectionSubtext}>
                {exerciseTypes
                  .flatMap(cat => cat.options)
                  .find(opt => opt.value === formData.exerciseType)?.description || ''}
              </Text>
            )}
          </View>
          <ChevronRight size={20} color={Colors.light.textTertiary} />
        </TouchableOpacity>

        {/* Single Arm/Leg Selection */}
        <TouchableOpacity 
          style={styles.selectionRow}
          onPress={() => setShowSingleArmLegModal(true)}
        >
          <Text style={styles.selectionLabel}>Single Leg / Single Arm</Text>
          <View style={styles.selectionValue}>
            <Text style={styles.selectionText}>
              {getSingleArmLegDisplayText()}
            </Text>
            <ChevronRight size={20} color={Colors.light.textTertiary} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Category Selection Modal */}
      <Modal visible={showCategoryModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Category</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={styles.modalOption}
                onPress={() => handleCategorySelect(category)}
              >
                <Text style={styles.modalOptionText}>{category}</Text>
                {formData.category === category && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Exercise Type Selection Modal */}
      <Modal visible={showExerciseTypeModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowExerciseTypeModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            {exerciseTypes.map((category) => (
              <View key={category.category}>
                <Text style={styles.categoryHeader}>{category.category}</Text>
                {category.options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.modalOption}
                    onPress={() => handleExerciseTypeSelect(option.value)}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.modalOptionText}>{option.value}</Text>
                      {option.description && (
                        <Text style={styles.optionDescription}>{option.description}</Text>
                      )}
                    </View>
                    {formData.exerciseType === option.value && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Single Arm/Leg Selection Modal */}
      <Modal visible={showSingleArmLegModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSingleArmLegModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.modalContent}>
            {singleArmLegOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.modalOption}
                onPress={() => handleSingleArmLegSelect(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={styles.modalOptionText}>{option.value}</Text>
                  {option.description && (
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  )}
                </View>
                {getSingleArmLegDisplayText() === option.value && (
                  <Text style={styles.checkmark}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Bodyweight Percentage Modal */}
      <Modal visible={showBodyweightModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBodyweightModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.bodyweightContent}>
            <View style={styles.bodyweightCard}>
              <Text style={styles.bodyweightTitle}>
                Percentage of bodyweight used when calculating weight for this exercise.
              </Text>
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={100}
                  value={bodyweightPercentage}
                  onValueChange={setBodyweightPercentage}
                  step={5}
                  minimumTrackTintColor={Colors.light.primary}
                  maximumTrackTintColor={Colors.light.border}
                  thumbTintColor={Colors.light.primary}
                />
                <Text style={styles.percentageText}>{bodyweightPercentage}%</Text>
              </View>
              <TouchableOpacity 
                style={styles.resetButton}
                onPress={() => setBodyweightPercentage(100)}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleBodyweightConfirm}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
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
  cancelButton: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  doneButton: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  selectionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
  },
  selectionValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    marginRight: 8,
  },
  placeholderText: {
    color: Colors.light.textTertiary,
  },
  selectionContent: {
    flex: 1,
  },
  selectionSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
    letterSpacing: 0.5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
  },
  checkmark: {
    fontSize: 18,
    color: Colors.light.primary,
    fontFamily: 'Inter-Bold',
  },
  categoryHeader: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  optionContent: {
    flex: 1,
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  bodyweightContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    justifyContent: 'space-between',
  },
  bodyweightCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  bodyweightTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    lineHeight: 24,
    marginBottom: 32,
  },
  sliderContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  slider: {
    width: '100%',
    height: 40,
    marginBottom: 16,
  },
  percentageText: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
  },
  resetButton: {
    backgroundColor: Colors.light.background,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'flex-start',
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  confirmButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 40,
  },
  confirmButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});