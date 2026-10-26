// Fails when a client's sample (a document or an export) is in git (story A-13). samples/ holds
// the client's samples for trying locally, and .gitignore keeps them out; this catches one added with
// `git add --force`, from a clone without the hooks, or under another letter case. It prints file
// names only.
// Usage:
//   node scripts/check-samples.mjs                  the index: what the next commit holds (pre-commit)
//   node scripts/check-samples.mjs --push <sha>...  the commits a push would publish (pre-push)
//   node scripts/check-samples.mjs --history        every commit reachable from HEAD (CI, full clone)
import { execFileSync } from 'node:child_process';

const ALLOWED = new Set(['samples/README.md']);
const BREACH_STEPS = 'docs/grs/grs-by-design.md, "Data breach (R-03)"';

const top = execFileSync('git', ['rev-parse', '--show-toplevel']).toString('utf8').trim();

// No pathspecs: with GIT_LITERAL_PATHSPECS set, as some git front ends do, `:(top)samples/` would
// match nothing and every check would pass. Listing everything and filtering here avoids that.
function git(args) {
  return execFileSync('git', args, { cwd: top, maxBuffer: 512 * 1024 * 1024 }).toString('utf8');
}

/**
 * Paths in samples/ other than its README, in any letter case (Windows and macOS fold case), and
 * a bare file named samples, which `cp export.csv samples` makes on a branch without the folder.
 */
function strays(names) {
  return [...new Set(names)].filter((name) => {
    const lower = name.toLowerCase();
    return (lower === 'samples' || lower.startsWith('samples/')) && !ALLOWED.has(name);
  });
}

/**
 * Every path whose content a commit in the walk carries: added or changed, a rename counting as
 * an add of its new path. A deletion is left out, since the commit that added the file is in the
 * same history, and a push that only deletes a sample publishes nothing.
 */
function namesIn(walk) {
  // A first-parent diff also shows a file that only a merge commit adds; showRoot lists the
  // files of a root commit even where a user's config hides them.
  return git([
    '-c',
    'log.showRoot=true',
    'log',
    '--format=',
    '--name-only',
    '-z',
    '--no-renames',
    '--diff-filter=d',
    '--diff-merges=first-parent',
    ...walk,
  ])
    .split('\0')
    .map((name) => name.replace(/^\n+/, ''));
}

function report(found, heading, advice) {
  if (found.length === 0) return true;
  console.error(heading);
  for (const name of found) console.error(`  ${name}`);
  console.error(advice);
  return false;
}

function checkIndex() {
  return report(
    strays(git(['ls-files', '--cached', '-z']).split('\0')),
    "A client's sample is staged. Unstage it with git rm --cached -- <path>:",
    'It can stay in samples/ on your machine, where git ignores it. If one is already in a commit,\n' +
      'remove it from that commit (amend or rebase) before you push, not in a new commit.',
  );
}

function checkPush(shas) {
  // The hook passes object names from git; anything else could smuggle an option into git log.
  if (!shas.every((sha) => /^[0-9a-f]{40}([0-9a-f]{24})?$/.test(sha))) {
    console.error('--push takes the commit ids the pre-push hook reads from git.');
    return false;
  }
  if (shas.length === 0) return true;
  return report(
    strays(namesIn([...shas, '--not', '--remotes'])),
    "A commit you are about to push holds a client's sample:",
    'Nothing was pushed. Remove the file from that commit (amend it, or rebase to drop it), then\n' +
      'push again; deleting it in a new commit is not enough, as the old commit would go too.',
  );
}

function checkHistory() {
  if (git(['rev-parse', '--is-shallow-repository']).trim() === 'true') {
    console.error('The history check needs every commit: check out with fetch-depth: 0.');
    return false;
  }
  return report(
    strays(namesIn(['HEAD'])),
    "A commit on this branch holds a client's sample:",
    'A pushed branch is public, so tell the team lead now. A new commit or a force-push does not\n' +
      `take it off GitHub: follow the steps for a pushed sample in ${BREACH_STEPS}.`,
  );
}

const [mode, ...rest] = process.argv.slice(2);
const passed =
  mode === '--push' ? checkPush(rest) : mode === '--history' ? checkHistory() : checkIndex();
if (!passed) process.exitCode = 1;
