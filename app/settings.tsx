import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Dumbbell,
  Timer,
  Bell,
  CircleHelp as HelpCircle,
  LogOut,
  Info,
  MessageSquare,
  FileDown,
  Shield,
  Trash2,
  ChevronRight,
} from 'lucide-react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch, HIT_SLOP } from '@/constants/theme';
import { useAuth } from '@/data/AuthContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { shareHistoryCsv } from '@/services/csvExport';
import {
  getDefaultRestSeconds,
  setDefaultRestSeconds,
  getBarWeightKg,
  setBarWeightKg,
  clampBarKg,
  DEFAULT_REST_SECONDS,
  DEFAULT_BAR_WEIGHT_KG,
} from '@/services/preferences';
import { openExactAlarmSettings } from '@/services/restNotifications';
import { LEGAL_URLS, FEEDBACK_FORM_URL, SUPPORT_EMAIL } from '@/constants/Links';
import { displayNameOf, initialsOf } from '@/data/userDisplay';

type SettingItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showBorder?: boolean;
  destructive?: boolean;
};

function SettingItem({ icon, title, subtitle, rightElement, onPress, showBorder = true, destructive }: SettingItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingItem, !showBorder && styles.settingItemNoBorder]}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle}
    >
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, destructive && styles.settingTitleDestructive]}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement ?? (onPress ? <ChevronRight size={18} color={Colors.light.textTertiary} /> : null)}
    </TouchableOpacity>
  );
}

type PickerOption = { value: number; label: string };

type PickerModalProps = {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: number;
  onSelect: (value: number) => void;
  onClose: () => void;
  /** When set, a "Custom" row lets the user type a value. */
  custom?: { placeholder: string; unit: string; parse: (text: string) => number | null };
};

/** One list, one selection. Used for rest time and bar weight. */
function PickerModal({ visible, title, options, selected, onSelect, onClose, custom }: PickerModalProps) {
  const [customText, setCustomText] = useState('');
  const isPreset = options.some((o) => o.value === selected);
  const customValue = custom ? custom.parse(customText) : null;

  useEffect(() => {
    if (visible) setCustomText(isPreset ? '' : String(selected));
  }, [visible, isPreset, selected]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={styles.modalScrollView} keyboardShouldPersistTaps="handled">
            {options.map((option) => {
              const active = selected === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, active && styles.modalOptionSelected]}
                  onPress={() => onSelect(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.modalOptionText, active && styles.modalOptionTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              );
            })}
            {custom && (
              <View style={[styles.modalOption, styles.modalCustomRow, !isPreset && styles.modalOptionSelected]}>
                <Text style={[styles.modalOptionText, !isPreset && styles.modalOptionTextSelected]}>Custom</Text>
                <View style={styles.modalCustomField}>
                  <TextInput
                    style={styles.modalCustomInput}
                    value={customText}
                    onChangeText={setCustomText}
                    placeholder={custom.placeholder}
                    placeholderTextColor={Colors.light.textTertiary}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={() => customValue !== null && onSelect(customValue)}
                    accessibilityLabel={`Custom ${title.toLowerCase()}`}
                  />
                  <Text style={styles.modalCustomUnit}>{custom.unit}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.modalCustomSet, customValue === null && styles.modalCustomSetDisabled]}
                  disabled={customValue === null}
                  onPress={() => customValue !== null && onSelect(customValue)}
                  accessibilityRole="button"
                  accessibilityLabel="Use custom value"
                >
                  <Text style={styles.modalCustomSetText}>Set</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity style={styles.modalCancelButton} onPress={onClose} accessibilityRole="button">
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 240];

// Men's Olympic, women's Olympic, technique bar. Anything else is custom.
const BAR_OPTIONS = [20, 15, 10];

const formatRestTime = (seconds: number) => {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
};

const formatKg = (kg: number) => `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;

/** Accepts 0 < kg <= 50 in 0.5 kg steps; rejects the rest as a bar weight. */
const parseBarKg = (text: string): number | null => clampBarKg(parseFloat(text.replace(',', '.')));

const openUrl = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open URL:', error);
    Alert.alert('Could not open link', url);
  }
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const [defaultRestTime, setDefaultRestTime] = useState(DEFAULT_REST_SECONDS);
  const [barWeight, setBarWeight] = useState(DEFAULT_BAR_WEIGHT_KG);
  const [showRestTimeModal, setShowRestTimeModal] = useState(false);
  const [showBarWeightModal, setShowBarWeightModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { signOut, user } = useAuth();
  const version = Constants.expoConfig?.version ?? '1.0.1';

  useEffect(() => {
    getDefaultRestSeconds().then(setDefaultRestTime);
    getBarWeightKg().then(setBarWeight);
  }, []);

  const handleLogOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Could not log out', 'Check your connection and try again.');
    }
  };

  const handleRestTimeChange = async (seconds: number) => {
    setDefaultRestTime(seconds);
    setShowRestTimeModal(false);
    try {
      await setDefaultRestSeconds(seconds, user?.id);
    } catch (error) {
      console.error('Error saving rest time preference:', error);
    }
  };

  const handleBarWeightChange = async (kg: number) => {
    setBarWeight(kg);
    setShowBarWeightModal(false);
    try {
      await setBarWeightKg(kg, user?.id);
    } catch (error) {
      console.error('Error saving bar weight preference:', error);
    }
  };

  const handleExportCSV = async () => {
    if (!user || exporting) return;
    setExporting(true);
    try {
      const rows = await WorkoutHistoryService.getAllWorkoutHistory(user.id);
      if (rows.length === 0) {
        Alert.alert('Nothing to export', 'Finish a workout first — the export is one row per set.');
        return;
      }
      const fileName = await shareHistoryCsv(rows);
      Alert.alert('Export ready', `${rows.length} ${rows.length === 1 ? 'workout' : 'workouts'} written to ${fileName}.`);
    } catch (error) {
      console.error('CSV export failed:', error);
      Alert.alert('Export failed', 'Could not write the file. Try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      `Account deletion is handled by request. You'll be taken to a web page with the steps; email ${SUPPORT_EMAIL} from your account address and everything is removed within 30 days.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open page', style: 'destructive', onPress: () => openUrl(LEGAL_URLS.deleteAccount) },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.dismiss()}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
        >
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: touch.min }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        {user && (
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.profileCard}
              onPress={() => router.push('/edit-profile')}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <View style={styles.profileIcon}>
                <Text style={styles.profileInitial}>{initialsOf(user)}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayNameOf(user)}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
              <ChevronRight size={18} color={Colors.light.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={<Timer size={22} color={Colors.light.primary} />}
              title="Default rest time"
              subtitle={`${formatRestTime(defaultRestTime)} between sets`}
              onPress={() => setShowRestTimeModal(true)}
            />
            <SettingItem
              icon={<Dumbbell size={22} color={Colors.light.primary} />}
              title="Barbell weight"
              subtitle={`${formatKg(barWeight)} bar assumed when loading plates`}
              onPress={() => setShowBarWeightModal(true)}
            />
            <SettingItem
              icon={<Bell size={22} color={Colors.light.primary} />}
              title="Rest alerts"
              subtitle='Buzz when rest is over, even when locked. Tap to allow "Alarms & reminders" so they fire on time.'
              // Straight to the exact-alarm page where that page exists; the
              // app-info page is the fallback (iOS, Android < 12, or an OEM
              // build with no such activity).
              onPress={() => {
                void openExactAlarmSettings()
                  .then((opened) => { if (!opened) void Linking.openSettings(); })
                  .catch(() => { void Linking.openSettings(); });
              }}
              showBorder={false}
            />
          </View>
          <Text style={styles.sectionNote}>Weights are logged in kilograms.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your data</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={<FileDown size={22} color={Colors.light.primary} />}
              title="Export to CSV"
              subtitle="Every set you've logged, one row each"
              onPress={handleExportCSV}
              rightElement={exporting ? <ActivityIndicator size="small" color={Colors.light.primary} /> : undefined}
            />
            <SettingItem
              icon={<Shield size={22} color={Colors.light.primary} />}
              title="Privacy policy"
              onPress={() => openUrl(LEGAL_URLS.privacy)}
            />
            <SettingItem
              icon={<Trash2 size={22} color={Colors.light.error} />}
              title="Delete account"
              subtitle="Request deletion of your account and data"
              onPress={handleDeleteAccount}
              showBorder={false}
              destructive
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.settingsCard}>
            <SettingItem icon={<HelpCircle size={22} color={Colors.light.primary} />} title="Help" onPress={() => router.push('/help-faq')} />
            <SettingItem icon={<MessageSquare size={22} color={Colors.light.primary} />} title="Send feedback" onPress={() => openUrl(FEEDBACK_FORM_URL)} />
            <SettingItem icon={<Info size={22} color={Colors.light.primary} />} title="About NextSet" onPress={() => router.push('/aboutus')} />
            <SettingItem
              icon={<LogOut size={22} color={Colors.light.error} />}
              title="Log out"
              onPress={handleLogOut}
              rightElement={<View />}
              showBorder={false}
              destructive
            />
          </View>
        </View>

        <Text style={styles.version}>NextSet v{version}</Text>
      </ScrollView>

      <PickerModal
        visible={showRestTimeModal}
        title="Default rest time"
        options={REST_OPTIONS.map((s) => ({ value: s, label: formatRestTime(s) }))}
        selected={defaultRestTime}
        onSelect={handleRestTimeChange}
        onClose={() => setShowRestTimeModal(false)}
      />

      <PickerModal
        visible={showBarWeightModal}
        title="Barbell weight"
        options={BAR_OPTIONS.map((kg) => ({ value: kg, label: formatKg(kg) }))}
        selected={barWeight}
        onSelect={handleBarWeightChange}
        onClose={() => setShowBarWeightModal(false)}
        custom={{ placeholder: '0', unit: 'kg', parse: parseBarKg }}
      />
    </SafeAreaView>
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
  closeButton: { minWidth: touch.min, minHeight: touch.min, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { ...type.section, color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  profileSection: { marginTop: spacing.lg, marginBottom: spacing.sm },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    padding: spacing.lg,
    ...shadow,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.primary,
    borderWidth: 3,
    borderColor: Colors.light.rubber,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.base,
  },
  profileInitial: { ...type.section, color: Colors.light.card },
  profileInfo: { flex: 1 },
  profileName: { ...type.section, color: Colors.light.text, marginBottom: spacing.xs / 2 },
  profileEmail: { ...type.label, color: Colors.light.textTertiary },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs },
  sectionNote: { ...type.label, color: Colors.light.textTertiary, marginTop: spacing.sm, marginLeft: spacing.xs },
  settingsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.card,
    ...shadow,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: touch.min,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingItemNoBorder: { borderBottomWidth: 0 },
  settingIcon: { marginRight: spacing.base },
  settingContent: { flex: 1 },
  settingTitle: { ...type.bodyMedium, color: Colors.light.text },
  settingTitleDestructive: { color: Colors.light.error },
  settingSubtitle: { ...type.label, color: Colors.light.textSecondary, marginTop: spacing.xs / 2 },
  version: { ...type.label, color: Colors.light.textTertiary, textAlign: 'center', marginTop: spacing.xxl, marginBottom: spacing.xxxl },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 21, 23, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: radius.slab,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: { ...type.section, color: Colors.light.text, marginBottom: spacing.lg, textAlign: 'center' },
  modalScrollView: { maxHeight: 360 },
  modalOption: {
    paddingVertical: spacing.md + spacing.xs / 2,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.input,
    marginBottom: spacing.sm,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.background,
  },
  modalOptionSelected: { backgroundColor: Colors.light.primaryLight, borderColor: Colors.light.primary },
  modalOptionText: { ...type.numeric, color: Colors.light.text, textAlign: 'center' },
  modalOptionTextSelected: { color: Colors.light.primary },
  modalCustomRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  modalCustomField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: Colors.light.border,
    paddingHorizontal: spacing.md,
  },
  modalCustomInput: { ...type.numeric, flex: 1, minWidth: 0, color: Colors.light.text, paddingVertical: spacing.sm, textAlign: 'right' },
  modalCustomUnit: { ...type.label, color: Colors.light.textTertiary, marginLeft: spacing.xs, flexShrink: 0 },
  modalCustomSet: {
    minHeight: touch.min,
    justifyContent: 'center',
    backgroundColor: Colors.light.primary,
    borderRadius: radius.input,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + spacing.xs / 2,
  },
  modalCustomSetDisabled: { opacity: 0.4 },
  modalCustomSetText: { ...type.label, color: Colors.light.card },
  modalCancelButton: {
    marginTop: spacing.base,
    paddingVertical: spacing.md + spacing.xs / 2,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  modalCancelText: { ...type.bodyMedium, color: Colors.light.textSecondary, textAlign: 'center' },
});
