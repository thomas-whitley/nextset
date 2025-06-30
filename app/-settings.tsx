import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  User, ChevronRight, Bell, Moon, Globe, 
  Dumbbell, Weight, HelpCircle, LogOut 
} from 'lucide-react-native';

type SettingItemProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  onPress?: () => void;
};

function SettingItem({ icon, title, subtitle, rightElement, onPress }: SettingItemProps) {
  return (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingIcon}>{icon}</View>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
      {rightElement || <ChevronRight size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const [darkMode, setDarkMode] = React.useState(false);
  const [notifications, setNotifications] = React.useState(true);
  
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.profileIcon}>
            <User size={32} color="#fff" />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>John Doe</Text>
            <Text style={styles.profileEmail}>John.doe@example.com</Text>
          </View>
          <ChevronRight size={20} color="#9CA3AF" />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Settings</Text>
          
          <SettingItem
            icon={<Bell size={20} color="#2563EB" />}
            title="Notifications"
            rightElement={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
                thumbColor={notifications ? '#2563EB' : '#9CA3AF'}
              />
            }
          />
          
          <SettingItem
            icon={<Moon size={20} color="#2563EB" />}
            title="Dark Mode"
            rightElement={
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#D1D5DB', true: '#BFDBFE' }}
                thumbColor={darkMode ? '#2563EB' : '#9CA3AF'}
              />
            }
          />
          
          <SettingItem
            icon={<Globe size={20} color="#2563EB" />}
            title="Language"
            subtitle="English"
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Workout Settings</Text>
          
          <SettingItem
            icon={<Dumbbell size={20} color="#2563EB" />}
            title="Units"
            subtitle="Kilograms (kg)"
          />
          
          <SettingItem
            icon={<Weight size={20} color="#2563EB" />}
            title="Custom Exercises"
            subtitle="Manage your exercise library"
          />
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <SettingItem
            icon={<HelpCircle size={20} color="#2563EB" />}
            title="Help & FAQ"
          />
          
          <SettingItem
            icon={<LogOut size={20} color="#EF4444" />}
            title="Log Out"
            rightElement={<View />}
          />
        </View>
        
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginTop: 2,
  },
  version: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
});