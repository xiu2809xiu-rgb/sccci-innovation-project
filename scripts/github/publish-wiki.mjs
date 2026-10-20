// Publishes docs/wiki/*.md to the repository's GitHub wiki, so the wiki is
// reviewed in pull requests like any other document. The wiki must be enabled,
// and GitHub creates its git repository only when the first page exists: if the
// clone fails, create any page once in the browser and run this again.
// Usage: node scripts/github/publish-wiki.mjs
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { repository } from './gh.mjs';

const repo = repository();
const source = new URL('../../docs/wiki/', import.meta.url);
const pages = readdirSync(source).filter((file) => file.endsWith('.md'));
const workdir = mkdtempSync(join(tmpdir(), 'huitong-wiki-'));
const git = (args, cwd = workdir) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' });

try {
  try {
    git(['clone', '--depth', '1', `https://github.com/${repo}.wiki.git`, workdir], tmpdir());
  } catch {
    console.error(
      `The wiki repository does not exist yet. Open https://github.com/${repo}/wiki, create the first page, then run this again.`,
    );
    process.exitCode = 1;
  }
  if (process.exitCode !== 1) {
    for (const page of pages) cpSync(new URL(page, source), join(workdir, page));
    git(['add', '--all']);
    const status = git(['status', '--porcelain']);
    if (status.trim() === '') {
      console.log('the wiki is already up to date');
    } else {
      git(['commit', '-m', 'docs: publish the team wiki from docs/wiki']);
      git(['push', 'origin', 'HEAD']);
      console.log(`published ${String(pages.length)} wiki pages`);
    }
  }
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
