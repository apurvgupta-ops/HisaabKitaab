import type { Request, Response } from 'express';
import { env } from '../../config';
import { redis } from '../../shared/cache/redis';
import { logger } from '../../shared/logger';
import { AppError } from '../../middleware/errorHandler';

const STRIPE_EVENT_ID_PREFIX = 'stripe_event:';
const IDEMPOTENCY_TTL = 24 * 60 * 60; // 24 hours

/**
 * Verifies Stripe webhook signature using the raw body and STRIPE_WEBHOOK_SECRET.
 * Returns the parsed event or throws.
 * Requires raw body - do NOT use express.json() for this route.
 */
function verifyStripeWebhook(
  payload: Buffer | string,
  signature: string | undefined,
  secret: string,
): Record<string, unknown> {
  if (!signature || !secret) {
    throw AppError.unauthorized('Missing Stripe signature or webhook secret');
  }

  try {
    // Use dynamic import to avoid loading stripe when not configured
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const stripe = require('stripe')(env.stripe.secretKey || 'sk_test_placeholder');
    const event = stripe.webhooks.constructEvent(payload, signature, secret);
    return event as unknown as Record<string, unknown>;
  } catch (err) {
    logger.warn({ err }, 'Stripe webhook signature verification failed');
    throw AppError.unauthorized('Invalid Stripe webhook signature');
  }
}

/**
 * Checks if we've already processed this event (idempotency).
 * Returns true if duplicate, false if new.
 */
async function isDuplicateEvent(eventId: string): Promise<boolean> {
  const key = `${STRIPE_EVENT_ID_PREFIX}${eventId}`;
  const exists = await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL, 'NX');
  return exists !== 'OK';
}

/**
 * Stripe webhook handler. Mount with express.raw({ type: 'application/json' }).
 * Verifies signature and implements idempotent event processing.
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  const webhookSecret = env.stripe.webhookSecret;
  if (!webhookSecret) {
    logger.warn('Stripe webhook received but STRIPE_WEBHOOK_SECRET not configured');
    res.status(501).json({ error: 'Webhook not configured' });
    return;
  }

  const rawBody = req.body;
  if (!(rawBody instanceof Buffer)) {
    logger.warn('Stripe webhook received without raw body');
    res.status(400).json({ error: 'Invalid payload' });
    return;
  }

  const signature = req.headers['stripe-signature'] as string | undefined;

  try {
    const event = verifyStripeWebhook(rawBody, signature, webhookSecret);
    const eventId = event.id as string;

    if (await isDuplicateEvent(eventId)) {
      logger.info({ eventId }, 'Stripe webhook duplicate - skipping');
      res.status(200).json({ received: true });
      return;
    }

    const eventType = event.type as string;
    logger.info({ eventId, eventType }, 'Stripe webhook received');

    // Handle event types - extend as payment flows are added
    switch (eventType) {
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
      case 'charge.succeeded':
      case 'charge.failed':
        // TODO: Integrate with settlement/payment flow
        break;
      default:
        logger.debug({ eventType }, 'Unhandled Stripe event type');
    }

    res.status(200).json({ received: true });
  } catch (err) {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ error: err.message });
      return;
    }
    logger.error({ err }, 'Stripe webhook error');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
