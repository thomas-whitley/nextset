import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking, Alert, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Bell, Moon, Globe, Dumbbell, Weight, CircleHelp as HelpCircle, LogOut, Info, MessageSquare, FileDown, FileUp } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';
import { supabase } from '@/data/supabase-client';
import SyncStatusIndicator from '@/components/SyncStatusIndicator';
import { useLocalDatabase } from '@/hooks/useLocalDatabase';

type SettingItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showBorder?: boolean;
};

function SettingItem({ icon, title, subtitle, rightElement, onPress, showBorder = true }: SettingItemProps) {
  return (
    <TouchableOpacity 
      style={[styles.settingItem, !showBorder && styles.settingItemNoBorder]} 
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={subtitle || "Tap to modify this setting"}
    >
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [defaultRestTime, setDefaultRestTime] = useState(90); // seconds
  const [showUnitsModal, setShowUnitsModal] = useState(false);
  const [showRestTimeModal, setShowRestTimeModal] = useState(false);
  const { signOut, user } = useAuth();
  const { syncToCloud } = useLocalDatabase();

  const restTimeOptions = [
    { label: '15 seconds', value: 15 },
    { label: '30 seconds', value: 30 },
    { label: '45 seconds', value: 45 },
    { label: '1:00', value: 60 },
    { label: '1:15', value: 75 },
    { label: '1:30', value: 90 },
    { label: '1:45', value: 105 },
    { label: '2:00', value: 120 },
    { label: '2:30', value: 150 },
    { label: '3:00', value: 180 },
  ];

  const faqItems = [
    {
      question: "How do I track my workouts?",
      answer: "You can track your workouts by creating a new workout session and adding exercises with sets, reps, and weights."
    },
    {
      question: "Can I sync my data across devices?",
      answer: "Yes, your data is automatically synced to the cloud when you're logged in."
    },
    {
      question: "How do I change my workout routine?",
      answer: "You can create custom workout routines in the Workouts tab and modify them anytime."
    }
  ];

  const handleClose = () => {
    router.dismiss();
  };

  const handleLogOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleHelpFAQ = () => {
    router.push('/help-faq');
  };

  const handleAboutUs = () => {
    router.push('/aboutus');
  };

  const handleUnitsChange = async (newUnits: 'metric' | 'imperial') => {
    setUnits(newUnits);
    setShowUnitsModal(false);
    
    if (user) {
      try {
        const { error } = await supabase
          .from('profile')
          .update({ 
            preferences: { 
              units: newUnits,
              defaultRestTime: defaultRestTime 
            }
          })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error updating units preference:', error);
        }
      } catch (error) {
        console.error('Error saving units preference:', error);
      }
    }
  };

  const handleRestTimeChange = async (newRestTime: number) => {
    setDefaultRestTime(newRestTime);
    setShowRestTimeModal(false);
    
    if (user) {
      try {
        const { error } = await supabase
          .from('profile')
          .update({ 
            preferences: { 
              units: units,
              defaultRestTime: newRestTime 
            }
          })
          .eq('id', user.id);
        
        if (error) {
          console.error('Error updating rest time preference:', error);
        }
      } catch (error) {
        console.error('Error saving rest time preference:', error);
      }
    }
  };

  const handleProvideFeedback = async () => {
    try {
      const feedbackUrl = 'https://forms.gle/rmBL944eRKG1yCcFA';
      const supported = await Linking.canOpenURL(feedbackUrl);
      
      if (supported) {
        await Linking.openURL(feedbackUrl);
      } else {
        Alert.alert(
          'Unable to Open Link',
          'Please visit the feedback form in your browser: https://forms.gle/rmBL944eRKG1yCcFA'
        );
      }
    } catch (error) {
      console.error('Error opening feedback form:', error);
      Alert.alert(
        'Error',
        'Unable to open the feedback form. Please try again later.'
      );
    }
  };

  const handleImportCSV = () => {
    // Placeholder for future functionality
    Alert.alert('Coming Soon', 'CSV import functionality will be available in a future update.');
  };

  const handleExportCSV = () => {
    // Placeholder for future functionality
    Alert.alert('Coming Soon', 'CSV export functionality will be available in a future update.');
  };

  const formatRestTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes}:00`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <X size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Profile Section */}
        {user && (
          <View style={styles.profileSection}>
            <View style={styles.profileCard}>
              <View style={styles.profileIcon}>
                <Text style={styles.profileInitial}>
                  {user.user_metadata?.full_name?.[0] || user.email?.[0] || 'U'}
                </Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {user.user_metadata?.full_name || 'User'}
                </Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
            </View>
          </View>
        )}

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={<Bell size={20} color={Colors.light.primary} />}
              title="Notifications"
              subtitle="Workout reminders and achievements"
              rightElement={
                <Switch
                  value={notifications}
                  onValueChange={setNotifications}
                  trackColor={{ false: Colors.light.border, true: Colors.light.primaryLight }}
                  thumbColor={notifications ? Colors.light.primary : Colors.light.textTertiary}
                  accessibilityLabel="Notifications toggle"
                  accessibilityHint="Enable or disable workout reminders and achievements"
                />
              }
            />
            
            <SettingItem
              icon={<Moon size={20} color={Colors.light.primary} />}
              title="Dark Mode"
              subtitle="Switch to dark theme"
              rightElement={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: Colors.light.border, true: Colors.light.primaryLight }}
                  thumbColor={darkMode ? Colors.light.primary : Colors.light.textTertiary}
                  accessibilityLabel="Dark mode toggle"
                  accessibilityHint="Switch between light and dark theme"
                />
              }
            />
            
            <SettingItem
              icon={<Globe size={20} color={Colors.light.primary} />}
              title="Language"
              subtitle="English"
              showBorder={false}
            />
          </View>
        </View>

        {/* Workout Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Settings</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={<Weight size={20} color={Colors.light.primary} />}
              title="Measurement Units"
              subtitle={units === 'metric' ? 'Metric (kg, km)' : 'Imperial (lbs, miles)'}
              onPress={() => setShowUnitsModal(true)}
            />
            
            <SettingItem
              icon={<Dumbbell size={20} color={Colors.light.primary} />}
              title="Default Rest Time"
              subtitle={formatRestTime(defaultRestTime)}
              onPress={() => setShowRestTimeModal(true)}
              showBorder={false}
            />
          </View>
        </View>

        {/* Support & Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Account</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={<Info size={20} color={Colors.light.primary} />}
              title="About Us"
              subtitle="Learn more about our mission"
              onPress={handleAboutUs}
            />

            <SettingItem
              icon={<MessageSquare size={20} color={Colors.light.primary} />}
              title="Provide Feedback"
              subtitle="Help us improve the app"
              onPress={handleProvideFeedback}
            />
            
            <SettingItem
              icon={<HelpCircle size={20} color={Colors.light.primary} />}
              title="Help & FAQ"
              subtitle="Get support and answers"
              onPress={handleHelpFAQ}
            />
            
            <SettingItem
              icon={<LogOut size={20} color={Colors.light.error} />}
              title="Log Out"
              onPress={handleLogOut}
              rightElement={<View />}
              showBorder={false}
            />
          </View>
        </View>

        {/* Data Management Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          <View style={styles.settingsCard}>
            <SettingItem
              icon={<FileUp size={20} color={Colors.light.primary} />}
              title="Import from CSV"
              subtitle="Import your workout data from a CSV file"
              onPress={handleImportCSV}
            />
            
            <SettingItem
              icon={<FileDown size={20} color={Colors.light.primary} />}
              title="Export to CSV"
              subtitle="Export your workout data to a CSV file"
              onPress={handleExportCSV}
              showBorder={false}
            />
          </View>
        </View>
        
        <Text style={styles.version}>Momentum v1.0.0</Text>
      </ScrollView>

      {/* Units Selection Modal */}
      <Modal visible={showUnitsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Measurement Units</Text>
            <TouchableOpacity
              style={[styles.modalOption, units === 'metric' && styles.modalOptionSelected]}
              onPress={() => handleUnitsChange('metric')}
            >
              <Text style={[styles.modalOptionText, units === 'metric' && styles.modalOptionTextSelected]}>
                Metric (kg, km)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOption, units === 'imperial' && styles.modalOptionSelected]}
              onPress={() => handleUnitsChange('imperial')}
            >
              <Text style={[styles.modalOptionText, units === 'imperial' && styles.modalOptionTextSelected]}>
                Imperial (lbs, miles)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowUnitsModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rest Time Selection Modal */}
      <Modal visible={showRestTimeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Default Rest Time</Text>
            <ScrollView style={styles.modalScrollView}>
              {restTimeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.modalOption, defaultRestTime === option.value && styles.modalOptionSelected]}
                  onPress={() => handleRestTimeChange(option.value)}
                >
                  <Text style={[styles.modalOptionText, defaultRestTime === option.value && styles.modalOptionTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowRestTimeModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileSection: {
    marginTop: 20,
    marginBottom: 8,
  },
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
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInitial: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: Colors.light.textTertiary,
  },
  section: {
    marginTop: 24,
  },
  syncSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  syncSectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 12,
  },
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
  settingItemNoBorder: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
  },
  version: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
  faqItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginRight: 12,
  },
  faqAnswer: {
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  faqAnswerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textSecondary,
    lineHeight: 20,
  },
  faqDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 8,
    marginHorizontal: 20,
  },
  liveChatPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    opacity: 0.6,
  },
  liveChatContent: {
    marginLeft: 16,
  },
  liveChatTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
  },
  liveChatSubtitle: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.light.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.light.background,
  },
  modalOptionSelected: {
    backgroundColor: Colors.light.primaryLight,
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.text,
    textAlign: 'center',
  },
  modalOptionTextSelected: {
    color: Colors.light.primary,
    fontFamily: 'Inter-Bold',
  },
  modalCancelButton: {
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.light.border,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
});