## What and why

<!-- One or two sentences: the change and the problem it solves. One task per pull request. -->

Closes #

## Acceptance criteria

<!-- Copy the story's criteria and tick each one this PR meets, with its evidence: a test name, a screenshot, a log line. -->

- [ ] …

## Ownership area

- [ ] Area 1: Integration core and platform
- [ ] Area 2: Assessment capture and verification
- [ ] Area 3: Competency, submissions and insights
- [ ] Area 4: Governance, security and monitoring
- [ ] Team: assessments and process

## Module requirements covered

<!-- M1 design thinking · M2 GRS by design · M3 AI-assisted coding · M4 best practices · M5 team Git workflow · M6 deploy and monitor -->

## How it was verified

<!-- Paste the real results, not "works on my machine". -->

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `docker compose up --build` still works (if Docker, infra or env changed)

## UI changes

<!-- Delete this section if there is no UI change. -->

- [ ] Every state handled: loading, empty, error (retry + traceId), partial, success, permission-denied
- [ ] EN and 中文 strings added (no hard-coded text)
- [ ] Keyboard navigation and focus rings checked
- [ ] `prefers-reduced-motion` respected
- [ ] Screenshots attached (light and dark)

## Docs

- [ ] `docs/requirements-traceability.md` updated
- [ ] ADR added or updated (if a decision changed)
- [ ] `docs/ai/ai-usage-log.md` updated (if the work was AI-assisted)

## Data and security

- [ ] Synthetic data only; no national ID numbers; no secrets or licence keys
- [ ] New writes are audited; new endpoints have RBAC and input validation
- [ ] No new CodeQL, dependency-review or Trivy findings, or each one is triaged in the Security tab

## Definition of Done

<!-- docs/agile/definition-of-ready-and-done.md -->

- [ ] The branch holds one task, and every acceptance criterion above is met
- [ ] CI and the security checks are green
- [ ] Reviewed by the code owner or the team lead, then merged with a merge commit
