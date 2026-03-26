import { Platform, PermissionsAndroid } from 'react-native';
import type { AndroidAutomationAdapter, AutomationSignal } from './types';

async function requestSmsPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  const required = [
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  ].filter(Boolean) as string[];

  const statuses = await PermissionsAndroid.requestMultiple(required);
  return required.every(
    (permission) => statuses[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
}

/**
 * Android-first automation adapter.
 *
 * This is intentionally integration-ready but safe by default.
 * For production, wire a native bridge (SMS Retriever / notification listener)
 * and replace `pollSignals` with real ingestion.
 */
export const androidAutomationAdapter: AndroidAutomationAdapter = {
  isSupported: () => Platform.OS === 'android',

  requestPermissions: async () => {
    try {
      return await requestSmsPermissions();
    } catch {
      return false;
    }
  },

  pollSignals: async (): Promise<AutomationSignal[]> => {
    return [];
  },
};
