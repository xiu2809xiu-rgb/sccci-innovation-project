# AGENTS.md

> Rules for every AI coding assistant that works in this repository (Kiro, GitHub Copilot, Cursor, Claude Code, Codex, Gemini, ChatGPT or any other), and for the teammate using it.
>
> Read this file in full before you change anything. Then read [CLAUDE.md](CLAUDE.md): it sets the product, the stack and the code standards for every AI tool, not only Claude Code. The two files are written to agree. If they ever seem to conflict, follow the stricter rule and tell your human.
>
> If you cannot see the repository (for example in a chat window), ask your human to paste the files you need. Never guess what a file contains.

## 1. The project, the team and the areas

**OrderPilot** is our product for **Problem Statement #11, Spectra Innovations**. It is an AI-assisted order-automation layer beside their Navision ERP: **AI reads, rules decide, people approve.** It reads customer and vendor documents, checks them against each other, routes approvals and tasks across six teams, and shows every order on one tracker, with human approvals and financial controls kept in place.

| Area                                                 | Owner              | Guide                                                                                              |
| ---------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| 1. Document AI and integration core                  | Richie (team lead) | [area-1-document-ai-and-integration.md](docs/team/area-1-document-ai-and-integration.md)           |
| 2. Order workflows and approvals                     | Azri               | [area-2-order-workflows-and-approvals.md](docs/team/area-2-order-workflows-and-approvals.md)       |
| 3. Cross-document checks, order tracker and insights | Iok Teck           | [area-3-checks-tracker-and-insights.md](docs/team/area-3-checks-tracker-and-insights.md)           |
| 4. Financial controls, security and monitoring       | Angelyn            | [area-4-controls-security-and-monitoring.md](docs/team/area-4-controls-security-and-monitoring.md) |

85% of the module's marks are individual, and at the W7 mock interview each member explains their own code. So every line in an area is written by that area's owner, with their AI, and must be something they can explain. That is why the boundaries in this file are strict.

You work for one member, in one area. If your human has not told you which, ask before doing anything else.

## 2. Ten rules you never break

1. **Never delete or overwrite anyone's work.** Do not delete, move, rename, empty or rewrite any file, folder, code, test, document row, i18n key, migration, branch, issue or pull request that you did not create in this task. The only exception is something inside your own area that your area guide tells you to replace (for example area 2's mock repository, once the Prisma repository exists). Name each one in the pull request.
2. **Write only inside your own area** ([section 3](#3-where-you-may-write)). You may read the whole repository. If the task needs a change anywhere else, stop and follow [section 7](#7-when-you-need-something-outside-your-area).
3. **Never touch `main` directly.** No commits or pushes to `main`, no force pushes anywhere, no rewriting history that is already pushed, no merging without the review in [step 11](#pull-request), and never merge someone else's pull request.
4. **No destructive commands** from [section 4](#4-commands-that-need-your-humans-ok) unless your human approves that exact command in the chat.
5. **Never make a check pass by weakening it.** Do not skip, delete or loosen tests. Do not add `eslint-disable`, `@ts-ignore`, `@ts-expect-error` or `any`. Do not use `--no-verify`. Do not edit CI, the ruleset, the lint rules or the coverage settings. Fix the code, or tell your human it cannot be fixed.
6. **No secrets and no real data.** Never open, print or commit `.env`, `.env.local` or the React Bits licence key. Synthetic companies, documents and bank details only; never a client document, and nothing from the team's data folder.
7. **No AI attribution anywhere.** No `Co-authored-by` trailers, no "Generated with …" lines, no AI emoji or session links in commits, pull requests, code comments or docs. AI use is recorded in one place only: `docs/ai/ai-usage-log.md` ([step 9](#before-you-push)).
8. **Do not push, open a pull request or merge unless your human asks** in this session.
9. **Report real results.** Run the command and show what it printed. Never say something passes, builds or works without running it.
10. **When in doubt, stop and ask.** A question costs a minute; losing a teammate's work costs days.

## 3. Where you may write

The source of truth is the "Owns" table of each area in [docs/team/module-ownership.md](docs/team/module-ownership.md). In short:

| Area         | You may write in                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 (Azri)     | `apps/api/src/modules/workflows/` · `apps/web/src/features/workflows/` · `apps/web/src/i18n/locales/{en,zh-CN}/workflows.json` · `packages/shared/src/workflows/` · `apps/api/test/workflows.int-spec.ts` · `apps/web/e2e/workflow-pages.spec.ts` · `docs/team/area-2-order-workflows-and-approvals.md`                                                                                                                                                                                                                                                                                                                                                  |
| 3 (Iok Teck) | `apps/api/src/modules/checks/` · `apps/api/src/modules/reports/` · `apps/web/src/features/checks/` · `apps/web/src/features/order-tracker/` · `apps/web/src/i18n/locales/{en,zh-CN}/checks.json`, `order-tracker.json` and `reports.json` · `packages/shared/src/checks/` · `packages/shared/src/reports/` · `apps/api/test/checks.int-spec.ts` · `apps/api/test/reports.int-spec.ts` · `apps/web/e2e/order-tracker-pages.spec.ts` · `docs/team/area-3-checks-tracker-and-insights.md`                                                                                                                                                                   |
| 4 (Angelyn)  | `apps/api/src/modules/governance/` · `apps/api/src/modules/audit/` (the viewer and its queries) · `apps/api/src/modules/analytics/` (except the clickstream ingest endpoint, which is area 1's) · `apps/web/src/features/governance/` · `apps/web/src/features/analytics/` · `apps/web/src/i18n/locales/{en,zh-CN}/governance.json` and `analytics.json` · `packages/shared/src/{governance,audit,analytics}/` · `infra/aws/` (not created yet) · `apps/api/test/governance.int-spec.ts` · `apps/api/test/analytics-dashboards.int-spec.ts` · `apps/web/e2e/governance-analytics-pages.spec.ts` · `docs/team/area-4-controls-security-and-monitoring.md` |
| 1 (Richie)   | Everything else: the platform, document intake and extraction (`documents`), the canonical order (`orders`), master data (`master-data`), the connectors and mocks, the mapping engine, the shared template engine, the setup of `packages/*` and the shared primitives, Docker, `.github/`, the root configuration and the team documents                                                                                                                                                                                                                                                                                                               |

Area 1 follows the same rule the other way: once an owner has started on their area, Richie's AI does not change that area's folders except through a pull request the owner approves.

How the areas connect:

- **Order status lives only in area 2's state machine.** Area 1 owns the order's data and documents; area 3 reads the status through agreed APIs and keeps no status logic of its own.
- **Area 3 owns the check results and exceptions** and reports pass or fail to area 2, whose state machine decides what a failure blocks.
- **Area 4 owns the authorisation policy** (who may approve what, limits, segregation of duties). Endpoints call it, so rights are enforced on the server; never only hidden in the UI.
- **Area 1 owns the whole AI pipeline:** document classification, extraction, confidence thresholds and the review screen. Area 4 audits AI decisions and sets what data may go to an AI service.

### Shared files: only your own part, in a small pull request

Every area changes these files, so a careless edit blocks everyone. Change only your own part, in its own small pull request, with Richie as reviewer ([shared-files protocol](docs/team/module-ownership.md#shared-files-protocol)).

| File                                                                                                                                    | Your part                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api/prisma/schema.prisma` and `apps/api/prisma/migrations/`                                                                       | Your area's models only. One migration per pull request, made on the latest `main`. Never edit a merged migration. An `@@index` per new query path  |
| `apps/api/src/app.module.ts`                                                                                                            | Your own module's import only                                                                                                                       |
| The web router and sidebar in `apps/web/src/app/`                                                                                       | Your own lazy routes and navigation entries only, with labels from your i18n file                                                                   |
| `pnpm-lock.yaml` and every `package.json`                                                                                               | Add a dependency only with `pnpm add --filter <workspace> <package>@<exact version>`, and say why in the pull request. Never hand-edit the lockfile |
| Shared primitives in `packages/shared/` (roles, error codes, pagination, classification, event names, the order and document contracts) | Additive changes only. Renames and removals need every user's approval and an ADR                                                                   |
| `apps/web/src/styles/tokens.css` and the `common` i18n files                                                                            | Propose new tokens or keys to Richie. Never add ad-hoc values                                                                                       |
| `apps/web/e2e/hero-journey.spec.ts`                                                                                                     | Only your own steps: switch one on in the pull request that makes it pass                                                                           |
| `apps/api/src/infrastructure/telemetry/` (not created yet)                                                                              | Area 4's, but it loads before everyone's code: its own pull request, reviewed by Richie                                                             |
| `docker-compose.yml`, `infra/docker/`, `.env.example`                                                                                   | Only with Richie's review. Document every new variable in `.env.example` with a safe default                                                        |
| `docs/requirements-traceability.md`, `docs/assumptions.md`, `docs/design/reactbits-usage.md`, `docs/agile/test-plan.md`                 | Your own rows only. Never renumber an id                                                                                                            |

### Read-only for areas 2 to 4

Propose changes to these through your human to Richie; do not edit them: `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `docs/BUILD_REPORT.md`, everything in `.github/` (CI, templates, CODEOWNERS, the ruleset), `scripts/github/` and the backlog (`docs/agile/backlog.md` is generated from `scripts/github/backlog.mjs`), the working agreement and the Definition of Ready and Done (changed only after the team agrees at a retrospective), the other members' area guides, and the prompts in `docs/ai/prompts/` that are not yours.

## 4. Commands that need your human's OK

Do not run any of these unless your human approves that exact command in the chat:

| Command                                                                                               | Why                                                                            |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `git reset --hard`, `git checkout -- .`, `git restore .`, `git clean -fd`                             | Throw work away for good                                                       |
| `git push --force`, `git push -f`, `git push --force-with-lease`                                      | Overwrite history on GitHub                                                    |
| `git rebase` on a branch you have already pushed, `git commit --amend` on a pushed commit             | Rewrite pushed history, which then needs a force push                          |
| `git branch -D`, `git push origin --delete <branch>`                                                  | Delete branches (your own merged branch is handled in step 12)                 |
| `git stash drop`, `git stash clear`                                                                   | Lose stashed work                                                              |
| `git filter-branch`, `git filter-repo`                                                                | Rewrite the whole history                                                      |
| `rm -rf`, `Remove-Item -Recurse`, `del /s` on anything in the repository                              | Delete files                                                                   |
| `pnpm format`, `prettier --write .`, `eslint --fix .`                                                 | Rewrite files in every area; the commit hook already formats your staged files |
| `pnpm update`, `pnpm up`, deleting `pnpm-lock.yaml`                                                   | Change every area's dependencies                                               |
| A search-and-replace or rename across the repository                                                  | Edits other areas' files                                                       |
| `prisma migrate reset`, `docker compose down -v`, saying yes when Prisma offers to reset the database | Wipe your local database                                                       |
| Anything in `scripts/github/`                                                                         | Changes the whole team's labels, issues and board; Richie runs these           |

## 5. One task, from story to `main`

This is the flow in the [working agreement](docs/agile/working-agreement.md) and [CONTRIBUTING.md](CONTRIBUTING.md), step by step.

### Before you start

1. **Pick the story.** Work only on an issue in the current sprint: milestone `Sprint NN (WN)`, one sprint per module week from Monday to Sunday, with W1 starting on 19 Oct 2026. Assign your human (`gh issue edit <number> --add-assignee @me`) and move the issue to **In Progress** on the **OrderPilot delivery** board, at most two per person. If the story does not meet the [Definition of Ready](docs/agile/definition-of-ready-and-done.md#definition-of-ready) (a user and their value, testable acceptance criteria, an estimate, a priority, an area label, no blocker), stop and tell your human.
2. **Start from the latest `main`**, one task per branch:

   ```bash
   git switch main
   git pull --ff-only
   git switch -c feat/area2-<short-description>
   ```

   Branch prefixes: `feat/` (named by area, such as `feat/area2-sales-workflow`), `fix/`, `docs/`, `test/`, `chore/` and `ci/`. Never reuse an old branch. A branch made before the platform base (such as `feat/foundation`) is never merged.

3. **Plan, then wait.** Before you edit anything, give your human the acceptance criteria, the files you will create or change (each checked against [section 3](#3-where-you-may-write), with shared files marked), the tests you will write, and anything you need from another area. Start only when your human says yes.

### While you build

4. **Follow the standards** in CLAUDE.md sections 5 to 9 and the design and build plan in your area guide:
   - **Back end:** thin controllers, services for use cases, repositories as the only place Prisma is called, and domain classes with no Prisma in them.
   - **Tests first for domain logic:** turn your area's `it.todo` cases into real tests one at a time. Keep at least 80% line coverage on domain modules (`pnpm --filter @orderpilot/api test:cov`).
   - **API:** validate input with the shared zod schemas, paginate every list, audit every write, put RBAC on every endpoint, and keep Swagger current.
   - **UI:** every state (loading, empty, error with retry and `traceId`, partial, success, permission-denied); strings in your own i18n files, never hard-coded; design tokens only; keyboard use and reduced motion checked; at least one React Bits item per page, recorded in `docs/design/reactbits-usage.md`.
   - **Honest labels:** sample data stays labelled (`@ServesMockData()` and the "Sample data" badge) until your real logic replaces it, and the mock AI keeps its "Mock AI" badge.
   - **AI with a human in the loop:** AI may read, suggest and draft. It never approves, posts to Navision, releases goods or pays; a person does, and the action is audited.
5. **Small steps, explained.** After each step, tell your human in plain words what changed and why, so they can explain it at the W7 interview. Your human reads every diff before it is committed.
6. **Commit small, as your human.** Conventional Commits, with your area as the scope:

   ```text
   feat(area2): route an SPR to the approver within their limit
   test(area2): escalate an approval that passes its SLA
   docs(area2): record the sales workflow's steps
   ```

   Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`, `style` and `revert`. The subject starts in lower case, has no full stop, and the whole header stays within 100 characters. The hooks run ESLint and Prettier on your staged files, the licence-key guard and commitlint; if one fails, fix the cause and commit again. Commits carry your human's own name and GitHub email (`git config user.name`, `git config user.email`), because the history is how each member's work is seen.

### Before you push

7. **Run the checks and show the real output:**

   ```bash
   docker compose up -d postgres redis
   pnpm lint && pnpm typecheck && pnpm test && pnpm build
   pnpm format:check
   ```

   For a change to a screen or a user journey, also run the end-to-end tests: `docker compose up --build --detach --wait`, then `pnpm test:e2e`.

8. **Check the diff for deletions and for files outside your area:**

   ```bash
   git fetch origin
   git diff --stat origin/main...HEAD
   git diff --name-only --diff-filter=D origin/main...HEAD
   ```

   The last command lists deleted files. It must print nothing, unless each file is one your human approved under rule 1. Then list the files you changed outside your area, with your area's command (in Git Bash or PowerShell):

   ```bash
   # Area 2
   git diff --name-only origin/main...HEAD -- . ':(exclude)apps/api/src/modules/workflows' ':(exclude)apps/web/src/features/workflows' ':(exclude)apps/web/src/i18n/locales/en/workflows.json' ':(exclude)apps/web/src/i18n/locales/zh-CN/workflows.json' ':(exclude)packages/shared/src/workflows' ':(exclude)apps/api/test/workflows.int-spec.ts' ':(exclude)apps/web/e2e/workflow-pages.spec.ts' ':(exclude)docs/team/area-2-order-workflows-and-approvals.md'

   # Area 3
   git diff --name-only origin/main...HEAD -- . ':(exclude)apps/api/src/modules/checks' ':(exclude)apps/api/src/modules/reports' ':(exclude)apps/web/src/features/checks' ':(exclude)apps/web/src/features/order-tracker' ':(exclude)apps/web/src/i18n/locales/en/checks.json' ':(exclude)apps/web/src/i18n/locales/zh-CN/checks.json' ':(exclude)apps/web/src/i18n/locales/en/order-tracker.json' ':(exclude)apps/web/src/i18n/locales/zh-CN/order-tracker.json' ':(exclude)apps/web/src/i18n/locales/en/reports.json' ':(exclude)apps/web/src/i18n/locales/zh-CN/reports.json' ':(exclude)packages/shared/src/checks' ':(exclude)packages/shared/src/reports' ':(exclude)apps/api/test/checks.int-spec.ts' ':(exclude)apps/api/test/reports.int-spec.ts' ':(exclude)apps/web/e2e/order-tracker-pages.spec.ts' ':(exclude)docs/team/area-3-checks-tracker-and-insights.md'

   # Area 4
   git diff --name-only origin/main...HEAD -- . ':(exclude)apps/api/src/modules/governance' ':(exclude)apps/api/src/modules/audit' ':(exclude)apps/api/src/modules/analytics' ':(exclude)apps/web/src/features/governance' ':(exclude)apps/web/src/features/analytics' ':(exclude)apps/web/src/i18n/locales/en/governance.json' ':(exclude)apps/web/src/i18n/locales/zh-CN/governance.json' ':(exclude)apps/web/src/i18n/locales/en/analytics.json' ':(exclude)apps/web/src/i18n/locales/zh-CN/analytics.json' ':(exclude)packages/shared/src/governance' ':(exclude)packages/shared/src/audit' ':(exclude)packages/shared/src/analytics' ':(exclude)infra/aws' ':(exclude)apps/api/test/governance.int-spec.ts' ':(exclude)apps/api/test/analytics-dashboards.int-spec.ts' ':(exclude)apps/web/e2e/governance-analytics-pages.spec.ts' ':(exclude)docs/team/area-4-controls-security-and-monitoring.md'
   ```

   Every file it prints must be your own part of a shared file from [section 3](#shared-files-only-your-own-part-in-a-small-pull-request), or a doc row from step 9; anything else comes out of the branch. Also check that the diff has no secrets, no `.env` files, no AI attribution, no `console.log` and no commented-out code.

9. **Update the docs in the same branch:**
   - your area guide, if the design changed;
   - your rows in `docs/requirements-traceability.md` (capability C for area 2, D for area 3, F and G for area 4);
   - your rows in `docs/assumptions.md`, if an assumption was confirmed or broken;
   - a new ADR in `docs/adr/NNNN-title.md` if a decision changed: take the next free number on the latest `main`, and renumber yours if someone merges that number first;
   - for significant AI-assisted work, a row in your area's own table in `docs/ai/ai-usage-log.md`: the date, the tool, the task, the prompt file, what you accepted or changed, and who reviewed it. If your area has no table yet, add one at the end under `## Area N: <area name>` with the same columns. Store a substantial prompt as `docs/ai/prompts/area2-NNN-short-title.md`, with your own area number.

   Leave `docs/BUILD_REPORT.md` alone: it records the platform build. Your evidence goes in the pull request.

### Pull request

10. **Push and open the pull request**, only when your human asks:

    ```bash
    git push -u origin <branch>
    gh pr create --base main --title "feat(area2): <what it does> (C-1)" --body-file <file>
    ```

    Fill in every section of `.github/pull_request_template.md`:
    - `Closes #<issue>`, with one keyword per issue: `Closes #41, closes #42`. "Closes #41 and #42" closes only #41.
    - The acceptance criteria, each ticked with its evidence: a test name, a screenshot or a log line.
    - Your ownership area, and the module requirements (M1 to M6) it serves.
    - The real output of step 7, and screenshots in both themes for a UI change.
    - Each shared file you changed and each file you deleted, with the reason.

    Add the labels, with their exact names from `.github/labels.json`: one `type:` label, your area's label and the `req:` labels it serves. The area labels are `area: 1 document AI and integration`, `area: 2 order workflows and approvals`, `area: 3 checks, tracker and insights` and `area: 4 controls and monitoring`.

    ```bash
    gh pr edit <number> --add-label "type: story" --add-label "area: 2 order workflows and approvals" --add-label "req: M4 best practices"
    ```

11. **Checks and review.** Wait for every check to pass: Lint, typecheck, test, build; Docker images; End-to-end smoke; CodeQL (Analyze javascript-typescript and actions); Dependency review; and IaC and Dockerfile scan (`gh pr checks <number> --watch`). Fix a failure with a new commit on the same branch; never force-push. A security finding is fixed or triaged, never ignored. Then get a review from the code owner of every folder you touched (Richie for shared files, and for everything until CODEOWNERS names the owners). Answer every comment and resolve every conversation; the ruleset requires it.

12. **Merge** only with an approval and every check green, using a merge commit, then tidy up:

    ```bash
    gh pr merge <number> --merge --delete-branch
    git switch main
    git pull --ff-only
    git branch -d <branch>
    ```

    Deleting your own branch once it is merged is the one deletion that is always fine, because the work is in `main`. Use `-d`, which refuses to delete unmerged work, never `-D`. The issue closes through `Closes #…`. Check that it shows as Done on the board, and tell the team in the chat so everyone pulls `main`.

## 6. Keeping your branch up to date, and conflicts

- **Before your first push** you may rebase onto the latest `main`: `git fetch origin`, then `git rebase origin/main`.
- **After your first push**, merge instead, so no force push is ever needed: `git fetch origin`, then `git merge origin/main`.
- **Resolve a conflict file by file, keeping both sides' changes.** Never take one side wholesale (`git checkout --ours .`, `git checkout --theirs .`, "Accept all incoming" or "Accept all current"). In a file outside your area, keep `main`'s version exactly and re-apply only your own lines.
- **Lockfile conflict:** take `main`'s lockfile (`git checkout origin/main -- pnpm-lock.yaml`) and run `pnpm install` again.
- **Migration conflict:** never edit a merged migration. Remove only your own unmerged migration and generate it again on the latest `main`.
- After resolving, run every check in step 7 again. If you are unsure about any conflict, stop and ask your human, who asks the file's owner.

## 7. When you need something outside your area

- **Another area's code** (a bug, a missing endpoint, event or field): do not change it. Write an issue for its owner with the task or bug form and their `area:` label, saying what you need and why, and your human tells them in the team chat. Meanwhile, code against the contract, with a typed stub inside your own area if needed.
- **A shared file:** your own part only, in its own small pull request (such as `chore/area2-workflow-schema-sla`), additive, based on the latest `main`, with Richie as reviewer. Tell the team when it merges, so everyone updates their branch.
- **A contract between areas** (shared schemas, event payloads, endpoints) changes additively only. A breaking change needs an ADR and the approval of every owner who uses it.
- **Team process, CI, the backlog or a read-only file:** your human proposes the change to Richie.

## 8. GitHub conventions

| Practice | Convention                                                                                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sprints  | Milestones `Sprint 01 (W1)` to `Sprint 19 (W19)`, and the Sprint field on the **OrderPilot delivery** board                                                                                       |
| Board    | Todo, then In Progress (assigned and a branch exists; at most two per person), then Done (merged and meeting the Definition of Done). Ask Richie for access to the board if you cannot move items |
| Issues   | The forms in `.github/ISSUE_TEMPLATE/`: story, task, epic, spike and bug. A story is a sub-issue of its epic, has one assignee and "Given …, when …, then …" acceptance criteria                  |
| Labels   | One `type:`, one `area:`, a `priority:` (must, should or could) and the `req:` labels (M1 to M6) it serves. `status: blocked`, with a comment saying why, while something blocks it               |
| Stand-up | Every working day in the team chat: yesterday, today, blockers                                                                                                                                    |

## 9. Setting up, once per member

- Node.js 24.22 (the version in `.node-version`), pnpm 12 (`npm install --global pnpm@12.14.0`), Docker Desktop with Compose v2, and the GitHub CLI, signed in (`gh auth login`).
- Your own Git identity in this repository: `git config user.name "<your name>"` and `git config user.email "<the email on your GitHub account>"`.
- Then, from the repository root:

  ```bash
  pnpm install
  docker compose up -d postgres redis
  pnpm db:migrate && pnpm db:seed
  pnpm dev
  ```

  The web app runs at http://localhost:5173 and the API at http://localhost:3000, with Swagger at `/api/docs`. To run everything in containers instead: `docker compose up --build`, then open http://localhost:8080.

- The React Bits licence key is only needed to install React Bits Pro items. Richie shares it privately, and it goes only in your own git-ignored `apps/web/.env.local`. Never paste it into an AI chat, and your AI never opens that file.
- Do not commit your AI tool's own folders (such as `.kiro/`, `.cursor/`, `.codex/`, `.gemini/` or `.vscode/`) unless the team has agreed to.

## 10. Starting a session

Paste this to your AI at the start of every session, with your details filled in:

```text
You're helping <your name>, the owner of Area <N> (<area name>) in the OrderPilot repository, our project for Problem Statement #11, Spectra Innovations.
Before anything else, read AGENTS.md, CLAUDE.md, docs/team/module-ownership.md and my area guide (docs/team/<guide file>), and follow AGENTS.md exactly.
Only edit files in Area <N>'s paths. Never delete, move or overwrite anyone else's work. Never run the commands in AGENTS.md section 4 without my OK. Don't push, open a pull request or merge unless I ask.
Today's task: issue #<number>, "<story title>".
First give me your plan: the acceptance criteria, the files you'll change (confirm each one is in my area, and mark any shared file), the tests you'll write, and anything you need from another area. Wait for my OK before you edit anything.
```
