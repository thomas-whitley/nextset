import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell, ChevronRight } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { useWorkout } from '@/contexts/WorkoutContext';
import { WorkoutHistoryEntry, WorkoutHistoryService } from '@/services/workoutHistoryService';
import { Program } from '@/services/exercise.types';
import { useAuth } from '@/data/AuthContext';
import WorkoutHistoryItem from '@/components/WorkoutHistoryItem';

function ProgramCard({ program, onPress, busy }: { program: Program; onPress: () => void; busy?: boolean }) {
  const dayNames = program.workouts.slice(0, 4).map((w) => w.name);
  const extra = program.workouts.length - dayNames.length;
  return (
    <TouchableOpacity
      style={styles.programCard}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${program.name}, ${program.workouts.length} workouts`}
    >
      <View style={styles.programBanner}>
        <Dumbbell size={22} color="#FFFFFF" />
        <Text style={styles.programBannerText}>{program.schedule ?? `${program.workouts.length} workouts`}</Text>
      </View>
      <View style={styles.programContent}>
        <Text style={styles.programName}>{program.name}</Text>
        <Text style={styles.programDescription} numberOfLines={2}>{program.description}</Text>
        <View style={styles.programDays}>
          {dayNames.map((name, i) => (
            <View key={`${name}-${i}`} style={styles.dayTag}>
              <Text style={styles.dayTagText}>{name}</Text>
            </View>
          ))}
          {extra > 0 && (
            <View style={styles.dayTag}>
              <Text style={styles.dayTagText}>+{extra}</Text>
            </View>
          )}
        </View>
        <View style={styles.programFooter}>
          <Text style={styles.statText}>
            {program.workouts.length} {program.workouts.length === 1 ? 'workout' : 'workouts'}
          </Text>
          {busy ? <ActivityIndicator size="small" color={Colors.light.primary} /> : <ChevronRight size={18} color={Colors.light.textTertiary} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ProgramsScreen() {
  const { programs, currentProgram, isLoadingProgram, setCurrentProgram, clearCurrentProgram } = useWorkout();
  const { user } = useAuth();
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChoosing, setIsChoosing] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const loadWorkoutHistory = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      setWorkoutHistory(await WorkoutHistoryService.getWorkoutHistory(user.id, 10));
    } catch (error) {
      console.error('Failed to load workout history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadWorkoutHistory();
    }, [loadWorkoutHistory])
  );

  const handleSelectProgram = async (program: Program) => {
    setSelecting(program.id);
    try {
      await setCurrentProgram(program);
      setIsChoosing(false);
    } catch (error) {
      Alert.alert('Could not select program', 'Check your connection and try again.');
    } finally {
      setSelecting(null);
    }
  };

  const handleConfirmProgramChange = () => {
    setShowConfirmModal(false);
    clearCurrentProgram();
    setIsChoosing(true);
  };

  const showPicker = isChoosing || (!currentProgram && !isLoadingProgram);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Programs</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {isLoadingProgram ? (
          <ActivityIndicator color={Colors.light.primary} style={styles.loader} />
        ) : showPicker ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Choose a program</Text>
            </View>
            {isChoosing && <Text style={styles.sectionHint}>Your edits to previous programs are kept.</Text>}
            <View style={styles.programList}>
              {programs.map((program) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  busy={selecting === program.id}
                  onPress={() => handleSelectProgram(program)}
                />
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active program</Text>
              <TouchableOpacity
                style={styles.changeProgramButton}
                onPress={() => setShowConfirmModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Change program"
              >
                <Text style={styles.changeProgramText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activeProgramContainer}>
              {currentProgram && <ProgramCard program={currentProgram} onPress={() => router.push('/program-detail')} />}
              <Text style={styles.sectionHint}>Tap the program to see its workouts, reorder days, or start one.</Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>History</Text>
        </View>
        <View style={styles.historyContainer}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.light.primary} style={styles.loader} />
          ) : workoutHistory.length > 0 ? (
            workoutHistory.map((row) => <WorkoutHistoryItem key={row.id} workout={row} />)
          ) : (
            <View style={styles.emptyHistoryContainer}>
              <Text style={styles.emptyHistoryText}>No workouts logged yet</Text>
              <Text style={styles.emptyHistorySubtext}>Finish a workout and it shows here.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change program?</Text>
            <Text style={styles.modalText}>
              Pick a different template. Exercises you added to this program are kept, and choosing it again restores them.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalButton, styles.modalCancelButton]} onPress={() => setShowConfirmModal(false)} accessibilityRole="button">
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalConfirmButton]} onPress={handleConfirmProgramChange} accessibilityRole="button">
                <Text style={styles.modalConfirmText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  title: { fontSize: 28, fontFamily: 'Inter-Bold', color: Colors.light.text },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  loader: { marginVertical: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.light.text },
  sectionHint: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.light.textTertiary, marginBottom: 12, lineHeight: 18 },
  changeProgramButton: { backgroundColor: Colors.light.primaryLight, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 14 },
  changeProgramText: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: Colors.light.primary },
  activeProgramContainer: { marginBottom: 8 },
  programList: { gap: 12 },
  programCard: { backgroundColor: Colors.light.card, borderRadius: 16, overflow: 'hidden', marginBottom: 4, ...shadow },
  programBanner: {
    backgroundColor: '#141517',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  programBannerText: { fontSize: 13, fontFamily: 'Inter-Medium', color: '#EEF0ED' },
  programContent: { padding: 16 },
  programName: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.light.text, marginBottom: 4 },
  programDescription: { fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.light.textSecondary, lineHeight: 20, marginBottom: 12 },
  programDays: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  dayTag: { backgroundColor: Colors.light.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  dayTagText: { fontSize: 12, fontFamily: 'Inter-Medium', color: Colors.light.primary },
  programFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statText: { fontSize: 13, fontFamily: 'Inter-Medium', color: Colors.light.textTertiary },
  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: 24 },
  historyContainer: { marginBottom: 8 },
  emptyHistoryContainer: { backgroundColor: Colors.light.card, borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyHistoryText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: Colors.light.text, marginBottom: 4 },
  emptyHistorySubtext: { fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.light.textTertiary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: Colors.light.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontFamily: 'Inter-Bold', color: Colors.light.text, marginBottom: 12 },
  modalText: { fontSize: 15, fontFamily: 'Inter-Regular', color: Colors.light.textSecondary, lineHeight: 22, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalCancelButton: { backgroundColor: Colors.light.border },
  modalConfirmButton: { backgroundColor: Colors.light.primary },
  modalCancelText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: Colors.light.textSecondary },
  modalConfirmText: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: '#FFFFFF' },
});
