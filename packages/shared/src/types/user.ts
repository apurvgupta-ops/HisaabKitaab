export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  preferredCurrency: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
  defaultSplitType: SplitType;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  expenseAdded: boolean;
  settlementReceived: boolean;
  budgetAlert: boolean;
  weeklyReport: boolean;
}

export type SplitType = 'equal' | 'percentage' | 'exact' | 'shares';

export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}
