import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Clock, Edit } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { WorkoutLogEntry } from '@/services/workoutLogService';
import { router } from 'expo-router';

interface WorkoutHistoryItemProps {
  workout: WorkoutLogEntry;
  onEdit: (workout: WorkoutLogEntry) => void;
}

const WorkoutHistoryItem = ({ workout, onEdit }: WorkoutHistoryItemProps) => {
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

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => {
        // View workout details (could navigate to a detail screen)
      }}
    >
      <View style={styles.content}>
        <Text style={styles.title}>{workout.workout_name}</Text>
        <View style={styles.details}>
          <View style={styles.detail}>
            <Calendar size={14} color={Colors.light.textTertiary} />
            <Text style={styles.detailText}>
              {formatDate(workout.completed_at)}
            </Text>
          </View>
          <View style={styles.detail}>
            <Clock size={14} color={Colors.light.textTertiary} />
            <Text style={styles.detailText}>
              {formatDuration(workout.duration_seconds)}
            </Text>
          </View>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => onEdit(workout)}
      >
        <Edit size={16} color={Colors.light.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  content: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4
  },
  details: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginLeft: 4
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default WorkoutHistoryItem;