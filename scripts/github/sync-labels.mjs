// Creates or updates the labels in .github/labels.json. Labels that are not in
// the file are left alone, so nothing a teammate added is ever deleted.
// Usage: node scripts/github/sync-labels.mjs
import { readFileSync } from 'node:fs';

import { gh, repository } from './gh.mjs';

const labels = JSON.parse(
  readFileSync(new URL('../../.github/labels.json', import.meta.url), 'utf8'),
);
const repo = repository();
const existing = JSON.parse(
  gh(['label', 'list', '--repo', repo, '--limit', '500', '--json', 'name']),
).map((label) => label.name);

for (const label of labels) {
  // An area keeps its number when its scope is renamed, so its label is renamed
  // in place and every issue and pull request keeps it.
  const areaPrefix = /^area: \d+ /.exec(label.name)?.[0];
  const renamed =
    areaPrefix && !existing.includes(label.name)
      ? existing.find((name) => name.startsWith(areaPrefix))
      : undefined;
  if (renamed) {
    gh(['label', 'edit', renamed, '--repo', repo, '--name', label.name]);
    console.log(`label renamed: ${renamed} -> ${label.name}`);
  }
  gh([
    'label',
    'create',
    label.name,
    '--repo',
    repo,
    '--color',
    label.color,
    '--description',
    label.description,
    '--force',
  ]);
  console.log(`label ready: ${label.name}`);
}
