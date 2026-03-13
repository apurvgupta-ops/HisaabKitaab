import type { Metadata } from 'next';
import GroupsClient from './GroupsClient';

export const metadata: Metadata = {
  title: 'Groups | Splitwise',
  description: 'Create and manage expense groups for trips, households, events, and more.',
};

export default function GroupsPage() {
  return <GroupsClient />;
}
