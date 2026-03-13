import type { Metadata } from 'next';
import GroupDetailClient from './GroupDetailClient';

export const metadata: Metadata = {
  title: 'Group Details | Splitwise',
  description: 'View group expenses, balances, and members. Add new expenses and settle debts.',
};

export default function GroupDetailPage() {
  return <GroupDetailClient />;
}
