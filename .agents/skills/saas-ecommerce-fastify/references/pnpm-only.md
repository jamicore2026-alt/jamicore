# ⚠️ CRITICAL: Use pnpm ONLY (Never npm)

This project uses **pnpm** exclusively. npm is strictly prohibited.

## Why pnpm?

- **Disk efficient**: Shared dependencies across projects
- **Strict**: Prevents phantom dependencies
- **Fast**: Better parallelization
- **Monorepo optimized**: Native workspace support

## Installation Commands (pnpm ONLY)

```bash
# ❌ NEVER use npm
npm install                    # ❌ FORBIDDEN
npm i package-name             # ❌ FORBIDDEN
npm run dev                    # ❌ FORBIDDEN

# ✅ ALWAYS use pnpm
pnpm install                   # ✅ Install dependencies
pnpm add package-name          # ✅ Add dependency
pnpm add -D package-name       # ✅ Add dev dependency
pnpm run dev                   # ✅ Run scripts
pnpm exec command              # ✅ Execute commands
pnpm dlx package               # ✅ Download and execute

# Monorepo commands
pnpm --filter backend dev      # ✅ Run in specific workspace
pnpm -r run build              # ✅ Run in all workspaces
```

## pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## package.json with pnpm

```json
{
  "name": "saas-ecommerce",
  "version": "1.0.0",
  "private": true,
  "packageManager": "pnpm@9.15.0",
  "scripts": {
    "build": "pnpm -r run build",
    "dev": "pnpm --filter backend dev",
    "db:generate": "pnpm --filter backend db:generate",
    "db:migrate": "pnpm --filter backend db:migrate",
    "db:studio": "pnpm --filter backend db:studio",
    "lint": "pnpm -r run lint",
    "typecheck": "pnpm -r run typecheck"
  },
  "devDependencies": {
    "turbo": "^2.4.0"
  }
}
```

## .npmrc (Force pnpm)

Create `.npmrc` in project root:
```
engine-strict=true
use-pnpm=true
```