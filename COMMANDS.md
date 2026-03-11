# Splitwise App - Command Reference

## Prerequisites

- Node.js 20+
- Docker Desktop
- npm 10+

---

## Docker Commands

### Start databases (PostgreSQL + Redis)
```bash
docker-compose up -d postgres redis
```

### Start all services (databases + backend + frontend)
```bash
docker-compose up -d
```

### Stop all containers
```bash
docker-compose down
```

### Stop and remove volumes (resets all data)
```bash
docker-compose down -v
```

### View container logs
```bash
docker-compose logs -f           # all services
docker-compose logs -f postgres  # postgres only
docker-compose logs -f redis     # redis only
docker-compose logs -f backend   # backend only
docker-compose logs -f frontend  # frontend only
```

### Check running containers
```bash
docker-compose ps
```

### Restart a specific service
```bash
docker-compose restart postgres
docker-compose restart redis
```

### Rebuild images (after code changes)
```bash
docker-compose up -d --build backend
docker-compose up -d --build frontend
```

---

## PostgreSQL Commands

### Connection details (local development)
| Field    | Value                |
|----------|----------------------|
| Host     | localhost            |
| Port     | 5433                 |
| User     | splitwise            |
| Password | splitwise_dev        |
| Database | splitwise            |

### Connect via psql (inside Docker)
```bash
docker exec -it splitwise-postgres psql -U splitwise -d splitwise
```

### Common psql commands (run after connecting)
```sql
\dt                          -- list all tables
\d users                     -- describe users table
\d+ expenses                 -- detailed table info with sizes
\l                           -- list all databases
\du                          -- list all users/roles
\q                           -- quit psql

SELECT * FROM users;
SELECT * FROM groups;
SELECT * FROM categories;
SELECT * FROM expenses;
SELECT * FROM settlements;
SELECT * FROM transactions;
SELECT * FROM budgets;
SELECT * FROM group_members;
SELECT * FROM expense_payers;
SELECT * FROM expense_splits;

SELECT COUNT(*) FROM users;  -- count rows in a table
```

### Run raw SQL from host machine
```bash
docker exec -it splitwise-postgres psql -U splitwise -d splitwise -c "SELECT * FROM users;"
```

### Export database dump
```bash
docker exec splitwise-postgres pg_dump -U splitwise splitwise > backup.sql
```

### Import database dump
```bash
docker exec -i splitwise-postgres psql -U splitwise splitwise < backup.sql
```

---

## Redis Commands

### Connect to Redis CLI
```bash
docker exec -it splitwise-redis redis-cli
```

### Common Redis commands (run after connecting)
```bash
PING                         # should return PONG
KEYS *                       # list all keys
GET <key>                    # get value of a key
DEL <key>                    # delete a key
FLUSHALL                     # delete ALL keys (careful!)
INFO memory                  # memory usage stats
INFO clients                 # connected clients
DBSIZE                       # number of keys in current DB
TTL <key>                    # time to live for a key
QUIT                         # exit
```

### Run Redis command from host
```bash
docker exec splitwise-redis redis-cli PING
docker exec splitwise-redis redis-cli KEYS "*"
docker exec splitwise-redis redis-cli FLUSHALL
```

---

## Prisma Commands

All Prisma commands run from `packages/backend/`:

### Generate Prisma Client (after schema changes)
```bash
npm run db:generate -w packages/backend
# or
cd packages/backend && npx prisma generate
```

### Create and apply migrations (development)
```bash
npm run db:migrate -w packages/backend
# or
cd packages/backend && npx prisma migrate dev --name <migration_name>
```

### Apply migrations (production)
```bash
cd packages/backend && npx prisma migrate deploy
```

### Reset database (drops all data + re-migrates)
```bash
cd packages/backend && npx prisma migrate reset
```

### Seed database with demo data
```bash
npm run db:seed -w packages/backend
# or
cd packages/backend && npx tsx prisma/seed.ts
```

### Open Prisma Studio (visual DB browser at http://localhost:5555)
```bash
npm run db:studio -w packages/backend
# or
cd packages/backend && npx prisma studio
```

### View migration status
```bash
cd packages/backend && npx prisma migrate status
```

### Format Prisma schema file
```bash
cd packages/backend && npx prisma format
```

### Introspect existing database (generate schema from DB)
```bash
cd packages/backend && npx prisma db pull
```

---

## NPM / Project Commands

### Install all dependencies
```bash
npm install --legacy-peer-deps
```

### Run development servers (backend + frontend)
```bash
npm run dev
```

### Run backend only (http://localhost:4000)
```bash
npm run dev:backend
```

### Run frontend only (http://localhost:3000)
```bash
npm run dev:frontend
```

### Build all packages
```bash
npm run build
```

### Build individual packages
```bash
npm run build:shared
npm run build:backend
npm run build:frontend
```

### Run tests
```bash
npm test
```

### Lint code
```bash
npm run lint
```

---

## Full Setup (First Time)

```bash
# 1. Clone and install
npm install --legacy-peer-deps

# 2. Start databases
docker-compose up -d postgres redis

# 3. Wait a few seconds for DB to be ready, then run migrations
cd packages/backend && npx prisma migrate dev --name init

# 4. Seed demo data
cd packages/backend && npx tsx prisma/seed.ts

# 5. Go back to root and start dev servers
cd ../..
npm run dev
```

Backend runs at: **http://localhost:4000**
Frontend runs at: **http://localhost:3000**
Prisma Studio: **http://localhost:5555** (run `npm run db:studio -w packages/backend`)
GraphQL Playground: **http://localhost:4000/graphql**
Health check: **http://localhost:4000/health**

---

## API Testing (curl examples)

### Health check
```bash
curl http://localhost:4000/health
```

### Register a user
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe","email":"john@example.com","password":"Password123"}'
```

### Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"Password123"}'
```

### Authenticated request (replace <TOKEN> with JWT from login response)
```bash
curl http://localhost:4000/api/users/me \
  -H "Authorization: Bearer <TOKEN>"
```

### Create a group
```bash
curl -X POST http://localhost:4000/api/groups \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"Trip to Goa","type":"trip","currency":"INR"}'
```

---

## Troubleshooting

### Port 5432 already in use (local PostgreSQL conflict)
The app uses port **5433** for Docker PostgreSQL to avoid conflicts with local PostgreSQL. If you change this, update:
- `docker-compose.yml` (ports mapping)
- `.env` (DATABASE_URL)
- `packages/backend/.env` (DATABASE_URL)

### Prisma: "Environment variable not found: DATABASE_URL"
Make sure `packages/backend/.env` exists with:
```
DATABASE_URL=postgresql://splitwise:splitwise_dev@localhost:5433/splitwise
```

### Docker containers not starting
```bash
docker-compose down -v    # remove old volumes
docker-compose up -d      # fresh start
```

### Reset everything (nuclear option)
```bash
docker-compose down -v                              # remove containers + volumes
rm -rf node_modules packages/*/node_modules         # remove all node_modules
npm install --legacy-peer-deps                       # reinstall
docker-compose up -d postgres redis                  # start fresh DBs
cd packages/backend && npx prisma migrate dev        # re-create tables
cd packages/backend && npx tsx prisma/seed.ts        # re-seed data
```
