import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Shield, LifeBuoy, ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Colors from '@/constants/Colors';
import { spacing, radius, type, HIT_SLOP } from '@/constants/theme';
import { LEGAL_URLS, SUPPORT_EMAIL, EXERCISE_DB_URL } from '@/constants/Links';
import { ExerciseService } from '@/services/exerciseService';

const open = (url: string) => Linking.openURL(url).catch((e) => console.error('Failed to open URL:', e));

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '1.0.1';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} hitSlop={HIT_SLOP} accessibilityRole="button" accessibilityLabel="Back">
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
      >
        <View style={styles.hero}>
          <View style={styles.ring}>
            <View style={styles.hub} />
          </View>
          <Text style={styles.appName}>NextSet</Text>
          <Text style={styles.version}>Version {version}</Text>
        </View>

        <Text style={styles.body}>
          NextSet is a gym workout log. Pick a program, log each set as you do it, and see what you lifted last time
          next to every set. Weights are in kilograms. Your workouts are saved to your account so they survive a new phone.
        </Text>

        <View style={styles.card}>
          <Row icon={<Mail size={20} color={Colors.light.primary} />} title="Contact" subtitle={SUPPORT_EMAIL} onPress={() => open(`mailto:${SUPPORT_EMAIL}`)} />
          <Row icon={<LifeBuoy size={20} color={Colors.light.primary} />} title="Support" subtitle="Help and account deletion" onPress={() => open(LEGAL_URLS.support)} />
          <Row icon={<Shield size={20} color={Colors.light.primary} />} title="Privacy policy" subtitle="What we store and why" onPress={() => open(LEGAL_URLS.privacy)} last />
        </View>

        <Text style={styles.sectionTitle}>Credits</Text>
        <Text style={styles.credit}>
          The exercise library ({ExerciseService.count} exercises) includes data from free-exercise-db, released under the Unlicense.
        </Text>
        <TouchableOpacity style={styles.link} onPress={() => open(EXERCISE_DB_URL)} hitSlop={HIT_SLOP} accessibilityRole="link">
          <Text style={styles.linkText}>github.com/yuhonas/free-exercise-db</Text>
          <ExternalLink size={14} color={Colors.light.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, title, subtitle, onPress, last }: { icon: React.ReactNode; title: string; subtitle: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.row, last && styles.rowLast]} onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <ExternalLink size={16} color={Colors.light.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: { width: spacing.xxxl, height: spacing.xxxl, justifyContent: 'center' },
  headerTitle: { ...type.section, color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: spacing.lg },
  hero: { alignItems: 'center', paddingVertical: spacing.xxl },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 10,
    borderColor: Colors.light.primary,
    backgroundColor: Colors.light.rubber,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  hub: { width: 14, height: 14, borderRadius: 7, backgroundColor: Colors.light.concrete },
  appName: { ...type.title, color: Colors.light.text },
  version: { ...type.label, color: Colors.light.textTertiary, marginTop: spacing.xs },
  body: { ...type.body, color: Colors.light.textSecondary, marginBottom: spacing.xl },
  card: { backgroundColor: Colors.light.card, borderRadius: radius.card, paddingHorizontal: spacing.base, marginBottom: spacing.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md + spacing.xs / 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: spacing.xxl + spacing.xs, alignItems: 'flex-start' },
  rowTitle: { ...type.bodyMedium, color: Colors.light.text },
  rowSubtitle: { ...type.label, color: Colors.light.textTertiary, marginTop: spacing.xs / 2 },
  sectionTitle: { ...type.eyebrow, color: Colors.light.textTertiary, marginBottom: spacing.sm, marginLeft: spacing.xs },
  credit: { ...type.body, color: Colors.light.textSecondary },
  link: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, marginTop: spacing.sm, marginBottom: spacing.xxxl },
  linkText: { ...type.bodyMedium, color: Colors.light.primary },
});
