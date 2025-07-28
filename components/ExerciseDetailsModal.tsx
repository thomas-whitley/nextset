import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { Exercise } from '@/services/exercise.types';

interface ExerciseDetailsModalProps {
  visible: boolean;
  exercise: Exercise | null;
  onClose: () => void;
}

export default function ExerciseDetailsModal({ visible, exercise, onClose }: ExerciseDetailsModalProps) {
  if (!exercise) return null;

  const formatMuscleGroups = (groups: string[] | undefined) => {
    if (!groups || groups.length === 0) return 'None';
    return groups.join(', ');
  };

  const formatExecutionCues = (cues: any) => {
    if (!cues) return 'No instructions available';
    
    const setup = cues.setup?.join('. ') || '';
    const action = cues.action?.join('. ') || '';
    const keyMentalCues = cues.keyMentalCues || '';
    
    return [setup, action, keyMentalCues].filter(Boolean).join('\n\n');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{exercise.name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Exercise Animation/Image Placeholder */}
          <View style={styles.animationContainer}>
            <View style={styles.animationPlaceholder}>
              <Text style={styles.animationText}>Exercise Animation</Text>
              <Text style={styles.animationSubtext}>Coming Soon</Text>
            </View>
          </View>

          {/* Exercise Information */}
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Primary muscles</Text>
              <Text style={styles.infoValue}>{exercise.primaryMuscleGroup}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Secondary muscles</Text>
              <Text style={styles.infoValue}>
                {formatMuscleGroups(exercise.secondaryMuscleGroups)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Equipment</Text>
              <Text style={styles.infoValue}>{exercise.equipment}</Text>
            </View>

            {exercise.difficulty && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Difficulty</Text>
                <Text style={styles.infoValue}>{exercise.difficulty}</Text>
              </View>
            )}

            {exercise.movementPattern && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Movement Pattern</Text>
                <Text style={styles.infoValue}>{exercise.movementPattern}</Text>
              </View>
            )}
          </View>

          {/* Execution Instructions */}
          {exercise.executionCues && (
            <View style={styles.instructionsSection}>
              <Text style={styles.sectionTitle}>Execution Instructions</Text>
              <Text style={styles.instructionsText}>
                {formatExecutionCues(exercise.executionCues)}
              </Text>
            </View>
          )}

          {/* Common Mistakes */}
          {exercise.commonMistakes && exercise.commonMistakes.length > 0 && (
            <View style={styles.mistakesSection}>
              <Text style={styles.sectionTitle}>Common Mistakes</Text>
              {exercise.commonMistakes.map((mistake, index) => (
                <View key={index} style={styles.mistakeItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.mistakeText}>{mistake}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Contraindications */}
          {exercise.contraindications && exercise.contraindications.length > 0 && (
            <View style={styles.contraindicationsSection}>
              <Text style={styles.sectionTitle}>Contraindications</Text>
              {exercise.contraindications.map((contraindication, index) => (
                <View key={index} style={styles.contraindicationItem}>
                  <Text style={styles.bulletPoint}>•</Text>
                  <Text style={styles.contraindicationText}>{contraindication}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Keystone Exercise Badge */}
          {exercise.isKeystone && (
            <View style={styles.keystoneBadge}>
              <Text style={styles.keystoneText}>⭐ Keystone Exercise</Text>
              <Text style={styles.keystoneDescription}>
                This is a fundamental exercise that forms the foundation of strength training
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'center',
    marginRight: 24, // Account for close button width
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  animationContainer: {
    height: 200,
    backgroundColor: Colors.light.card,
    margin: 20,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  animationPlaceholder: {
    alignItems: 'center',
  },
  animationText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  animationSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  infoSection: {
    backgroundColor: Colors.light.card,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  infoLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    flex: 1,
    textAlign: 'right',
  },
  instructionsSection: {
    backgroundColor: Colors.light.card,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    lineHeight: 24,
  },
  mistakesSection: {
    backgroundColor: Colors.light.card,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  mistakeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.error,
    marginRight: 8,
    marginTop: 2,
  },
  mistakeText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  contraindicationsSection: {
    backgroundColor: Colors.light.card,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  contraindicationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  contraindicationText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    flex: 1,
    lineHeight: 22,
  },
  keystoneBadge: {
    backgroundColor: Colors.light.primaryLight,
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.light.primary,
  },
  keystoneText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  keystoneDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.primary,
    lineHeight: 20,
  },
});