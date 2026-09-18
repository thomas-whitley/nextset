import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { ensureRestPermission, scheduleRestNotification, cancelRestNotification, hasAskedRestPermission, markRestPermissionAsked } from '../restNotifications';

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
