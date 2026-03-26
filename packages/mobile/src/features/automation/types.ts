import { Platform } from 'react-native';

export type AutomationSource = 'sms' | 'notification' | 'receipt' | 'manual';

export interface AutomationSignal {
  id: string;
  source: AutomationSource;
  receivedAt: string;
  rawText: string;
  confidence: number;
  metadata?: Record<string, string | number | boolean>;
}

export interface ProposedExpense {
  groupId?: string;
  amount?: number;
  currency?: string;
  merchant?: string;
  occurredAt?: string;
  notes?: string;
}

export interface AutomationProposal {
  signal: AutomationSignal;
  proposal: ProposedExpense;
}

export interface AndroidAutomationAdapter {
  isSupported: () => boolean;
  requestPermissions: () => Promise<boolean>;
  pollSignals: () => Promise<AutomationSignal[]>;
}

export const isAndroid = Platform.OS === 'android';
