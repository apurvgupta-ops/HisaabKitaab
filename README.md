# HisaabKitaab
A modern expense splitting &amp; money management platform built with Next.js, Node.js, PostgreSQL &amp; AI. Split bills instantly, track budgets, and manage finances with intelligent categorization. Features: multi-currency, OCR receipts, debt simplification, real-time updates &amp; AI-powered insights. Production-ready with Docker &amp; AWS deployment.


# 💰 HisaabKitaab

<div align="center">

![HisaabKitaab Logo](./assets/logo.png)

**Smart Expense Splitting & Money Management Platform**

*Split bills instantly • Track budgets • Manage finances with AI*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

[Demo](https://hisaabkitaab.com) • [Documentation](./docs) • [API Docs](./docs/api) • [Contributing](./CONTRIBUTING.md)

</div>

---

## 🎯 Overview

HisaabKitaab is a production-grade expense splitting and personal finance management application inspired by Splitwise, with advanced AI-powered features. Built for scalability, security, and exceptional user experience.

### ✨ Key Features

#### 💸 Expense Splitting (Splitwise-like)
- **Smart Splitting**: Equal, percentage, exact amounts, custom shares
- **Group Management**: Trips, roommates, events, projects
- **Debt Simplification**: Graph-based algorithm to minimize transactions
- **Multi-Currency**: Live exchange rates with 150+ currencies
- **Settlement Tracking**: Payment history with status updates
- **Receipt Upload**: S3-backed storage with OCR extraction

#### 📊 Personal Finance Management
- **Income/Expense Tracking**: Multi-account support
- **Budget Management**: Category-wise limits with real-time alerts
- **Financial Goals**: Savings targets, debt payoff tracking
- **Net Worth Calculator**: Assets vs liabilities overview
- **Cash Flow Analysis**: Daily/weekly/monthly trend visualization
- **Bill Reminders**: Never miss a payment

#### 🤖 AI-Powered Features
- **Auto-Categorization**: Claude AI categorizes expenses from descriptions
- **OCR Receipt Scanning**: Extract amount, date, merchant from images
- **Smart Split Suggestions**: AI recommends split logic based on context
- **Natural Language Entry**: "Spent ₹500 on groceries yesterday"
- **Financial Insights**: Monthly summaries and spending pattern analysis

#### ⚡ Advanced Capabilities
- **Real-time Updates**: Socket.io for live group synchronization
- **Payment Integration**: Razorpay/Stripe for instant settlements
- **Export Reports**: CSV/PDF with customizable date ranges
- **Multi-platform**: Responsive web + PWA for mobile experience
- **Notifications**: Email/SMS/Push for settlements and reminders

---

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router, Server Components)
- **Language**: TypeScript 5+
- **State Management**: Redux Toolkit + RTK Query
- **UI Library**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod
- **Real-time**: Socket.io Client

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js + TypeScript
- **API**: RESTful + GraphQL (Apollo Server)
- **Authentication**: JWT + Refresh Tokens, OAuth 2.0
- **Real-time**: Socket.io
- **Background Jobs**: Bull Queue + Redis
- **File Uploads**: Multer + AWS S3

### Database & Caching
- **Primary**: PostgreSQL 15 (transactional data)
- **Document Store**: MongoDB (flexible metadata)
- **Cache**: Redis 7 (sessions, queues)
- **ORM**: Prisma (PostgreSQL), Mongoose (MongoDB)

### AI/GenAI
- **Provider**: Anthropic Claude API (Sonnet 4)
- **Framework**: LangChain.js
- **Use Cases**: Categorization, OCR parsing, insights generation
- **Vector Store**: Pinecone (future feature)

### DevOps & Infrastructure
- **Containerization**: Docker + Docker Compose
- **Cloud**: AWS (EC2, S3, RDS, ElastiCache, Lambda)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry, CloudWatch
- **CDN**: CloudFront

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 20+
PostgreSQL 15+
MongoDB 6+
Redis 7+
Docker (optional)
```

### Installation
```bash
# Clone repository
git clone https://github.com/yourusername/hisaabkitaab.git
cd hisaabkitaab

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env with your credentials

# Run database migrations
npm run db:migrate

# Seed database (optional)
npm run db:seed

# Start development servers
npm run dev
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- GraphQL Playground: http://localhost:5000/graphql

### Docker Setup (Recommended)
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 📁 Project Structure
```
hisaabkitaab/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/           # App router pages
│   │   │   ├── components/    # React components
│   │   │   ├── store/         # Redux store
│   │   │   └── lib/           # Utilities
│   │   └── public/
│   └── api/                    # Node.js backend
│       ├── src/
│       │   ├── modules/       # Feature modules
│       │   │   ├── users/
│       │   │   ├── groups/
│       │   │   ├── expenses/
│       │   │   ├── settlements/
│       │   │   └── budgets/
│       │   ├── shared/        # Shared services
│       │   │   ├── database/
│       │   │   ├── cache/
│       │   │   ├── queue/
│       │   │   └── ai/
│       │   └── infrastructure/
│       └── tests/
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── types/                  # Shared TypeScript types
│   └── utils/                  # Shared utilities
├── docker-compose.yml
├── .github/
│   └── workflows/             # CI/CD pipelines
└── docs/                      # Documentation
```

---

## 🧪 Testing
```bash
# Run all tests
npm test

# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

---

## 📚 API Documentation

### Authentication
```
POST   /api/auth/register      # Create account
POST   /api/auth/login         # Login with JWT
POST   /api/auth/refresh       # Refresh access token
POST   /api/auth/logout        # Logout
```

### Groups
```
GET    /api/groups             # List user's groups
POST   /api/groups             # Create group
GET    /api/groups/:id         # Group details
PUT    /api/groups/:id         # Update group
DELETE /api/groups/:id         # Delete group
POST   /api/groups/:id/members # Add member
```

### Expenses
```
GET    /api/groups/:id/expenses    # List expenses
POST   /api/groups/:id/expenses    # Create expense
PUT    /api/expenses/:id           # Update expense
DELETE /api/expenses/:id           # Delete expense
POST   /api/expenses/categorize    # AI categorization
```

### Settlements
```
GET    /api/groups/:id/balances    # Calculate balances
POST   /api/groups/:id/settle      # Record settlement
GET    /api/settlements            # Settlement history
```

[Full API Documentation →](./docs/api/README.md)

---

## 🔐 Security

- **Authentication**: JWT with HTTP-only cookies
- **Authorization**: Role-based access control (RBAC)
- **Rate Limiting**: 100 requests/min per user
- **Input Validation**: Zod schemas on all inputs
- **SQL Injection**: Parameterized queries via Prisma
- **XSS Protection**: Content Security Policy headers
- **CSRF**: Token-based protection
- **Encryption**: bcrypt (passwords), AES-256 (sensitive data)

---

## 🚢 Deployment

### Environment Variables
```env
# See .env.example for complete list
DATABASE_URL=postgresql://...
MONGO_URI=mongodb://...
REDIS_URL=redis://...
JWT_SECRET=your-secret-key
ANTHROPIC_API_KEY=sk-ant-...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

### AWS Deployment
```bash
# Build Docker images
docker build -t hisaabkitaab-web ./apps/web
docker build -t hisaabkitaab-api ./apps/api

# Push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker tag hisaabkitaab-web:latest <account>.dkr.ecr.us-east-1.amazonaws.com/hisaabkitaab-web:latest
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/hisaabkitaab-web:latest

# Deploy via GitHub Actions (automated)
git push origin main
```

[Deployment Guide →](./docs/deployment/README.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.
```bash
# Fork the repo
# Create feature branch
git checkout -b feature/amazing-feature

# Commit changes
git commit -m "Add amazing feature"

# Push to branch
git push origin feature/amazing-feature

# Open Pull Request
```

### Development Guidelines
- Write TypeScript with strict mode
- Follow ESLint + Prettier rules
- Write tests for new features (>80% coverage)
- Update documentation
- Use conventional commits

---

## 📊 Performance Benchmarks

- **API Latency**: p95 < 200ms
- **Page Load**: < 2s (LCP)
- **Database Queries**: < 50ms avg
- **AI Categorization**: < 3s per request
- **Concurrent Users**: 10k+ tested

---

## 🗺️ Roadmap

- [x] Core expense splitting
- [x] Personal finance tracking
- [x] AI categorization
- [x] Multi-currency support
- [ ] Mobile apps (React Native)
- [ ] Recurring expenses automation
- [ ] Investment portfolio tracking
- [ ] Tax report generation
- [ ] Voice expense entry
- [ ] Cryptocurrency support

[View Full Roadmap →](./docs/ROADMAP.md)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 👥 Team

**Apurv Gupta** - Full-Stack Developer
- GitHub: [@apurvgupta](https://github.com/apurvgupta)
- LinkedIn: [Apurv Gupta](https://linkedin.com/in/apurvgupta)

---

## 🙏 Acknowledgments

- [Splitwise](https://www.splitwise.com/) - Inspiration for expense splitting
- [Anthropic Claude](https://www.anthropic.com/) - AI categorization
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- All our contributors!

---

## 📞 Support

- **Documentation**: [docs.hisaabkitaab.com](https://docs.hisaabkitaab.com)
- **Issues**: [GitHub Issues](https://github.com/yourusername/hisaabkitaab/issues)
- **Email**: support@hisaabkitaab.com
- **Discord**: [Join Community](https://discord.gg/hisaabkitaab)

---

<div align="center">

**⭐ Star this repo if you find it useful! ⭐**

Made with ❤️ in India

</div>
```

---

## GitHub Topics (Tags)
```
expense-splitting
money-management
personal-finance
splitwise-clone
nextjs
nodejs
typescript
postgresql
redis
ai-powered
anthropic-claude
langchain
fintech
budgeting
expense-tracker
pwa
docker
aws
production-ready
full-stack
