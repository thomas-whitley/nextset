import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Trophy, Target, TrendingUp, CreditCard as Edit } from 'lucide-react-native';
import { router } from 'expo-router';
import { User as UserIcon } from 'lucide-react-native'; // Renamed to avoid conflict with useAuth user
import Colors from '@/constants/Colors';
import { AuthProvider, useAuth } from '@/data/AuthContext';

export default function ProfileScreen() {
  const { user } = useAuth();

  const handleSettingsPress = () => {
    router.push('/settings');
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const lifetimeStats = [
    { label: 'Total Workouts', value: '156', icon: TrendingUp, color: Colors.light.success },
    { label: 'Personal Records', value: '47', icon: Trophy, color: Colors.light.accent },
    { label: 'Total Volume', value: '1.2M kg', icon: Target, color: Colors.light.primary },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={handleSettingsPress}>
            <Settings size={24} color={Colors.light.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            {user?.user_metadata?.avatar_url ? (
              <Image 
                source={{ uri: user.user_metadata.avatar_url }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.genericProfileIcon}>
                <UserIcon size={40} color={Colors.light.textTertiary} />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{user?.user_metadata?.full_name || 'User'}</Text>
          <Text style={styles.profileUsername}>{user?.user_metadata?.username || 'Username'}</Text>
         </View>

        {/* Lifetime Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lifetime Stats</Text>
          <View style={styles.statsGrid}>
            {lifetimeStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <View key={index} style={styles.statCard}>
                  <IconComponent size={24} color={stat.color} />
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Recent Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Achievements</Text>
          <View style={styles.achievementsList}>
            <View style={styles.achievementItem}>
              <View style={styles.achievementIcon}>
                <Trophy size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>New PR: Bench Press</Text>
                <Text style={styles.achievementSubtitle}>80kg × 5 reps • 2 days ago</Text>
              </View>
            </View>
            
            <View style={styles.achievementItem}>
              <View style={styles.achievementIcon}>
                <Target size={20} color={Colors.light.success} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>3-Week Streak</Text>
                <Text style={styles.achievementSubtitle}>Consistent training • 1 week ago</Text>
              </View>
            </View>
            
            <View style={styles.achievementItem}>
              <View style={styles.achievementIcon}>
                <TrendingUp size={20} color={Colors.light.primary} />
              </View>
              <View style={styles.achievementContent}>
                <Text style={styles.achievementTitle}>Volume Milestone</Text>
                <Text style={styles.achievementSubtitle}>1M kg total lifted • 2 weeks ago</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Personal Records */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal Records</Text>
          <View style={styles.prList}>
            {[
              { exercise: 'Bench Press', weight: '80kg', reps: '5' },
              { exercise: 'Squat', weight: '100kg', reps: '3' },
              { exercise: 'Deadlift', weight: '120kg', reps: '1' },
              { exercise: 'Overhead Press', weight: '55kg', reps: '8' },
            ].map((pr, index) => (
              <View key={index} style={styles.prItem}>
                <Text style={styles.prExercise}>{pr.exercise}</Text>
                <Text style={styles.prWeight}>{pr.weight} × {pr.reps}</Text>
              </View>
            ))}
          </View>
        </View>
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
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  genericProfileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.light.border,
  },
  profileName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
  achievementsList: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  achievementIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  achievementContent: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
    marginBottom: 2,
  },
  achievementSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
  },
  prList: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  prExercise: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: Colors.light.text,
  },
  prWeight: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: Colors.light.primary,
  },
});