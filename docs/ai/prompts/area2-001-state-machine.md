# Area 2 prompt 001: the workflow state machine (C-2)

Azri, area 2's owner, asked the AI to read AGENTS.md, CLAUDE.md, module ownership and the area 2 guide, then start on one part of area 2 and report what it was working on.

## Agreed plan

- **Story:** C-2, the workflow state machine (sprint 8), build plan step 2 in the area 2 guide.
- **Scope:** a pure domain class with no Prisma: start, complete the current task, pause, resume, fail and cancel, with one transition table that refuses anything illegal (409). Due times come from the step's SLA hours and a time passed in, never the real clock.
- **Tests first:** turn the domain cases in `workflow-state-machine.spec.ts` from `it.todo` into real tests, at least 80% line coverage. The audit, publish and activation cases stay to-dos for the service.
- **Out of scope:** retries and backoff (BullMQ, step 4), the Prisma repository (step 1), auditing and events (step 5).
- **Decisions for now:** one step at a time; an SLA clock starts when its step starts.
- **Paths:** only area 2's (AGENTS.md section 3). The State machine pattern entry goes in the area 2 guide, for the register in `docs/architecture/patterns.md` later through area 1.

## Review

After the first version passed, three AI reviewers read it independently through one lens each (correctness, fit with the spec and later stories, test quality) and were told to report only concrete problems they could not refute. Their eight findings and the fixes are in the AI usage log row.
