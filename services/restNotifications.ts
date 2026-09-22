import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const ASKED_KEY = 'rest_notif_asked';
const CHANNEL = 'rest-timer';
const EXACT_PROMPTED_KEY = 'rest_exact_alarm_prompted_v1';
let scheduledId: string | null = null;

export async function hasAskedRestPermission(): Promise<boolean> {
  return (await AsyncStorage.getItem(ASKED_KEY)) === '1';
}

/** Records that the explainer was shown and dismissed with "Not now" — never fires the OS prompt. */
export async function markRestPermissionAsked(): Promise<void> {
  await AsyncStorage.setItem(ASKED_KEY, '1');
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

/**
 * Opens this app's "Alarms & reminders" page. Always available, unlike the
 * one-time redirect below: a user who never saw that prompt — anyone who had
 * already granted notification permission before it shipped — otherwise has no
 * route to exact alarms and their rest alerts stay up to a minute late (F8).
 * Returns false when the page does not exist (iOS, Android < 12).
 */
export async function openExactAlarmSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return false;
  const pkg = Constants.expoConfig?.android?.package ?? 'com.twhitley.momentumgymtracker';
  await IntentLauncher.startActivityAsync('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', { data: `package:${pkg}` });
  return true;
}

/** Android 12+ only fires alarms on time if the user allows "Alarms & reminders". Send them there once. */
export async function openExactAlarmSettingsOnce(): Promise<boolean> {
  if (Platform.OS !== 'android' || Number(Platform.Version) < 31) return false;
  if (await AsyncStorage.getItem(EXACT_PROMPTED_KEY)) return false;
  await AsyncStorage.setItem(EXACT_PROMPTED_KEY, '1');
  return openExactAlarmSettings();
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
    content: { title: 'NextSet', body: `Rest over — ${exerciseName}, set ${setNumber}`, sound: 'default' },
    // On Android the channel is a property of the trigger, not the content; in the
    // content it is ignored and the alert lands on expo's silent fallback channel.
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endsAt), ...(Platform.OS === 'android' ? { channelId: CHANNEL } : {}) },
  });
}
