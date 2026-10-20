// Creates the backlog of backlog.mjs in GitHub: one milestone per sprint, the
// epics and stories as labelled issues, each story a sub-issue of its epic,
// and, with --project, a Projects board with Sprint, Estimate and Area fields.
// It can run again safely: anything that exists (matched by title) is kept, and
// a story marked done is closed only once the pull request from its branch has
// merged. Run sync-labels.mjs first.
// Usage: node scripts/github/seed-backlog.mjs [--project] [--dry-run]
import { EPICS, SPRINTS } from './backlog.mjs';
import { api, apiList, repository } from './gh.mjs';
import { sprintDates, sprintTitle } from './sprints.mjs';

const DRY_RUN = process.argv.includes('--dry-run');
const WITH_PROJECT = process.argv.includes('--project');
const PROJECT_TITLE = 'HuiTong delivery';
const repo = repository();

/** GitHub limits how fast content is created; a short pause keeps well under it. */
function pause(ms = 700) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function create(description, call) {
  if (DRY_RUN) {
    console.log(`would create ${description}`);
    return null;
  }
  const result = call();
  console.log(`created ${description}`);
  pause();
  return result;
}

// --- Milestones (sprints) ---------------------------------------------------
const milestones = new Map(
  apiList(`repos/${repo}/milestones?state=all&per_page=100`).map((milestone) => [
    milestone.title,
    milestone.number,
  ]),
);
for (const sprint of SPRINTS) {
  const title = sprintTitle(sprint.number);
  if (milestones.has(title)) continue;
  const { due, label } = sprintDates(sprint.number);
  const created = create(`milestone ${title}`, () =>
    api(`repos/${repo}/milestones`, {
      method: 'POST',
      body: { title, due_on: due, description: `${label}. Goal: ${sprint.goal}` },
    }),
  );
  if (created) milestones.set(title, created.number);
}

// --- Issues -----------------------------------------------------------------
const issues = new Map(
  apiList(`repos/${repo}/issues?state=all&per_page=100`)
    .filter((issue) => !issue.pull_request)
    .map((issue) => [issue.title, issue]),
);
const mergedBranches = new Map(
  apiList(`repos/${repo}/pulls?state=closed&per_page=100`)
    .filter((pull) => pull.merged_at)
    .map((pull) => [pull.head.ref, pull.number]),
);

const DONE = [
  'Acceptance criteria met and demonstrated',
  '`pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass; CI and security checks green',
  'Tests added: unit for domain logic, integration for endpoints, e2e for user journeys',
  'UI: every state, EN and 中文 strings, keyboard and reduced motion checked, screenshots in the PR',
  'Writes audited, endpoints guarded by RBAC, input validated, synthetic data only',
  'Traceability matrix, ADRs and the AI usage log updated where relevant',
  'Reviewed and merged into main through a pull request',
];

function epicBody(epic) {
  return [
    `**Goal.** ${epic.goal}`,
    '',
    '**Stories** (sub-issues of this epic):',
    '',
    ...epic.stories.map(
      (story) =>
        `- ${story.key}: ${story.title} (sprint ${String(story.sprint)}, ${String(story.points)} points)`,
    ),
    '',
    'Plan: [docs/agile/backlog.md](../blob/main/docs/agile/backlog.md). Definition of Done: [docs/agile/definition-of-ready-and-done.md](../blob/main/docs/agile/definition-of-ready-and-done.md).',
  ].join('\n');
}

function storyBody(story, epicNumber, merged) {
  const tick = story.done && merged ? 'x' : ' ';
  return [
    story.story,
    '',
    '### Acceptance criteria',
    '',
    ...story.acceptance.map((criterion) => `- [${tick}] ${criterion}`),
    '',
    `**Estimate:** ${String(story.points)} points · **Priority:** ${story.priority} · **Sprint:** ${sprintTitle(story.sprint)}${epicNumber ? ` · **Epic:** #${String(epicNumber)}` : ''}`,
    ...(story.deliveredBy ? ['', `**Delivered by** the \`${story.deliveredBy}\` branch.`] : []),
    '',
    '### Definition of Done',
    '',
    ...DONE.map((item) => `- [${tick}] ${item}`),
  ].join('\n');
}

const created = { epics: new Map(), stories: [] };
for (const epic of EPICS) {
  const title = `Epic ${epic.key}: ${epic.title}`;
  let epicIssue = issues.get(title);
  epicIssue ??= create(`epic "${title}"`, () =>
    api(`repos/${repo}/issues`, {
      method: 'POST',
      body: { title, body: epicBody(epic), labels: ['type: epic', epic.area, ...epic.labels] },
    }),
  );
  created.epics.set(epic.key, epicIssue);
  const linked =
    epicIssue && !DRY_RUN
      ? new Set(
          apiList(`repos/${repo}/issues/${String(epicIssue.number)}/sub_issues?per_page=100`).map(
            (sub) => sub.id,
          ),
        )
      : new Set();

  for (const story of epic.stories) {
    const storyTitle = `${story.key}: ${story.title}`;
    const merged = story.deliveredBy ? mergedBranches.get(story.deliveredBy) : undefined;
    let issue = issues.get(storyTitle);
    issue ??= create(`story "${storyTitle}"`, () =>
      api(`repos/${repo}/issues`, {
        method: 'POST',
        body: {
          title: storyTitle,
          body: storyBody(story, epicIssue?.number, merged !== undefined),
          labels: [
            story.type ?? 'type: story',
            epic.area,
            `priority: ${story.priority}`,
            ...new Set([...epic.labels, ...(story.labels ?? [])]),
          ],
          milestone: milestones.get(sprintTitle(story.sprint)),
        },
      }),
    );
    if (!issue) continue;

    if (epicIssue && !linked.has(issue.id)) {
      create(`link ${story.key} under ${title}`, () =>
        api(`repos/${repo}/issues/${String(epicIssue.number)}/sub_issues`, {
          method: 'POST',
          body: { sub_issue_id: issue.id },
        }),
      );
    }
    if (story.done && merged !== undefined && issue.state === 'open') {
      create(`closing ${story.key} (delivered in #${String(merged)})`, () => {
        api(`repos/${repo}/issues/${String(issue.number)}/comments`, {
          method: 'POST',
          body: { body: `Delivered in #${String(merged)} (\`${story.deliveredBy}\`).` },
        });
        return api(`repos/${repo}/issues/${String(issue.number)}`, {
          method: 'PATCH',
          body: { state: 'closed', state_reason: 'completed' },
        });
      });
      if (!DRY_RUN) issue = { ...issue, state: 'closed' };
    }
    created.stories.push({ story, issue, epic });
  }
}

if (WITH_PROJECT && !DRY_RUN) {
  const { setUpProject } = await import('./project-board.mjs');
  setUpProject({ repo, title: PROJECT_TITLE, epics: created.epics, stories: created.stories });
}
console.log(DRY_RUN ? 'dry run finished: nothing was changed' : 'backlog seeded');
