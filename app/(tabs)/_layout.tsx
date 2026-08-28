import { Tabs } from 'expo-router';
import { StyleSheet, Platform } from 'react-native';
import { Zap, FileText, User, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarStyle: styles.tabBar,
        // A lightning bolt for Home and a page icon for Programs are not
        // self-evident; the labels were styled but never switched on.
        tabBarShowLabel: true,
        tabBarLabelStyle: styles.tabBarLabel,
        headerShown: false,
        tabBarAccessibilityLabel: 'Main navigation',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Zap size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color, size }) => (
            <FileText size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Programs tab',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <TrendingUp size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Progress tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
          tabBarAccessibilityLabel: 'Profile tab',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    height: 68,
    paddingBottom: 10,
    paddingTop: 8,
    ...Platform.select({
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 8,
      },
    }),
  },
  tabBarLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    fontWeight: '600',
  },
});