# ---- Base ----
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/dashboard/package.json apps/dashboard/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter @repo/dashboard...

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/dashboard/node_modules ./apps/dashboard/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/dashboard ./apps/dashboard
COPY packages ./packages
RUN cd apps/dashboard && pnpm run build

# ---- Production ----
FROM node:22-alpine AS production
WORKDIR /app

COPY --from=build /app/apps/dashboard/build ./build
COPY --from=deps /app/apps/dashboard/node_modules ./node_modules
COPY apps/dashboard/package.json ./

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["node", "build/index.js"]
