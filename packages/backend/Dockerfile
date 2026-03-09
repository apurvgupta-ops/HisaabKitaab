FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json ./packages/backend/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/backend/package.json ./packages/backend/package.json
RUN cd packages/backend && npm install --legacy-peer-deps

FROM base AS shared-build
COPY packages/shared ./packages/shared
COPY tsconfig.base.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
RUN cd packages/shared && npx tsc

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/backend/node_modules ./packages/backend/node_modules
COPY --from=shared-build /app/packages/shared ./packages/shared
COPY packages/backend ./packages/backend
COPY tsconfig.base.json ./
RUN cd packages/backend && npx prisma generate && npx tsc

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /app/packages/backend/dist ./dist
COPY --from=build /app/packages/backend/prisma ./prisma
COPY --from=build /app/packages/backend/node_modules ./node_modules
COPY --from=build /app/packages/shared/dist ./node_modules/@splitwise/shared/dist
COPY --from=build /app/packages/shared/package.json ./node_modules/@splitwise/shared/package.json

EXPOSE 4000

CMD ["node", "dist/server.js"]
