import type { Metadata } from 'next';
import DashboardClient from './DashboardClient';

export const metadata: Metadata = {
  title: 'Dashboard | Splitwise',
  description: 'View your financial overview, recent activity, and spending summary at a glance.',
};

export default function DashboardPage() {
  return <DashboardClient />;
}
