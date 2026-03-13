FROM node:20-alpine AS base
WORKDIR /app

# --- Install all monorepo deps via npm workspaces ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/backend/package.json ./packages/backend/package.json

# Stub the frontend package.json so npm workspaces doesn't fail
RUN mkdir -p packages/frontend && echo '{"name":"@splitwise/frontend","version":"1.0.0","private":true}' > packages/frontend/package.json

RUN npm install --legacy-peer-deps

# --- Build the shared package first ---
FROM base AS shared-build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY --from=deps /app/node_modules ./node_modules
RUN cd packages/shared && npx tsc

# --- Build the backend (including prisma generate) ---
FROM base AS build
COPY tsconfig.base.json ./
COPY packages/backend ./packages/backend
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-build /app/packages/shared ./packages/shared
RUN cd packages/backend && npx prisma generate && npx tsc

# --- Production runner ---
FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 backend

COPY --from=build --chown=backend:nodejs /app/packages/backend/dist ./dist
COPY --from=build --chown=backend:nodejs /app/packages/backend/prisma ./prisma
COPY --from=build --chown=backend:nodejs /app/node_modules ./node_modules

COPY --from=shared-build --chown=backend:nodejs /app/packages/shared/dist ./node_modules/@splitwise/shared/dist
COPY --from=shared-build --chown=backend:nodejs /app/packages/shared/package.json ./node_modules/@splitwise/shared/package.json

USER backend

EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy --schema ./prisma/schema.prisma && node dist/server.js"]
