export type SettlementStatus = 'pending' | 'confirmed' | 'rejected';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'stripe' | 'razorpay' | 'other';

export interface Settlement {
  id: string;
  groupId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  currency: string;
  status: SettlementStatus;
  paymentMethod: PaymentMethod | null;
  paymentDetails: Record<string, unknown> | null;
  note: string | null;
  settledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettlementWithUsers extends Settlement {
  fromUser: { id: string; name: string; avatar: string | null };
  toUser: { id: string; name: string; avatar: string | null };
}
