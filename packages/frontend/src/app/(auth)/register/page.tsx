import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Create Account | Splitwise',
  description:
    'Create a free Splitwise account to start splitting expenses, tracking budgets, and managing group finances.',
  openGraph: {
    title: 'Create Account | Splitwise',
    description: 'Join Splitwise for free and start splitting expenses with friends.',
  },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
