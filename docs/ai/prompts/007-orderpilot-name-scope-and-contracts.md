# Prompt 007: OrderPilot: the name, the scope and the contracts between areas

The team reviewed prompt 006 and settled the points below.

- **What stays:** prompt 006's structure, areas and owners.
- **What changes:** apply the points below **while you carry out prompt 006**. Where the two differ, this prompt wins. If a step of 006 is already merged, change it in a follow-up pull request.
- **No attribution:** don't credit any person or document as the source of these points. If you have already added a line such as "Adopted from Angelyn's OrderPilot proposal", remove it.
- **This file's name:** commit it as `docs/ai/prompts/007-orderpilot-name-scope-and-contracts.md`. If it is already committed under its old name, rename it in your next pull request.

## Changes to make

1. **The name, in the code too.** The product is **OrderPilot**, and the code takes the name as well. Rename HuiTong everywhere it is current, in one pull request of its own, before any other code changes:
   - the package names (`@huitong/*` becomes `@orderpilot/*`) and every import, `--filter` and script that uses them, in the root `package.json`, CI and the Dockerfiles;
   - the Docker Compose project, service and image names (`huitong-*` becomes `orderpilot-*`), and the database name and user in compose, `.env.example` and CI;
   - the UI title and app name, the i18n strings, Swagger's title, and the telemetry and logger service names;
   - the README, CLAUDE.md, CONTRIBUTING.md, SECURITY.md, `AGENTS.md`, the wiki, the slides and the diagrams;
   - the GitHub board: rename the existing **HuiTong delivery** project to **OrderPilot delivery** (rename it; never create a second board), and update `scripts/github/project-board.mjs` to match.

   Leave the history as it is: the earlier ADRs, the build report's earlier sections, the AI usage log's rows, prompts 001 to 005 and the archive tags. ADR 0024 says once that the project was called HuiTong for #7. Tell Richie that everyone must run `pnpm install`, then `pnpm db:migrate && pnpm db:seed`, after the rename, because the local database gets a new name.

   **The tagline** is **"AI reads, rules decide, people approve."** It sits beside Spectra's own principle.

2. **MVP first, with MoSCoW.** Encode this in `scripts/github/backlog.mjs` as priorities and sprint goals (006 step 10), and in the problem statement.
   - **Must: the sales pilot, for the W4 prototype and the W5 proposal.**
     - PO upload.
     - AI classification of the document type, then extraction with a confidence score per field.
     - A person checks every low-confidence field before anything moves on.
     - Stock lookup in mock Navision.
     - Routing and approval, with the SPR raised by a button until its trigger is confirmed.
     - The order tracker.
     - One mismatch in the exceptions queue: a packing list whose quantity differs from the PO.
     - The server-side permission check.
   - **Should, in this order, by W13:**
     1. The payment gate: packing is blocked until Finance confirms the payment, because most customers pay in advance.
     2. A PI draft for Support to review and release.
     3. Full invoice and packing-list matching.
     4. AWB/BL and import-permit follow-ups, with reminders and escalations.
     5. Email intake and AI-drafted notifications.
     6. More matching rules.
   - **Phase 2: the purchase flow, built in W8 to W12 and part of the W18 final.** SPR, then vendor PO, then the vendor PI with the bank-detail check, then goods-receipt matching, then payment-due reminders.
   - **Later, only if Spectra wants it:** real Navision integration, write-back with controls, forwarder tracking.
   - **Out of scope:** replacing Navision, posting financial transactions automatically, processing real payments, and sending real emails to customers (drafts only).

3. **Re-cut the end-to-end tests to the pilot.** This replaces E2E #1 and #3 in 006 step 8.
   - **E2E #1, the sales pilot:**
     1. A PO is uploaded, classified and extracted.
     2. A person confirms two low-confidence fields.
     3. Stock is checked in mock Navision.
     4. The SPR is raised and approved, and the approval is logged.
     5. A reminder fires on a task left waiting.
     6. A packing list with the wrong quantity is flagged.
     7. The tracker shows the status, the owner, the history and the exception.

     Extend it as each Should item lands.
   - **E2E #2:** unchanged.
   - **E2E #3:** an unauthorised role is refused an approval by the backend, even when it calls the API directly. Segregation of duties and masking work as in 006, and every refusal and override is audited.
   - **E2E #4, the purchase flow (phase 2):**
     1. An SPR becomes a vendor PO.
     2. The vendor's PI arrives with bank details that differ from the vendor master, so the payment is held until Finance and a second approver clear it.
     3. Goods receipt is matched against the documents.
     4. The payment-due reminder fires.

4. **The contracts between the areas.** Write them into `docs/team/module-ownership.md`, the area guides and CLAUDE.md.
   - **Order status lives only in area 2's state machine.** Area 1 owns the order's data and its documents (`orders`, `documents`). Area 3 reads the status through agreed APIs and keeps no status logic of its own.
   - **Area 3 owns the check results and the exceptions.** It reports pass or fail to area 2, and area 2's state machine decides what a failure blocks.
   - **Area 4 owns the authorisation policy:** who may approve what, the limits and segregation of duties. Endpoints call that policy, so rights are enforced on the server, and tests prove it with direct API calls. Area 1 keeps the generic guard that calls the policy.
   - **Area 1 owns the whole AI pipeline:** document classification, extraction, the confidence scores and their thresholds (which confidence needs a person, and which fields always do), and the review screen. Area 4 audits AI decisions and sets what data may go to an AI service.
   - **The team agrees the shared order and event contract in W3, and every owner reviews it.** Add a team story for it.

5. **Open business rules are configurable, never hard-coded,** until Spectra confirms them:
   - the SPR trigger in sales (always, only when stock is short, or only for items not normally stocked; a button in the MVP);
   - the PI sequence;
   - the approvers and their limits;
   - delegation when the approver is away.

   Record each one as an assumption and as a client question.

6. **"Where we use AI, and where we don't."** Put this table in the problem statement and the proposal deck:

   | Task | Approach |
   | --- | --- |
   | Reading the fields of POs, PIs, invoices and packing lists | AI extraction with confidence scores and human review |
   | Telling document types apart | AI classification |
   | Comparing quantities, prices and PO references | Fixed rules |
   | SPR routing and limits | Workflow rules; a person approves |
   | Releasing packing after payment | A rule plus Finance's confirmation |
   | Explaining an exception | An AI summary; the logs stay the source of truth |
   | Drafting customer or vendor emails | An AI draft; a person sends it |

7. **Success measures with tests and targets,** next to Spectra's five measures (which stay as lab estimates):

   | Measure | Test | Target |
   | --- | --- | --- |
   | Extraction accuracy | Correct fields on the synthetic test set | At least 95% on the agreed document types |
   | Mismatch detection | Seeded mismatches | Every one flagged |
   | Duplicate protection | The same PO submitted twice | No duplicate order |
   | Workflow correctness | Defined test cases | 100% pass |
   | Time and touches per order | Manual against OrderPilot, timed | Measured reduction |
   | Follow-up visibility | Overdue payments and AWB/BL | All shown |

8. **GRS additions.**
   - **Sustainability:** less re-typing and fewer errors mean fewer reshipments, and AI is used only where it helps, with its usage and cost tracked.
   - **PDPA framing:** customer contacts are personal data, so collect only what is needed and use synthetic data in development. Do not claim the prototype is PDPA compliant.

9. **Briefing-call questions.** Add these to 006's list:
   - Is Navision cloud or on-premise?
   - Can they share samples of each document type, including the SPR form, with normal and messy cases?
   - What counts as a mismatch (price tolerance, partial shipments, substitutions), and what happens next?
   - What happens when the approver is away?
   - Which channels do the teams use (email, Teams, WhatsApp), and may the system send messages or only draft them?
   - Are bank details and customer contacts off-limits for AI?
   - Who signs off the results and the success measures?

   Note in the backlog that the priority questions go to Spectra before the call.

10. **Personas.** Start the personas from a role table: each role, what it does today, and what would help it.

## Unchanged

The areas and owners in 006 stand: area 1 Richie, area 2 Azri, area 3 Iok Teck and area 4 Angelyn. Log this prompt in the AI usage log, and record these points in ADR 0024 or a short ADR of their own.
