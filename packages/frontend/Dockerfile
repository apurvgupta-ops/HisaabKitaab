FROM node:20-alpine AS base
WORKDIR /app

# --- Install all monorepo deps via npm workspaces ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json

# Stub the backend package.json so npm workspaces doesn't fail
RUN mkdir -p packages/backend && echo '{"name":"@splitwise/backend","version":"1.0.0","private":true}' > packages/backend/package.json

RUN npm install --legacy-peer-deps

# --- Build the shared package first ---
FROM base AS shared-build
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY --from=deps /app/node_modules ./node_modules
RUN cd packages/shared && npx tsc

# --- Build the frontend ---
FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
COPY tsconfig.base.json ./
COPY packages/frontend ./packages/frontend
COPY --from=deps /app/node_modules ./node_modules
COPY --from=shared-build /app/packages/shared ./packages/shared

# Ensure public folder exists
RUN mkdir -p packages/frontend/public

RUN cd packages/frontend && npm run build

# --- Production runner ---
# Standalone output for monorepo lives at:
#   .next/standalone/node_modules     (traced deps)
#   .next/standalone/packages/frontend/server.js
#   .next/standalone/packages/frontend/.next/...
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the full standalone tree preserving monorepo layout
COPY --from=build --chown=nextjs:nodejs /app/packages/frontend/.next/standalone ./

# Copy static assets into the correct location within the monorepo layout
COPY --from=build /app/packages/frontend/public ./packages/frontend/public
COPY --from=build --chown=nextjs:nodejs /app/packages/frontend/.next/static ./packages/frontend/.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

WORKDIR /app/packages/frontend
CMD ["node", "server.js"]
