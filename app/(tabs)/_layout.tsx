import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { BottomTabBar } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, FileText, User, TrendingUp } from 'lucide-react-native';
import Colors from '@/constants/Colors';
import ResumeWorkoutBar from '@/components/ResumeWorkoutBar';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      tabBar={(props) => (
        <View>
          <ResumeWorkoutBar />
          <BottomTabBar {...props} />
        </View>
      )}
      screenOptions={{
        tabBarActiveTintColor: Colors.light.primary,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        tabBarStyle: [styles.tabBar, { height: 64 + insets.bottom, paddingBottom: insets.bottom + 4 }],
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
          tabBarIcon: ({ color }) => (
            <Zap size={24} color={color} />
          ),
          tabBarAccessibilityLabel: 'Home tab',
        }}
      />
      <Tabs.Screen
        name="programs"
        options={{
          title: 'Programs',
          tabBarIcon: ({ color }) => (
            <FileText size={24} color={color} />
          ),
          tabBarAccessibilityLabel: 'Programs tab',
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => (
            <TrendingUp size={24} color={color} />
          ),
          tabBarAccessibilityLabel: 'Progress tab',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <User size={24} color={color} />
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
    fontFamily: 'ArchivoNarrow-SemiBold',
    fontSize: 13,
    fontWeight: '600',
  },
});