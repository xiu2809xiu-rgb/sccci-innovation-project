# How the team works

HuiTong is built in one-week sprints that follow the module weeks, with the backlog, the board and the pull requests all in GitHub.

| Document                                                           | What it covers                                                                                                        |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [working-agreement.md](working-agreement.md)                       | Roles, ceremonies, the board, and the path from a story to `main`                                                     |
| [definition-of-ready-and-done.md](definition-of-ready-and-done.md) | When a story may enter a sprint, and when it counts as done                                                           |
| [backlog.md](backlog.md)                                           | Every epic and story with its acceptance criteria, sprint, estimate and priority                                      |
| [hero-journey.md](hero-journey.md)                                 | The one journey across all four areas: the demo spine, E2E #1 to #3, presenter plan                                   |
| [test-plan.md](test-plan.md)                                       | Test levels, environments, traceability, the failure and edge-case matrix, entry and exit criteria, schedule, defects |
| [../security/security-testing.md](../security/security-testing.md) | SAST and the other security checks, and how findings are triaged                                                      |
| [../team/module-ownership.md](../team/module-ownership.md)         | The four ownership areas and their interfaces                                                                         |

## In GitHub

| Practice                            | Where                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Epics, stories, tasks, spikes, bugs | Issue forms in `.github/ISSUE_TEMPLATE/`; stories are sub-issues of their epic                       |
| Sprints                             | Milestones `Sprint 01 (W1)` to `Sprint 19 (W19)`, and the Sprint field of the project board          |
| The board                           | The **HuiTong delivery** project: Status, Sprint, Estimate and Area                                  |
| Labels                              | `.github/labels.json`: type, area, priority (MoSCoW), module requirement and status                  |
| Task allocation                     | One assignee per issue; the area label shows who reviews                                             |
| Pull requests                       | `.github/pull_request_template.md`: the linked story, acceptance evidence and the Definition of Done |
| Protection of `main`                | The ruleset in `.github/rulesets/main.json`: pull requests only, green checks, no force pushes       |
| Wiki                                | Pages in `docs/wiki/`, published with `scripts/github/publish-wiki.mjs`                              |

## Keeping GitHub in step

The backlog is data in `scripts/github/backlog.mjs`, so changes to the plan are reviewed like code:

```bash
node scripts/github/render-backlog.mjs        # rewrite docs/agile/backlog.md from the data
node scripts/github/sync-labels.mjs           # create or update the labels
node scripts/github/seed-backlog.mjs --dry-run
node scripts/github/seed-backlog.mjs --project
```

The scripts use the GitHub CLI signed in as a maintainer (`gh auth login`, with the `project` scope for the board). Running them again only adds what is missing, closes stories whose pull request has merged, and closes the open issues of retired keys as not planned. Issues are matched by their key, so a story whose title changes keeps its issue, and an area whose name changes keeps its label and its option on the board. After the plan changes, `--refresh` also rewrites the open issues and the sprint goals from the data; it leaves alone an issue with a ticked box.
