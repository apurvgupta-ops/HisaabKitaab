import type { Metadata } from 'next';
import ReceiptScannerClient from './ReceiptScannerClient';

export const metadata: Metadata = {
  title: 'Receipt Scanner | Splitwise',
  description: 'Scan receipts with AI to auto-fill expenses.',
};

export default function ReceiptScannerPage() {
  return <ReceiptScannerClient />;
}
