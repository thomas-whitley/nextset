import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';
import {
  ensureRestPermission,
  scheduleRestNotification,
  cancelRestNotification,
  hasAskedRestPermission,
  markRestPermissionAsked,
  openExactAlarmSettingsOnce,
} from '../restNotifications';

jest.mock('expo-intent-launcher', () => ({
  __esModule: true,
  startActivityAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { android: { package: 'com.twhitley.momentumgymtracker' } } },
}));

beforeEach(async () => { await AsyncStorage.clear(); jest.clearAllMocks(); });

describe('markRestPermissionAsked', () => {
  it('records that the explainer was asked without calling the OS prompt', async () => {
    expect(await hasAskedRestPermission()).toBe(false);
    await markRestPermissionAsked();
    expect(await hasAskedRestPermission()).toBe(true);
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('ensureRestPermission', () => {
  it('asks once and records that it asked', async () => {
    expect(await hasAskedRestPermission()).toBe(false);
    expect(await ensureRestPermission()).toBe('granted');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(await hasAskedRestPermission()).toBe(true);
  });
  it('does not re-ask after a denial', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    expect(await ensureRestPermission()).toBe('denied');
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    expect(await ensureRestPermission()).toBe('denied');
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

describe('scheduleRestNotification', () => {
  beforeEach(() => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  });
  // The module keeps its last scheduled id as private state; reset it after
  // each test so one test's schedule can't leak into the next test's "no-op" check.
  afterEach(async () => {
    await cancelRestNotification();
  });

  it('cancels the previous one and schedules at endsAt with the spec copy', async () => {
    await scheduleRestNotification(2_000_000, 'Bench', 2);
    await scheduleRestNotification(3_000_000, 'Bench', 3);
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
    const arg = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[1][0];
    expect(arg.content.body).toBe('Rest over — Bench, set 3');
    expect(arg.trigger.date).toEqual(new Date(3_000_000));
  });
  it('cancel is a no-op when nothing is scheduled', async () => {
    await cancelRestNotification();
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('openExactAlarmSettingsOnce', () => {
  const originalOS = Platform.OS;
  const originalVersionDescriptor = Object.getOwnPropertyDescriptor(Platform, 'Version');

  afterEach(() => {
    Platform.OS = originalOS;
    if (originalVersionDescriptor) Object.defineProperty(Platform, 'Version', originalVersionDescriptor);
  });

  it('opens the exact-alarm settings page once on Android 12+ and remembers it', async () => {
    Platform.OS = 'android';
    Object.defineProperty(Platform, 'Version', { value: 34, configurable: true });

    expect(await openExactAlarmSettingsOnce()).toBe(true);
    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledWith('android.settings.REQUEST_SCHEDULE_EXACT_ALARM', {
      data: 'package:com.twhitley.momentumgymtracker',
    });

    expect(await openExactAlarmSettingsOnce()).toBe(false);
    expect(IntentLauncher.startActivityAsync).toHaveBeenCalledTimes(1);
  });

  it('resolves false on iOS without touching storage', async () => {
    Platform.OS = 'ios';

    expect(await openExactAlarmSettingsOnce()).toBe(false);
    expect(IntentLauncher.startActivityAsync).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('rest_exact_alarm_prompted_v1')).toBeNull();
  });
});
