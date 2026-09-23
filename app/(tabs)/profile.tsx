import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Pencil } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import Colors from '@/constants/Colors';
import { spacing, radius, type, touch } from '@/constants/theme';
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
          {/* Weight plate, not a ring: solid disc with an inset bevel line,
              same material language as the bar-loading strip. */}
          <View style={styles.avatarPlate}>
            <View style={styles.avatarPlateRing} />
            <Text style={styles.avatarText}>{initialsOf(user)}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          {subline ? <Text style={styles.profileUsername}>{subline}</Text> : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>All time</Text>
          <View style={styles.statsCard}>
            {summary.map((stat, index) => (
              <View
                key={stat.label}
                style={[styles.statRow, index === summary.length - 1 && styles.statRowLast]}
              >
                <Text style={styles.statRowLabel}>{stat.label}</Text>
                <Text style={styles.statRowValue}>{stat.value}</Text>
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
              <ActivityIndicator color={Colors.light.primary} style={styles.loadingSpinner} />
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
                  <View style={styles.prItemText}>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.base,
  },
  title: { ...type.title, color: Colors.light.text },
  headerButtons: { flexDirection: 'row', alignItems: 'center' },
  // Explicit 44x44 box rather than a smaller icon plus hitSlop — the whole
  // box is the touch target, not just the icon glyph inside it.
  headerButton: {
    minWidth: touch.min,
    minHeight: touch.min,
    borderRadius: radius.pill,
    backgroundColor: Colors.light.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  profileHeader: { alignItems: 'center', paddingVertical: spacing.xl },

  // Avatar-as-plate: solid disc in plate blue with an inset bevel ring,
  // rather than an outlined initials circle.
  avatarPlate: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.light.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
    ...shadow,
  },
  avatarPlateRing: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: Colors.light.onRubberSecondary,
  },
  // White text on the primary disc — `card` is white and is the established
  // token for this pairing (see progress.tsx activeTimeRangeText).
  avatarText: { ...type.title, color: Colors.light.card },

  profileName: { ...type.section, color: Colors.light.text, marginBottom: spacing.xs },
  profileUsername: { ...type.body, color: Colors.light.textTertiary },

  section: { marginBottom: spacing.xl + spacing.xs },
  sectionTitle: { ...type.section, color: Colors.light.text, marginBottom: spacing.md },

  // Lifetime stats as a rows-in-a-card list, one figure per row — the
  // display role reads at 44pt, so three side-by-side columns would crowd.
  statsCard: { backgroundColor: Colors.light.card, borderRadius: radius.card, paddingHorizontal: spacing.lg, ...shadow },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  statRowLast: { borderBottomWidth: 0 },
  statRowLabel: { ...type.eyebrow, color: Colors.light.textTertiary },
  statRowValue: { ...type.display, color: Colors.light.text },

  sinceText: { ...type.label, color: Colors.light.textTertiary, textAlign: 'center', marginTop: spacing.md },

  prList: { backgroundColor: Colors.light.card, borderRadius: radius.card, paddingHorizontal: spacing.base, ...shadow },
  loadingSpinner: { paddingVertical: spacing.xl },
  prItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  prItemLast: { borderBottomWidth: 0 },
  prItemText: { flex: 1, marginRight: spacing.md },
  prExercise: { ...type.bodyMedium, color: Colors.light.text },
  prDate: { ...type.label, color: Colors.light.textTertiary, marginTop: spacing.xs / 2 },
  prWeight: { ...type.numeric, color: Colors.light.primary },

  emptyState: { paddingVertical: spacing.xl, paddingHorizontal: spacing.sm, alignItems: 'center' },
  emptyTitle: { ...type.section, color: Colors.light.text, marginBottom: spacing.sm },
  emptyText: { ...type.body, color: Colors.light.textTertiary, textAlign: 'center', marginBottom: spacing.base },
  emptyButton: {
    minHeight: touch.min,
    backgroundColor: Colors.light.primaryLight,
    borderRadius: radius.input,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyButtonText: { ...type.bodyMedium, color: Colors.light.primary },
});
