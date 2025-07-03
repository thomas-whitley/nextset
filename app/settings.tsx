import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Bell, Moon, Globe, Dumbbell, Weight, CircleHelp as HelpCircle, LogOut, Info, MessageSquare } from 'lucide-react-native';
import { router } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';

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
  const { signOut, user } = useAuth();

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

  const handleAboutUs = () => {
    router.push('/aboutus');
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
              title="Units"
              subtitle="Kilograms (kg)"
            />
            
            <SettingItem
              icon={<Dumbbell size={20} color={Colors.light.primary} />}
              title="Rest Timer Defaults"
              subtitle="60s, 90s, 120s"
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
        
        <Text style={styles.version}>Momentum v1.0.0</Text>
      </ScrollView>
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  settingsCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  settingItemNoBorder: {
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  version: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 40,
  },
});