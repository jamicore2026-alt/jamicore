# ---- Base ----
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/storefront-food/package.json apps/storefront-food/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter @repo/storefront-food...

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/storefront-food/node_modules ./apps/storefront-food/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/storefront-food ./apps/storefront-food
COPY packages ./packages
RUN cd apps/storefront-food && pnpm run build

# ---- Production ----
FROM node:24-alpine AS production
WORKDIR /app

COPY --from=build /app/apps/storefront-food/build ./build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/storefront-food/node_modules ./apps/storefront-food/node_modules
COPY apps/storefront-food/package.json ./

# Merge app node_modules into root (resolve pnpm symlinks for runtime)
RUN for pkg in apps/storefront-food/node_modules/*; do \
    [ -d "$pkg" ] || continue; \
    name=$(basename "$pkg"); \
    [ "$name" = ".bin" ] && continue; \
    rm -rf "node_modules/$name" 2>/dev/null; \
    cp -rL "$pkg" "node_modules/$name"; \
done 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3003
EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

CMD ["node", "build/index.js"]
