# Splitwise — Architecture & Developer Guide

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Monorepo Strategy](#monorepo-strategy)
- [Folder Structure](#folder-structure)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Shared Package](#shared-package)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Real-Time Architecture](#real-time-architecture)
- [Background Jobs](#background-jobs)
- [AI Features](#ai-features)
- [Authentication Flow](#authentication-flow)
- [Caching Strategy](#caching-strategy)
- [Security](#security)
- [Environment Variables](#environment-variables)
- [Commands Reference](#commands-reference)
- [Docker Setup](#docker-setup)
- [Pros & Cons of Architecture Decisions](#pros--cons-of-architecture-decisions)

---

## Overview

A production-grade expense splitting and money management application. Supports group expense tracking, debt simplification, budgets, recurring expenses, AI-powered receipt scanning, financial insights, and real-time notifications.

**Architecture style**: Monorepo with layered backend (Controller → Service → Repository) and component-based frontend (Next.js App Router + RTK Query).

---

## Tech Stack

| Layer                | Technology                          | Version   | Purpose                                          |
| -------------------- | ----------------------------------- | --------- | ------------------------------------------------ |
| **Runtime**          | Node.js                             | ≥20       | Server & build tooling                           |
| **Monorepo**         | npm workspaces + Turborepo          | 2.8.x     | Package linking, task orchestration, caching     |
| **Backend**          | Express.js                          | 4.x       | REST API server                                  |
| **GraphQL**          | Apollo Server                       | 4.x       | Alternative query interface                      |
| **ORM**              | Prisma                              | 6.x       | Type-safe database access                        |
| **Database**         | PostgreSQL                          | 16        | Primary data store                               |
| **Cache/Queue**      | Redis + ioredis                     | 7 / 5.x   | Caching, rate limiting, job queues               |
| **Job Queue**        | BullMQ                              | 5.x       | Background jobs (reminders, recurring expenses)  |
| **Real-Time**        | Socket.IO                           | 4.x       | WebSocket events (expenses, settlements, nudges) |
| **Frontend**         | Next.js (App Router)                | 14.x      | React framework with SSR                         |
| **State**            | Redux Toolkit + RTK Query           | 2.x       | Global state & API data fetching                 |
| **UI**               | Tailwind CSS + Radix UI + shadcn/ui | 3.x       | Styling & accessible components                  |
| **Charts**           | Recharts                            | 2.x       | Data visualization                               |
| **AI**               | Anthropic Claude (Sonnet)           | —         | Categorization, parsing, insights, chat, OCR     |
| **Auth**             | JWT + Passport.js                   | —         | Access/refresh token auth + Google OAuth         |
| **File Storage**     | AWS S3                              | —         | Receipt images, avatars, attachments             |
| **Email**            | Nodemailer                          | 6.x       | Transactional emails (password reset, nudges)    |
| **Payments**         | Stripe + Razorpay                   | —         | Settlement payment processing                    |
| **Monitoring**       | Sentry                              | —         | Error tracking & performance                     |
| **Logging**          | Pino                                | 9.x       | Structured JSON logging                          |
| **Validation**       | Zod                                 | 3.x       | Runtime schema validation (shared between FE/BE) |
| **Testing**          | Jest                                | 29.x      | Unit & integration tests                         |
| **Linting**          | ESLint + Prettier                   | 9.x / 3.x | Code quality & formatting                        |
| **Containerization** | Docker + Docker Compose             | —         | Development & production deployment              |

---

## Monorepo Strategy

### Why npm Workspaces + Turborepo?

```
splitwise/                    ← Root (npm workspace host)
├── packages/
│   ├── shared/               ← @splitwise/shared (Zod schemas, types, utils)
│   ├── backend/              ← @splitwise/backend (Express API)
│   └── frontend/             ← @splitwise/frontend (Next.js app)
├── turbo.json                ← Task pipeline definition
└── package.json              ← Workspace config + root scripts
```

**npm workspaces** handles:

- Symlinking `@splitwise/shared` so backend and frontend can import from it
- Hoisting shared `node_modules` to root (single install, no duplication)
- Workspace-scoped script execution (`npm run -w packages/backend`)

**Turborepo** handles:

- Task dependency graph (`dev` depends on `^build` — builds shared before starting dev servers)
- Parallel execution (backend + frontend dev servers run simultaneously)
- Build caching (skips unchanged packages on rebuild)
- Environment variable passthrough for secrets

### Dependency Graph

```
@splitwise/shared ← no dependencies on other packages
       ↑
       ├── @splitwise/backend (imports schemas, types, utils)
       └── @splitwise/frontend (imports types for API responses)
```

---

## Folder Structure

```
splitwise/
├── .husky/                           # Git hooks (pre-commit, commit-msg)
├── packages/
│   ├── shared/                       # Shared library
│   │   └── src/
│   │       ├── schemas/              # Zod validation schemas
│   │       │   ├── auth.schema.ts
│   │       │   ├── budget.schema.ts
│   │       │   ├── category.schema.ts
│   │       │   ├── common.schema.ts
│   │       │   ├── expense.schema.ts
│   │       │   ├── group.schema.ts
│   │       │   ├── settlement.schema.ts
│   │       │   ├── transaction.schema.ts
│   │       │   └── user.schema.ts
│   │       ├── types/                # TypeScript interfaces
│   │       │   ├── api.ts
│   │       │   ├── auth.ts
│   │       │   ├── budget.ts
│   │       │   ├── category.ts
│   │       │   ├── expense.ts
│   │       │   ├── featureFlag.ts
│   │       │   ├── group.ts
│   │       │   ├── settlement.ts
│   │       │   ├── transaction.ts
│   │       │   └── user.ts
│   │       └── utils/                # Shared utilities
│   │           ├── currency.ts
│   │           ├── date.ts
│   │           └── pagination.ts
│   │
│   ├── backend/                      # Express API server
│   │   ├── prisma/
│   │   │   ├── schema.prisma         # Database schema (11 models)
│   │   │   ├── seed.ts               # Database seeder
│   │   │   └── migrations/           # SQL migration history
│   │   └── src/
│   │       ├── app.ts                # Express app setup (middleware, routes)
│   │       ├── server.ts             # HTTP server, Socket.IO, startup
│   │       ├── config/
│   │       │   └── env.ts            # Environment variable loader
│   │       ├── graphql/
│   │       │   ├── typeDefs.ts       # GraphQL schema definitions
│   │       │   └── resolvers.ts      # GraphQL resolvers
│   │       ├── middleware/
│   │       │   ├── auth.ts           # JWT authentication
│   │       │   ├── csrf.ts           # CSRF protection
│   │       │   ├── errorHandler.ts   # Global error handler
│   │       │   ├── rateLimiter.ts    # Rate limiting (Redis-backed)
│   │       │   ├── requestTracer.ts  # Request ID tracing
│   │       │   └── validate.ts       # Zod schema validation
│   │       ├── modules/              # Feature modules (Controller → Service)
│   │       │   ├── ai/               # AI categorization, parsing, insights, chat
│   │       │   ├── auth/             # Register, login, OAuth, password reset
│   │       │   ├── budgets/          # Budget CRUD & alerts
│   │       │   ├── categories/       # Category management
│   │       │   ├── expenses/         # Expense CRUD, splitting, balances
│   │       │   ├── features/         # Feature flags
│   │       │   ├── groups/           # Group CRUD, members, roles
│   │       │   ├── payments/         # Stripe webhook handler
│   │       │   ├── recurring/        # Recurring expense processor
│   │       │   ├── reminders/        # Payment nudges & auto-reminders
│   │       │   ├── reports/          # CSV/PDF export, financial reports
│   │       │   ├── settlements/      # Debt settlement & simplification
│   │       │   ├── transactions/     # Personal transaction tracking
│   │       │   ├── uploads/          # File upload & receipt OCR
│   │       │   └── users/            # User profile management
│   │       ├── routes/
│   │       │   └── v1.ts             # API v1 route aggregator
│   │       └── shared/
│   │           ├── cache/redis.ts    # Redis client & cache helpers
│   │           ├── database/prisma.ts # Prisma client singleton
│   │           ├── logger.ts         # Pino logger
│   │           ├── queue/
│   │           │   ├── bullQueue.ts  # BullMQ queue definitions
│   │           │   └── workers.ts    # Background job workers & schedulers
│   │           ├── services/
│   │           │   ├── currency.ts   # Exchange rate service
│   │           │   ├── email.ts      # SMTP email service
│   │           │   ├── ocr.ts        # Receipt OCR (Claude Vision + regex fallback)
│   │           │   ├── s3.ts         # AWS S3 upload/presign
│   │           │   └── upload.ts     # Multer middleware
│   │           └── socket/
│   │               └── socketServer.ts # Socket.IO setup & helpers
│   │
│   └── frontend/                     # Next.js application
│       └── src/
│           ├── app/
│           │   ├── layout.tsx        # Root layout (providers, theme, toaster)
│           │   ├── page.tsx          # Landing redirect
│           │   ├── globals.css       # Tailwind + CSS variables (light/dark)
│           │   ├── (auth)/           # Auth route group
│           │   │   ├── layout.tsx
│           │   │   ├── login/
│           │   │   └── register/
│           │   └── (dashboard)/      # Dashboard route group (protected)
│           │       ├── layout.tsx    # Sidebar + Header + ChatWidget
│           │       ├── dashboard/    # Main dashboard
│           │       ├── groups/       # Groups list + [id] detail
│           │       ├── transactions/ # Personal transactions
│           │       ├── budgets/      # Budget management
│           │       ├── reports/      # Financial reports
│           │       ├── activity/     # Activity feed
│           │       ├── settings/     # User settings
│           │       ├── categorize/   # AI expense categorization
│           │       ├── insights/     # AI financial insights
│           │       └── receipt-scanner/ # AI receipt scanning
│           ├── components/
│           │   ├── ai/
│           │   │   └── chat-widget.tsx    # Floating AI assistant
│           │   ├── budgets/
│           │   │   └── create-budget-dialog.tsx
│           │   ├── expenses/
│           │   │   ├── add-expense-dialog.tsx
│           │   │   ├── balance-cards.tsx
│           │   │   └── expense-list.tsx
│           │   ├── groups/
│           │   │   ├── create-group-dialog.tsx
│           │   │   ├── debt-graph.tsx      # SVG debt flow visualization
│           │   │   └── settle-up-dialog.tsx
│           │   ├── layout/
│           │   │   ├── header.tsx          # Mobile header + theme toggle
│           │   │   └── sidebar.tsx         # Collapsible sidebar navigation
│           │   ├── transactions/
│           │   │   └── add-transaction-dialog.tsx
│           │   ├── ui/                     # shadcn/ui primitives (20+ components)
│           │   ├── error-boundary.tsx
│           │   ├── theme-provider.tsx      # Theme hydration & system detection
│           │   └── theme-toggle.tsx        # Light/Dark/System dropdown
│           ├── hooks/
│           │   └── useFeatureFlag.ts       # Feature flag hook
│           ├── lib/
│           │   ├── api.ts                  # API_BASE constant (/api/v1)
│           │   └── utils.ts               # cn() utility
│           └── store/
│               ├── api/                    # RTK Query API slices
│               │   ├── apiSlice.ts         # Base query (auth, unwrap, 401 redirect)
│               │   ├── aiApi.ts
│               │   ├── authApi.ts
│               │   ├── budgetApi.ts
│               │   ├── categoryApi.ts
│               │   ├── chatApi.ts
│               │   ├── expenseApi.ts
│               │   ├── featureApi.ts
│               │   ├── groupApi.ts
│               │   ├── reminderApi.ts
│               │   ├── settlementApi.ts
│               │   ├── transactionApi.ts
│               │   └── uploadApi.ts
│               ├── slices/
│               │   ├── authSlice.ts        # Auth state (JWT, user, hydration)
│               │   └── uiSlice.ts          # UI state (sidebar, theme)
│               ├── hooks.ts                # Typed useAppSelector/useAppDispatch
│               ├── provider.tsx            # Redux Provider + auth hydrator
│               └── store.ts                # Store configuration
│
├── .env.example                  # Environment variable template
├── .editorconfig                 # Editor formatting rules
├── .gitignore                    # Git ignore patterns
├── .npmrc                        # npm config (engine-strict, save-exact)
├── .nvmrc                        # Node version (20)
├── .prettierrc                   # Prettier config
├── docker-compose.yml            # PostgreSQL + Redis + Backend + Frontend
├── eslint.config.mjs             # ESLint flat config (shared across packages)
├── package.json                  # Root workspace + Turbo scripts
├── tsconfig.base.json            # Shared TypeScript config
└── turbo.json                    # Turborepo task pipeline
```

---

## Backend Architecture

### Layered Architecture

```
Request → Middleware → Controller → Service → Prisma/Redis → Response
```

| Layer          | Responsibility                                       | Location                      |
| -------------- | ---------------------------------------------------- | ----------------------------- |
| **Middleware** | Auth, validation, rate limiting, error handling      | `src/middleware/`             |
| **Controller** | HTTP request/response handling, input extraction     | `src/modules/*/controller.ts` |
| **Service**    | Business logic, database queries, external API calls | `src/modules/*/service.ts`    |
| **Routes**     | URL → controller mapping                             | `src/modules/*/routes.ts`     |
| **Shared**     | Cross-cutting concerns (cache, DB, email, S3, queue) | `src/shared/`                 |

### Module Pattern

Every feature module follows the same structure:

```
modules/expenses/
├── expense.controller.ts    # Extracts req data, calls service, sends response
├── expense.service.ts       # Business logic, Prisma queries
└── expense.routes.ts        # Route definitions with middleware
```

### API Versioning

All routes are mounted under `/api/v1` via the v1 router. A backward-compatible mirror exists at `/api` for migration support.

```
app.use('/api/v1', v1Router);   // Primary
app.use('/api', v1Router);       // Backward compat
```

---

## Frontend Architecture

### Next.js App Router

```
(auth)/          → Public routes (login, register)
(dashboard)/     → Protected routes (requires JWT)
```

The dashboard layout wraps all protected pages with:

- `Sidebar` — collapsible navigation with keyboard shortcut (Ctrl+[)
- `Header` — mobile nav + theme toggle + notifications
- `ChatWidget` — floating AI assistant (bottom-right)

### State Management

```
Redux Store
├── auth slice     → JWT tokens, user data, hydration from localStorage
├── ui slice       → Sidebar state, theme preference, active group
└── api slice      → RTK Query (13 API slices, automatic caching & invalidation)
```

RTK Query handles all API communication with:

- Automatic Bearer token injection
- Response envelope unwrapping (`{ success, data }` → `data`)
- 401 auto-redirect to login
- Tag-based cache invalidation

### Component Hierarchy

```
RootLayout
├── StoreProvider (Redux)
│   └── ThemeProvider (dark/light/system)
│       └── TooltipProvider
│           ├── (auth) routes
│           └── (dashboard) routes
│               ├── Sidebar
│               ├── Header
│               ├── Page content
│               └── ChatWidget (floating)
```

---

## Shared Package

`@splitwise/shared` is compiled to CommonJS (`tsc`) and consumed by both backend and frontend.

| Export      | Purpose                                                                           |
| ----------- | --------------------------------------------------------------------------------- |
| `schemas/*` | Zod validation schemas (used by backend `validate` middleware and frontend forms) |
| `types/*`   | TypeScript interfaces for API request/response shapes                             |
| `utils/*`   | Currency formatting, date period ranges, pagination helpers                       |

**Why a shared package?**

- Single source of truth for validation rules (same Zod schema validates on both client and server)
- Type-safe API contracts (frontend knows exact response shapes)
- Utility code reuse (no copy-paste between packages)

---

## Database Schema

11 models in PostgreSQL via Prisma:

```
User ──┬── GroupMember ── Group
       │        │
       │        └── Expense ──┬── ExpensePayer
       │                      └── ExpenseSplit
       │
       ├── Settlement (from/to users within a group)
       ├── Transaction (personal income/expense tracking)
       ├── Budget (per-category spending limits)
       └── Category (hierarchical, system + user-defined)

FeatureFlag (standalone — feature rollout management)
```

### Key Design Decisions

| Decision                  | Rationale                                                     |
| ------------------------- | ------------------------------------------------------------- |
| UUID primary keys         | Prevents ID enumeration, safe for distributed systems         |
| `Decimal(12,2)` for money | Avoids floating-point precision errors                        |
| `amountInBase` on Expense | Pre-computed base currency amount for multi-currency groups   |
| `splitType` enum          | Supports equal, percentage, exact, and shares-based splitting |
| `recurringConfig` as JSON | Flexible frequency config without extra tables                |
| `@@index` on foreign keys | Optimized JOIN performance for common queries                 |
| Cascade deletes on groups | Deleting a group removes all expenses/settlements             |

---

## API Reference

All endpoints are under `/api/v1`. Authentication is via `Authorization: Bearer <token>`.

| Module           | Prefix          | Endpoints                                                                                                                                                                                      |
| ---------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**         | `/auth`         | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /password-reset/request`, `POST /password-reset/confirm`, `GET /google`, `GET /google/callback`                        |
| **Users**        | `/users`        | `GET /me`, `PUT /me`, `PATCH /me/currency`, `DELETE /me`                                                                                                                                       |
| **Groups**       | `/groups`       | `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `POST /:id/members`, `DELETE /:id/members/:userId`, `PATCH /:id/members/:userId/role`                                                |
| **Expenses**     | `/expenses`     | `POST /`, `GET /group/:groupId`, `GET /group/:groupId/balances`, `GET /:id`, `PUT /:id`, `DELETE /:id`                                                                                         |
| **Settlements**  | `/settlements`  | `POST /`, `GET /group/:groupId`, `GET /group/:groupId/simplified`, `GET /me`, `PATCH /:id/status`                                                                                              |
| **Transactions** | `/transactions` | `GET /`, `GET /summary`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`                                                                                                                       |
| **Budgets**      | `/budgets`      | `GET /`, `GET /alerts`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`                                                                                                                        |
| **Categories**   | `/categories`   | `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`                                                                                                                                                   |
| **AI**           | `/ai`           | `POST /categorize`, `POST /parse`, `GET /insights`, `POST /chat`                                                                                                                               |
| **Uploads**      | `/uploads`      | `POST /` (single), `POST /multiple`, `POST /receipt` (OCR)                                                                                                                                     |
| **Reports**      | `/reports`      | `GET /groups/:groupId/csv`, `GET /transactions/csv`, `GET /groups/:groupId/summary`, `GET /financial`                                                                                          |
| **Features**     | `/features`     | `GET /`                                                                                                                                                                                        |
| **Reminders**    | `/reminders`    | `GET /pending`, `POST /nudge/:settlementId`                                                                                                                                                    |
| **Recurring**    | `/recurring`    | `GET /`                                                                                                                                                                                        |
| **GraphQL**      | `/graphql`      | Queries: `me`, `groups`, `group`, `expenses`, `balances`, `debts`, `transactions`, `budgets`, `categories`. Mutations: `createGroup`, `createExpense`, `createSettlement`, `createTransaction` |
| **Health**       | `/health`       | `GET /` (no auth)                                                                                                                                                                              |

---

## Real-Time Architecture

Socket.IO runs on the same HTTP server as Express.

```
Client connects → JWT verified → joins user:{userId} room
                               → joins group:{groupId} rooms on demand
```

| Event                 | Direction      | Trigger                    |
| --------------------- | -------------- | -------------------------- |
| `expense_added`       | Server → Group | New expense created        |
| `expense_updated`     | Server → Group | Expense modified           |
| `expense_deleted`     | Server → Group | Expense removed            |
| `settlement_created`  | Server → Group | New settlement             |
| `settlement_received` | Server → User  | Settlement received        |
| `settlement_updated`  | Server → Group | Settlement status changed  |
| `payment_nudge`       | Server → User  | Manual nudge from creditor |
| `payment_reminder`    | Server → User  | Automatic overdue reminder |

---

## Background Jobs

BullMQ with Redis. Workers registered on server startup.

| Queue                | Schedule          | Purpose                                                                          |
| -------------------- | ----------------- | -------------------------------------------------------------------------------- |
| `reminder-scheduler` | Daily at 9:00 AM  | Sends escalating reminders for overdue settlements (3d, 7d, 14d, then every 14d) |
| `recurring-expenses` | Daily at midnight | Creates new expense instances for due recurring expenses                         |
| `notifications`      | On-demand         | Email notifications (nudges, password resets)                                    |
| `reports`            | On-demand         | Async report generation                                                          |
| `debt-calculation`   | On-demand         | Complex debt simplification                                                      |

---

## AI Features

All AI features use **Anthropic Claude Sonnet** with keyword-based fallbacks when the API key is not configured.

| Feature                      | Endpoint                | How It Works                                                                           |
| ---------------------------- | ----------------------- | -------------------------------------------------------------------------------------- |
| **Expense Categorization**   | `POST /ai/categorize`   | Sends description + amount to Claude, returns category/subcategory/confidence/tags     |
| **Natural Language Parsing** | `POST /ai/parse`        | Parses "spent $50 on groceries yesterday" into structured expense data                 |
| **Financial Insights**       | `GET /ai/insights`      | Aggregates monthly transactions, sends summary to Claude for personalized tips         |
| **AI Chat Assistant**        | `POST /ai/chat`         | Context-aware chat using user's transactions, groups, and settlements as system prompt |
| **Receipt OCR**              | `POST /uploads/receipt` | Claude Vision analyzes receipt images, extracts merchant/items/total/category          |

---

## Authentication Flow

```
Register/Login → JWT access token (15m) + refresh token (7d)
                 ↓
              Stored in localStorage
                 ↓
              Sent as Bearer token on every API request
                 ↓
              401 → auto-redirect to /login + clear credentials
                 ↓
              Refresh → POST /auth/refresh with refresh token
```

Google OAuth follows the same flow but exchanges the OAuth code for JWT tokens server-side.

---

## Caching Strategy

| What                       | Where              | TTL          | Purpose                                   |
| -------------------------- | ------------------ | ------------ | ----------------------------------------- |
| Feature flags              | Redis              | 5 min        | Avoid DB hit on every request             |
| Rate limit counters        | Redis              | Window-based | Track request counts per IP               |
| Stripe webhook idempotency | Redis              | 24 hours     | Prevent duplicate payment processing      |
| RTK Query cache            | In-memory (client) | Tag-based    | Automatic cache invalidation on mutations |

---

## Security

| Measure              | Implementation                                                 |
| -------------------- | -------------------------------------------------------------- |
| **Helmet**           | Security headers (CSP, X-Frame-Options, HSTS, Referrer-Policy) |
| **CORS**             | Restricted to `FRONTEND_URL` origin                            |
| **Rate Limiting**    | Redis-backed, 100 req/min general, 20 req/15min on auth        |
| **JWT**              | Short-lived access tokens (15m) + refresh rotation             |
| **Input Validation** | Zod schemas on every mutating endpoint                         |
| **SQL Injection**    | Prisma parameterized queries (no raw SQL)                      |
| **Password Hashing** | bcrypt with salt rounds                                        |
| **CSRF**             | Optional middleware for cookie-based flows                     |
| **Request Tracing**  | X-Request-Id header for log correlation                        |

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable                 | Required | Default                  | Description                           |
| ------------------------ | -------- | ------------------------ | ------------------------------------- |
| `NODE_ENV`               | Yes      | `development`            | `development` / `production` / `test` |
| `PORT`                   | Yes      | `4000`                   | Backend server port                   |
| `FRONTEND_URL`           | Yes      | `http://localhost:3000`  | CORS origin                           |
| `NEXT_PUBLIC_API_URL`    | Yes      | `http://localhost:4000`  | Frontend → backend proxy target       |
| `DATABASE_URL`           | Yes      | —                        | PostgreSQL connection string          |
| `REDIS_URL`              | Yes      | `redis://localhost:6379` | Redis connection string               |
| `JWT_SECRET`             | Yes      | —                        | Access token signing secret           |
| `JWT_REFRESH_SECRET`     | Yes      | —                        | Refresh token signing secret          |
| `JWT_EXPIRES_IN`         | No       | `15m`                    | Access token lifetime                 |
| `JWT_REFRESH_EXPIRES_IN` | No       | `7d`                     | Refresh token lifetime                |
| `GOOGLE_CLIENT_ID`       | No       | —                        | Google OAuth client ID                |
| `GOOGLE_CLIENT_SECRET`   | No       | —                        | Google OAuth client secret            |
| `AWS_ACCESS_KEY_ID`      | No       | —                        | S3 access key                         |
| `AWS_SECRET_ACCESS_KEY`  | No       | —                        | S3 secret key                         |
| `S3_BUCKET`              | No       | `splitwise-uploads`      | S3 bucket name                        |
| `ANTHROPIC_API_KEY`      | No       | —                        | Claude AI (enables AI features)       |
| `STRIPE_SECRET_KEY`      | No       | —                        | Stripe payments                       |
| `STRIPE_WEBHOOK_SECRET`  | No       | —                        | Stripe webhook verification           |
| `SMTP_HOST`              | No       | `smtp.gmail.com`         | Email server                          |
| `SMTP_USER`              | No       | —                        | Email username                        |
| `SMTP_PASS`              | No       | —                        | Email password                        |
| `SENTRY_DSN`             | No       | —                        | Sentry error tracking                 |
| `EXCHANGE_RATE_API_KEY`  | No       | —                        | Live currency conversion              |

---

## Commands Reference

### Prerequisites

```bash
node --version    # ≥ 20.0.0
npm --version     # ≥ 10.0.0
docker --version  # For PostgreSQL & Redis
```

### Initial Setup

```bash
# 1. Clone and install
git clone <repo-url> && cd splitwise
npm install

# 2. Environment
cp .env.example .env
# Edit .env with your secrets

# 3. Start infrastructure (PostgreSQL + Redis)
npm run docker:up

# 4. Run database migrations
npm run db:migrate

# 5. Seed sample data (optional)
npm run db:seed

# 6. Start development
npm run dev
```

### Development Commands

| Command                | Description                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `npm run dev`          | Start all packages in dev mode (Turbo builds shared first, then runs backend + frontend in parallel) |
| `npm run build`        | Production build all packages (with Turbo caching)                                                   |
| `npm run lint`         | Lint all packages                                                                                    |
| `npm run lint:fix`     | Lint and auto-fix all packages                                                                       |
| `npm run typecheck`    | Type-check all packages                                                                              |
| `npm run test`         | Run tests                                                                                            |
| `npm run clean`        | Remove all build artifacts + node_modules + .turbo cache                                             |
| `npm run format`       | Format all files with Prettier                                                                       |
| `npm run format:check` | Check formatting without modifying                                                                   |

### Database Commands

| Command                   | Description                                |
| ------------------------- | ------------------------------------------ |
| `npm run db:migrate`      | Run pending Prisma migrations              |
| `npm run db:migrate:prod` | Deploy migrations (production, no prompts) |
| `npm run db:seed`         | Seed database with sample data             |
| `npm run db:studio`       | Open Prisma Studio (visual DB browser)     |
| `npm run db:generate`     | Regenerate Prisma client                   |

### Docker Commands

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `npm run docker:up`   | Start PostgreSQL + Redis containers |
| `npm run docker:down` | Stop and remove containers          |
| `npm run docker:logs` | Stream container logs               |

### Running Individual Packages

```bash
# Backend only
npm run dev -w packages/backend

# Frontend only
npm run dev -w packages/frontend

# Build shared only
npm run build -w packages/shared
```

### Production Deployment

```bash
# Full Docker deployment (all services)
docker-compose up -d

# Or build individually
npm run build
npm run db:migrate:prod
node packages/backend/dist/server.js    # Backend on :4000
npx next start packages/frontend        # Frontend on :3000
```

---

## Docker Setup

### Development (infrastructure only)

```bash
npm run docker:up    # Starts PostgreSQL (port 5433) + Redis (port 6379)
npm run dev          # Starts backend (port 4000) + frontend (port 3000) locally
```

### Production (full stack)

```yaml
# docker-compose.yml runs:
# 1. postgres:16-alpine  → port 5433 (mapped to 5432 internally)
# 2. redis:7-alpine      → port 6379
# 3. backend             → port 4000 (waits for healthy postgres + redis)
# 4. frontend            → port 3000 (waits for healthy backend)
```

Health checks ensure services start in the correct order.

---

## Pros & Cons of Architecture Decisions

### Monorepo (npm workspaces + Turborepo)

| Pros                                              | Cons                                                     |
| ------------------------------------------------- | -------------------------------------------------------- |
| Single repo, single PR for cross-package changes  | Larger repo size over time                               |
| Shared types/schemas prevent API contract drift   | All packages must use compatible Node/npm versions       |
| Turbo caching speeds up CI/CD significantly       | Learning curve for Turbo pipeline configuration          |
| Atomic commits across frontend + backend + shared | Merge conflicts more likely with many contributors       |
| Single `npm install` for all packages             | Hoisted dependencies can cause phantom dependency issues |

### Express.js (vs Fastify, NestJS, Hono)

| Pros                                                | Cons                                                              |
| --------------------------------------------------- | ----------------------------------------------------------------- |
| Largest ecosystem, most middleware available        | No built-in TypeScript support                                    |
| Simple, flexible, well-understood                   | No built-in validation, DI, or module system                      |
| Easy to add GraphQL, Socket.IO, and other protocols | Manual layered architecture (NestJS provides this out of the box) |
| Low overhead, fast startup                          | Less opinionated — requires discipline to maintain structure      |

### Next.js App Router (vs Pages Router, Vite SPA)

| Pros                                               | Cons                                                         |
| -------------------------------------------------- | ------------------------------------------------------------ |
| Server components for metadata/SEO                 | More complex mental model (server vs client components)      |
| Built-in API rewrites (proxy to backend)           | Larger bundle than a pure Vite SPA                           |
| File-based routing with layouts and groups         | Hot reload can be slower than Vite                           |
| Streaming SSR and React Suspense support           | App Router is newer, some ecosystem gaps                     |
| `outputFileTracingRoot` for monorepo Docker builds | Requires `'use client'` directive for interactive components |

### RTK Query (vs React Query/TanStack Query, SWR)

| Pros                                                | Cons                                             |
| --------------------------------------------------- | ------------------------------------------------ |
| Integrated with Redux (single store for everything) | Heavier than React Query if you don't need Redux |
| Tag-based cache invalidation is powerful            | More boilerplate than SWR                        |
| Automatic request deduplication                     | Learning curve for `injectEndpoints` pattern     |
| Built-in optimistic updates and polling             | Bundle size larger than alternatives             |
| Code-generated hooks (`useGetGroupsQuery`, etc.)    | Tightly coupled to Redux ecosystem               |

### PostgreSQL + Prisma (vs MongoDB/Mongoose, Drizzle, TypeORM)

| Pros                                                   | Cons                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| Relational data model fits expense splitting perfectly | Prisma client regeneration required after schema changes    |
| Prisma provides type-safe queries and auto-completion  | Prisma doesn't support all PostgreSQL features (e.g., CTEs) |
| Declarative schema with automatic migrations           | Cold starts slower due to Prisma engine binary              |
| Prisma Studio for visual data browsing                 | `Decimal` types require manual `Number()` conversion        |
| Strong referential integrity with foreign keys         | Schema changes require migration files                      |

### Redis for Caching + Queues (vs in-memory, RabbitMQ, Kafka)

| Pros                                                    | Cons                                                     |
| ------------------------------------------------------- | -------------------------------------------------------- |
| Single service for cache, rate limiting, and job queues | Additional infrastructure to manage                      |
| BullMQ provides reliable job processing with retries    | Redis data is ephemeral (persistence must be configured) |
| Sub-millisecond reads for feature flags and rate limits | Memory-bound — large datasets need careful management    |
| Built-in TTL for automatic cache expiration             | Single point of failure without Redis Sentinel/Cluster   |

### Claude AI (vs OpenAI GPT, local models)

| Pros                                                             | Cons                            |
| ---------------------------------------------------------------- | ------------------------------- |
| Vision API for receipt OCR (no separate OCR service needed)      | API cost per request            |
| Strong structured output (JSON parsing)                          | Latency (1-3s per request)      |
| Keyword fallback when API key is not set                         | Vendor lock-in to Anthropic     |
| Single provider for categorization, parsing, insights, chat, OCR | Rate limits on free/lower tiers |

### JWT Authentication (vs Session-based, OAuth-only)

| Pros                                                 | Cons                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------- |
| Stateless — no server-side session storage           | Tokens can't be revoked until expiry (mitigated by short TTL)               |
| Works with mobile apps and SPAs                      | Token size larger than session cookies                                      |
| Refresh token rotation for extended sessions         | Must handle token refresh logic on client                                   |
| Easy to scale horizontally (no shared session store) | localStorage storage is vulnerable to XSS (mitigated by short-lived tokens) |

### Socket.IO (vs native WebSocket, SSE, Pusher)

| Pros                                           | Cons                                            |
| ---------------------------------------------- | ----------------------------------------------- |
| Automatic reconnection and fallback transports | Larger bundle than native WebSocket             |
| Room-based broadcasting (per-group, per-user)  | Not compatible with native WebSocket clients    |
| Built-in acknowledgments and error handling    | Additional server memory per connection         |
| Works behind proxies and load balancers        | Requires sticky sessions for horizontal scaling |

---

## Development URLs

| Service            | URL                                             |
| ------------------ | ----------------------------------------------- |
| Frontend           | http://localhost:3000                           |
| Backend API        | http://localhost:4000/api/v1                    |
| GraphQL Playground | http://localhost:4000/graphql                   |
| Prisma Studio      | http://localhost:5555 (via `npm run db:studio`) |
| Health Check       | http://localhost:4000/health                    |
