import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { radius, spacing, touch, type } from '@/constants/theme';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';
import BodyMap from '@/components/BodyMap';
import { ExerciseService } from '@/services/exerciseService';
import { worksSentence } from '@/services/muscleMap';

type Props = { visible: boolean; libraryExerciseId: number; onDismiss: () => void };

/** "How to do it" (spec R13): body map, then the library's own words, verbatim. */
export default function HowToSheet({ visible, libraryExerciseId, onDismiss }: Props) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const e = ExerciseService.getById(libraryExerciseId);
  if (!e) return null;
  const setup = e.executionCues?.setup ?? [];
  const action = e.executionCues?.action ?? [];
  const cue = (e.executionCues?.keyMentalCues ?? '').replace(/^"|"$/g, '');
  const mistakes = e.common_mistakes ?? [];
  const sentence = worksSentence(e.primary_muscle_group, e.secondary_muscle_groups);
  const hasTips = setup.length + action.length > 0;

  const Step = ({ n, text }: { n: number; text: string }) => (
    <View style={styles.step}>
      <View style={styles.num}><Text style={styles.numText}>{n}</Text></View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );

  return (
    <DragDismissSheet visible={visible} onDismiss={onDismiss}>
      <View style={{ maxHeight: height * 0.9 }}>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: spacing.lg + insets.bottom }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{e.name}</Text>
              <Text style={styles.meta}>{[e.equipment, e.difficulty_level?.toLowerCase()].filter(Boolean).join(', ')}</Text>
            </View>
            <TouchableOpacity style={styles.close} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close">
              <X size={22} color={Colors.light.text} />
            </TouchableOpacity>
          </View>

          {sentence ? (
            <View style={styles.mapCard}>
              <BodyMap primary={e.primary_muscle_group} secondary={e.secondary_muscle_groups} width={Math.min(348, width - 64)} />
              <Text style={styles.works}>{sentence}</Text>
            </View>
          ) : null}

          {hasTips ? (
            <View style={styles.steps}>
              {setup.length > 0 ? <Text style={styles.label}>Setup</Text> : null}
              {setup.map((t, i) => <Step key={`s${i}`} n={i + 1} text={t} />)}
              {action.length > 0 ? <Text style={styles.label}>The lift</Text> : null}
              {action.map((t, i) => <Step key={`a${i}`} n={setup.length + i + 1} text={t} />)}
            </View>
          ) : (
            <Text style={styles.stepText}>No tips for this one yet.</Text>
          )}

          {cue ? <Text style={styles.cue}>{cue}</Text> : null}

          {mistakes.length > 0 ? (
            <View style={styles.steps}>
              <Text style={styles.label}>Watch out for</Text>
              {mistakes.map((m, i) => <Text key={i} style={styles.mistake}>{m}</Text>)}
            </View>
          ) : null}

          <TouchableOpacity style={styles.back} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.backText}>Back to workout</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </DragDismissSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...type.title, color: Colors.light.text },
  meta: { ...type.label, fontSize: 15, color: Colors.light.textSecondary },
  close: { width: touch.min, height: touch.min, borderRadius: 12, backgroundColor: Colors.light.background, justifyContent: 'center', alignItems: 'center' },
  mapCard: { backgroundColor: Colors.light.background, borderRadius: radius.card, padding: spacing.base, gap: spacing.md },
  works: { ...type.body, fontSize: 17, color: Colors.light.text },
  steps: { gap: spacing.md },
  label: { ...type.eyebrow, color: Colors.light.textSecondary },
  step: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  num: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.light.primaryLight, justifyContent: 'center', alignItems: 'center' },
  numText: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 15, color: Colors.light.primary },
  stepText: { flex: 1, fontFamily: 'Archivo-Regular', fontSize: 17, lineHeight: 25, color: Colors.light.text },
  cue: { backgroundColor: Colors.light.primaryLight, borderRadius: radius.card, padding: spacing.base, fontFamily: 'Archivo-Medium', fontSize: 17, lineHeight: 25, color: Colors.light.primary },
  mistake: { fontFamily: 'Archivo-Regular', fontSize: 16, lineHeight: 24, color: Colors.light.text },
  back: { height: touch.row, borderRadius: radius.card, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center' },
  backText: { fontFamily: 'Archivo-SemiBold', fontSize: 18, color: '#FFFFFF' },
});
