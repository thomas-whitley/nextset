import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw, X, Settings, Clock, Zap, Plus, Minus, Save } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';
import { useTimer } from '@/contexts/TimerContext';
import { TimerPresetService, TimerPreset, TimerPresetData, TimerExercise } from '@/services/timerPresetService';
import { useAuth } from '@/data/AuthContext';

type TimerMode = 'stopwatch' | 'master' | 'preset';

export default function TimerScreen() {
  const params = useLocalSearchParams();
  const { 
    time, 
    isRunning, 
    mode, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    setMode: setTimerMode,
    setInitialTime 
  } = useTimer();
  
  const { user } = useAuth();
  const [currentMode, setCurrentMode] = useState<TimerMode>('stopwatch');
  const [showPresets, setShowPresets] = useState(false);
  const [showMasterConfig, setShowMasterConfig] = useState(false);
  const [showCreatePreset, setShowCreatePreset] = useState(false);
  const [presets, setPresets] = useState<TimerPreset[]>([]);
  const [currentPreset, setCurrentPreset] = useState<TimerPreset | null>(null);
  
  // Master Timer Configuration
  const [masterConfig, setMasterConfig] = useState<TimerPresetData>({
    type: 'circuit',
    exercises: [
      { name: 'Exercise 1', workTime: 30, restTime: 15 },
    ],
    sets: 3,
    setRestTime: 60,
    circuits: 1,
    circuitRestTime: 120,
  });

  // Timer State
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [currentCircuit, setCurrentCircuit] = useState(1);
  const [isWorkPhase, setIsWorkPhase] = useState(true);
  const [isSetRest, setIsSetRest] = useState(false);
  const [isCircuitRest, setIsCircuitRest] = useState(false);

  const contextExercise = params.contextExercise as string;
  const isRestMode = params.mode === 'rest';
  const initialDuration = params.duration ? parseInt(params.duration as string) : 60;

  useEffect(() => {
    loadPresets();
    
    if (isRestMode) {
      setCurrentMode('stopwatch');
      setTimerMode('countdown');
      setInitialTime(initialDuration);
      startTimer();
    }
  }, [isRestMode, initialDuration]);

  const loadPresets = async () => {
    try {
      const loadedPresets = await TimerPresetService.getTimerPresets(user?.id);
      setPresets(loadedPresets);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggleTimer = () => {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const handleClose = () => {
    resetTimer();
    router.back();
  };

  const handleModeChange = (mode: TimerMode) => {
    setCurrentMode(mode);
    resetTimer();
    
    if (mode === 'stopwatch') {
      setTimerMode('stopwatch');
      setInitialTime(0);
    }
  };

  const handlePresetSelect = (preset: TimerPreset) => {
    setCurrentPreset(preset);
    setMasterConfig(preset.preset_data);
    setCurrentMode('master');
    setShowPresets(false);
    resetMasterTimer();
  };

  const resetMasterTimer = () => {
    setCurrentExerciseIndex(0);
    setCurrentSet(1);
    setCurrentCircuit(1);
    setIsWorkPhase(true);
    setIsSetRest(false);
    setIsCircuitRest(false);
    
    if (masterConfig.exercises.length > 0) {
      const firstExercise = masterConfig.exercises[0];
      setTimerMode('countdown');
      setInitialTime(firstExercise.workTime);
    }
  };

  const startMasterTimer = () => {
    if (masterConfig.exercises.length === 0) return;
    
    resetMasterTimer();
    setTimerMode('countdown');
    setInitialTime(masterConfig.exercises[0].workTime);
    startTimer();
  };

  const updateMasterConfig = (field: keyof TimerPresetData, value: any) => {
    setMasterConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateExercise = (index: number, field: keyof TimerExercise, value: any) => {
    const updatedExercises = [...masterConfig.exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setMasterConfig(prev => ({ ...prev, exercises: updatedExercises }));
  };

  const addExercise = () => {
    const newExercise: TimerExercise = {
      name: `Exercise ${masterConfig.exercises.length + 1}`,
      workTime: 30,
      restTime: 15,
    };
    setMasterConfig(prev => ({
      ...prev,
      exercises: [...prev.exercises, newExercise],
    }));
  };

  const removeExercise = (index: number) => {
    if (masterConfig.exercises.length <= 1) return;
    const updatedExercises = masterConfig.exercises.filter((_, i) => i !== index);
    setMasterConfig(prev => ({ ...prev, exercises: updatedExercises }));
  };

  const saveAsPreset = async () => {
    if (!user) {
      Alert.alert('Error', 'Please log in to save presets');
      return;
    }

    Alert.prompt(
      'Save Preset',
      'Enter a name for this timer preset:',
      async (presetName) => {
        if (presetName && presetName.trim()) {
          try {
            await TimerPresetService.createTimerPreset(
              user.id,
              presetName.trim(),
              masterConfig,
              false
            );
            Alert.alert('Success', 'Preset saved successfully!');
            loadPresets();
          } catch (error) {
            Alert.alert('Error', 'Failed to save preset');
          }
        }
      }
    );
  };

  const renderStopwatch = () => (
    <Pressable style={styles.timerContainer} onPress={handleToggleTimer}>
      <SafeAreaView style={styles.timerContent} edges={['top']}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close timer">
          <X size={24} color={Colors.light.onRubber} />
        </TouchableOpacity>

        <View style={styles.timerDisplay}>
          <Text style={styles.timerText}>{formatTime(time)}</Text>

          {!isRunning && (
            <View style={styles.controls}>
              <TouchableOpacity style={[styles.controlButton, styles.controlButtonPrimary]} onPress={handleToggleTimer} accessibilityRole="button" accessibilityLabel="Start">
                <Play size={32} color={Colors.light.card} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.controlButton} onPress={resetTimer} accessibilityRole="button" accessibilityLabel="Reset">
                <RotateCcw size={32} color={Colors.light.onRubber} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {contextExercise && (
          <View style={styles.contextBanner}>
            <Text style={styles.contextText}>Next: {contextExercise}</Text>
          </View>
        )}
      </SafeAreaView>
    </Pressable>
  );

  // Any rest phase is a caution state: yellow plate, rubber text on it.
  const isResting = isCircuitRest || isSetRest || !isWorkPhase;

  const renderMasterTimer = () => (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close timer">
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Master Timer</Text>
        <TouchableOpacity onPress={() => setShowMasterConfig(true)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Timer setup">
          <Settings size={24} color={Colors.light.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.masterTimerContent}>
        <View style={styles.currentExerciseCard}>
          <Text style={styles.currentExerciseTitle}>
            {masterConfig.exercises[currentExerciseIndex]?.name || 'No Exercise'}
          </Text>
          <View style={[styles.phasePill, isResting && styles.phasePillRest]}>
            <Text style={[styles.phaseText, isResting && styles.phaseTextRest]}>
              {isCircuitRest ? 'Circuit Rest' :
               isSetRest ? 'Set Rest' :
               isWorkPhase ? 'Work' : 'Rest'}
            </Text>
          </View>
          <Text style={styles.masterTimerText}>{formatTime(time)}</Text>
        </View>

        <View style={styles.progressInfo}>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Set</Text>
            <Text style={styles.progressValue}>{currentSet}/{masterConfig.sets}</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Circuit</Text>
            <Text style={styles.progressValue}>{currentCircuit}/{masterConfig.circuits}</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={styles.progressLabel}>Exercise</Text>
            <Text style={styles.progressValue}>
              {currentExerciseIndex + 1}/{masterConfig.exercises.length}
            </Text>
          </View>
        </View>

        <View style={styles.masterControls}>
          <TouchableOpacity
            style={styles.masterControlButton}
            onPress={startMasterTimer}
            accessibilityRole="button"
            accessibilityLabel="Start from the beginning"
          >
            <Play size={24} color={Colors.light.card} />
            <Text style={styles.masterControlText}>Start</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.masterControlButton, styles.pauseButton]}
            onPress={handleToggleTimer}
            accessibilityRole="button"
            accessibilityLabel={isRunning ? 'Pause' : 'Resume'}
          >
            {isRunning ? <Pause size={24} color={Colors.light.text} /> : <Play size={24} color={Colors.light.text} />}
            <Text style={[styles.masterControlText, styles.pauseButtonText]}>
              {isRunning ? 'Pause' : 'Resume'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.masterControlButton, styles.resetButton]}
            onPress={resetMasterTimer}
            accessibilityRole="button"
            accessibilityLabel="Reset"
          >
            <RotateCcw size={24} color={Colors.light.card} />
            <Text style={styles.masterControlText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );

  const renderModeSelector = () => (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close timer">
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timer</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, currentMode === 'stopwatch' && styles.modeButtonActive]}
          onPress={() => handleModeChange('stopwatch')}
        >
          <Clock size={32} color={currentMode === 'stopwatch' ? Colors.light.card : Colors.light.primary} />
          <Text style={[
            styles.modeButtonText,
            currentMode === 'stopwatch' && styles.modeButtonTextActive
          ]}>
            Stopwatch
          </Text>
          <Text style={[
            styles.modeButtonSubtext,
            currentMode === 'stopwatch' && styles.modeButtonSubtextActive
          ]}>
            Simple timer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, currentMode === 'master' && styles.modeButtonActive]}
          onPress={() => handleModeChange('master')}
        >
          <View style={styles.masterTimerIcon}>
            <Zap size={32} color={currentMode === 'master' ? Colors.light.card : Colors.light.primary} />
          </View>
          <Text style={[
            styles.modeButtonText,
            currentMode === 'master' && styles.modeButtonTextActive
          ]}>
            Master Timer
          </Text>
          <Text style={[
            styles.modeButtonSubtext,
            currentMode === 'master' && styles.modeButtonSubtextActive
          ]}>
            Advanced workout timer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.presetButton}
          onPress={() => setShowPresets(true)}
        >
          <Text style={styles.presetButtonText}>Load Preset Workout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // Master Timer Configuration Modal
  const renderMasterConfigModal = () => (
    <Modal visible={showMasterConfig} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Master Timer Setup</Text>
          <View style={styles.modalHeaderButtons}>
            <TouchableOpacity onPress={saveAsPreset} style={styles.saveButton} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Save as preset">
              <Save size={20} color={Colors.light.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowMasterConfig(false)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close setup">
              <X size={24} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.configContent}>
          {/* Exercises Configuration */}
          <View style={styles.configSection}>
            <Text style={styles.configSectionTitle}>Exercises</Text>
            {masterConfig.exercises.map((exercise, index) => (
              <View key={index} style={styles.exerciseConfig}>
                <View style={styles.exerciseHeader}>
                  <TextInput
                    style={styles.exerciseNameInput}
                    value={exercise.name}
                    onChangeText={(value) => updateExercise(index, 'name', value)}
                    placeholder="Exercise name"
                    placeholderTextColor={Colors.light.textTertiary}
                  />
                  {masterConfig.exercises.length > 1 && (
                    <TouchableOpacity onPress={() => removeExercise(index)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Remove exercise">
                      <X size={20} color={Colors.light.error} />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.timeControls}>
                  <View style={styles.timeControl}>
                    <Text style={styles.timeLabel}>Work Time</Text>
                    <View style={styles.timeAdjuster}>
                      <TouchableOpacity
                        style={styles.adjustButton}
                        hitSlop={HIT_SLOP}
                        onPress={() => updateExercise(index, 'workTime', Math.max(0, exercise.workTime - 5))}
                      >
                        <Minus size={20} color={Colors.light.primary} />
                      </TouchableOpacity>
                      <Text style={styles.timeValue}>{exercise.workTime}s</Text>
                      <TouchableOpacity
                        style={styles.adjustButton}
                        hitSlop={HIT_SLOP}
                        onPress={() => updateExercise(index, 'workTime', Math.min(180, exercise.workTime + 5))}
                      >
                        <Plus size={20} color={Colors.light.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.timeControl}>
                    <Text style={styles.timeLabel}>Rest Time</Text>
                    <View style={styles.timeAdjuster}>
                      <TouchableOpacity
                        style={styles.adjustButton}
                        hitSlop={HIT_SLOP}
                        onPress={() => updateExercise(index, 'restTime', Math.max(0, exercise.restTime - 5))}
                      >
                        <Minus size={20} color={Colors.light.primary} />
                      </TouchableOpacity>
                      <Text style={styles.timeValue}>{exercise.restTime}s</Text>
                      <TouchableOpacity
                        style={styles.adjustButton}
                        hitSlop={HIT_SLOP}
                        onPress={() => updateExercise(index, 'restTime', Math.min(180, exercise.restTime + 5))}
                      >
                        <Plus size={20} color={Colors.light.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
            
            <TouchableOpacity style={styles.addExerciseButton} onPress={addExercise}>
              <Plus size={20} color={Colors.light.primary} />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>

          {/* Sets Configuration */}
          <View style={styles.configSection}>
            <Text style={styles.configSectionTitle}>Sets</Text>
            <View style={styles.setConfig}>
              <View style={styles.timeControl}>
                <Text style={styles.timeLabel}>Number of Sets</Text>
                <View style={styles.timeAdjuster}>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    hitSlop={HIT_SLOP}
                    onPress={() => updateMasterConfig('sets', Math.max(1, masterConfig.sets - 1))}
                  >
                    <Minus size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{masterConfig.sets}</Text>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    hitSlop={HIT_SLOP}
                    onPress={() => updateMasterConfig('sets', masterConfig.sets + 1)}
                  >
                    <Plus size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.timeControl}>
                <Text style={styles.timeLabel}>Rest Between Sets</Text>
                <View style={styles.timeAdjuster}>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    hitSlop={HIT_SLOP}
                    onPress={() => updateMasterConfig('setRestTime', Math.max(0, masterConfig.setRestTime - 5))}
                  >
                    <Minus size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{masterConfig.setRestTime}s</Text>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    hitSlop={HIT_SLOP}
                    onPress={() => updateMasterConfig('setRestTime', Math.min(300, masterConfig.setRestTime + 5))}
                  >
                    <Plus size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Circuits Configuration */}
          <View style={styles.configSection}>
            <Text style={styles.configSectionTitle}>Circuits</Text>
            <View style={styles.setConfig}>
              <View style={styles.timeControl}>
                <Text style={styles.timeLabel}>Number of Circuits</Text>
                <View style={styles.timeAdjuster}>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    hitSlop={HIT_SLOP}
                    onPress={() => updateMasterConfig('circuits', Math.max(1, masterConfig.circuits - 1))}
                  >
                    <Minus size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{masterConfig.circuits}</Text>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    hitSlop={HIT_SLOP}
                    onPress={() => updateMasterConfig('circuits', masterConfig.circuits + 1)}
                  >
                    <Plus size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.timeControl}>
                <Text style={styles.timeLabel}>Rest Between Circuits</Text>
                <View style={styles.timeAdjuster}>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    hitSlop={HIT_SLOP}
                    onPress={() => updateMasterConfig('circuitRestTime', Math.max(0, masterConfig.circuitRestTime - 5))}
                  >
                    <Minus size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{masterConfig.circuitRestTime}s</Text>
                  <TouchableOpacity
                    style={styles.adjustButton}
                    hitSlop={HIT_SLOP}
                    onPress={() => updateMasterConfig('circuitRestTime', Math.min(300, masterConfig.circuitRestTime + 5))}
                  >
                    <Plus size={20} color={Colors.light.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  // Presets Modal
  const renderPresetsModal = () => (
    <Modal visible={showPresets} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer} edges={['top']}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Workout Presets</Text>
          <TouchableOpacity onPress={() => setShowPresets(false)} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Close presets">
            <X size={24} color={Colors.light.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.presetsContent}>
          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={styles.presetItem}
              onPress={() => handlePresetSelect(preset)}
            >
              <View style={styles.presetInfo}>
                <Text style={styles.presetName}>{preset.preset_name}</Text>
                <Text style={styles.presetDetails}>
                  {preset.preset_data.exercises.length} exercises • {preset.preset_data.sets} sets
                  {preset.is_public && ' • Public'}
                </Text>
              </View>
              <View style={styles.presetIcon}>
                <Zap size={20} color={Colors.light.primary} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  if (currentMode === 'stopwatch' && !showMasterConfig && !showPresets) {
    return renderStopwatch();
  }

  if (currentMode === 'master' && !showMasterConfig && !showPresets) {
    return renderMasterTimer();
  }

  return (
    <>
      {renderModeSelector()}
      {renderMasterConfigModal()}
      {renderPresetsModal()}
    </>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 4,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: { ...type.section, color: Colors.light.text },
  modeSelector: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xxxl },
  modeButton: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: Colors.light.border,
  },
  modeButtonActive: { backgroundColor: Colors.light.primary, borderColor: Colors.light.primary },
  masterTimerIcon: { marginBottom: spacing.sm },
  modeButtonText: { ...type.section, color: Colors.light.text, marginTop: spacing.base, marginBottom: spacing.sm },
  modeButtonTextActive: { color: Colors.light.card },
  modeButtonSubtext: { ...type.label, color: Colors.light.textTertiary, textAlign: 'center' },
  modeButtonSubtextActive: { color: Colors.light.primaryLight },
  presetButton: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: radius.card,
    paddingVertical: spacing.lg,
    minHeight: 44,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  presetButtonText: { ...type.bodyMedium, color: Colors.light.primary },

  // Full-screen stopwatch sits on the rubber slab.
  timerContainer: { flex: 1, backgroundColor: Colors.light.rubber },
  timerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.slabField,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerDisplay: { alignItems: 'center' },
  // Tabular numerals come with the token; the readout must not reflow each second.
  timerText: { ...type.display, color: Colors.light.onRubber, marginBottom: spacing.xxxl },
  controls: { flexDirection: 'row', alignItems: 'center' },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.slabField,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: spacing.base,
  },
  controlButtonPrimary: { backgroundColor: Colors.light.primary },
  contextBanner: {
    position: 'absolute',
    bottom: 100,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: Colors.light.slabField,
    borderRadius: radius.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  contextText: { ...type.bodyMedium, color: Colors.light.onRubber },

  masterTimerContent: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  currentExerciseCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.xxl,
    alignItems: 'center',
    marginBottom: spacing.xl,
    ...shadow,
  },
  currentExerciseTitle: { ...type.section, color: Colors.light.text, marginBottom: spacing.sm, textAlign: 'center' },
  phasePill: {
    backgroundColor: Colors.light.primaryLight,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.base,
  },
  phasePillRest: { backgroundColor: Colors.light.warning },
  phaseText: { ...type.eyebrow, color: Colors.light.primary },
  phaseTextRest: { color: Colors.light.text },
  masterTimerText: { ...type.display, color: Colors.light.text },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    ...shadow,
  },
  progressItem: { alignItems: 'center' },
  progressLabel: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.xs },
  progressValue: { ...type.numeric, color: Colors.light.text },
  masterControls: { flexDirection: 'row', justifyContent: 'space-around' },
  masterControlButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: radius.card,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    minWidth: 80,
    minHeight: 44,
  },
  // Caution plate, so rubber text and icon rather than white.
  pauseButton: { backgroundColor: Colors.light.warning },
  pauseButtonText: { color: Colors.light.text },
  resetButton: { backgroundColor: Colors.light.textSecondary },
  masterControlText: { ...type.label, color: Colors.light.card, marginTop: spacing.xs },

  modalContainer: { flex: 1, backgroundColor: Colors.light.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  modalTitle: { ...type.section, color: Colors.light.text },
  modalHeaderButtons: { flexDirection: 'row', alignItems: 'center' },
  saveButton: { marginRight: spacing.base, padding: spacing.xs },
  configContent: { flex: 1, paddingHorizontal: spacing.lg },
  configSection: { marginVertical: spacing.lg },
  configSectionTitle: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs },
  exerciseConfig: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  exerciseNameInput: {
    ...type.bodyMedium,
    flex: 1,
    color: Colors.light.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingVertical: spacing.sm,
    marginRight: spacing.base,
  },
  timeControls: { flexDirection: 'row', justifyContent: 'space-between' },
  timeControl: { flex: 1, marginHorizontal: spacing.sm },
  timeLabel: { ...type.label, color: Colors.light.textTertiary, marginBottom: spacing.sm, textAlign: 'center' },
  timeAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
    borderRadius: radius.input,
    paddingHorizontal: spacing.xs,
  },
  adjustButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  // Tabular so the row does not shift when 5s becomes 10s.
  timeValue: { ...type.numeric, color: Colors.light.text, minWidth: 44, textAlign: 'center' },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.primaryLight,
    borderRadius: radius.card,
    paddingVertical: spacing.base,
    minHeight: 44,
    marginTop: spacing.sm,
  },
  addExerciseText: { ...type.bodyMedium, color: Colors.light.primary, marginLeft: spacing.sm },
  setConfig: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.base,
  },
  presetsContent: { flex: 1, paddingHorizontal: spacing.lg },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    ...shadow,
  },
  presetInfo: { flex: 1 },
  presetName: { ...type.section, color: Colors.light.text, marginBottom: spacing.xs },
  presetDetails: { ...type.label, color: Colors.light.textTertiary },
  presetIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
