import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Clock, Zap, Timer } from 'lucide-react-native';
import Colors from '@/constants/Colors';

export default function TimerTab() {
  const handleNavigateToTimers = () => {
    router.push('/timer-main');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Timers</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.timerCard}
          onPress={handleNavigateToTimers}
        >
          <View style={styles.timerIconContainer}>
            <Clock size={48} color={Colors.light.primary} />
          </View>
          <Text style={styles.timerTitle}>Workout Timers</Text>
          <Text style={styles.timerDescription}>
            Interval, circuit, and HIIT timers for your workouts
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.timerCard}>
          <View style={styles.timerIconContainer}>
            <Timer size={48} color={Colors.light.success} />
          </View>
          <Text style={styles.timerTitle}>Rest Timer</Text>
          <Text style={styles.timerDescription}>
            Simple countdown timer for between sets
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.timerCard}>
          <View style={styles.timerIconContainer}>
            <Zap size={48} color={Colors.light.accent} />
          </View>
          <Text style={styles.timerTitle}>Tabata Timer</Text>
          <Text style={styles.timerDescription}>
            Classic 20/10 Tabata interval timer
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  timerCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  timerIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.light.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  timerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  timerDescription: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: Colors.light.textTertiary,
    textAlign: 'center',
  },
});