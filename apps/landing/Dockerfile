# ---- Base ----
FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# ---- Dependencies ----
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/landing/package.json apps/landing/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --filter @repo/landing...

# ---- Build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/landing/node_modules ./apps/landing/node_modules
COPY --from=deps /app/packages ./packages
COPY apps/landing ./apps/landing
COPY packages ./packages
RUN cd apps/landing && pnpm run build

# ---- Production ----
FROM node:24-alpine AS production
WORKDIR /app

COPY --from=build /app/apps/landing/build ./build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/landing/node_modules ./apps/landing/node_modules
COPY apps/landing/package.json ./

# Merge app node_modules into root (resolve pnpm symlinks for runtime)
RUN for pkg in apps/landing/node_modules/*; do \
    [ -d "$pkg" ] || continue; \
    name=$(basename "$pkg"); \
    [ "$name" = ".bin" ] && continue; \
    rm -rf "node_modules/$name" 2>/dev/null; \
    cp -rL "$pkg" "node_modules/$name"; \
done 2>/dev/null || true

ENV NODE_ENV=production
ENV PORT=3004
EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3004/', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

CMD ["node", "build/index.js"]
