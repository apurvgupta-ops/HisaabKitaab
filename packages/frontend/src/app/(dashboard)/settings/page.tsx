import type { Metadata } from 'next';
import SettingsClient from './SettingsClient';

export const metadata: Metadata = {
  title: 'Settings | Splitwise',
  description: 'Manage your profile, notification preferences, theme, and account settings.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
