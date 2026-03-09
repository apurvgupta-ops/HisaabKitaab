import { prisma } from '../../shared/database/prisma';
import { cacheGet, cacheSet, cacheDeletePattern } from '../../shared/cache/redis';
import { AppError } from '../../middleware/errorHandler';
import { emitToGroup, emitToUser } from '../../shared/socket/socketServer';
import type { CreateSettlementInput, UpdateSettlementStatusInput } from '@splitwise/shared';

const SIMPLIFIED_DEBTS_TTL = 300;

const settlementInclude = {
  fromUser: { select: { id: true, name: true, email: true, avatar: true } },
  toUser: { select: { id: true, name: true, email: true, avatar: true } },
  group: { select: { id: true, name: true, currency: true } },
} as const;

const serialiseSettlement = (settlement: Record<string, unknown>) => ({
  ...settlement,
  amount: Number(settlement.amount),
});

async function checkMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!membership) {
    throw AppError.forbidden('You are not a member of this group');
  }

  return membership;
}

export const settlementService = {
  /**
   * Creates a pending settlement between two group members and notifies the recipient.
   */
  async createSettlement(userId: string, data: CreateSettlementInput) {
    await checkMembership(data.groupId, userId);
    await checkMembership(data.groupId, data.toUserId);

    if (userId === data.toUserId) {
      throw AppError.badRequest('Cannot create a settlement with yourself');
    }

    const settlement = await prisma.settlement.create({
      data: {
        groupId: data.groupId,
        fromUserId: userId,
        toUserId: data.toUserId,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod ?? null,
        note: data.note ?? null,
        status: 'pending',
      },
      include: settlementInclude,
    });

    await cacheDeletePattern(`group:${data.groupId}:simplified*`);

    const serialised = serialiseSettlement(settlement as unknown as Record<string, unknown>);
    emitToGroup(data.groupId, 'settlement_created', serialised);
    emitToUser(data.toUserId, 'settlement_received', serialised);

    return serialised;
  },

  /**
   * Returns all settlements for a group with payer/payee details.
   */
  async getGroupSettlements(groupId: string, userId: string) {
    await checkMembership(groupId, userId);

    const settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: settlementInclude,
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map((s) =>
      serialiseSettlement(s as unknown as Record<string, unknown>),
    );
  },

  /**
   * Returns all settlements where the user is either the sender or receiver.
   */
  async getUserSettlements(userId: string) {
    const settlements = await prisma.settlement.findMany({
      where: {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      },
      include: settlementInclude,
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map((s) =>
      serialiseSettlement(s as unknown as Record<string, unknown>),
    );
  },

  /**
   * Updates settlement status. Only the recipient (toUser) can confirm or reject.
   */
  async updateSettlementStatus(
    settlementId: string,
    userId: string,
    data: UpdateSettlementStatusInput,
  ) {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw AppError.notFound('Settlement');
    }

    if (settlement.toUserId !== userId) {
      throw AppError.forbidden('Only the recipient can confirm or reject a settlement');
    }

    if (settlement.status !== 'pending') {
      throw AppError.badRequest(`Settlement is already ${settlement.status}`);
    }

    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: data.status,
        settledAt: data.status === 'confirmed' ? new Date() : settlement.settledAt,
      },
      include: settlementInclude,
    });

    await cacheDeletePattern(`group:${settlement.groupId}:simplified*`);

    const serialised = serialiseSettlement(updated as unknown as Record<string, unknown>);
    emitToGroup(settlement.groupId, 'settlement_updated', serialised);
    emitToUser(settlement.fromUserId, 'settlement_status_changed', serialised);

    return serialised;
  },

  /**
   * Computes simplified debts for a group using the min-cash-flow algorithm.
   *
   * Algorithm:
   * 1. Compute net balance per member from expense payers/splits and confirmed settlements.
   * 2. Positive balance = creditor (owed money), negative = debtor (owes money).
   * 3. Greedily match max creditor with max debtor, settle min of their absolute values.
   * 4. Repeat until all settled — this minimises the number of transactions.
   */
  async getSimplifiedDebts(groupId: string, userId: string) {
    await checkMembership(groupId, userId);

    const cacheKey = `group:${groupId}:simplified`;
    const cached = await cacheGet<unknown[]>(cacheKey);
    if (cached) return cached;

    const members = await prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    const memberMap = new Map(members.map((m) => [m.userId, m.user]));

    const payers = await prisma.expensePayer.findMany({
      where: { expense: { groupId } },
      select: { userId: true, amount: true },
    });

    const splits = await prisma.expenseSplit.findMany({
      where: { expense: { groupId } },
      select: { userId: true, amount: true },
    });

    const confirmedSettlements = await prisma.settlement.findMany({
      where: { groupId, status: 'confirmed' },
      select: { fromUserId: true, toUserId: true, amount: true },
    });

    const balanceMap = new Map<string, number>();
    for (const m of members) {
      balanceMap.set(m.userId, 0);
    }

    for (const p of payers) {
      balanceMap.set(p.userId, (balanceMap.get(p.userId) ?? 0) + Number(p.amount));
    }

    for (const s of splits) {
      balanceMap.set(s.userId, (balanceMap.get(s.userId) ?? 0) - Number(s.amount));
    }

    for (const s of confirmedSettlements) {
      balanceMap.set(s.fromUserId, (balanceMap.get(s.fromUserId) ?? 0) - Number(s.amount));
      balanceMap.set(s.toUserId, (balanceMap.get(s.toUserId) ?? 0) + Number(s.amount));
    }

    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];

    for (const [uid, balance] of balanceMap) {
      const rounded = Math.round(balance * 100) / 100;
      if (rounded > 0.01) {
        creditors.push({ userId: uid, amount: rounded });
      } else if (rounded < -0.01) {
        debtors.push({ userId: uid, amount: Math.abs(rounded) });
      }
    }

    const transactions: { from: unknown; to: unknown; amount: number }[] = [];

    while (creditors.length > 0 && debtors.length > 0) {
      creditors.sort((a, b) => b.amount - a.amount);
      debtors.sort((a, b) => b.amount - a.amount);

      const maxCreditor = creditors[0]!;
      const maxDebtor = debtors[0]!;

      const settleAmount = Math.round(Math.min(maxCreditor.amount, maxDebtor.amount) * 100) / 100;

      transactions.push({
        from: memberMap.get(maxDebtor.userId),
        to: memberMap.get(maxCreditor.userId),
        amount: settleAmount,
      });

      maxCreditor.amount = Math.round((maxCreditor.amount - settleAmount) * 100) / 100;
      maxDebtor.amount = Math.round((maxDebtor.amount - settleAmount) * 100) / 100;

      if (maxCreditor.amount < 0.01) creditors.shift();
      if (maxDebtor.amount < 0.01) debtors.shift();
    }

    await cacheSet(cacheKey, transactions, SIMPLIFIED_DEBTS_TTL);

    return transactions;
  },
};
