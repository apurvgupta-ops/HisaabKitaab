# Splitwise

Production-grade expense splitting and money management application built as a TypeScript monorepo.

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Monorepo Structure](#monorepo-structure)
- [Architecture](#architecture)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Shared Package](#shared-package)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
  - [REST Endpoints](#rest-endpoints)
  - [GraphQL](#graphql)
  - [WebSocket Events](#websocket-events)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Variables](#environment-variables)
  - [Database Setup](#database-setup)
  - [Running the App](#running-the-app)
- [Docker](#docker)
- [Scripts Reference](#scripts-reference)
- [Code Quality](#code-quality)
- [Production-Grade Improvements](#production-grade-improvements)
- [Phase 1 Production Features](#phase-1-production-features)
- [Project Conventions](#project-conventions)
- [Seed Data](#seed-data)

---

## Overview

A full-featured Splitwise-style application that supports group expense splitting, personal finance tracking, budgets, settlements, AI-powered categorization, and real-time updates. The codebase is organized as an NPM workspaces monorepo with Turborepo for build orchestration.

---

## Tech Stack

| Layer                | Technology                                                    |
| -------------------- | ------------------------------------------------------------- |
| **Runtime**          | Node.js 20+                                                   |
| **Language**         | TypeScript 5.7 (strict mode)                                  |
| **Frontend**         | Next.js 14 (App Router), React 18, Redux Toolkit + RTK Query  |
| **UI**               | Tailwind CSS 3.4, Radix UI primitives, Lucide icons, Recharts |
| **Forms**            | React Hook Form + Zod resolver                                |
| **Backend**          | Express 4, Apollo Server (GraphQL), Socket.IO                 |
| **Database**         | PostgreSQL 16 (Prisma ORM)                                    |
| **Cache / Queue**    | Redis 7 (ioredis), BullMQ                                     |
| **Auth**             | JWT (access + refresh tokens), Passport.js, Google OAuth      |
| **AI**               | Anthropic Claude SDK                                          |
| **Storage**          | AWS S3 (presigned uploads)                                    |
| **Email**            | Nodemailer (SMTP)                                             |
| **Logging**          | Pino (with pino-pretty in dev)                                |
| **Build**            | Turborepo, tsc, Next.js standalone                            |
| **Code Quality**     | ESLint 9, Prettier, Husky, lint-staged                        |
| **Containerization** | Docker, Docker Compose                                        |

---

## Monorepo Structure

```
splitwise/
├── packages/
│   ├── shared/              # Shared types, Zod schemas, utilities
│   │   └── src/
│   │       ├── types/       # TypeScript interfaces (auth, user, group, expense, ...)
│   │       ├── schemas/     # Zod validation schemas
│   │       └── utils/       # Currency, date, pagination helpers
│   │
│   ├── backend/             # Express API server
│   │   ├── prisma/          # Schema, migrations, seed
│   │   └── src/
│   │       ├── config/      # Environment configuration
│   │       ├── middleware/   # Auth, validation, rate limiting, error handling
│   │       ├── modules/     # Domain modules (controller → service → routes)
│   │       ├── graphql/     # Apollo Server type defs + resolvers
│   │       ├── routes/     # API versioning (v1 router)
│   │       ├── docs/        # OpenAPI spec generation
│   │       └── shared/      # Database, cache, logger, queue, socket, services
│   │
│   └── frontend/            # Next.js web application
│       └── src/
│           ├── app/         # App Router pages, layouts, error.tsx, loading.tsx
│           ├── components/  # UI components, ErrorBoundary, layout, domain components
│           ├── store/       # Redux store, RTK Query API slices (with token refresh), auth/ui slices
│           └── lib/         # Utility functions
│
├── .husky/                  # Git hooks (pre-commit, commit-msg)
├── turbo.json               # Turborepo task pipeline configuration
├── tsconfig.base.json       # Shared TypeScript compiler options
├── eslint.config.mjs        # Root ESLint flat config
├── .prettierrc              # Prettier formatting rules
├── .editorconfig            # Editor-agnostic formatting
├── docker-compose.yml       # Multi-service Docker setup
└── package.json             # Workspace root with scripts and hoisted devDependencies
```

### Dependency Graph

```
@splitwise/frontend ──→ @splitwise/shared
@splitwise/backend  ──→ @splitwise/shared
```

Both `frontend` and `backend` consume shared Zod schemas for validation and TypeScript types for API contracts. The shared package is built first via Turborepo's `dependsOn: ["^build"]` pipeline.

---

## Architecture

### Backend

The backend follows a **layered architecture** with domain-driven module organization:

```
Request → Middleware (auth, validate, rateLimit) → Controller → Service → Prisma → Response
```

**Middleware stack (in order):**

1. `helmet` — Security headers
2. `cors` — Cross-origin configuration (frontend URL only); allows `X-CSRF-Token`, `X-Idempotency-Key`
3. `compression` — Gzip response compression
4. `requestTracer` — Assigns `X-Request-Id`, logs request lifecycle with duration and user ID
5. `express.json` — Body parsing (10MB limit)
6. `apiLimiter` — Redis-backed rate limiting on `/api/*` (via `rate-limit-redis`)
7. `authLimiter` — Stricter rate limit on `/login` and `/register` (20 req / 15 min)
8. `graphqlLimiter` — Rate limit on `/graphql` (200 req / min)
9. `authenticate` — JWT Bearer token verification (per-route)
10. `validate` — Zod schema validation (body, query, or params)
11. `errorHandler` — Centralized error handling (AppError, ZodError, Prisma errors, Sentry capture)

**Module structure (each domain follows this pattern):**

```
modules/<domain>/
├── <domain>.controller.ts   # Request handling, response formatting
├── <domain>.service.ts      # Business logic, database operations
└── <domain>.routes.ts       # Express router with middleware chain
```

**Environment validation:**

All environment variables are validated at startup using a Zod schema (`config/env.ts`). In production, the server will refuse to start if critical variables (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `REDIS_URL`) are missing, printing a clear error message. In development, safe fallback defaults are provided so the app can start without a fully configured `.env`.

**Server initialization:**

1. Validate environment variables (fail-fast on missing critical vars)
2. Connect to PostgreSQL via Prisma
3. Connect to Redis
4. Start Apollo Server (GraphQL) and mount at `/graphql`
5. Initialize Socket.IO on the same HTTP server
6. Listen on configured port

**Graceful shutdown** handles `SIGTERM` and `SIGINT` — closes HTTP server, disconnects Prisma and Redis.

**Rate limiting:**

All rate limiters are backed by Redis via `rate-limit-redis`, ensuring limits are shared across multiple server instances. Three tiers are configured:

| Limiter          | Scope                                 | Window                     | Max Requests               |
| ---------------- | ------------------------------------- | -------------------------- | -------------------------- |
| `apiLimiter`     | All `/api/*` routes                   | Configurable (default 60s) | Configurable (default 100) |
| `authLimiter`    | `/login`, `/register`, password reset | 15 minutes                 | 20                         |
| `graphqlLimiter` | `/graphql`                            | 60 seconds                 | 200                        |

**Error handling** uses a custom `AppError` class with static factory methods:

| Method                       | Status | Code                |
| ---------------------------- | ------ | ------------------- |
| `AppError.badRequest()`      | 400    | `BAD_REQUEST`       |
| `AppError.unauthorized()`    | 401    | `UNAUTHORIZED`      |
| `AppError.forbidden()`       | 403    | `FORBIDDEN`         |
| `AppError.notFound()`        | 404    | `NOT_FOUND`         |
| `AppError.conflict()`        | 409    | `CONFLICT`          |
| `AppError.tooManyRequests()` | 429    | `TOO_MANY_REQUESTS` |

All API responses follow a consistent envelope:

```json
{ "success": true, "data": { ... } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "...", "details": {} } }
```

### Frontend

The frontend uses **Next.js 14 App Router** with client-side state management:

**Route structure:**

```
app/
├── page.tsx                          # Root → redirect to /dashboard or /login
├── layout.tsx                        # Root layout (StoreProvider, Toaster, TooltipProvider)
├── error.tsx                         # Global error boundary page
├── (auth)/
│   ├── layout.tsx                    # Auth pages layout
│   ├── login/page.tsx                # Login form
│   └── register/page.tsx             # Registration form
└── (dashboard)/
    ├── layout.tsx                    # Auth guard, Sidebar + Header shell, ErrorBoundary
    ├── loading.tsx                   # Route-level skeleton loading
    ├── error.tsx                     # Route-level error recovery
    ├── dashboard/page.tsx            # Overview dashboard (live data, skeleton, error/retry)
    ├── groups/page.tsx               # Groups list
    ├── groups/[id]/page.tsx          # Group detail (expenses, balances, settlements)
    ├── transactions/page.tsx         # Personal transactions
    ├── budgets/page.tsx              # Budget management
    ├── reports/page.tsx              # Spending reports
    └── settings/page.tsx             # User settings
```

**State management:**

- **Redux Toolkit** with `configureStore` combining RTK Query, auth slice, and UI slice
- **RTK Query** (`apiSlice`) as the data-fetching layer with tag-based cache invalidation
- **Auth flow:** `hydrateAuth` reads tokens from `localStorage` on mount → `isAuthenticated` + `hydrated` flags drive route guards

**API communication:**

1. RTK Query uses relative `/api/*` URLs
2. `next.config.js` rewrites `/api/:path*` → `http://localhost:4000/api/:path*`
3. Base query injects `Authorization: Bearer <token>` header
4. Custom `baseQueryWithReauth` strips the `{ success, data }` envelope and normalizes errors
5. **Automatic token refresh:** On 401, the base query attempts a silent refresh using the stored refresh token before giving up. A mutex (`async-mutex`) prevents concurrent refresh attempts when multiple parallel requests fail simultaneously. If refresh succeeds, the original request is retried transparently. If refresh fails, credentials are cleared and the user is redirected to `/login`.

**Error handling:**

- **React Error Boundary** (`components/error-boundary.tsx`) wraps the dashboard layout to catch render errors with "Try again" and "Refresh page" actions
- **Next.js `error.tsx`** at both the global level and the `(dashboard)` route group provides route-level error recovery
- **Next.js `loading.tsx`** at the `(dashboard)` route group provides skeleton loading states during route transitions
- **Dashboard** uses per-query loading/error states with skeleton UI and a retry button on API failures

**SEO & Metadata**

- **Root layout** — Default title and description for the app
- **Per-page metadata** — Each page (login, register, dashboard, groups, group detail, transactions, budgets, reports, settings) exports `metadata` or `generateMetadata` with page-specific title, description, and OpenGraph tags for sharing

**Component organization:**

| Directory                  | Contents                                                               |
| -------------------------- | ---------------------------------------------------------------------- |
| `components/ui/`           | shadcn/ui-style primitives (Button, Dialog, Card, Select, Toast, etc.) |
| `components/layout/`       | Sidebar, Header                                                        |
| `components/expenses/`     | AddExpenseDialog, ExpenseList, BalanceCards                            |
| `components/groups/`       | CreateGroupDialog, SettleUpDialog                                      |
| `components/transactions/` | AddTransactionDialog                                                   |
| `components/budgets/`      | CreateBudgetDialog                                                     |
| `components/`              | ErrorBoundary                                                          |

### Shared Package

The shared package provides a **single source of truth** for validation and types consumed by both frontend and backend:

**Types** (`src/types/`) — TypeScript interfaces for API contracts:

| File             | Exports                                                                       |
| ---------------- | ----------------------------------------------------------------------------- |
| `api.ts`         | `ApiResponse<T>`, `ApiError`, `PaginatedResponse<T>`, `PaginationParams`      |
| `auth.ts`        | `LoginRequest`, `RegisterRequest`, `AuthTokens`, `AuthResponse`, `JwtPayload` |
| `user.ts`        | `User`, `UserSummary`, `UserPreferences`, `UpdateProfileInput`                |
| `group.ts`       | `Group`, `GroupMember`, `GroupWithMembers`, `GroupBalance`, `DebtEdge`        |
| `expense.ts`     | `Expense`, `ExpenseWithDetails`, `ExpensePayer`, `ExpenseSplit`               |
| `settlement.ts`  | `Settlement`, `PaymentMethod`                                                 |
| `transaction.ts` | `Transaction`, `TransactionFilters`                                           |
| `budget.ts`      | `Budget`, `BudgetWithProgress`, `BudgetAlert`, `BudgetPeriod`                 |
| `category.ts`    | `Category`, `SystemCategory`                                                  |

**Schemas** (`src/schemas/`) — Zod validation schemas:

| File                    | Exports                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------- |
| `common.schema.ts`      | `paginationSchema`, `uuidSchema`, `dateRangeSchema`, `sortSchema`, `currencySchema`, `amountSchema` |
| `auth.schema.ts`        | `loginSchema`, `registerSchema`, `refreshTokenSchema`, `passwordResetRequestSchema`                 |
| `group.schema.ts`       | `createGroupSchema`, `updateGroupSchema`, `addMemberSchema`                                         |
| `expense.schema.ts`     | `createExpenseSchema`, `updateExpenseSchema`, `expenseFiltersSchema`                                |
| `settlement.schema.ts`  | `createSettlementSchema`, `updateSettlementStatusSchema`                                            |
| `transaction.schema.ts` | `createTransactionSchema`, `updateTransactionSchema`, `transactionFiltersSchema`                    |
| `budget.schema.ts`      | `createBudgetSchema`, `updateBudgetSchema`                                                          |
| `category.schema.ts`    | `createCategorySchema`, `updateCategorySchema`                                                      |
| `user.schema.ts`        | `updateProfileSchema`, `updatePreferencesSchema`                                                    |

**Utilities** (`src/utils/`):

| Function                                     | Description                                          |
| -------------------------------------------- | ---------------------------------------------------- |
| `formatCurrency(amount, currency?, locale?)` | Locale-aware currency formatting                     |
| `getCurrencySymbol(currency)`                | Returns symbol for 20 supported currencies           |
| `roundMoney(amount)`                         | Two-decimal banker's rounding                        |
| `splitEqually(total, people)`                | Equal split with remainder handling                  |
| `splitByPercentage(total, percentages)`      | Percentage-based split                               |
| `splitByShares(total, shares)`               | Share-ratio split                                    |
| `getPeriodRange(date, period)`               | Date range for weekly/monthly/yearly periods         |
| `getRelativeTime(date)`                      | Human-readable relative time ("2h ago", "yesterday") |
| `buildPaginationMeta(total, page, limit)`    | Pagination metadata builder                          |
| `getPrismaSkipTake(page, limit)`             | Prisma-compatible pagination params                  |

---

## Database Schema

PostgreSQL 16 with Prisma ORM. All IDs are UUIDs.

```
┌──────────┐       ┌─────────────┐       ┌──────────┐
│   User   │──────<│ GroupMember  │>──────│  Group   │
└──────────┘       └─────────────┘       └──────────┘
     │                                        │
     │  ┌──────────────┐    ┌──────────────┐  │
     ├─<│ ExpensePayer  │>──│   Expense     │>─┤
     │  └──────────────┘    └──────────────┘  │
     │  ┌──────────────┐         │            │
     ├─<│ ExpenseSplit  │>───────┘            │
     │  └──────────────┘                      │
     │  ┌──────────────┐                      │
     ├─<│  Settlement   │>────────────────────┘
     │  └──────────────┘
     │  ┌──────────────┐    ┌──────────────┐
     ├─<│ Transaction   │>──│   Category   │
     │  └──────────────┘    └──────────────┘
     │  ┌──────────────┐         │
     └─<│    Budget     │>───────┘
        └──────────────┘
```

**Models:**

| Model            | Key Fields                                              | Notes                                         |
| ---------------- | ------------------------------------------------------- | --------------------------------------------- |
| **User**         | email, name, passwordHash, preferredCurrency, googleId  | Supports local + OAuth auth                   |
| **Group**        | name, type, currency, settings, createdBy               | Types: trip, home, couple, other              |
| **GroupMember**  | groupId, userId, role                                   | Roles: admin, member. Unique per group+user   |
| **Expense**      | groupId, amount, currency, splitType, description, date | Split types: equal, exact, percentage, shares |
| **ExpensePayer** | expenseId, userId, amount                               | Multiple payers per expense                   |
| **ExpenseSplit** | expenseId, userId, amount, percentage?, shares?         | One per participant                           |
| **Settlement**   | groupId, fromUserId, toUserId, amount, status           | Status: pending, confirmed, rejected          |
| **Transaction**  | userId, type, amount, description, categoryId, account  | Types: income, expense                        |
| **Budget**       | userId, categoryId, limitAmount, period, alertThreshold | Periods: weekly, monthly, yearly              |
| **Category**     | name, icon, color, parentId, isSystem                   | Self-referencing tree structure               |

---

## API Reference

### API Versioning

All REST endpoints are versioned under **`/api/v1`**. Legacy `/api` paths are supported for backward compatibility during migration. The frontend uses `API_BASE = '/api/v1'` from `lib/api.ts` for all RTK Query requests.

| Base Path   | Status          | Notes                         |
| ----------- | --------------- | ----------------------------- |
| `/api/v1/*` | Primary         | Use for all new integrations  |
| `/api/*`    | Backward compat | Mirrors v1; prefer v1 for new |

### REST Endpoints

All endpoints below are under `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

**Health** (no prefix, no auth)

| Method | Path            | Description                                                                                  |
| ------ | --------------- | -------------------------------------------------------------------------------------------- |
| GET    | `/health`       | Liveness probe — returns `{ status: "ok" }`                                                  |
| GET    | `/health/ready` | Readiness probe — checks Postgres + Redis, returns `{ status: "ready"\|"degraded", checks }` |

**Auth** (`/api/v1/auth`)

| Method | Path                      | Auth | Description                            |
| ------ | ------------------------- | ---- | -------------------------------------- |
| POST   | `/register`               | No   | Create account                         |
| POST   | `/login`                  | No   | Login, returns access + refresh tokens |
| POST   | `/refresh`                | No   | Refresh access token                   |
| POST   | `/logout`                 | Yes  | Invalidate session                     |
| POST   | `/password-reset/request` | No   | Request password reset email           |
| POST   | `/password-reset/confirm` | No   | Confirm password reset                 |

**Users** (`/api/v1/users`)

| Method | Path              | Description              |
| ------ | ----------------- | ------------------------ |
| GET    | `/me`             | Get current user profile |
| PUT    | `/me`             | Update profile           |
| PUT    | `/me/preferences` | Update preferences       |

**Groups** (`/api/v1/groups`)

| Method | Path                   | Description            |
| ------ | ---------------------- | ---------------------- |
| GET    | `/`                    | List user's groups     |
| POST   | `/`                    | Create group           |
| GET    | `/:id`                 | Get group with members |
| PUT    | `/:id`                 | Update group           |
| DELETE | `/:id`                 | Delete group           |
| POST   | `/:id/members`         | Add member             |
| PUT    | `/:id/members/:userId` | Update member role     |
| DELETE | `/:id/members/:userId` | Remove member          |

**Expenses** (`/api/v1/expenses`)

| Method | Path              | Description                                                                       |
| ------ | ----------------- | --------------------------------------------------------------------------------- |
| GET    | `/group/:groupId` | List group expenses (paginated, filterable)                                       |
| POST   | `/`               | Create expense with payers and splits (validates payers/splits are group members) |
| GET    | `/:id`            | Get expense details                                                               |
| PUT    | `/:id`            | Update expense (validates payers/splits are group members)                        |
| DELETE | `/:id`            | Delete expense                                                                    |

**Settlements** (`/api/v1/settlements`)

| Method | Path                         | Description               |
| ------ | ---------------------------- | ------------------------- |
| GET    | `/group/:groupId`            | List group settlements    |
| POST   | `/`                          | Create settlement         |
| PUT    | `/:id/status`                | Update settlement status  |
| GET    | `/group/:groupId/balances`   | Get group balances        |
| GET    | `/group/:groupId/simplified` | Get simplified debt graph |

**Transactions** (`/api/v1/transactions`)

| Method | Path   | Description                                    |
| ------ | ------ | ---------------------------------------------- |
| GET    | `/`    | List user transactions (paginated, filterable) |
| POST   | `/`    | Create transaction                             |
| GET    | `/:id` | Get transaction                                |
| PUT    | `/:id` | Update transaction                             |
| DELETE | `/:id` | Delete transaction                             |

**Budgets** (`/api/v1/budgets`)

| Method | Path   | Description                     |
| ------ | ------ | ------------------------------- |
| GET    | `/`    | List user budgets with progress |
| POST   | `/`    | Create budget                   |
| PUT    | `/:id` | Update budget                   |
| DELETE | `/:id` | Delete budget                   |

**Categories** (`/api/v1/categories`)

| Method | Path   | Description                     |
| ------ | ------ | ------------------------------- |
| GET    | `/`    | List categories (system + user) |
| POST   | `/`    | Create custom category          |
| PUT    | `/:id` | Update category                 |
| DELETE | `/:id` | Delete category                 |

**AI** (`/api/v1/ai`)

| Method | Path             | Description                                              |
| ------ | ---------------- | -------------------------------------------------------- |
| POST   | `/categorize`    | Smart expense categorization (Claude / keyword fallback) |
| POST   | `/parse-expense` | Natural language expense parsing                         |
| POST   | `/insights`      | Financial insights and tips                              |

**Uploads** (`/api/v1/uploads`)

| Method | Path             | Description                 |
| ------ | ---------------- | --------------------------- |
| POST   | `/presigned-url` | Get S3 presigned upload URL |

**Reports** (`/api/v1/reports`)

| Method | Path           | Description                    |
| ------ | -------------- | ------------------------------ |
| GET    | `/summary`     | Transaction summary by period  |
| GET    | `/by-category` | Spending breakdown by category |

**CSRF** (`/api/v1/csrf-token`) — Optional for cookie-based or cross-origin form flows; JWT-only API clients can omit

| Method | Path      | Auth | Description                                          |
| ------ | --------- | ---- | ---------------------------------------------------- |
| GET    | `/`       | No   | Get CSRF token (sets `__csrf` cookie, returns token) |
| POST   | `/revoke` | Yes  | Revoke token on logout                               |

**Features** (`/api/v1/features`) — Feature flags (Redis-cached, Prisma-backed)

| Method | Path | Auth | Description              |
| ------ | ---- | ---- | ------------------------ |
| GET    | `/`  | No   | List enabled feature IDs |

**Webhooks** (`/api/v1/webhooks`) — Raw body required; no `express.json()` parsing

| Method | Path      | Auth | Description                                                         |
| ------ | --------- | ---- | ------------------------------------------------------------------- |
| POST   | `/stripe` | No   | Stripe webhook; verified via `Stripe-Signature`, idempotent (Redis) |

**API Documentation** (no version prefix)

| Method | Path                     | Description                           |
| ------ | ------------------------ | ------------------------------------- |
| GET    | `/api-docs`              | Swagger UI (interactive API explorer) |
| GET    | `/api-docs/openapi.json` | OpenAPI 3 spec (JSON)                 |

### GraphQL

Available at `/graphql` (introspection enabled in development).

**Queries:** `me`, `groups`, `group(id)`, `groupExpenses(groupId)`, `groupBalances(groupId)`, `simplifiedDebts(groupId)`, `transactions`, `budgets`, `categories`

**Mutations:** `createGroup`, `createExpense`, `createSettlement`, `createTransaction`

### WebSocket Events

Socket.IO server runs on the same HTTP server. Requires JWT auth via `socket.handshake.auth.token`.

| Event                | Direction       | Description                             |
| -------------------- | --------------- | --------------------------------------- |
| `join_group`         | Client → Server | Join a group room for real-time updates |
| `leave_group`        | Client → Server | Leave a group room                      |
| `expense:created`    | Server → Group  | New expense added                       |
| `expense:updated`    | Server → Group  | Expense modified                        |
| `settlement:created` | Server → Group  | New settlement recorded                 |

---

## Features

- **Group Expense Splitting** — Create groups, add expenses with multiple payers, split by equal/exact/percentage/shares
- **Simplified Debts** — Minimize the number of transactions needed to settle up
- **Personal Finance** — Track income and expenses with categories and accounts
- **Budget Management** — Set category-based budgets with alert thresholds and period tracking
- **Multi-Currency** — 20 supported currencies with base amount conversion
- **AI-Powered** — Smart categorization via Anthropic Claude, natural language expense parsing, financial insights
- **Real-Time Updates** — Socket.IO for live expense and settlement notifications
- **Background Jobs** — BullMQ queues for notifications, reports, and debt calculations
- **File Uploads** — S3 presigned URL workflow for receipt attachments
- **Reports** — Spending summaries and category breakdowns
- **Google OAuth** — Social login support (configurable)
- **Responsive UI** — Mobile-friendly sidebar layout with Tailwind CSS
- **Theme Management** — Light/dark/system themes with localStorage persistence and FOUC prevention

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **PostgreSQL** 16
- **Redis** 7

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd splitwise

# Install all dependencies (workspaces + root)
npm install

# Build the shared package (required before running backend/frontend)
npm run build:shared
```

### Environment Variables

Copy the example file and configure:

```bash
cp .env.example .env
```

All environment variables are validated at startup via a Zod schema. In **production**, the server will exit immediately with a clear error if required variables are missing. In **development**, safe defaults are provided for `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` so you can start the app without a fully configured `.env`.

| Variable                  | Required in Prod | Dev Default                                                     | Description                                                                          |
| ------------------------- | ---------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`            | **Yes**          | `postgresql://splitwise:splitwise_dev@localhost:5433/splitwise` | PostgreSQL connection string                                                         |
| `REDIS_URL`               | **Yes**          | `redis://localhost:6379`                                        | Redis connection string                                                              |
| `JWT_SECRET`              | **Yes**          | Auto-generated dev secret                                       | Secret for signing access tokens                                                     |
| `JWT_REFRESH_SECRET`      | **Yes**          | Auto-generated dev secret                                       | Secret for signing refresh tokens                                                    |
| `FRONTEND_URL`            | No               | `http://localhost:3000`                                         | CORS origin                                                                          |
| `PORT`                    | No               | `4000`                                                          | Backend server port                                                                  |
| `ANTHROPIC_API_KEY`       | No               | —                                                               | Enables AI features (falls back to keyword matching)                                 |
| `GOOGLE_CLIENT_ID`        | No               | —                                                               | Google OAuth client ID                                                               |
| `GOOGLE_CLIENT_SECRET`    | No               | —                                                               | Google OAuth client secret                                                           |
| `AWS_ACCESS_KEY_ID`       | No               | —                                                               | S3 file uploads                                                                      |
| `AWS_SECRET_ACCESS_KEY`   | No               | —                                                               | S3 file uploads                                                                      |
| `S3_BUCKET`               | No               | `splitwise-uploads`                                             | S3 bucket name                                                                       |
| `SMTP_HOST`               | No               | `smtp.gmail.com`                                                | Email sending                                                                        |
| `SMTP_USER`               | No               | —                                                               | SMTP username                                                                        |
| `SMTP_PASS`               | No               | —                                                               | SMTP password                                                                        |
| `RATE_LIMIT_WINDOW_MS`    | No               | `60000`                                                         | Rate limit window in milliseconds                                                    |
| `RATE_LIMIT_MAX_REQUESTS` | No               | `100`                                                           | Max requests per window                                                              |
| `SENTRY_DSN`              | No               | —                                                               | Sentry error tracking (enables server-side exception reporting)                      |
| `STRIPE_SECRET_KEY`       | No               | —                                                               | Stripe API key (payments)                                                            |
| `STRIPE_WEBHOOK_SECRET`   | No               | —                                                               | Stripe webhook signing secret (`whsec_...`); verifies `POST /api/v1/webhooks/stripe` |

### Database Setup

```bash
# Start PostgreSQL and Redis (via Docker)
npm run docker:up

# Run Prisma migrations
npm run db:migrate

# Seed demo data
npm run db:seed

# (Optional) Open Prisma Studio
npm run db:studio
```

### Running the App

```bash
# Development — runs backend + frontend concurrently via Turborepo
npm run dev

# Or run individually
npm run dev:backend    # Express on http://localhost:4000
npm run dev:frontend   # Next.js on http://localhost:3000
```

---

## Docker

Full containerized setup with Docker Compose:

```bash
# Start all services (postgres, redis, backend, frontend)
npm run docker:up

# View logs
npm run docker:logs

# Stop all services
npm run docker:down
```

| Service  | Image                | Port | Notes                                                  |
| -------- | -------------------- | ---- | ------------------------------------------------------ |
| postgres | `postgres:16-alpine` | 5433 | Volume: `postgres_data`                                |
| redis    | `redis:7-alpine`     | 6379 | 256MB maxmemory, LRU eviction                          |
| backend  | Multi-stage Node 20  | 4000 | Runs `prisma migrate deploy` on startup, non-root user |
| frontend | Multi-stage Node 20  | 3000 | Next.js standalone build, non-root user                |

Both Dockerfiles use multi-stage builds: install deps → build shared → build app → minimal production image. Both run as non-root users (`backend:nodejs` / `nextjs:nodejs`) for security.

**Production Compose** (`docker-compose.prod.yml`)

For production-like deployments:

- **Docker secrets** — `postgres_password`, `redis_password`, `jwt_secret`, `jwt_refresh_secret` (file-based, not env vars)
- **Resource limits** — CPU and memory limits/reservations for all services
- **Restart policy** — `always` for all services
- **Health checks** — All services have health checks with `start_period`; backend uses `/health/ready` for Postgres + Redis probes
- **Log rotation** — `json-file` driver with max-size and max-file limits
- **Redis password** — Redis configured with `requirepass` via secret

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## Scripts Reference

Run from the repository root:

| Script                 | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run dev`          | Start all packages in development mode (Turborepo parallel)          |
| `npm run dev:backend`  | Start backend only                                                   |
| `npm run dev:frontend` | Start frontend only                                                  |
| `npm run build`        | Build all packages (shared → backend → frontend, cached)             |
| `npm run lint`         | Lint all packages                                                    |
| `npm run lint:fix`     | Lint and auto-fix all packages                                       |
| `npm run format`       | Format all files with Prettier                                       |
| `npm run format:check` | Check formatting without writing                                     |
| `npm run typecheck`    | Type-check all packages                                              |
| `npm run test`         | Run Jest unit tests (auth service, expense splitting logic; backend) |
| `npm run clean`        | Remove all build artifacts, node_modules, and Turbo cache            |
| `npm run db:migrate`   | Run Prisma migrations                                                |
| `npm run db:seed`      | Seed demo data                                                       |
| `npm run db:studio`    | Open Prisma Studio GUI                                               |
| `npm run docker:up`    | Start Docker Compose services                                        |
| `npm run docker:down`  | Stop Docker Compose services                                         |
| `npm run docker:logs`  | Tail Docker Compose logs                                             |

---

## Code Quality

### Turborepo

Build orchestration with dependency-aware task pipelines and local caching. Unchanged packages are skipped on subsequent builds.

### ESLint

- **Root** (`eslint.config.mjs`): ESLint 9 flat config with TypeScript rules, `consistent-type-imports`, `no-console`, Prettier compatibility
- **Backend** (`packages/backend/eslint.config.mjs`): Extends root, relaxes `no-console` for server logging
- **Frontend** (`packages/frontend/.eslintrc.json`): Extends `next/core-web-vitals` + Prettier

### Prettier

Configured at root (`.prettierrc`) with Tailwind CSS plugin for consistent class ordering. Runs on commit via lint-staged.

### Testing

- **Jest** — Backend unit tests with `ts-jest`, path aliases (`@/`, `@shared/`), and coverage thresholds (50%)
- **Auth service** — 15 tests for register, login, refresh, logout, password reset (bcrypt, Redis, Prisma mocks)
- **Expense splitting** — 25 tests for `splitEqually`, `splitByPercentage`, `splitByShares`, `roundMoney`, `formatCurrency`

```bash
npm run test              # Root: runs all package tests
cd packages/backend && npm run test   # Backend only
```

### Husky + lint-staged

- **Pre-commit hook**: Runs Prettier and ESLint `--fix` on staged `.ts`/`.tsx` files; Prettier on `.js`/`.json`/`.css`/`.md`
- **Commit-msg hook**: Enforces [Conventional Commits](https://www.conventionalcommits.org/) format

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

Examples:
  feat(expenses): add recurring expense support
  fix(auth): handle expired refresh tokens
  chore: update dependencies
```

### TypeScript

Strict mode enabled via `tsconfig.base.json`:

- `strict: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`
- `noImplicitReturns: true`
- `noFallthroughCasesInSwitch: true`

---

## Production-Grade Improvements

A set of enhancements applied to make the application production-ready across three priority tiers:

### Priority 1 — Critical

| Item                           | Description                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| **Env validation**             | Zod schema validates all env vars at startup; fail-fast in production on missing critical vars     |
| **Redis-backed rate limiting** | `rate-limit-redis` for API, auth (`/login`, `/register`), and GraphQL endpoints                    |
| **Automatic token refresh**    | RTK Query `baseQueryWithReauth` with mutex; silent refresh on 401 before redirecting to login      |
| **Dynamic dashboard**          | Live data from API, loading skeletons, error states, and retry                                     |
| **Error handling**             | React ErrorBoundary, Next.js `error.tsx` (global + dashboard), `loading.tsx` for route transitions |

### Priority 2 — Important

| Item                      | Description                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------- |
| **Docker non-root**       | Backend and frontend containers run as non-root users                                              |
| **Health checks**         | `/health` (liveness) and `/health/ready` (readiness with Postgres + Redis probes)                  |
| **Request tracing**       | `X-Request-Id` middleware; request/response logging with duration and `userId`                     |
| **Prisma error handling** | P2002, P2025, P2003 mapped to appropriate HTTP status codes                                        |
| **Redis SCAN**            | Pattern-based key deletion uses `SCAN` instead of `KEYS` (non-blocking)                            |
| **Theme management**      | Light/dark/system with `localStorage` and FOUC prevention script                                   |
| **Sentry**                | Backend error tracking; unhandled exceptions and `uncaughtException`/`unhandledRejection` captured |

### Priority 3 — Nice-to-have

| Item                        | Description                                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Jest + unit tests**       | Backend tests with path aliases, coverage thresholds; 15 auth tests, 25 expense-splitting tests                                |
| **Per-page SEO metadata**   | `metadata` / `generateMetadata` for login, register, dashboard, groups, group detail, transactions, budgets, reports, settings |
| **Expense validation**      | Payers and splits must reference group members; 400 error with invalid user IDs                                                |
| **docker-compose.prod.yml** | Docker secrets, resource limits, restart policies, Redis password, log rotation                                                |

### Phase 1 Production Features

Additional production-ready enhancements applied to the API and security layer:

| Item                  | Description                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **API versioning**    | All REST endpoints under `/api/v1`; backward compatibility at `/api`                                                            |
| **Security headers**  | Helmet with CSP, X-Frame-Options, HSTS, Referrer-Policy; CORS includes `X-CSRF-Token`, `X-Idempotency-Key`                      |
| **CSRF protection**   | Optional middleware for cookie-based flows; `GET /api/v1/csrf-token`, `POST /api/v1/csrf-token/revoke`; tokens stored in Redis  |
| **API documentation** | OpenAPI 3 spec at `/api-docs/openapi.json`; interactive Swagger UI at `/api-docs`                                               |
| **Stripe webhook**    | `POST /api/v1/webhooks/stripe` with HMAC-SHA256 signature verification; raw body; idempotent event handling via Redis (24h TTL) |

---

## Project Conventions

| Convention          | Details                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Package naming**  | `@splitwise/<package>` scoped names                                                                             |
| **Architecture**    | Controller → Service → Repository (backend)                                                                     |
| **Validation**      | Zod schemas in `@splitwise/shared`, used in both Express middleware and React Hook Form                         |
| **Env validation**  | Zod schema validates all env vars at startup; fail-fast in production on missing critical vars                  |
| **API responses**   | `{ success, data }` / `{ success, error: { code, message, details } }` envelope                                 |
| **Auth**            | JWT Bearer tokens; access (15m) + refresh (7d); automatic silent refresh on 401                                 |
| **Rate limiting**   | Redis-backed via `rate-limit-redis`; tiered limits for API, auth, and GraphQL                                   |
| **Error handling**  | `AppError` class with static factories; centralized error middleware; React ErrorBoundary + Next.js `error.tsx` |
| **Logging**         | Pino with structured JSON (production) / pretty-print (development)                                             |
| **Naming**          | camelCase for variables/functions, PascalCase for types/components                                              |
| **Commits**         | Conventional Commits enforced by git hook                                                                       |
| **Formatting**      | Prettier + ESLint enforced on commit                                                                            |
| **Docker security** | Both backend and frontend containers run as non-root users                                                      |

---

## Seed Data

After running `npm run db:seed`, the following demo data is available:

| User      | Email                | Password      |
| --------- | -------------------- | ------------- |
| Demo User | `demo@splitwise.app` | `Password123` |
| Alice     | `alice@example.com`  | `Password123` |
| Bob       | `bob@example.com`    | `Password123` |

A demo group **"Weekend Trip"** (USD) is created with all three users, sample expenses, and settlements.

System categories (Food & Drink, Transportation, Entertainment, etc.) are also seeded.
