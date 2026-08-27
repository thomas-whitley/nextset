import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Mail, Shield, LifeBuoy, ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import Colors from '@/constants/Colors';
import { LEGAL_URLS, SUPPORT_EMAIL, EXERCISE_DB_URL } from '@/constants/Links';
import { ExerciseService } from '@/services/exerciseService';

const open = (url: string) => Linking.openURL(url).catch((e) => console.error('Failed to open URL:', e));

export default function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.1';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <ArrowLeft size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
        <TouchableOpacity style={styles.link} onPress={() => open(EXERCISE_DB_URL)} accessibilityRole="link">
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'Inter-Bold', color: Colors.light.text },
  content: { flex: 1, paddingHorizontal: 20 },
  hero: { alignItems: 'center', paddingVertical: 32 },
  ring: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 10,
    borderColor: '#1C4FA1',
    backgroundColor: '#141517',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  hub: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#EEF0ED' },
  appName: { fontSize: 28, fontFamily: 'Inter-Bold', color: Colors.light.text },
  version: { fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.light.textTertiary, marginTop: 4 },
  body: { fontSize: 16, fontFamily: 'Inter-Regular', color: Colors.light.textSecondary, lineHeight: 24, marginBottom: 24 },
  card: { backgroundColor: Colors.light.card, borderRadius: 16, paddingHorizontal: 16, marginBottom: 28 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: { width: 36, alignItems: 'flex-start' },
  rowTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', color: Colors.light.text },
  rowSubtitle: { fontSize: 13, fontFamily: 'Inter-Regular', color: Colors.light.textTertiary, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontFamily: 'Inter-SemiBold', color: Colors.light.textTertiary, marginBottom: 8 },
  credit: { fontSize: 14, fontFamily: 'Inter-Regular', color: Colors.light.textSecondary, lineHeight: 20 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 40 },
  linkText: { fontSize: 14, fontFamily: 'Inter-Medium', color: Colors.light.primary },
});
