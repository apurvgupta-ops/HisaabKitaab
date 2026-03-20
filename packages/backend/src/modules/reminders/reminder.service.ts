import { prisma } from '../../shared/database/prisma';
import { logger } from '../../shared/logger';
import { emitToUser } from '../../shared/socket/socketServer';
import { notificationQueue } from '../../shared/queue/bullQueue';

export interface PendingDebt {
  settlementId: string;
  groupId: string;
  groupName: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
  createdAt: Date;
  daysPending: number;
}

export const reminderService = {
  /**
   * Returns all pending (unsettled) debts for a given user.
   */
  async getPendingDebts(userId: string): Promise<PendingDebt[]> {
    const settlements = await prisma.settlement.findMany({
      where: {
        fromUserId: userId,
        status: 'pending',
      },
      include: {
        group: { select: { id: true, name: true } },
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const now = Date.now();
    return settlements.map((s) => ({
      settlementId: s.id,
      groupId: s.group.id,
      groupName: s.group.name,
      fromUserId: s.fromUser.id,
      fromUserName: s.fromUser.name,
      toUserId: s.toUser.id,
      toUserName: s.toUser.name,
      amount: Number(s.amount),
      currency: s.currency,
      createdAt: s.createdAt,
      daysPending: Math.floor((now - s.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  },

  /**
   * Sends a nudge notification to a specific user about a pending settlement.
   * Emits a real-time socket event and queues an email notification.
   */
  async sendNudge(
    fromUserId: string,
    settlementId: string,
  ): Promise<{ sent: boolean; message: string }> {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        fromUser: { select: { id: true, name: true, email: true } },
        toUser: { select: { id: true, name: true, email: true } },
        group: { select: { name: true } },
      },
    });

    if (!settlement) {
      return { sent: false, message: 'Settlement not found' };
    }

    if (settlement.status !== 'pending') {
      return { sent: false, message: 'Settlement is already completed' };
    }

    if (settlement.toUserId !== fromUserId && settlement.fromUserId !== fromUserId) {
      return { sent: false, message: 'You are not part of this settlement' };
    }

    const debtor = settlement.fromUser;
    const creditor = settlement.toUser;

    emitToUser(debtor.id, 'payment_nudge', {
      settlementId: settlement.id,
      from: creditor.name,
      amount: Number(settlement.amount),
      currency: settlement.currency,
      groupName: settlement.group.name,
      message: `${creditor.name} is reminding you about a pending payment of ${settlement.currency} ${Number(settlement.amount).toFixed(2)} in ${settlement.group.name}`,
      timestamp: new Date().toISOString(),
    });

    await notificationQueue.add(
      'nudge-email',
      {
        to: debtor.email,
        subject: `Reminder: You owe ${creditor.name} ${settlement.currency} ${Number(settlement.amount).toFixed(2)}`,
        body: `Hi ${debtor.name},\n\n${creditor.name} sent you a gentle reminder about a pending payment of ${settlement.currency} ${Number(settlement.amount).toFixed(2)} in the group "${settlement.group.name}".\n\nSettle up when you can!`,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
    );

    logger.info({ settlementId, from: fromUserId, to: debtor.id }, 'Payment nudge sent');

    return { sent: true, message: `Reminder sent to ${debtor.name}` };
  },

  /**
   * Processes overdue settlements and sends automatic reminders.
   * Called by the scheduled cron job.
   */
  async processOverdueReminders(): Promise<number> {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    const overdueSettlements = await prisma.settlement.findMany({
      where: {
        status: 'pending',
        createdAt: { lte: threeDaysAgo },
      },
      include: {
        fromUser: { select: { id: true, name: true } },
        toUser: { select: { id: true, name: true } },
        group: { select: { name: true } },
      },
    });

    let sent = 0;
    for (const settlement of overdueSettlements) {
      const daysPending = Math.floor(
        (Date.now() - settlement.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysPending === 3 || daysPending === 7 || daysPending === 14 || daysPending % 14 === 0) {
        emitToUser(settlement.fromUserId, 'payment_reminder', {
          settlementId: settlement.id,
          amount: Number(settlement.amount),
          currency: settlement.currency,
          toUserName: settlement.toUser.name,
          groupName: settlement.group.name,
          daysPending,
          message: `You have an outstanding payment of ${settlement.currency} ${Number(settlement.amount).toFixed(2)} to ${settlement.toUser.name} (${daysPending} days pending)`,
          timestamp: new Date().toISOString(),
        });
        sent++;
      }
    }

    logger.info({ count: sent }, 'Processed overdue payment reminders');
    return sent;
  },
};
