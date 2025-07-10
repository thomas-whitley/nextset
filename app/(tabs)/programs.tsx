import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Calendar, Clock } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';
import { WorkoutLogService } from '@/services/workoutLogService';
import { useAuth } from '@/data/AuthContext';

export default function ProgramsScreen() {
  const { programs, currentProgram, setCurrentProgram } = useWorkout();
  const { user } = useAuth();
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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
    }
  }, [user]);

  const loadWorkoutHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const history = await WorkoutLogService.getWorkoutHistory(user.id, 10);
      setWorkoutHistory(history);
    } catch (error) {
      console.error('Failed to load workout history:', error);
    } finally {
      setIsLoading(false);
    }
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
        {/* Active Program Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Program</Text>
        </View>
        
        <View style={styles.activeProgramContainer}>
          {currentProgram ? (
            <ProgramCard program={currentProgram} />
          ) : (
            <View style={styles.noProgramContainer}>
              <Text style={styles.noProgramText}>No active program selected</Text>
              <TouchableOpacity 
                style={styles.selectProgramButton}
                onPress={() => {}}
              >
                <Text style={styles.selectProgramButtonText}>Select Program</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
        {/* All Programs Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>All Programs</Text>
        </View>
        
        <View style={styles.programList}>
          {programs.map((program) => (
            <ProgramCard key={program.id} program={program} />
          ))}
          
          <TouchableOpacity 
            style={styles.createButton} 
            onPress={handleCreateProgram}
            activeOpacity={0.8}
          >
            <Plus size={24} color={Colors.light.primary} />
            <Text style={styles.createButtonText}>Create New Program</Text>
          </TouchableOpacity>
        </View>
        
        {/* Workout History Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workout History</Text>
        </View>
        
        <View style={styles.historyContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.light.primary} style={styles.loader} />
          ) : workoutHistory.length > 0 ? (
            workoutHistory.map((log: any) => (
              <TouchableOpacity 
                key={log.id} 
                style={styles.historyItem}
                onPress={() => {}}
              >
                <View style={styles.historyItemContent}>
                  <Text style={styles.historyItemTitle}>{log.workout_name}</Text>
                  <View style={styles.historyItemDetails}>
                    <View style={styles.historyItemDetail}>
                      <Calendar size={14} color={Colors.light.textTertiary} />
                      <Text style={styles.historyItemDetailText}>
                        {formatDate(log.completed_at)}
                      </Text>
                    </View>
                    <View style={styles.historyItemDetail}>
                      <Clock size={14} color={Colors.light.textTertiary} />
                      <Text style={styles.historyItemDetailText}>
                        {formatDuration(log.duration_seconds)}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
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
    color: Colors.light.text
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
});