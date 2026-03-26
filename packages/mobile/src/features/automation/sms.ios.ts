import type { AndroidAutomationAdapter } from './types';

export const iosAutomationAdapter: AndroidAutomationAdapter = {
  isSupported: () => false,
  requestPermissions: async () => false,
  pollSignals: async () => [],
};
