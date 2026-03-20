import { Queue } from 'bullmq';
import { createWorker } from './bullQueue';
import { reminderService } from '../../modules/reminders/reminder.service';
import { recurringService } from '../../modules/recurring/recurring.service';
import { logger } from '../logger';
import { env } from '../../config';

const connection = {
  host: new URL(env.redisUrl).hostname || 'localhost',
  port: parseInt(new URL(env.redisUrl).port || '6379', 10),
};

export const reminderSchedulerQueue = new Queue('reminder-scheduler', { connection });
export const recurringExpenseQueue = new Queue('recurring-expenses', { connection });

/**
 * Registers all background workers.
 * Call once during server startup.
 */
export const registerWorkers = (): void => {
  createWorker<void>('reminder-scheduler', async () => {
    const count = await reminderService.processOverdueReminders();
    logger.info({ count }, 'Overdue reminder job completed');
  });

  createWorker<void>('recurring-expenses', async () => {
    const count = await recurringService.processRecurringExpenses();
    logger.info({ count }, 'Recurring expense job completed');
  });

  logger.info('Background workers registered');
};

/**
 * Schedules all recurring cron jobs.
 */
export const scheduleRecurringJobs = async (): Promise<void> => {
  await reminderSchedulerQueue.upsertJobScheduler(
    'daily-overdue-reminders',
    { pattern: '0 9 * * *' },
    { name: 'process-overdue-reminders' },
  );

  await recurringExpenseQueue.upsertJobScheduler(
    'daily-recurring-expenses',
    { pattern: '0 0 * * *' },
    { name: 'process-recurring-expenses' },
  );

  logger.info('Recurring jobs scheduled');
};
