## What and why

<!-- One or two sentences: the change and the problem it solves. Link the issue: Closes #123 -->

## Ownership area

- [ ] Area 1: Integration Core + platform base
- [ ] Area 2: Workflow automation
- [ ] Area 3: Attendance, leave and reporting
- [ ] Area 4: Governance, security and monitoring

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
