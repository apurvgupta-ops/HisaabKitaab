import { Queue, Worker, type Job } from 'bullmq';
import { env } from '../../config';
import { logger } from '../logger';

const connection = {
  host: new URL(env.redisUrl).hostname || 'localhost',
  port: parseInt(new URL(env.redisUrl).port || '6379', 10),
};

export const notificationQueue = new Queue('notifications', { connection });
export const reportQueue = new Queue('reports', { connection });
export const debtCalculationQueue = new Queue('debt-calculation', { connection });

export const createWorker = <T>(
  queueName: string,
  processor: (job: Job<T>) => Promise<void>
): Worker<T> => {
  const worker = new Worker<T>(queueName, processor, { connection });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queue: queueName }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, queue: queueName, err }, 'Job failed');
  });

  return worker;
};
