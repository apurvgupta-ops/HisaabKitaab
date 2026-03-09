import type { UserSummary } from './user';

export type GroupType = 'trip' | 'home' | 'couple' | 'project' | 'other';
export type MemberRole = 'admin' | 'member';

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  currency: string;
  settings: GroupSettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupSettings {
  simplifyDebts: boolean;
  defaultSplitType: string;
  allowSettlements: boolean;
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  user?: UserSummary;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

export interface GroupBalance {
  userId: string;
  userName: string;
  balance: number;
}

export interface DebtEdge {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
}

export interface GroupBalanceSummary {
  groupId: string;
  balances: GroupBalance[];
  simplifiedDebts: DebtEdge[];
  totalExpenses: number;
}
