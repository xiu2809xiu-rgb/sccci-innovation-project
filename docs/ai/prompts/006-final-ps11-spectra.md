# Prompt 006: The final statement, #11 Spectra Innovations

The allocation is confirmed: the team has **Problem Statement #11, Spectra Innovations** (announced in W2, 26 Oct 2026). This is final. **Stop prompt 005 where it is**: #5 was not allocated, and its remaining steps are cancelled.

What happened, for the record (ADR 0024 tells it in full):

- **#7, LESSO Solar:** the base was built and then retargeted to it; the client withdrew on 23 Oct. The repository as it stood is tagged `archive/ps7-lesso-solar`.
- **#5, ASPRI-IPI:** the team's resubmitted first choice. Prompt 005 got through ADR 0023, the reframe, the assumptions and questions, the design-thinking set, the GRS design, the backlog and the GitHub forms (#148 to #182). #186 and some local branches were still open.
- **#11, Spectra Innovations:** allocated.

Keep the repository, its history and the platform. Retarget everything that is specific to #5, #7 or HR, so that `main` reads as a #11 project from end to end.

## How to work

- **The usual flow:** a branch per step (split the bigger steps), Conventional Commits, pull requests that you open and merge with green checks, ADRs for decisions, a row per step in the AI usage log, and no AI attribution anywhere.
- **Respect the owners.** Area 2 is Azri's, area 3 Iok Teck's and area 4 Angelyn's. A change inside their folders goes in its own pull request with that owner as reviewer, and only as step 7 allows. Never change Azri's state machine; it carries over as it is.
- **`AGENTS.md` has been rewritten for #11** (at the repository root, not yet committed). It fixes the module, label and file names below. Use those names, so that it stays true. If you have to differ, update `AGENTS.md` in the same pull request and say why.
- **Public repository.** Never commit Spectra's documents (the brief, their proposal, their process slides) or anything from the data folder. Summarise them in our own words.
- **Edit, don't rebuild.** Reuse the platform, the connector framework, the mapping engine and its AI assistant, the file import, the workflow engine, the conflict detection, the template engine and the exports, and the governance features.

## Step 0: settle #5 and #7 first

1. **Save the work in progress.** Commit whatever is uncommitted to the branch it is on. Push no new work to `main`.
2. **Tag before changing anything.**
   - Tag the current `main` as `archive/ps5-aspri-ipi`.
   - Tag the tip of each unmerged #5 branch as `archive/ps5-<branch-name>`, on GitHub and local, worktrees included (`docs/ps5-areas`, `docs/area2-ps5-guide`, `docs/area3-ps5-guide`, `docs/area4-ps5-guide` and `feat/area1-ps5-roles`, plus any others you find).
   - Push the tags and check that they are on GitHub.
3. **Close without merging.** Close pull request #186 with a comment linking ADR 0024. Once a branch's tag is on GitHub, you may delete that branch, locally and on GitHub, but only your own branches. Never touch `feat/foundation`, Azri's branches or Dependabot's.
4. **Close the #5 issues.** Close every issue that only #5 needs as "not planned", with a comment linking ADR 0024. Never delete an issue. Keep the team issues (T-1, T-2 and the like) and retitle them where needed.
5. **Salvage what is generic from `docs/area1-data-formats`** (#7's data-formats work): the guard that keeps client sample exports out of commits, pushes and Docker builds. Bring it to `main` in its own pull request, without the LESSO-specific content. Then tag the branch `archive/ps7-data-formats`, and delete it once the tag is on GitHub.
6. **Keep:** Azri's state machine (#147), the platform, the dependency and image fixes, the rename-safe backlog scripts, and the backlog's capacity-based sprint planning.

## The brief, in our own words

- **The client.** Spectra Innovations is a Singapore distributor, and master distributor for some brands, of IT products and computer peripherals. It sells to South Asia (India, Sri Lanka, Bangladesh, Pakistan) and the Middle East. Most customers pay in advance, before the goods ship. It runs on Microsoft Dynamics Navision.
- **The challenge.** Purchase and sales orders pass through many manual steps and hand-offs between Product Managers, the approver, Support, Warehouse, Finance and Logistics. Staff re-type data from POs, invoices, proforma invoices (PIs), packing lists and shipping documents, and chase approvals, payments and shipping paperwork by hand.
- **What a good solution does.**
  - It reads customer and vendor documents and extracts part numbers, quantities, prices and shipment details.
  - It checks the documents against each other and flags mismatches for staff to review.
  - It routes approvals and tasks to the right team, with reminders for overdue items.
  - It shows every order's status, owner, outstanding actions and exceptions on one dashboard.
- **Good to know.** The suggested start is one workflow (probably sales), from capturing the customer's PO to an order-status tracker, with staff still posting into Navision. Human approvals and financial controls must stay in place.

### Their process today, from their slides

| Process  | Steps |
| -------- | ----- |
| Sales    | Customer PO (part number, quantity, USD unit price) → stock check, with an SPR (Sales Purchase Requisition) if stock is short → Support generates a PI from Navision with the bank details → once the customer pays, the PI goes to the warehouse for packing → invoice and packing list → PI to the customer with the shipment date → goods released to the forwarder under the shipping terms → shipping details to the customer → follow-up of the AWB/BL and import permit |
| Purchase | Product Manager raises an SPR (part number, quantity, USD unit price) → the approver reviews and approves it → Support creates the vendor PO in Navision → the vendor sends a PI with our PO number and their bank details → forwarder arranged under the shipping terms → the warehouse checks the goods against the invoice, packing list and AWB/BL → goods received into Navision from the vendor's invoice → customer notified → Finance pays the vendor on the due date |

### Their own proposal

- **Four capabilities:** AI document processing, an AI workflow agent, Navision integration, and an order dashboard.
- **Their principle:** the AI reads documents and handles what varies, while a workflow engine enforces the business rules, approval limits and the order of steps. The AI makes no unrestricted decisions.
- **Their phases:** (1) capture, extraction, validation, approval notifications and order tracking, with Navision posting and money kept under staff control; (2) Navision integration; (3) logistics and Finance coordination; (4) measurement.
- **Their measures:** order-processing time, manual touches per order, data-entry error rate, approval turnaround and overdue orders.
- **Their open questions:** can Navision be integrated, how do orders arrive, and purchase, sales or both? They also flag a sequence to confirm: when the PI goes to the warehouse and when it goes to the customer.

## Changes to make

1. **ADR 0024 and the reframe.** Write ADR 0024: the allocation of #11, why prompt 005 stopped, what Step 0 archived and closed, what carries over from #7 and #5, and what changes. Then rewrite the README, CLAUDE.md sections 1, 3 and 4, and `docs/problem-statement.md` for #11. Keep the project name HuiTong 汇通; the platform still converges and connects systems.

2. **Product scope** (CLAUDE.md section 4, capabilities A to G):
   - **A. Document intake and AI extraction.** Documents arrive by email or upload, as PDFs, scans or Excel. Each customer's and vendor's layout is a mapping version, proposed by the AI mapping assistant and approved before use. Every extracted field carries a confidence score and a link to its source document, and anything uncertain waits for a person.
   - **B. Master data and Navision.** Customers, vendors, items (part numbers), price lists and stock are read from Navision. Staff keep posting into Navision: any write-back needs a preview and an audited approval, and goes to the mock only until the client agrees.
   - **C. Order workflows and approvals.** The sales and purchase workflows run on the state machine, with tasks routed to the six roles. They include SPR approval within approval limits, an SPR raised from a sales order's shortage, SLA reminders and escalations, generated documents (PI, invoice, packing list) and notifications.
   - **D. Cross-document checks, the order tracker and insights.** PO against PI, invoice, packing list and AWB/BL, plus stock and price checks; an exceptions queue; one order tracker; and Spectra's own measures as KPIs.
   - **E. AI with a human in the loop.** Extraction, layout mapping, an explainer for each mismatch, and drafts of customer updates that a person approves. AI never posts to Navision, approves, releases goods or pays.
   - **F. Financial controls and governance.** RBAC and segregation of duties (a requester never approves their own SPR); approval limits; bank-detail change control, where a PI whose bank details differ from the vendor master puts the payment on hold until Finance and a second approver clear it; masking of bank details and prices by role; a tamper-evident audit trail; retention; and no customer or pricing data sent to a third-party AI service without the client's written permission.
   - **G. Monitoring and analytics.** As before, with the AI cost per document.
   - **Roles:** `PRODUCT_MANAGER`, `APPROVER`, `SUPPORT`, `WAREHOUSE`, `FINANCE`, `LOGISTICS`, `MANAGEMENT`, `AUDITOR` and `SYSTEM_ADMIN`, replacing the #5 and HR roles.
   - **Data rules:** synthetic companies, fictional brands and synthetic documents only. Bank details are synthetic and obviously fake. Prices are in USD.
   - **Languages:** English first. Keep the i18n framework and the 中文 strings already written, but do not claim a second language as a client need until the briefing call confirms one.

3. **The areas.** Each of the brief's four requirements has one owner. Update CLAUDE.md, `docs/team/module-ownership.md` (owners as below, backups TBD) and the guides, renamed to the names in this table, and fix every link.

   | Area | Owner | Scope | Guide |
   | --- | --- | --- | --- |
   | 1. Document AI and integration core | Richie | Intake and AI extraction, layout mapping, the canonical order and its documents with provenance, master data, the Navision and mailbox connectors, write-back behind approval, and the platform | `docs/team/area-1-document-ai-and-integration.md` |
   | 2. Order workflows and approvals | Azri | The sales and purchase workflows on his state machine, task routing, SPR approval within limits, SPRs from shortages, SLA reminders and escalations, generated documents and notifications | `docs/team/area-2-order-workflows-and-approvals.md` |
   | 3. Cross-document checks, order tracker and insights | Iok Teck | The checks engine (tolerances, currency, PO references, totals, stock), the exceptions queue, the order tracker with each order's full trail, and the KPIs and insights | `docs/team/area-3-checks-tracker-and-insights.md` |
   | 4. Financial controls, security and monitoring | Angelyn | Segregation of duties, approval-limit and bank-detail controls, masking, audit, retention, AI governance, observability, clickstream, AI cost and the AWS deployment | `docs/team/area-4-controls-security-and-monitoring.md` |

   **The names to use.** Rename `employees` to `master-data`, and `attendance-leave` to `checks`, in the API modules, the web features, the shared contracts, the i18n files and the tests. Add:
   - the API modules `documents` and `orders` (area 1);
   - the web features `documents` (area 1) and `order-tracker` (area 3);
   - the i18n files `documents.json` and `order-tracker.json`.

   Keep `workflows`, `reports`, `connectors`, `mapping`, `ai`, `governance`, `audit` and `analytics`. Area 3's tests become `apps/api/test/checks.int-spec.ts` and `apps/web/e2e/order-tracker-pages.spec.ts`.

   **The template engine moves to the platform.** Move the template and Excel-export engine from area 3's head start into the shared platform (area 1), so that area 2's generated documents and area 3's reports both use it.

   **Labels:** rename them so issues keep them: `area: 1 document AI and integration`, `area: 2 order workflows and approvals`, `area: 3 checks, tracker and insights` and `area: 4 controls and monitoring`. Update the board's Area field, the issue forms and the pull request template to match.

4. **Mocks and synthetic documents.**
   - Replace `mock-sg-hr`, `mock-cn-hq` and `mock-oa` with `mock-navision` and `mock-mailbox`.
     - `mock-navision`: items and stock, customers, vendors, price lists, sales and purchase orders, PIs, invoices, payments and goods receipts, behind an OData-style API.
     - `mock-mailbox`: inbound emails with attachments, and an HMAC-signed "new mail" webhook (reuse the intranet mock's signing).
   - Turn `packages/synthetic-data` into a generator of synthetic customers, vendors, items, orders and documents. The documents are customer POs in at least three layouts (PDF and Excel), vendor PIs, commercial invoices, packing lists and AWB/BL, with deliberate mismatches for the demos.
   - Document every assumed format in `docs/data-formats.md`, to confirm at the briefing call. Keep every "Mock" label.

5. **CI and Docker.** Same pipeline and the same required check names. Update compose, the Dockerfiles, the Trivy scan list and the end-to-end run for the new mocks, and keep every check green.

6. **Area 1 in code.**
   - Intake, and the extraction pipeline through the `LlmGateway`. The mock provider stays deterministic for demos, with the "Mock AI" badge.
   - The mapping of each layout, the canonical order and document records with field-level provenance, and master data synced from Navision.
   - The Navision and mailbox connectors, and write-back behind approval.
   - The overview page and the 3D integration map, showing documents, then workflows, then Navision.

7. **Areas 2 to 4.**
   - Rewrite each area's guide for #11: its scope, what its folders hold today, what the owner changes first, and its interfaces and stories.
   - Make additive changes to the shared contracts.
   - Then ask Richie, one area at a time, whether the owner wants you to rework the head start for #11 (scaffolding, models, contracts, typed sample data, screens and test skeletons) or will do it themselves. If they want you to, do it in one pull request per area, with the owner as reviewer, and never touch the owner's own code. If not, leave the folder alone.
   - Expect Azri to want only the sales and purchase workflow definitions and the screens; his state machine stays as it is.

8. **Hero journey and tests.**
   - **E2E #1, the sales pilot:**
     1. A customer's PO arrives by email as a PDF. The AI extracts it, and Support confirms the one uncertain field.
     2. The checks find one line short of stock, so an SPR is raised, prefilled, and the approver approves it within the limit.
     3. The vendor's PI arrives and is checked against the vendor PO. Its bank details differ from the vendor master, so the payment goes on hold until Finance and a second approver clear it.
     4. The goods arrive, and the packing list and AWB are checked against the invoice.
     5. The customer's PI is generated with the configured bank details. Finance confirms the payment, and the order is packed, invoiced and released to the forwarder.
     6. The AWB/BL follow-up reminder fires, and the customer gets a shipment update that the AI drafted and Support approved.
     7. The tracker shows the whole trail and the time in each step, and the audit trail shows every action.
   - **E2E #2:** a new customer's Excel PO layout, then the AI's mapping proposal, then Support's approval, then the next PO imports with no code change.
   - **E2E #3:** segregation of duties and masking. A requester cannot approve their own SPR or release a payment they asked for, roles outside Finance see bank details masked, and every override is audited.
   - **The test plan's failure matrix:** a duplicate email or PO, a low-confidence extraction, a partial shipment, a price or currency mismatch, a quantity mismatch between the packing list and the invoice, a missing AWB/BL, a payment that never arrives, an approval that times out and escalates, Navision unavailable with a retry, and a bank-detail change.
   - **Success metrics:** Spectra's five measures, as lab estimates on synthetic data until the client gives baselines.

9. **Design thinking, GRS, assumptions and client questions.**
   - **Personas:** Product Manager, the approver, a Support executive, Warehouse, Finance, Logistics and Management.
   - **Journey maps** of today's sales and purchase flows and of the future flows, then the HMW statements.
   - **GRS:** extraction errors, payment fraud through changed bank details, segregation of duties, the confidentiality of prices and customers with AI, Navision write errors, and the AI's cost.
   - **Assumptions:** Navision is mocked; documents arrive by email; prices are in USD; customers pay in advance; staff keep posting in Navision.
   - **Questions for the briefing call** in the week of 2 Nov, prioritised:
     - Navision's version and interfaces;
     - how documents arrive, and how many per month;
     - whether the sales or the purchase flow is the pilot;
     - the PI sequence they flagged;
     - the approval rules and limits;
     - how payment is confirmed;
     - the forwarders, the AWB/BL formats and each country's import permits;
     - the costliest errors today, and baselines for their five measures;
     - where staff work (Outlook, Teams, Excel);
     - permission to use an AI service, and in which region;
     - one or two staff to try the prototype.

     Lead with three items to request: five to ten anonymised samples of each document type, a Navision export of items, customers and vendors, and the timeline of one real order.

10. **GitHub.**
    - Rewrite `scripts/github/backlog.mjs` for #11: epics A to G, stories with acceptance criteria, estimates and priorities, T-1 for the owners, T-2 for the briefing call with Spectra, and capacity-based sprint goals (S2: allocation and retarget; S3: briefing call and project plan; S4: UI prototype; S5: proposal).
    - Render the backlog and the wiki, then run the sync scripts. The milestones stay.

11. **Slides, diagrams and screenshots.** Retarget the proposal deck, regenerate every diagram (context, containers, data flow, the sales and purchase sequences, and the ER diagrams per area), and re-capture the screenshots.

12. **Team setup.** Check `AGENTS.md` against the repository and fix anything that is not true, then execute `docs/ai/prompts/004-team-ai-guide.md`.

## Finish

Run every check. Update the traceability matrix, the AI usage log and the build report (a prompt 006 section, with prompt 005 marked stopped and the reason). Summarise what changed per step, then list what only Richie can do:

- download Spectra's data folder whenever new files are shared, and never commit them;
- relay each owner's answer about their head start;
- make sure the teammates can reach the repository and the board.
