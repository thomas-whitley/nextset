import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Search, X } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import { radius, spacing, touch, type } from '@/constants/theme';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';
import { ExerciseService } from '@/services/exerciseService';
import { similarExercises } from '@/services/similarExercises';
import type { Exercise } from '@/services/exercise.types';

type Props = { visible: boolean; libraryExerciseId: number; currentName: string; onDismiss: () => void; onPick: (e: Exercise) => void };

const SHOWN = 6;
const SEARCH_LIMIT = 30;
const PATTERN_WORD: Record<string, string> = { Push: 'pushing', Pull: 'pulling', Static: 'holds' };

/** Swap an exercise (spec R12): search everything, or take a similar one first. */
export default function SwapExerciseSheet({ visible, libraryExerciseId, currentName, onDismiss, onPick }: Props) {
  const { height } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const target = ExerciseService.getById(libraryExerciseId);
  const similar = useMemo(() => (target ? similarExercises(target, ExerciseService.getAll()) : []), [target]);
  const results = query.trim() ? ExerciseService.search(query).filter((e) => e.id !== libraryExerciseId).slice(0, SEARCH_LIMIT) : null;
  const list = results ?? (showAll ? similar : similar.slice(0, SHOWN));

  const heading = target
    ? `Similar: ${target.primary_muscle_group.toLowerCase()}${target.movement_pattern && PATTERN_WORD[target.movement_pattern] ? `, ${PATTERN_WORD[target.movement_pattern]}` : ''}`
    : null;

  return (
    <DragDismissSheet visible={visible} onDismiss={onDismiss}>
      <View style={[styles.body, { height: height * 0.85 }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Swap exercise</Text>
            <Text style={styles.subtitle} numberOfLines={1}>Replacing {currentName}</Text>
          </View>
          <TouchableOpacity style={styles.close} onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Close">
            <X size={22} color={Colors.light.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.search}>
          <Search size={22} color={Colors.light.textTertiary} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={`Search all ${ExerciseService.count} exercises`}
            placeholderTextColor={Colors.light.textTertiary}
            accessibilityLabel="Search all exercises"
          />
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled">
          {results === null && heading && similar.length > 0 ? <Text style={styles.label}>{heading}</Text> : null}
          <View style={styles.list}>
            {list.map((e, i) => (
              <TouchableOpacity
                key={e.id}
                style={[styles.item, i === 0 && { borderTopWidth: 0 }]}
                onPress={() => onPick(e)}
                accessibilityRole="button"
                accessibilityLabel={`Swap to ${e.name}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{e.name}</Text>
                  <Text style={styles.itemMeta}>{e.equipment}</Text>
                </View>
                {target && e.equipment === target.equipment ? <Text style={styles.tag}>Same kit</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
          {results === null && !showAll && similar.length > SHOWN ? (
            <TouchableOpacity style={styles.more} onPress={() => setShowAll(true)} accessibilityRole="button">
              <Text style={styles.moreText}>Show {similar.length - SHOWN} more similar</Text>
            </TouchableOpacity>
          ) : null}
          {results !== null && results.length === 0 ? <Text style={styles.empty}>No exercise matches “{query.trim()}”.</Text> : null}
        </ScrollView>
      </View>
    </DragDismissSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: spacing.base, paddingTop: spacing.sm, gap: spacing.base },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...type.title, color: Colors.light.text },
  subtitle: { ...type.body, color: Colors.light.textSecondary },
  close: { width: touch.min, height: touch.min, borderRadius: 12, borderWidth: 1, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center' },
  search: { height: touch.row, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.base, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, backgroundColor: Colors.light.card },
  searchInput: { flex: 1, fontFamily: 'Archivo-Regular', fontSize: 17, color: Colors.light.text },
  label: { ...type.eyebrow, color: Colors.light.textSecondary, marginBottom: spacing.sm },
  list: { backgroundColor: Colors.light.card, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, overflow: 'hidden' },
  item: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: Colors.light.background },
  itemName: { fontFamily: 'Archivo-Medium', fontSize: 17, lineHeight: 22, color: Colors.light.text },
  itemMeta: { ...type.label, fontSize: 14, color: Colors.light.textSecondary },
  tag: { ...type.label, fontFamily: 'Archivo-SemiBold', color: Colors.light.primary, backgroundColor: Colors.light.primaryLight, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 2, overflow: 'hidden' },
  more: { height: touch.min, justifyContent: 'center', alignItems: 'center' },
  moreText: { fontFamily: 'Archivo-SemiBold', fontSize: 16, color: Colors.light.primary },
  empty: { ...type.body, color: Colors.light.textSecondary, paddingVertical: spacing.lg, textAlign: 'center' },
});
