import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Pencil } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { useAuth } from '@/data/AuthContext';
import { WorkoutHistoryService, LifetimeStats } from '@/services/workoutHistoryService';
import { formatKg, formatCount, formatMinutes, formatShortDate, formatSet } from '@/utils/format';
import { displayNameOf, initialsOf } from '@/data/userDisplay';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<LifetimeStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      setStats(await WorkoutHistoryService.getLifetimeStats(user.id));
    } catch (error) {
      console.error('Failed to load lifetime stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const username: string | undefined = user?.user_metadata?.username;
  const displayName = displayNameOf(user);
  const subline = username ? `@${username}` : user?.email ?? '';

  const summary = [
    { label: 'Workouts', value: stats ? formatCount(stats.totalWorkouts) : '—' },
    { label: 'Lifted', value: stats ? formatKg(stats.totalVolume) : '—' },
    { label: 'Time training', value: stats ? formatMinutes(stats.totalMinutes) : '—' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/edit-profile')}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
          >
            <Pencil size={20} color={Colors.light.textTertiary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Settings size={22} color={Colors.light.textTertiary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarRing}>
            <Text style={styles.avatarText}>{initialsOf(user)}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          {subline ? <Text style={styles.profileUsername}>{subline}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All time</Text>
          <View style={styles.statsGrid}>
            {summary.map((stat) => (
              <View key={stat.label} style={styles.statCard}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          {stats?.firstWorkoutAt ? (
            <Text style={styles.sinceText}>Logging since {formatShortDate(stats.firstWorkoutAt)}</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal records</Text>
          <View style={styles.prList}>
            {loading ? (
              <ActivityIndicator color={Colors.light.primary} style={{ paddingVertical: 24 }} />
            ) : !stats || stats.personalRecords.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No records yet</Text>
                <Text style={styles.emptyText}>
                  Your heaviest set for each exercise shows here after your first workout.
                </Text>
                <TouchableOpacity
                  style={styles.emptyButton}
                  onPress={() => router.push('/(tabs)')}
                  accessibilityRole="button"
                >
                  <Text style={styles.emptyButtonText}>Go to Home</Text>
                </TouchableOpacity>
              </View>
            ) : (
              stats.personalRecords.slice(0, 8).map((pr, index, arr) => (
                <View key={pr.exercise} style={[styles.prItem, index === arr.length - 1 && styles.prItemLast]}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.prExercise}>{pr.exercise}</Text>
                    <Text style={styles.prDate}>{formatShortDate(pr.date)}</Text>
                  </View>
                  <Text style={styles.prWeight}>{formatSet(pr.weight, pr.reps)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: { flex: 1, paddingHorizontal: 20 },
  profileHeader: { alignItems: 'center', paddingVertical: 24 },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 4,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { fontSize: 30, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.primary },
  profileName: { fontSize: 24, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, marginBottom: 4 },
  profileUsername: { fontSize: 15, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, marginBottom: 12 },
  statsGrid: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: Colors.light.card, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 8, alignItems: 'center', ...shadow },
  statValue: { fontSize: 18, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.text, marginBottom: 4 },
  statLabel: { fontSize: 12, fontFamily: 'Archivo-Medium', color: Colors.light.textTertiary, textAlign: 'center' },
  sinceText: { fontSize: 13, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, textAlign: 'center', marginTop: 12 },
  prList: { backgroundColor: Colors.light.card, borderRadius: 16, paddingHorizontal: 16, ...shadow },
  prItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  prItemLast: { borderBottomWidth: 0 },
  prExercise: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text },
  prDate: { fontSize: 12, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, marginTop: 2 },
  prWeight: { fontSize: 16, fontFamily: 'ArchivoNarrow-Bold', color: Colors.light.primary },
  emptyState: { paddingVertical: 28, paddingHorizontal: 8, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.text, marginBottom: 6 },
  emptyText: { fontSize: 14, fontFamily: 'Archivo-Regular', color: Colors.light.textTertiary, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  emptyButton: { backgroundColor: Colors.light.primaryLight, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 20 },
  emptyButtonText: { fontSize: 14, fontFamily: 'ArchivoNarrow-SemiBold', color: Colors.light.primary },
});
