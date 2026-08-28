import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Dumbbell, CircleHelp as HelpCircle, LogOut, Info, MessageSquare, FileDown, Shield, Trash2, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';
import { WorkoutHistoryService } from '@/services/workoutHistoryService';
import { shareHistoryCsv } from '@/services/csvExport';
import { getDefaultRestSeconds, setDefaultRestSeconds } from '@/services/preferences';
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

const REST_OPTIONS = [30, 45, 60, 75, 90, 105, 120, 150, 180, 240];

const formatRestTime = (seconds: number) => {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} s`;
};

const openUrl = async (url: string) => {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error('Failed to open URL:', error);
    Alert.alert('Could not open link', url);
  }
};

export default function SettingsScreen() {
  const [defaultRestTime, setDefaultRestTime] = useState(90);
  const [showRestTimeModal, setShowRestTimeModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const { signOut, user } = useAuth();
  const version = Constants.expoConfig?.version ?? '1.0.1';

  useEffect(() => {
    getDefaultRestSeconds().then(setDefaultRestTime);
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
      await setDefaultRestSeconds(seconds);
    } catch (error) {
      console.error('Error saving rest time preference:', error);
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
        <TouchableOpacity onPress={() => router.dismiss()} accessibilityRole="button" accessibilityLabel="Close settings">
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {user && (
          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.profileCard} onPress={() => router.push('/edit-profile')} accessibilityRole="button" accessibilityLabel="Edit profile">
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
              icon={<Dumbbell size={20} color={Colors.light.primary} />}
              title="Default rest time"
              subtitle={`${formatRestTime(defaultRestTime)} between sets`}
              onPress={() => setShowRestTimeModal(true)}
              showBorder={false}
            />
          </View>
          <Text style={styles.sectionNote}>Weights are logged in kilograms.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your data</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={<FileDown size={20} color={Colors.light.primary} />}
              title="Export to CSV"
              subtitle="Every set you've logged, one row each"
              onPress={handleExportCSV}
              rightElement={exporting ? <ActivityIndicator size="small" color={Colors.light.primary} /> : undefined}
            />
            <SettingItem
              icon={<Shield size={20} color={Colors.light.primary} />}
              title="Privacy policy"
              onPress={() => openUrl(LEGAL_URLS.privacy)}
            />
            <SettingItem
              icon={<Trash2 size={20} color={Colors.light.error} />}
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
            <SettingItem icon={<HelpCircle size={20} color={Colors.light.primary} />} title="Help" onPress={() => router.push('/help-faq')} />
            <SettingItem icon={<MessageSquare size={20} color={Colors.light.primary} />} title="Send feedback" onPress={() => openUrl(FEEDBACK_FORM_URL)} />
            <SettingItem icon={<Info size={20} color={Colors.light.primary} />} title="About NextSet" onPress={() => router.push('/aboutus')} />
            <SettingItem
              icon={<LogOut size={20} color={Colors.light.error} />}
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

      <Modal visible={showRestTimeModal} transparent animationType="slide" onRequestClose={() => setShowRestTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Default rest time</Text>
            <ScrollView style={styles.modalScrollView}>
              {REST_OPTIONS.map((seconds) => (
                <TouchableOpacity
                  key={seconds}
                  style={[styles.modalOption, defaultRestTime === seconds && styles.modalOptionSelected]}
                  onPress={() => handleRestTimeChange(seconds)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: defaultRestTime === seconds }}
                >
                  <Text style={[styles.modalOptionText, defaultRestTime === seconds && styles.modalOptionTextSelected]}>
                    {formatRestTime(seconds)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowRestTimeModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  headerTitle: { fontSize: 18, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: 20 },
  profileSection: { marginTop: 20, marginBottom: 8 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInitial: { fontSize: 22, fontFamily: 'ArchivoNarrow-Bold', color: '#FFFFFF', textTransform: 'uppercase' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text, marginBottom: 2 },
  profileEmail: { fontSize: 14, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text, marginBottom: 12 },
  sectionNote: { fontSize: 13, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, marginTop: 8, marginLeft: 4 },
  settingsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingItemNoBorder: { borderBottomWidth: 0 },
  settingIcon: { marginRight: 16 },
  settingContent: { flex: 1 },
  settingTitle: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text, marginBottom: 2 },
  settingTitleDestructive: { color: Colors.light.error },
  settingSubtitle: { fontSize: 13, fontFamily: 'Archivo-Regular', color: Colors.light.textSecondary },
  version: { fontSize: 14, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, textAlign: 'center', marginTop: 32, marginBottom: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContent: { backgroundColor: Colors.light.card, borderRadius: 20, padding: 24, width: '100%', maxWidth: 400, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, marginBottom: 20, textAlign: 'center' },
  modalScrollView: { maxHeight: 320 },
  modalOption: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginBottom: 8, backgroundColor: Colors.light.background },
  modalOptionSelected: { backgroundColor: Colors.light.primaryLight },
  modalOptionText: { fontSize: 16, fontFamily: 'Archivo-Medium', color: Colors.light.text, textAlign: 'center' },
  modalOptionTextSelected: { color: Colors.light.primary, fontFamily: 'ArchivoNarrow-Bold' },
  modalCancelButton: { marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.light.border },
  modalCancelText: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.textSecondary, textAlign: 'center' },
});
