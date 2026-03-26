import type { AutomationProposal, AutomationSignal } from '../automation/types';

export function toProposal(signal: AutomationSignal): AutomationProposal {
  const amountMatch = signal.rawText.match(/(?:INR|Rs\.?|\$)\s?([0-9]+(?:\.[0-9]{1,2})?)/i);
  const merchantMatch = signal.rawText.match(/at\s+([A-Za-z0-9\s&-]+)/i);

  return {
    signal,
    proposal: {
      amount: amountMatch ? Number(amountMatch[1]) : undefined,
      currency: /INR|Rs\.?/i.test(signal.rawText) ? 'INR' : 'USD',
      merchant: merchantMatch?.[1]?.trim(),
      occurredAt: signal.receivedAt,
      notes: signal.rawText,
    },
  };
}

export function rankProposals(signals: AutomationSignal[]): AutomationProposal[] {
  return signals.map(toProposal).sort((a, b) => b.signal.confidence - a.signal.confidence);
}
