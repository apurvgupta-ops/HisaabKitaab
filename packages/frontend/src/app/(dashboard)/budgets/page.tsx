import type { Metadata } from 'next';
import BudgetsClient from './BudgetsClient';

export const metadata: Metadata = {
  title: 'Budgets | Splitwise',
  description: 'Set and track spending budgets by category. Stay on top of your financial goals.',
};

export default function BudgetsPage() {
  return <BudgetsClient />;
}
