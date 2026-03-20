import type { Metadata } from 'next';
import InsightsClient from './InsightsClient';

export const metadata: Metadata = {
  title: 'AI Insights | Splitwise',
  description: 'Get AI-powered financial insights, spending trends, and personalized suggestions.',
};

export default function InsightsPage() {
  return <InsightsClient />;
}
