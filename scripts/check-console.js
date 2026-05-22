// Security check: detect console.log usage in backend runtime source
// console.log must NEVER be used in production; always use fastify.log.*
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('../apps/backend/src', import.meta.url));
const EXCLUDES = ['node_modules', 'dist', 'build', '.svelte-kit', 'seed.ts', 'check-schema.ts', 'migrate.ts', 'seed-superadmin.ts'];

function* walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (EXCLUDES.some((e) => path.includes(e))) continue;
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile() && path.endsWith('.ts')) {
      yield path;
    }
  }
}

let found = 0;
for (const filePath of walk(SRC_DIR)) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = relative(SRC_DIR, filePath).replace(/\\/g, '/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    const code = line.replace(/\/\/.*$/, '');
    if (/\bconsole\.\s*(log|warn|error|info|debug)\s*\(/.test(code)) {
      console.error(`  ${relPath}:${i + 1}  ${code.trim()}`);
      found++;
    }
  }
}

if (found > 0) {
  console.error(`\nFound ${found} occurrence(s) of console.log (or console.warn/error/info/debug) — use fastify.log.* instead.`);
  process.exit(1);
}

console.log('No console.log usage found in backend runtime source.');
process.exit(0);
