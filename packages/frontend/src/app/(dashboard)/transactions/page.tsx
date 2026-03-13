import type { Metadata } from 'next';
import TransactionsClient from './TransactionsClient';

export const metadata: Metadata = {
  title: 'Transactions | Splitwise',
  description: 'View and manage all your transactions, payments, and expense history.',
};

export default function TransactionsPage() {
  return <TransactionsClient />;
}
