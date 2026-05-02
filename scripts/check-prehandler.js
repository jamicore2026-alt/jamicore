// Security check: detect inline preHandler function definitions in backend routes
// Route files should use centralized preHandler factories (requirePermission, requireAdminRole)
// rather than defining inline anonymous functions
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROUTES_DIR = fileURLToPath(new URL('../apps/backend/src/modules', import.meta.url));
const EXCLUDES = ['node_modules', 'dist', 'build', '.svelte-kit'];

function* walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (EXCLUDES.some((e) => path.includes(e))) continue;
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.isFile() && entry.name.includes('.route.')) {
      yield path;
    }
  }
}

// Match preHandler followed by an inline function definition, not a variable reference
const inlinePreHandlerPattern = /preHandler\s*:\s*(?:\[\s*)?(?:async\s*)?(?:function\s*\(|\()/;
let found = 0;

for (const filePath of walk(ROUTES_DIR)) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = relative(ROUTES_DIR, filePath).replace(/\\/g, '/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const code = line.replace(/\/\/.*$/, '');
    if (inlinePreHandlerPattern.test(code)) {
      console.error(`  ${relPath}:${i + 1}  ${code.trim()}`);
      found++;
    }
  }
}

if (found > 0) {
  console.error(`\nFound ${found} inline preHandler function(s) — use centralized preHandler factories instead.`);
  process.exit(1);
}

console.log('No inline preHandler function definitions found.');
process.exit(0);
