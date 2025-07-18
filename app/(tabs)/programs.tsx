import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout, Workout } from '@/contexts/WorkoutContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { useAuth } from '@/data/AuthContext';
import WorkoutHistoryItem from '@/components/WorkoutHistoryItem';

export default function ProgramsScreen() {
  const { programs, currentProgram, setCurrentProgram } = useWorkout();
  const { user } = useAuth();
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasActiveProgram, setHasActiveProgram] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleProgramPress = (program: any) => {
    setCurrentProgram(program);
    router.push({
      pathname: '/program-detail',
      params: { programId: program.id }
    });
  };

  const handleCreateProgram = () => {
    router.push('/create-program');
  };

  React.useEffect(() => {
    if (user) {
      loadWorkoutHistory();
      checkActiveProgram();
    }
  }, [user]);

  const checkActiveProgram = () => {
    // Check if user has an active program set
    setHasActiveProgram(!!currentProgram);
  };

  const loadWorkoutHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const history = await WorkoutHistoryService.getWorkoutHistory(user.id, 10);
      setWorkoutHistory(history);
    } catch (error) {
      console.error('Failed to load workout history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProgram = async (program: any) => {
    try {
      await setCurrentProgram(program);
      setHasActiveProgram(true);
      Alert.alert('Program Selected', `${program.name} is now your active program!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to set active program. Please try again.');
    }
  };

  const handleProgramChangeRequest = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmProgramChange = () => {
    setShowConfirmModal(false);
    setHasActiveProgram(false);
    // Here we would archive the current program instead of deleting it
    // For now, we'll just set hasActiveProgram to false to show the program selection
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const ProgramCard = ({ program }: { program: any }) => (
    <TouchableOpacity 
      style={styles.programCard} 
      onPress={() => handleProgramPress(program)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: program.imageUrl }} style={styles.programImage} />
      <View style={styles.programContent}>
        <View style={styles.programHeader}>
          <Text style={styles.programName}>{program.name}</Text>
          <Text style={styles.programCreator}>{program.creator}</Text>
        </View>
        
        <View style={styles.programDays}>
          {program.workouts.slice(0, 3).map((workout: any, index: number) => (
            <View key={index} style={styles.dayTag}>
              <Text style={styles.dayTagText}>{workout.name}</Text>
            </View>
          ))}
          {program.workouts.length > 3 && (
            <View style={styles.dayTag}>
              <Text style={styles.dayTagText}>+{program.workouts.length - 3}</Text>
            </View>
          )}
        </View>

        <View style={styles.programStats}>
          <Text style={styles.statText}>{program.workouts.length} workouts</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Conditional Rendering Based on Active Program Status */}
        {hasActiveProgram ? (
          /* Condition B: Show Active Program Details */
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Program</Text>
              <TouchableOpacity 
                style={styles.changeProgramButton}
                onPress={handleProgramChangeRequest}
              >
                <Text style={styles.changeProgramText}>Change Program</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.activeProgramContainer}>
              {currentProgram && <ProgramCard program={currentProgram} />}
            </View>
          </>
        ) : (
          /* Condition A: Show Program Selection */
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Choose Your Program</Text>
            </View>
            
            <View style={styles.programList}>
              {programs.map((program) => (
                <TouchableOpacity
                  key={program.id}
                  onPress={() => handleSelectProgram(program)}
                  activeOpacity={0.8}
                >
                  <ProgramCard program={program} />
                </TouchableOpacity>
              ))}
              
              <TouchableOpacity 
                style={styles.createButton} 
                onPress={handleCreateProgram}
                activeOpacity={0.8}
              >
                <Plus size={24} color={Colors.light.primary} />
                <Text style={styles.createButtonText}>Create Your Own Program</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Visual Divider */}
        <View style={styles.divider} />
        
        {/* Workout History Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workout History</Text>
        </View>
        
        <View style={styles.historyContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.light.primary} style={styles.loader} />
          ) : workoutHistory.length > 0 ? (
            workoutHistory.map((log: any) => (
              <WorkoutHistoryItem 
                key={log.id}
                workout={log}
                onEdit={(workout) => {
                  // Handle edit functionality
                  Alert.alert(
                    'Edit Workout',
                    `You'll be able to edit "${workout.workout_name}" in a future update.`
                  );
                }}
              />
            ))
          ) : (
            <View style={styles.emptyHistoryContainer}>
              <Text style={styles.emptyHistoryText}>No workout history yet</Text>
              <Text style={styles.emptyHistorySubtext}>
                Complete a workout to see it here
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Program Change Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Program Change</Text>
            <Text style={styles.modalText}>
              Are you sure? Your custom workouts and progress for the current program will be archived. You can restore it later.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalCancelButton]} 
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalConfirmButton]} 
                onPress={handleConfirmProgramChange}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  changeProgramButton: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  changeProgramText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
  activeProgramContainer: {
    marginBottom: 8
  },
  noProgramContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16
  },
  noProgramText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginBottom: 12
  },
  selectProgramButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16
  },
  selectProgramButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF'
  },
  programList: {
    paddingBottom: 40,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 24,
    marginHorizontal: 16,
  },
  programCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  programImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  programContent: {
    padding: 16,
  },
  programHeader: {
    marginBottom: 12,
  },
  programName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  programCreator: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  programDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  dayTag: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  dayTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
  programStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  createButton: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: 'dashed',
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
    marginLeft: 8,
  },
  historyContainer: {
    marginBottom: 24
  },
  historyItem: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  historyItemContent: {
    flex: 1
  },
  historyItemTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4
  },
  historyItemDetails: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  historyItemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  historyItemDetailText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginLeft: 4
  },
  emptyHistoryContainer: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center'
  },
  emptyHistoryText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4
  },
  emptyHistorySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary
  },
  loader: {
    padding: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: Colors.light.border,
    marginRight: 8,
  },
  modalConfirmButton: {
    backgroundColor: Colors.light.primary,
    marginLeft: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textSecondary,
  },
  modalConfirmText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});