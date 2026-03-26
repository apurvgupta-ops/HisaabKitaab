import { useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { automationAdapter } from './features/automation';
import { captureReceipt } from './features/capture/receiptCapture';
import { uploadReceiptForOcr } from './features/inbox/inboxApi';
import { rankProposals } from './features/inbox/normalizer';
import type { AutomationProposal } from './features/automation/types';

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function ActionButton({ label, onPress }: { label: string; onPress: () => void | Promise<void> }) {
  return (
    <Pressable style={styles.button} onPress={() => void onPress()}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export default function App() {
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [automationProposals, setAutomationProposals] = useState<AutomationProposal[]>([]);
  const [receiptMessage, setReceiptMessage] = useState('No receipt scanned yet');

  const enableAutomation = async () => {
    if (!automationAdapter.isSupported()) {
      Alert.alert('Not available', 'Android automation is not available on this platform yet.');
      return;
    }

    const granted = await automationAdapter.requestPermissions();
    if (!granted) {
      Alert.alert(
        'Permission required',
        'SMS and notification permissions are required for automation.',
      );
      return;
    }

    setAutomationEnabled(true);
    Alert.alert('Automation enabled', 'Android automation permissions granted.');
  };

  const syncSignals = async () => {
    const signals = await automationAdapter.pollSignals();
    const proposals = rankProposals(signals);
    setAutomationProposals(proposals);

    if (proposals.length === 0) {
      Alert.alert('No signals', 'No new automation signals were detected.');
    }
  };

  const scanReceipt = async () => {
    const captured = await captureReceipt();
    if (!captured) {
      return;
    }

    try {
      const parsed = await uploadReceiptForOcr(captured);
      setReceiptMessage(
        `${parsed.receipt.merchant ?? 'Unknown merchant'} - ${parsed.receipt.total ?? 'N/A'} ${parsed.receipt.currency ?? ''}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload receipt';
      setReceiptMessage(message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Splitwise Mobile</Text>
        <Text style={styles.subheading}>
          Phase 2 foundation: Android-first automation and fast capture
        </Text>

        <Card
          title="Android Automation"
          subtitle="Permission-first ingestion pipeline (SMS and notification adapter)"
        >
          <Text style={styles.mutedText}>Status: {automationEnabled ? 'Enabled' : 'Disabled'}</Text>
          <View style={styles.actionsRow}>
            <ActionButton label="Enable" onPress={enableAutomation} />
            <ActionButton label="Sync" onPress={syncSignals} />
          </View>
        </Card>

        <Card title="Receipt Capture" subtitle="Camera to OCR via existing /uploads/receipt API">
          <Text style={styles.mutedText}>{receiptMessage}</Text>
          <ActionButton label="Scan Receipt" onPress={scanReceipt} />
        </Card>

        <Card title="Automation Inbox" subtitle="Normalized proposals waiting for user approval">
          {automationProposals.length === 0 ? (
            <Text style={styles.mutedText}>No proposals yet.</Text>
          ) : (
            automationProposals.map((proposal) => (
              <View key={proposal.signal.id} style={styles.proposalRow}>
                <Text style={styles.proposalMerchant}>
                  {proposal.proposal.merchant ?? 'Unknown merchant'}
                </Text>
                <Text style={styles.proposalMeta}>
                  {proposal.proposal.amount ?? 'N/A'} {proposal.proposal.currency ?? ''} - conf{' '}
                  {proposal.signal.confidence}
                </Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: '#f8fafc',
  },
  subheading: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#111827',
    borderColor: '#1f2937',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  cardTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  cardBody: {
    marginTop: 10,
    gap: 10,
  },
  mutedText: {
    color: '#cbd5e1',
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  buttonText: {
    color: '#ecfeff',
    fontSize: 13,
    fontWeight: '600',
  },
  proposalRow: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    padding: 10,
  },
  proposalMerchant: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  proposalMeta: {
    color: '#93c5fd',
    fontSize: 12,
    marginTop: 4,
  },
});
