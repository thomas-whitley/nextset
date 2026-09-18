import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const ASKED_KEY = 'rest_notif_asked';
const CHANNEL = 'rest-timer';
let scheduledId: string | null = null;

export async function hasAskedRestPermission(): Promise<boolean> {
  return (await AsyncStorage.getItem(ASKED_KEY)) === '1';
}

/** Ask the OS at most once (spec §5.1). Callers show their own one-line explanation first. */
export async function ensureRestPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return 'granted';
  if (await hasAskedRestPermission()) return current.status === 'denied' ? 'denied' : 'undetermined';
  await AsyncStorage.setItem(ASKED_KEY, '1');
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === 'granted' ? 'granted' : 'denied';
}

/** Alerts are suppressed while the app is in the foreground; the banner covers that case (D5). */
export function installForegroundHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Rest timer', importance: Notifications.AndroidImportance.HIGH, sound: 'default' });
  }
}

export async function cancelRestNotification(): Promise<void> {
  if (!scheduledId) return;
  const id = scheduledId;
  scheduledId = null;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export async function scheduleRestNotification(endsAt: number, exerciseName: string, setNumber: number): Promise<void> {
  await cancelRestNotification();
  if ((await Notifications.getPermissionsAsync()).status !== 'granted') return;
  scheduledId = await Notifications.scheduleNotificationAsync({
    content: { title: 'NextSet', body: `Rest over — ${exerciseName}, set ${setNumber}`, sound: 'default', ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt) },
  });
}
