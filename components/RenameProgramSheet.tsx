import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { spacing, touch, radius, type } from '@/constants/theme';
import DragDismissSheet from '@/components/gestures/DragDismissSheet';
import { cleanProgramName, MAX_PROGRAM_NAME } from '@/services/programEdits';

type Props = { visible: boolean; initialName: string; onDismiss: () => void; onSave: (name: string) => Promise<boolean> };

export default function RenameProgramSheet({ visible, initialName, onDismiss, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (visible) setName(initialName);
  }, [visible, initialName]);

  const usable = cleanProgramName(name) !== null;
  const save = async () => {
    if (!usable || saving) return;
    setSaving(true);
    try {
      if (await onSave(name)) onDismiss();
      else Alert.alert('Could not rename', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DragDismissSheet visible={visible} onDismiss={onDismiss} avoidKeyboard>
      <View style={[styles.body, { paddingBottom: spacing.lg + insets.bottom }]}>
        <Text style={styles.heading}>Rename program</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          autoFocus
          maxLength={MAX_PROGRAM_NAME}
          returnKeyType="done"
          onSubmitEditing={save}
          accessibilityLabel="Program name"
        />
        <TouchableOpacity
          style={[styles.save, !usable && styles.disabled]}
          disabled={!usable || saving}
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel="Save name"
        >
          <Text style={styles.saveText}>{saving ? 'Saving…' : 'Save name'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancel} onPress={onDismiss} accessibilityRole="button">
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </DragDismissSheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingTop: spacing.sm, paddingHorizontal: spacing.lg, gap: spacing.md },
  heading: { fontFamily: 'ArchivoNarrow-Bold', fontSize: 24, color: Colors.light.text },
  input: {
    ...type.body,
    fontSize: 18,
    minHeight: touch.row,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    paddingHorizontal: spacing.md,
    color: Colors.light.text,
  },
  save: { height: touch.row, borderRadius: radius.card, backgroundColor: Colors.light.primary, justifyContent: 'center', alignItems: 'center' },
  disabled: { opacity: 0.4 },
  saveText: { fontFamily: 'Archivo-SemiBold', fontSize: 17, color: '#FFFFFF' },
  cancel: { height: touch.min, borderRadius: radius.card, borderWidth: 1, borderColor: Colors.light.border, justifyContent: 'center', alignItems: 'center' },
  cancelText: { fontFamily: 'Archivo-SemiBold', fontSize: 17, color: Colors.light.text },
});
