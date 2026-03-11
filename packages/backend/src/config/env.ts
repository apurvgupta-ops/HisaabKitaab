import dotenv from 'dotenv';
import path from 'path';

// Load .env from workspace root (works whether run from root or packages/backend)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',

  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://splitwise:splitwise_dev@localhost:5432/splitwise',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'dev-jwt-refresh-secret-change-in-prod',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:4000/api/auth/google/callback',
  },

  aws: {
    region: process.env.AWS_REGION ?? 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    s3Bucket: process.env.S3_BUCKET ?? 'splitwise-uploads',
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
  },

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  },

  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? 'noreply@splitwise.app',
  },

  exchangeRateApiKey: process.env.EXCHANGE_RATE_API_KEY ?? '',
  sentryDsn: process.env.SENTRY_DSN ?? '',

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),
  },

  isDev: () => env.nodeEnv === 'development',
  isProd: () => env.nodeEnv === 'production',
  isTest: () => env.nodeEnv === 'test',
} as const;
