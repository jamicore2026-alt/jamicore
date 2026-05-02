// Auto-fix common unused imports in dashboard Svelte files
import { readFileSync, writeFileSync } from 'node:fs';

// Map: file -> array of import names to remove
const fixes = {
  'apps/dashboard/src/lib/components/layout/AdminTopbar.svelte': ['goto'],
  'apps/dashboard/src/lib/components/notifications/NotificationBell.svelte': ['goto'],
  'apps/dashboard/src/routes/(auth)/invite/[token]/+page.svelte': ['z'],
  'apps/dashboard/src/routes/(merchant)/dashboard/analytics/+page.svelte': ['Button'],
  'apps/dashboard/src/routes/(merchant)/dashboard/categories/+page.svelte': ['CardHeader', 'CardTitle', 'Separator'],
  'apps/dashboard/src/routes/(merchant)/dashboard/coupons/+page.svelte': ['CardHeader', 'CardTitle'],
  'apps/dashboard/src/routes/(merchant)/dashboard/inventory/+page.svelte': ['CardHeader', 'CardTitle'],
  'apps/dashboard/src/routes/(merchant)/dashboard/modifiers/+page.svelte': ['Separator'],
  'apps/dashboard/src/routes/(merchant)/dashboard/orders/[id]/+page.svelte': ['CardDescription'],
  'apps/dashboard/src/routes/(merchant)/dashboard/reviews/+page.svelte': ['Table'],
  'apps/dashboard/src/routes/(merchant)/dashboard/settings/branding/+page.svelte': ['Separator'],
  'apps/dashboard/src/routes/(merchant)/dashboard/settings/general/+page.svelte': ['Separator'],
  'apps/dashboard/src/routes/(merchant)/dashboard/settings/webhooks/+page.svelte': ['CardHeader', 'CardTitle'],
  'apps/dashboard/src/routes/(merchant)/dashboard/support/[id]/+page.svelte': ['Separator'],
  'apps/dashboard/src/routes/(superadmin)/admin/invoices/+page.svelte': ['Separator'],
  'apps/dashboard/src/routes/(superadmin)/admin/invoices/[id]/+page.svelte': ['Store'],
  'apps/dashboard/src/routes/(superadmin)/admin/merchants/+page.svelte': ['invalidateAll', 'apiFetch', 'toast'],
  'apps/dashboard/src/routes/(superadmin)/admin/merchants/[id]/+page.svelte': ['CalendarDays'],
  'apps/dashboard/src/routes/(superadmin)/admin/revenue/+page.svelte': ['Badge', 'Store'],
  'apps/dashboard/src/routes/(superadmin)/admin/settings/+page.svelte': ['Select'],
};

function removeImportName(content, name) {
  // Pattern: import { ..., Name, ... } from '...';
  const regex = new RegExp(`(import\\s*\\{[^}]*)[,\\s]*\\b${name}\\b[,\\s]*([^}]*\\})`, 'g');
  let result = content.replace(regex, (match, before, after) => {
    const cleaned = (before + after).replace(/\{\s*,/g, '{').replace(/,\s*\}/g, '}').replace(/\{\s*\}/g, '{ }');
    return cleaned;
  });

  // Pattern: import Name from '...';
  const defaultRegex = new RegExp(`import\\s+\\b${name}\\b\\s+from\\s+['"][^'"]+['"];\\n`, 'g');
  result = result.replace(defaultRegex, '');

  // If the import line is now empty or only has whitespace, remove it entirely
  result = result.replace(/import\s*\{\s*\}\s*from\s*['"][^'"]+['"];\n/g, '');

  return result;
}

for (const [file, names] of Object.entries(fixes)) {
  try {
    let content = readFileSync(file, 'utf-8');
    let changed = false;
    for (const name of names) {
      const next = removeImportName(content, name);
      if (next !== content) {
        content = next;
        changed = true;
      }
    }
    if (changed) {
      writeFileSync(file, content);
      console.log(`Fixed ${file}`);
    }
  } catch (err) {
    console.error(`Failed ${file}: ${err.message}`);
  }
}
