import type { Metadata } from 'next';
import CategorizeClient from './CategorizeClient';

export const metadata: Metadata = {
  title: 'Smart Categorize | Splitwise',
  description: 'Use AI to automatically categorize expenses and parse natural language inputs.',
};

export default function CategorizePage() {
  return <CategorizeClient />;
}
