# ---- Base ----
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/storefront/package.json apps/storefront/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter @repo/storefront...

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/storefront/node_modules ./apps/storefront/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/storefront ./apps/storefront
COPY packages ./packages
RUN cd apps/storefront && pnpm run build

# ---- Production ----
FROM node:22-alpine AS production
WORKDIR /app

COPY --from=build /app/apps/storefront/build ./build
COPY --from=deps /app/apps/storefront/node_modules ./node_modules
COPY apps/storefront/package.json ./

ENV NODE_ENV=production
ENV PORT=3002
EXPOSE 3002

CMD ["node", "build/index.js"]
