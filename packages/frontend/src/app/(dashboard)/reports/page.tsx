import type { Metadata } from 'next';
import ReportsClient from './ReportsClient';

export const metadata: Metadata = {
  title: 'Reports | Splitwise',
  description:
    'Analyze your spending patterns with detailed charts, category breakdowns, and trend reports.',
};

export default function ReportsPage() {
  return <ReportsClient />;
}
