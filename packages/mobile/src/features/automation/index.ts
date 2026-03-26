import { Platform } from 'react-native';
import { androidAutomationAdapter } from './sms.android';
import { iosAutomationAdapter } from './sms.ios';

export const automationAdapter =
  Platform.OS === 'android' ? androidAutomationAdapter : iosAutomationAdapter;
