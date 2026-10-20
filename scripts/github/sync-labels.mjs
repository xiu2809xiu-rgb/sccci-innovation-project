// Creates or updates the labels in .github/labels.json. Labels that are not in
// the file are left alone, so nothing a teammate added is ever deleted.
// Usage: node scripts/github/sync-labels.mjs
import { readFileSync } from 'node:fs';

import { gh, repository } from './gh.mjs';

const labels = JSON.parse(
  readFileSync(new URL('../../.github/labels.json', import.meta.url), 'utf8'),
);
const repo = repository();

for (const label of labels) {
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
