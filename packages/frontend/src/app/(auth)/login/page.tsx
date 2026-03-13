import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In | Splitwise',
  description:
    'Sign in to your Splitwise account to manage shared expenses, track balances, and settle debts with friends.',
  openGraph: {
    title: 'Sign In | Splitwise',
    description: 'Access your Splitwise account to manage shared expenses.',
  },
};

export default function LoginPage() {
  return <LoginClient />;
}
