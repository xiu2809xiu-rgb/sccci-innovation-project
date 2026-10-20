// Checks the performance budget from CLAUDE.md section 7: initial JS at most 250 KB gzip,
// excluding the lazy 3D chunk. "Initial" means the entry module and every module it imports
// statically; lazily imported routes are reported separately as entry + route.
// Usage (after `vite build`): node scripts/check-bundle-budget.mjs
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGET_KB = 250;
const ROUTES = {
  'sign-in page': 'src/features/auth/login-page.tsx',
  'app shell': 'src/app/layouts/app-layout.tsx',
  overview: 'src/features/overview/overview-page.tsx',
};

const manifest = JSON.parse(readFileSync('dist/.vite/manifest.json', 'utf8'));
const gzipped = new Map();

function gzipKb(file) {
  if (!gzipped.has(file)) {
    gzipped.set(file, gzipSync(readFileSync(`dist/${file}`)).length / 1024);
  }
  return gzipped.get(file);
}

/** Files a manifest entry loads before it can run: itself and its static imports, transitively. */
function staticClosure(key, seen = new Set()) {
  const chunk = manifest[key];
  if (!chunk || seen.has(chunk.file)) return seen;
  seen.add(chunk.file);
  for (const imported of chunk.imports ?? []) staticClosure(imported, seen);
  return seen;
}

const total = (files) => [...files].reduce((sum, file) => sum + gzipKb(file), 0);

const entryKey = Object.keys(manifest).find((key) => manifest[key].isEntry);
const initial = staticClosure(entryKey);
const initialKb = total(initial);
console.log(
  `initial JS (entry + static imports): ${initialKb.toFixed(1)} KB gzip / budget ${BUDGET_KB} KB`,
);

for (const [name, key] of Object.entries(ROUTES)) {
  const files = staticClosure(key, new Set(initial));
  console.log(`  + ${name}: ${total(files).toFixed(1)} KB gzip on first visit`);
}

if (initialKb > BUDGET_KB) {
  console.error(`Initial JS is over budget by ${(initialKb - BUDGET_KB).toFixed(1)} KB.`);
  process.exitCode = 1;
}
