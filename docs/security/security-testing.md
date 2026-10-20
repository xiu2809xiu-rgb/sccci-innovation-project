# Security testing

How HuiTong checks its own security, what each check covers and what to do with a finding. It serves module requirement 4 (application security) and the OWASP Top 10 and OWASP API Security Top 10 controls in `CLAUDE.md` section 7. The traceability rows are M4.1-13 and M4.1-17 to M4.1-23.

## Why SAST fits a React and TypeScript stack

Static application security testing reads the code without running it. CodeQL, GitHub's engine, has a JavaScript and TypeScript extractor that understands JSX, TSX, React components and hooks, Express and NestJS. It follows untrusted data from where it enters (a URL parameter, a request body, an uploaded file) to where it can do harm, for example:

- cross-site scripting through `dangerouslySetInnerHTML`, `innerHTML` or `href="javascript:…"`;
- injection into SQL, shell commands, file paths or regular expressions;
- open redirects and server-side request forgery;
- prototype pollution, insecure randomness, and secrets left in code.

A second CodeQL language, `actions`, checks the GitHub workflows themselves (for example untrusted input in a `run` step). So yes, SAST is right for this stack. It does not replace our tests: it finds unsafe patterns, while the integration tests prove that access control works (OWASP API1, API3, API5).

## The layers

| When                | Check                                                                                   | Fails the build when                                                                  | Where                           |
| ------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------- |
| Before each commit  | Licence-key guard; lint and format of staged files                                      | A staged line contains the React Bits licence key                                     | `.husky/pre-commit`             |
| Every pull request  | Lint, typecheck, unit and integration tests (including the auth-failure tests)          | Any check fails                                                                       | `ci.yml` (verify)               |
|                     | `pnpm audit --audit-level high`                                                         | A high or critical advisory without a documented exception                            | `ci.yml` (verify)               |
|                     | CodeQL SAST, `security-extended` queries, JavaScript/TypeScript and Actions             | A new error-level alert or a high-severity security alert                             | `codeql.yml`, ruleset on `main` |
|                     | Dependency review                                                                       | A dependency with a high or critical vulnerability, or an AGPL, GPL-3 or SSPL licence | `dependency-review.yml`         |
|                     | Trivy misconfiguration scan of Dockerfiles, compose and `infra/`                        | Reported in code scanning (High and Critical)                                         | `security.yml`                  |
|                     | Trivy image scan of the api, web and mock images                                        | A fixable High or Critical vulnerability                                              | `ci.yml` (docker)               |
| `main` and weekly   | CodeQL again (new queries over unchanged code), Trivy configuration scan                | As above                                                                              | `codeql.yml`, `security.yml`    |
|                     | OpenSSF Scorecard: pinned dependencies, token permissions, branch protection, and so on | Never; the score is reported in the Security tab                                      | `scorecard.yml`                 |
| Continuously        | Dependabot alerts; weekly grouped update PRs with a 7-day cooldown                      | Alerts open in the Security tab                                                       | `.github/dependabot.yml`        |
|                     | Secret scanning with push protection                                                    | A push containing a known secret pattern is blocked                                   | Repository settings             |
| With the deployment | DAST: OWASP ZAP baseline scan of the deployed demo                                      | Planned with module requirement 6 (Phase 9)                                           | M4.1-23                         |

Supply-chain hygiene supports all of these. Every action in a workflow is pinned to a full commit SHA, and every base image to a tag and a digest. The runtime images carry only `node` or `nginx`: npm, npx, corepack and yarn are removed, so there is nothing to patch and nothing for an attacker to install with.

## Triage

Findings land in the repository's **Security** tab (code scanning, Dependabot, secret scanning). The area owner of the affected code triages them; area 4 owns the monitoring of the tab.

| Severity          | Action                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Critical and High | Fixed before the pull request merges. On `main`, fixed in the current sprint as a `type: security` issue |
| Medium            | A `type: security` issue in the backlog, planned within two sprints                                      |
| Low and notes     | Fixed when the code is next touched, or dismissed with a reason                                          |

A false positive is dismissed in the Security tab with the reason ("false positive" or "used in tests"), never silenced in code without a comment that explains why. A secret that reaches GitHub is treated as leaked: rotate it first, then remove it from the history.

## Accepted findings

Findings that were dismissed or accepted rather than fixed, each with its reason and when to look again. The first CodeQL and Scorecard runs on `main` were triaged in [#82](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/issues/82).

| Finding                                                                           | Where                                                  | Decision                          | Reason                                                                                                                                                                                                   | Look again when                                       |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| CodeQL `js/user-controlled-bypass` (#20)                                          | `auth.guard.ts`                                        | Dismissed: false positive         | The access cookie's presence only decides whether to verify it. Without a verified token every non-public route throws `UnauthenticatedError` (`auth.int-spec.ts`: _refuses /auth/me without a session_) | The guard changes                                     |
| CodeQL `js/insufficient-password-hash` (#17 to #19)                               | The mocks' `http/auth.ts`                              | Dismissed: used in tests          | The mock systems hash a demo API key on both sides only to compare it in constant time; nothing is stored. HuiTong's own passwords use argon2id                                                          | A mock is replaced by a real connector                |
| CodeQL `js/sensitive-get-query` (#14 to #16)                                      | The mocks' routes                                      | Dismissed: used in tests          | `GET` by an internal employee number, in the path of a mock system                                                                                                                                       | A mock is replaced by a real connector                |
| Scorecard _Vulnerabilities_ (#9): `braces` up to 3.0.3, GHSA-vfj7-8cjw-p6xm, High | Development tooling, through transitive dependencies   | Open, accepted until a fix exists | Only build tools use it, on patterns from our own configuration, never on user input, and no patched version exists yet                                                                                  | A patched release appears; Dependabot will propose it |
| Scorecard _Pinned-Dependencies_ (#4 to #6)                                        | `npm install --global pnpm@12.14.0` in the Dockerfiles | Accepted                          | pnpm is pinned to an exact version, and `pnpm-lock.yaml` pins every package it installs by integrity. Pinning pnpm itself by hash needs Corepack in the build stage                                      | Before the AWS deployment (Phase 9)                   |
| Scorecard _Fuzzing_ (#7), _CII-Best-Practices_ (#13)                              | The repository                                         | Accepted                          | Out of scope for a proof of concept                                                                                                                                                                      | Not for this project                                  |
| Scorecard _Maintained_ (#12)                                                      | The repository                                         | Accepted                          | The repository was created in October 2026                                                                                                                                                               | It clears 90 days after creation                      |
| Scorecard _Code-Review_ (#11)                                                     | The pull requests                                      | Accepted for now                  | The team lead builds the platform base alone; the working agreement allows checking against the Definition of Done before merging                                                                        | Teammates review from W3 (T-1)                        |
| Scorecard _License_ (#10)                                                         | The repository                                         | Open                              | Choosing a licence is the team lead's decision, given the licensed React Bits Pro code                                                                                                                   | The team lead decides                                 |
| Scorecard _Branch-Protection_ (#2), _Security-Policy_ (#3), _SAST_ (#8)           | The repository                                         | Fixed                             | The `Protect main` ruleset is applied, `SECURITY.md` is on `main`, and CodeQL runs on every pull request                                                                                                 | The next Scorecard run                                |

## OWASP mapping

| OWASP Top 10 (2021)                 | Controls                                                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A01 Broken access control           | RBAC guard, entity-scoped records and field masking (M4.1-11), with integration tests for every role |
| A02 Cryptographic failures          | argon2id passwords, HMAC-signed webhooks, httpOnly Secure cookies, TLS at the edge on AWS            |
| A03 Injection                       | zod validation at every boundary, Prisma's parameterised queries, CodeQL                             |
| A04 Insecure design                 | Preview before any sync writes, human approval of AI mappings, GRS risk register                     |
| A05 Security misconfiguration       | helmet with a strict CSP, CORS allow-list, typed config; Trivy configuration scan                    |
| A06 Vulnerable components           | Exact pins, `pnpm audit`, dependency review, Dependabot, Trivy image scan                            |
| A07 Authentication failures         | Rate-limited sign-in, refresh-token rotation with reuse detection, CSRF double-submit token          |
| A08 Software and data integrity     | SHA-pinned actions, digest-pinned images, Scorecard, webhook signatures and replay window            |
| A09 Logging and monitoring failures | Append-only audit log, structured logs with trace ids, health checks                                 |
| A10 Server-side request forgery     | Connector endpoints come from server-side configuration only, never from a request                   |

The full OWASP Top 10 and API Security Top 10 checklist is M4.1-14 (area 4).
