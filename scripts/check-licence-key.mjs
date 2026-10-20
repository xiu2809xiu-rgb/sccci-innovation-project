// Blocks a commit that would add the React Bits licence key to the repository (GRS risk R-17).
// It reads the key from the git-ignored .env.local files when they exist, then looks for it, byte
// for byte, in the lines the commit adds. It prints file names only, never the key. A clone
// without the key (CI, or a teammate without a licence) has nothing to check, so it passes.
// Usage: node scripts/check-licence-key.mjs (the pre-commit hook runs it)
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const KEY_NAME = 'REACTBITS_LICENSE_KEY';
const KEY_FILES = ['.env.local', 'apps/web/.env.local'];

/** The key's value in one env file, or undefined when the file or the line is missing. */
function keyIn(path) {
  if (!existsSync(path)) return undefined;
  const line = readFileSync(path, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${KEY_NAME}=`));
  const value = line
    ?.slice(KEY_NAME.length + 1)
    .trim()
    .replace(/^["']|["']$/g, '');
  return value || undefined;
}

const keys = [...new Set(KEY_FILES.map(keyIn).filter(Boolean))];
if (keys.length > 0) {
  // Added lines only. History from before this guard is covered by the Phase 10 sweep of the
  // whole repository and its history.
  const diff = execFileSync(
    'git',
    [
      'diff',
      '--cached',
      '--no-color',
      '--no-ext-diff',
      '--text',
      '--unified=0',
      '--diff-filter=ACMR',
    ],
    { maxBuffer: 512 * 1024 * 1024 },
  ).toString('utf8');
  const leaks = new Set();
  let file = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      file = line.slice(4).replace(/^b\//, '');
    } else if (line.startsWith('+') && keys.some((key) => line.includes(key))) {
      leaks.add(file);
    }
  }
  if (leaks.size > 0) {
    console.error(`${KEY_NAME} is in the staged changes. Remove it before committing:`);
    for (const leak of leaks) console.error(`  ${leak}`);
    process.exitCode = 1;
  }
}
