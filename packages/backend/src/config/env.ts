import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),

  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  GOOGLE_CLIENT_ID: z.string().default(''),
  GOOGLE_CLIENT_SECRET: z.string().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:4000/api/auth/google/callback'),

  AWS_REGION: z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  S3_BUCKET: z.string().default('splitwise-uploads'),

  ANTHROPIC_API_KEY: z.string().default(''),

  STRIPE_SECRET_KEY: z.string().default(''),
  STRIPE_WEBHOOK_SECRET: z.string().default(''),

  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().int().default(587),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  EMAIL_FROM: z.string().default('noreply@splitwise.app'),

  EXCHANGE_RATE_API_KEY: z.string().default(''),
  SENTRY_DSN: z.string().default(''),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
});

/**
 * In development/test, allow fallback JWT secrets so the app can start
 * without a fully configured .env. In production, these MUST be set.
 */
const rawEnv = {
  ...process.env,
  JWT_SECRET:
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'dev-jwt-secret-do-not-use-in-prod' : undefined),
  JWT_REFRESH_SECRET:
    process.env.JWT_REFRESH_SECRET ||
    (process.env.NODE_ENV !== 'production'
      ? 'dev-jwt-refresh-secret-do-not-use-in-prod'
      : undefined),
  DATABASE_URL:
    process.env.DATABASE_URL ||
    (process.env.NODE_ENV !== 'production'
      ? 'postgresql://splitwise:splitwise_dev@localhost:5433/splitwise'
      : undefined),
  REDIS_URL:
    process.env.REDIS_URL ||
    (process.env.NODE_ENV !== 'production' ? 'redis://localhost:6379' : undefined),
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  console.error(`\n❌ Invalid environment variables:\n${formatted}\n`);
  process.exit(1);
}

const validated = parsed.data;

export const env = {
  nodeEnv: validated.NODE_ENV,
  port: validated.PORT,
  frontendUrl: validated.FRONTEND_URL,

  databaseUrl: validated.DATABASE_URL,
  redisUrl: validated.REDIS_URL,

  jwt: {
    secret: validated.JWT_SECRET,
    refreshSecret: validated.JWT_REFRESH_SECRET,
    expiresIn: validated.JWT_EXPIRES_IN,
    refreshExpiresIn: validated.JWT_REFRESH_EXPIRES_IN,
  },

  google: {
    clientId: validated.GOOGLE_CLIENT_ID,
    clientSecret: validated.GOOGLE_CLIENT_SECRET,
    callbackUrl: validated.GOOGLE_CALLBACK_URL,
  },

  aws: {
    region: validated.AWS_REGION,
    accessKeyId: validated.AWS_ACCESS_KEY_ID,
    secretAccessKey: validated.AWS_SECRET_ACCESS_KEY,
    s3Bucket: validated.S3_BUCKET,
  },

  anthropic: {
    apiKey: validated.ANTHROPIC_API_KEY,
  },

  stripe: {
    secretKey: validated.STRIPE_SECRET_KEY,
    webhookSecret: validated.STRIPE_WEBHOOK_SECRET,
  },

  smtp: {
    host: validated.SMTP_HOST,
    port: validated.SMTP_PORT,
    user: validated.SMTP_USER,
    pass: validated.SMTP_PASS,
    from: validated.EMAIL_FROM,
  },

  exchangeRateApiKey: validated.EXCHANGE_RATE_API_KEY,
  sentryDsn: validated.SENTRY_DSN,

  rateLimit: {
    windowMs: validated.RATE_LIMIT_WINDOW_MS,
    maxRequests: validated.RATE_LIMIT_MAX_REQUESTS,
  },

  isDev: () => validated.NODE_ENV === 'development',
  isProd: () => validated.NODE_ENV === 'production',
  isTest: () => validated.NODE_ENV === 'test',
} as const;
