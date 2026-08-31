import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dumbbell, ChevronRight } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, elevation, type, HIT_SLOP } from '@/constants/theme';
import { useWorkout } from '@/contexts/WorkoutContext';
import { WorkoutHistoryEntry, WorkoutHistoryService } from '@/services/workoutHistoryService';
import { Program } from '@/services/exercise.types';
import { useAuth } from '@/data/AuthContext';
import WorkoutHistoryItem from '@/components/WorkoutHistoryItem';

function ProgramCard({
  program,
  onPress,
  busy,
  active,
}: {
  program: Program;
  onPress: () => void;
  busy?: boolean;
  /** Only the current program gets the loud rubber-slab treatment. */
  active?: boolean;
}) {
  const dayNames = program.workouts.slice(0, 4).map((w) => w.name);
  const extra = program.workouts.length - dayNames.length;
  return (
    <TouchableOpacity
      style={[styles.programCard, active ? styles.programCardActive : styles.programCardQuiet]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${program.name}, ${program.workouts.length} workouts`}
    >
      <View style={[styles.programBanner, active ? styles.programBannerActive : styles.programBannerQuiet]}>
        <Dumbbell size={22} color={active ? Colors.light.onRubber : Colors.light.primary} />
        <Text style={[styles.programBannerText, active ? styles.onSlabText : styles.programBannerTextQuiet]}>
          {program.schedule ?? `${program.workouts.length} workouts`}
        </Text>
      </View>
      <View style={styles.programContent}>
        <Text style={[styles.programName, active && styles.onSlabText]}>{program.name}</Text>
        <Text style={[styles.programDescription, active && styles.onSlabMuted]} numberOfLines={2}>
          {program.description}
        </Text>
        <View style={styles.programDays}>
          {dayNames.map((name, i) => (
            <View key={`${name}-${i}`} style={[styles.dayTag, active && styles.dayTagActive]}>
              <Text style={[styles.dayTagText, active && styles.onSlabText]}>{name}</Text>
            </View>
          ))}
          {extra > 0 && (
            <View style={[styles.dayTag, active && styles.dayTagActive]}>
              <Text style={[styles.dayTagText, active && styles.onSlabText]}>+{extra}</Text>
            </View>
          )}
        </View>
        <View style={styles.programFooter}>
          <Text style={[styles.statText, active && styles.onSlabMuted]}>
            {program.workouts.length} {program.workouts.length === 1 ? 'workout' : 'workouts'}
          </Text>
          {busy ? (
            <ActivityIndicator size="small" color={active ? Colors.light.onRubber : Colors.light.primary} />
          ) : (
            <ChevronRight size={18} color={active ? Colors.light.onRubberSecondary : Colors.light.textTertiary} />
          )}
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
                hitSlop={HIT_SLOP}
              >
                <Text style={styles.changeProgramText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.activeProgramContainer}>
              {currentProgram && <ProgramCard program={currentProgram} onPress={() => router.push('/program-detail')} active />}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.base },
  title: { ...type.title, color: Colors.light.text },
  content: { flex: 1 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  loader: { marginVertical: spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.xs },
  sectionTitle: { ...type.section, color: Colors.light.text },
  sectionHint: { ...type.label, color: Colors.light.textTertiary, marginBottom: spacing.md },
  changeProgramButton: { backgroundColor: Colors.light.primaryLight, borderRadius: radius.pill, paddingVertical: spacing.sm - 2, paddingHorizontal: spacing.md + 2 },
  changeProgramText: { ...type.label, color: Colors.light.primary },
  activeProgramContainer: { marginBottom: spacing.sm },
  programList: { gap: spacing.md },

  // Program card — active gets the rubber-slab treatment (same idiom as
  // Home's "up next" card); other cards stay white and quiet.
  programCard: { overflow: 'hidden', marginBottom: spacing.xs },
  programCardActive: { backgroundColor: Colors.light.rubber, borderRadius: radius.slab, ...elevation.slab },
  programCardQuiet: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border },
  programBanner: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  programBannerActive: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderOnRubber },
  programBannerQuiet: { backgroundColor: Colors.light.primaryLight },
  programBannerText: { ...type.label, fontVariant: ['tabular-nums'] },
  programBannerTextQuiet: { color: Colors.light.primary },
  programContent: { padding: spacing.base },
  programName: { ...type.section, color: Colors.light.text, marginBottom: spacing.xs },
  programDescription: { ...type.body, color: Colors.light.textSecondary, marginBottom: spacing.md },
  programDays: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm - 2, marginBottom: spacing.md },
  dayTag: { backgroundColor: Colors.light.primaryLight, borderRadius: radius.input, paddingHorizontal: spacing.sm + 2, paddingVertical: spacing.xs },
  dayTagActive: { backgroundColor: Colors.light.slabField },
  dayTagText: { ...type.label, color: Colors.light.primary, fontVariant: ['tabular-nums'] },
  programFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statText: { ...type.label, color: Colors.light.textTertiary, fontVariant: ['tabular-nums'] },

  // Shared "text/icon sitting on the rubber slab" overrides.
  onSlabText: { color: Colors.light.onRubber },
  onSlabMuted: { color: Colors.light.onRubberSecondary },

  divider: { height: 1, backgroundColor: Colors.light.border, marginVertical: spacing.xl },
  historyContainer: { marginBottom: spacing.sm },
  emptyHistoryContainer: { backgroundColor: Colors.light.card, borderRadius: radius.card, padding: spacing.xl, alignItems: 'center' },
  emptyHistoryText: { ...type.section, color: Colors.light.text, marginBottom: spacing.xs },
  emptyHistorySubtext: { ...type.body, color: Colors.light.textTertiary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.lg },
  modalContent: { backgroundColor: Colors.light.card, borderRadius: radius.slab, padding: spacing.xl, width: '100%', maxWidth: 400 },
  modalTitle: { ...type.section, color: Colors.light.text, marginBottom: spacing.md },
  modalText: { ...type.body, color: Colors.light.textSecondary, marginBottom: spacing.lg },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  modalButton: { flex: 1, paddingVertical: spacing.base, borderRadius: radius.card, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  modalCancelButton: { backgroundColor: Colors.light.border },
  modalConfirmButton: { backgroundColor: Colors.light.primary },
  modalCancelText: { ...type.section, color: Colors.light.textSecondary },
  modalConfirmText: { ...type.section, color: '#FFFFFF' },
});
