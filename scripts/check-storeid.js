// Security check: detect body.storeId usage in backend source
// StoreId must come from JWT/session context, not request body (except superAdmin routes)
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('../apps/backend/src', import.meta.url));
const EXCLUDES = ['node_modules', 'dist', 'build', '.svelte-kit'];

const patterns = [
  // Direct property access
  /body\.storeId/,
  /req\.body\.storeId/,
  /request\.body\.storeId/,
  // Destructuring from body
  /const\s*\{[^}]*storeId[^}]*\}\s*=\s*(?:req\.body|request\.body|body)/,
  /const\s*\{[^}]*storeId[^}]*\}\s*=\s*\w+\.body/,
];

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
  // SuperAdmin routes legitimately take storeId from body to manage cross-store resources
  if (filePath.includes('superAdmin')) continue;

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const relPath = relative(SRC_DIR, filePath).replace(/\\/g, '/');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip comments
    const code = line.replace(/\/\/.*$/, '');
    for (const pattern of patterns) {
      if (pattern.test(code)) {
        console.error(`  ${relPath}:${i + 1}  ${code.trim()}`);
        found++;
        break;
      }
    }
  }
}

if (found > 0) {
  console.error(`\nFound ${found} occurrence(s) of body.storeId — storeId must come from JWT/session context.`);
  process.exit(1);
}

console.log('No body.storeId usage found.');
process.exit(0);
