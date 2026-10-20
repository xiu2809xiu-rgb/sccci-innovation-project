# Definition of Done

A story is done when it is merged into `main` through a pull request and:

- every acceptance criterion is met, with the evidence in the pull request;
- lint, typecheck, tests and the build pass, and CI and the security checks are green;
- new domain logic has unit tests (80% line coverage on domain modules), new endpoints have integration tests for the happy path and an auth failure, and new journeys have an end-to-end step with axe checks;
- UI changes handle every state, have EN and 中文 strings, work with the keyboard and reduced motion, and come with screenshots in both themes;
- data is synthetic, writes are audited, endpoints have RBAC and validation, and no secret or key is committed;
- the traceability matrix, ADRs, assumptions and the AI usage log are updated where relevant;
- the code owner (or the team lead for shared files) has reviewed it.

The full checklists, including the Definition of Ready and the sprint and release checks, are in [definition-of-ready-and-done.md](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/main/docs/agile/definition-of-ready-and-done.md).
