import type { Metadata } from 'next';
import HouseholdClient from './HouseholdClient';

export const metadata: Metadata = {
  title: 'Household | Splitwise',
  description: 'Track shared household spending fairness and contribution balance.',
};

export default function HouseholdPage() {
  return <HouseholdClient />;
}
