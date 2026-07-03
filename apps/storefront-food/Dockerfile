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

# ---- Production dependencies (prod-only; slimmer runtime image) ----
# P1-D(#34): install only production deps so dev tooling (vite, typescript,
# svelte-check, tailwindcss, @lucide/svelte, mode-watcher, ...) is excluded
# from the runtime image. Safe because `svelte` was moved to dependencies —
# SvelteKit externalizes it at runtime (build/server imports `from 'svelte'`);
# @sveltejs/kit and the rest are bundled into build/.
FROM base AS prod-deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/storefront-food/package.json apps/storefront-food/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-utils/package.json packages/shared-utils/
COPY packages/ui/package.json packages/ui/
RUN pnpm install --frozen-lockfile --prod --filter @repo/storefront-food...

# ---- Production ----
FROM node:24-alpine AS production
WORKDIR /app

COPY --from=build /app/apps/storefront-food/build ./build
# P1-D: strip sourcemaps from the production image (see apps/storefront/Dockerfile).
RUN find build \( -name '*.map' -o -name '*.map.gz' -o -name '*.map.br' \) -delete
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=prod-deps /app/apps/storefront-food/node_modules ./apps/storefront-food/node_modules
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
