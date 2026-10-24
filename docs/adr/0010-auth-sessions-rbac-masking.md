# ADR 0010: Cookie-based JWT sessions, RBAC and field-level masking

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M2, M4 · capabilities B, F

## Context

HuiTong holds employee data from two entities in two countries, including pay, bank and birth-date fields. Every control must hold on the server, because anything sent to the browser can be read there ([R-03, R-11](../grs/grs-by-design.md#32-register)).

- **Seven roles and entity scope.** `HR_SG` may see SG01 RESTRICTED fields and `HR_HQ` may see CN01 ones. SG01 RESTRICTED fields reach `HR_HQ` only through an approved cross-border transfer entry ([GRS 2.2](../grs/grs-by-design.md#22-classification-and-masking-baseline); A-14, Q-08, Q-39).
- **OWASP.** Broken Access Control (A01) and Identification and Authentication Failures (A07) in the Top 10; object-, property- and function-level authorisation (API1, API3, API5) in the API Security Top 10.
- **Same origin.** The single-page app and the API share one origin, behind nginx locally and CloudFront on AWS, so `SameSite=Strict` cookies work.
- **A demo role switcher** shows the client each role's view in one session.
- **Production identity is unknown:** Microsoft Entra ID, Active Directory, DingTalk or HQ's own directory, with or without MFA (A-16, Q-44, Q-45).

## Decision

**1. Passwords.** argon2id, with parameters at or above OWASP's minimum (19 MiB of memory, 2 iterations, parallelism 1). Unknown accounts still run a hash verification, so response times do not reveal which emails exist. Sign-in has its own, tighter rate limit.

**2. Session cookies.**

| Cookie       | Content                                                                                                                                                                               | Flags                                                | Lifetime                   |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------- |
| `ht_access`  | JWT signed with `@nestjs/jwt` 12 (HS256, secret from the environment, algorithm fixed on verification). Claims: user id, role, entity scope and session family id; no names or emails | httpOnly, Secure, SameSite=Strict, Path=/            | 15 minutes                 |
| `ht_refresh` | Opaque 256-bit random token; only its hash is stored, with its token family                                                                                                           | httpOnly, Secure, SameSite=Strict, Path=/api/v1/auth | 7 days                     |
| `ht_csrf`    | CSRF token, readable by JavaScript                                                                                                                                                    | Secure, SameSite=Strict, Path=/                      | Reissued with each refresh |

- **Rotation with reuse detection.** Every refresh issues a new refresh token and retires the old one. If a retired token is presented again, the whole family is revoked, the cookies are cleared, an audit event is written and the user sees "signed out for security".
- **CSRF double-submit.** The `ApiClient` copies `ht_csrf` into an `X-CSRF-Token` header on every state-changing request, and a guard compares the two in constant time. The token is bound to the session with an HMAC (OWASP's signed double-submit pattern), so a planted cookie cannot pass. OA webhooks carry no cookies and are verified by their HMAC signature instead ([ADR 0008](0008-jobs-events-realtime.md)).

**3. Permission-based RBAC.** Routes declare permissions (for example `employees:read` or `mappings:approve`), never role names. The role-to-permission matrix lives in `@huitong/shared`, so the web hides what the API would refuse. A global guard denies by default and `@Public()` opts out; a test fails any route that declares neither. Entity scope (object-level authorisation) is checked in services ([ADR 0006](0006-api-nestjs-layered-modules.md)).

**4. Field-masking interceptor.** Every canonical field carries a classification in the shared field catalogue (PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED). The interceptor compares it with the viewer's clearance for the record's entity, and replaces any value above that clearance with a marker such as `{ masked: true, classification: "RESTRICTED", reason: "NO_TRANSFER_ENTRY" }`.

- Reasons are UPPER_SNAKE codes (clearance too low, other entity, no approved transfer entry) that the "Why is this hidden?" tooltip translates.
- The shared schemas type each sensitive field as "value or masked marker", so the UI must handle both.
- Masking runs on the server, so masked values never reach the browser, and exports pass through the same rules.

**5. Demo login.** `POST /api/v1/auth/demo-login { role }` is registered only when `DEMO_MODE=true`, and configuration validation refuses to start with `DEMO_MODE=true` in production.

**6. Production path.** OIDC or SAML with the client's identity provider replaces local passwords behind the same auth module. Cookies, RBAC and masking stay as they are, and roles may come from directory groups (Q-46).

## Consequences

### Positive

- Injected scripts cannot read the tokens, and cross-site requests carry neither the cookies nor a valid CSRF token.
- A stolen refresh token is detected as soon as both the thief and the user have used it.
- One permission matrix drives both API enforcement and UI visibility.
- Masking is uniform and explains itself, supporting the PDPA and PIPL considerations in [GRS section 5](../grs/grs-by-design.md#5-compliance-considerations).

### Negative

- An access token stays valid for up to 15 minutes after its family is revoked. Sensitive actions (approvals, role changes) re-check the session family in the database.
- Two tabs refreshing at once would look like reuse, so the `ApiClient` refreshes under a cross-tab lock (Web Locks API).
- The cookie design depends on same-origin hosting; a split domain would need a new decision.
- argon2 is a native package, so its install script needs a reviewed approval ([ADR 0003](0003-pnpm-workspaces-monorepo.md#dependency-policy)).

## Alternatives considered

| Option                                       | Why rejected                                                                                                                                                                                                     |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bearer tokens in `localStorage`              | Readable by any injected script; the CSP reduces that risk but does not remove it                                                                                                                                |
| Server-side sessions behind an opaque cookie | Simpler revocation, and viable. `CLAUDE.md` fixes JWT cookies; a short-lived stateless access token avoids a store lookup on every request and SSE connection, while the refresh store still provides revocation |
| Role checks written in code                  | Rules scatter, drift between web and API, and cannot be reviewed as one matrix                                                                                                                                   |
| Masking in the UI only                       | Hidden values would still reach the browser (R-11)                                                                                                                                                               |
| PostgreSQL row-level security                | Strong defence in depth, but awkward with pooled connections through the Prisma adapter, and masking reasons need application logic anyway. A candidate for production hardening                                 |
| bcrypt                                       | Not memory-hard and limited to 72 bytes of input; OWASP recommends argon2id first                                                                                                                                |

## Amendment, 21 Oct 2026: a per-destination field allowlist, default deny

Adopted from Azri's integrated plan (prompt 002, story B-7). Clearance rules decide how far a role sees into classified data; they do not say which fields one entity may receive from another. A field can be within HR_HQ's clearance and still have no business reaching HQ.

**Decision.**

- **The register is the allowlist.** For a record of entity S read by a user whose own entity is D (D ≠ S), a field is shown only when an ACTIVE entry of the cross-border transfer register from S to D covers it. An entry's data categories map to canonical fields (`fieldsCoveredBy` in `@huitong/shared`); an entry may also name a single field; an unknown entry covers nothing. Everything else is withheld with the reason `CROSS_BORDER_NOT_APPROVED`. Within the user's own entity only the clearance rules apply. There is no second list.
- **Enforced in the API, not the UI.** `AccessPolicyService` reads the ACTIVE entries with the clearance rules, and `FieldMasker` applies them to every value it shows: the record drawer, each source's value, conflicts, history and sync previews. The masking interceptor applies them to any `@MaskFields` route. Another entity's records appear in the employee list, the conflict queues and the overview only while every field the list shows, searches, filters or sorts by is shared. Otherwise they read as missing (a 404), so search and sort cannot leak a withheld value. The AI explainer withholds the values of a field the reader may not see.
- **Versioned and audited.** Each entry has a `version`. A record drawer that withholds fields writes one `access.fields_withheld` audit event with the fields and the entry versions that decided it. Area 4's administration (F-4) raises the version, audits each change and reloads the policy. An export (area 3, D-4) leaves out the fields `FieldMasker.withheld` names.

**Consequences.**

- The seed's SG01 to CN01 entry no longer covers dates of birth (data minimisation, Q-08): HR_HQ sees them withheld, though its clearance would allow them. This is the demonstration for E2E #3.
- A new subsidiary's records stay invisible to other entities until a register entry covers them; connecting MY01 (story A-5) includes its entry.
- Opening another entity's record writes an audit event, which is also the start of the access log that PIPL-style accountability expects.

## Amendment, 23 Oct 2026: a joining company's register entry

The amendment above says that connecting MY01 (story A-5) includes its register entry. The import built in A-5 does not create one. An entry records a decision of the data owner and the DPO, which area 4's register administration (F-4) captures; an upload is not that decision.

**Consequences.**

- Until an ACTIVE entry from the new entity covers them, its imported records stay invisible to HR in every other entity, including the HR who imported them. [`file-import.int-spec.ts`](../../apps/api/test/file-import.int-spec.ts) shows both sides: none of the records without an entry, and only the shared fields with one.
- The seed has no MY01 entry, so E2E #2 ends with the records in the master and none of them shown in Singapore or at HQ. No one can add that entry until area 4's register administration (F-4) lands, so a demo cannot show them yet; the integration test inserts an entry directly.

## Amendment, 24 Oct 2026: statement #5

Statement #5 ([ADR 0023](0023-retarget-ps5-aspri-ipi.md)) keeps the sessions, RBAC and masking, and changes the roles. `ASSESSOR`, `OPERATIONS`, `TRAINING_MANAGER`, `MANAGEMENT`, `AUDITOR` and `SYSTEM_ADMIN` replace the seven HR roles: the new roles are added first, and the HR roles and their entity scopes leave once no area uses them. The per-destination allowlist (amendment of 21 Oct) becomes a per-agency allowlist: an agency receives only the fields that an ACTIVE entry shares with it.
