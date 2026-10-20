// Thin wrapper over the GitHub CLI for the repository scripts in this folder.
// `gh` must be installed and signed in (`gh auth login`); GH_PATH overrides
// the executable, and GH_REPO (owner/name) the repository.
import { execFileSync } from 'node:child_process';

const GH = process.env.GH_PATH ?? 'gh';

/** Runs gh and returns its standard output. Throws with gh's message on failure. */
export function gh(args, input) {
  return execFileSync(GH, args, {
    encoding: 'utf8',
    input,
    stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

/** Calls the REST or GraphQL API through `gh api` and parses the JSON reply. */
export function api(path, { method = 'GET', fields = {}, body } = {}) {
  const args = ['api', path, '--method', method];
  for (const [key, value] of Object.entries(fields)) args.push('-f', `${key}=${String(value)}`);
  if (body !== undefined) args.push('--input', '-');
  const output = gh(args, body === undefined ? undefined : JSON.stringify(body));
  return output.trim() === '' ? null : JSON.parse(output);
}

/** Every page of a REST list endpoint. */
export function apiList(path) {
  const output = gh(['api', path, '--paginate', '--slurp']);
  return JSON.parse(output).flat();
}

/** `owner/name` of the repository the scripts act on. */
export function repository() {
  if (process.env.GH_REPO) return process.env.GH_REPO;
  return gh(['repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner']).trim();
}
