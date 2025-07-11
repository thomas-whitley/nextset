import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, Download, ChevronLeft, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';
import { supabase } from '@/data/supabase-client';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface WorkoutCalendarViewProps {
  visible: boolean;
  onClose: () => void;
}

interface WorkoutEntry {
  id: string;
  workout_name: string;
  completed_at: string;
  duration_seconds: number;
  workout_data: any;
}

interface ScheduledWorkout {
  id: string;
  workout_name: string;
  scheduled_date: string;
  program_name?: string;
}

export default function WorkoutCalendarView({ visible, onClose }: WorkoutCalendarViewProps) {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [completedWorkouts, setCompletedWorkouts] = useState<WorkoutEntry[]>([]);
  const [scheduledWorkouts, setScheduledWorkouts] = useState<ScheduledWorkout[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutEntry | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadWorkoutData();
    }
  }, [visible, user]);

  const loadWorkoutData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Load completed workouts from exercise_log
      const { data: completed, error: completedError } = await supabase
        .from('exercise_log')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (completedError) {
        console.error('Error loading completed workouts:', completedError);
      } else {
        setCompletedWorkouts(completed || []);
      }

      // Load scheduled workouts (placeholder - you can implement this table later)
      // For now, we'll create some mock scheduled workouts
      const mockScheduled: ScheduledWorkout[] = [
        {
          id: '1',
          workout_name: 'Push Day',
          scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          program_name: '5-Day Split'
        },
        {
          id: '2',
          workout_name: 'Pull Day',
          scheduled_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          program_name: '5-Day Split'
        }
      ];
      setScheduledWorkouts(mockScheduled);

    } catch (error) {
      console.error('Error loading workout data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getDateString = (day: number) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, day).toISOString().split('T')[0];
  };

  const hasCompletedWorkout = (day: number) => {
    const dateString = getDateString(day);
    return completedWorkouts.some(workout => 
      workout.completed_at.split('T')[0] === dateString
    );
  };

  const hasScheduledWorkout = (day: number) => {
    const dateString = getDateString(day);
    return scheduledWorkouts.some(workout => 
      workout.scheduled_date.split('T')[0] === dateString
    );
  };

  const getWorkoutForDate = (day: number) => {
    const dateString = getDateString(day);
    return completedWorkouts.find(workout => 
      workout.completed_at.split('T')[0] === dateString
    );
  };

  const handleDatePress = (day: number) => {
    const dateString = getDateString(day);
    const workout = getWorkoutForDate(day);
    
    if (workout) {
      setSelectedDate(dateString);
      setSelectedWorkout(workout);
    }
  };

  const generateICSFile = async () => {
    try {
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Momentum Gym App//Workout Schedule//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH'
      ];

      scheduledWorkouts.forEach(workout => {
        const startDate = new Date(workout.scheduled_date);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration
        
        const formatDate = (date: Date) => {
          return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        };

        icsContent.push(
          'BEGIN:VEVENT',
          `UID:${workout.id}@momentum-gym-app.com`,
          `DTSTART:${formatDate(startDate)}`,
          `DTEND:${formatDate(endDate)}`,
          `SUMMARY:${workout.workout_name}`,
          `DESCRIPTION:Scheduled workout: ${workout.workout_name}${workout.program_name ? ` (${workout.program_name})` : ''}`,
          'STATUS:CONFIRMED',
          'SEQUENCE:0',
          'END:VEVENT'
        );
      });

      icsContent.push('END:VCALENDAR');

      const icsString = icsContent.join('\r\n');
      const fileName = 'momentum_workout_schedule.ics';
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, icsString);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/calendar',
          dialogTitle: 'Export Workout Schedule'
        });
      } else {
        Alert.alert('Export Complete', 'Workout schedule has been saved to your device.');
      }
    } catch (error) {
      console.error('Error generating ICS file:', error);
      Alert.alert('Export Failed', 'Unable to export workout schedule. Please try again.');
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Workout Calendar</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={generateICSFile} style={styles.downloadButton}>
              <Download size={20} color={Colors.light.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.content}>
          {/* Calendar Navigation */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => navigateMonth('prev')}>
              <ChevronLeft size={24} color={Colors.light.primary} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={() => navigateMonth('next')}>
              <ChevronRight size={24} color={Colors.light.primary} />
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaders}>
            {dayNames.map(day => (
              <Text key={day} style={styles.dayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {getDaysInMonth(currentDate).map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  day === null && styles.emptyDay,
                  hasCompletedWorkout(day!) && styles.completedDay,
                  hasScheduledWorkout(day!) && styles.scheduledDay
                ]}
                onPress={() => day && handleDatePress(day)}
                disabled={day === null}
              >
                {day && (
                  <>
                    <Text style={[
                      styles.dayText,
                      hasCompletedWorkout(day) && styles.completedDayText,
                      hasScheduledWorkout(day) && styles.scheduledDayText
                    ]}>
                      {day}
                    </Text>
                    {hasCompletedWorkout(day) && (
                      <View style={styles.completedIndicator} />
                    )}
                    {hasScheduledWorkout(day) && (
                      <View style={styles.scheduledIndicator} />
                    )}
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.light.success }]} />
              <Text style={styles.legendText}>Completed Workout</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: Colors.light.primary }]} />
              <Text style={styles.legendText}>Scheduled Workout</Text>
            </View>
          </View>

          {/* Workout Details Modal */}
          {selectedWorkout && (
            <View style={styles.workoutDetails}>
              <Text style={styles.workoutDetailsTitle}>
                {new Date(selectedDate!).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
              <View style={styles.workoutSummary}>
                <Text style={styles.workoutName}>{selectedWorkout.workout_name}</Text>
                <Text style={styles.workoutDuration}>
                  Duration: {formatDuration(selectedWorkout.duration_seconds)}
                </Text>
                <Text style={styles.exerciseCount}>
                  Exercises: {selectedWorkout.workout_data?.exercises?.length || 0}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.closeDetailsButton}
                onPress={() => {
                  setSelectedDate(null);
                  setSelectedWorkout(null);
                }}
              >
                <Text style={styles.closeDetailsText}>Close</Text>
              </TouchableOpacity>
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
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadButton: {
    marginRight: 16,
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  monthTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.light.border,
    position: 'relative',
  },
  emptyDay: {
    backgroundColor: Colors.light.background,
  },
  completedDay: {
    backgroundColor: Colors.light.success + '20',
  },
  scheduledDay: {
    backgroundColor: Colors.light.primary + '20',
  },
  dayText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
  },
  completedDayText: {
    color: Colors.light.success,
    fontFamily: 'Inter-Bold',
  },
  scheduledDayText: {
    color: Colors.light.primary,
    fontFamily: 'Inter-Bold',
  },
  completedIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.success,
  },
  scheduledIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.primary,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    marginTop: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  workoutDetails: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginBottom: 40,
  },
  workoutDetailsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  workoutSummary: {
    marginBottom: 16,
  },
  workoutName: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
    marginBottom: 8,
  },
  workoutDuration: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  exerciseCount: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
  },
  closeDetailsButton: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  closeDetailsText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.primary,
  },
});