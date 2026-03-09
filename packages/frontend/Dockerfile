FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/frontend/package.json ./packages/frontend/package.json
RUN npm install --legacy-peer-deps --workspace=packages/frontend

FROM base AS shared-build
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
RUN cd packages/shared && npx tsc

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/frontend/node_modules ./packages/frontend/node_modules
COPY --from=shared-build /app/packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY tsconfig.base.json ./
RUN cd packages/frontend && npm run build

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=build /app/packages/frontend/public ./public
COPY --from=build --chown=nextjs:nodejs /app/packages/frontend/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/packages/frontend/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
