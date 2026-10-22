# Prompt 003: Align the project with the final statement (#7, LESSO Solar)

The team has been allocated the renumbered statement **#7, Lessosolar**, which replaces old #17 (Organisation E). The final brief names the real client and its systems, so the repo must stop describing an anonymous financial-services company. Update everything to match the brief below.

## How to work

- **When:** finish the task you are on first.
- **Branches:** use the usual branch-per-task and PR flow from `docs/agile/working-agreement.md`. Split the work into sensible PRs: docs, mocks and data, UI, backlog.
- **Edit, don't rebuild:** keep what already works and change only what the brief changes. Record significant decisions in ADRs and log the work in `docs/ai/ai-usage-log.md`.
- **Public repository:**
  - Do **not** commit the original brief PDF or any client sample data. Sample data will arrive later through the team's data folder.
  - Summarise the brief in our own words, quoting only its short requirement lines.
  - Do not add LESSO's logo or brand assets until the client gives permission.

## The final brief (summary)

### The client
LESSO Solar is the solar division of LESSO Group, a Hong Kong-listed building-materials manufacturer, with a regional hub in Singapore. Like many Chinese companies expanding overseas, it keeps its China HQ systems while using local HR and finance tools for Singapore compliance.

### The challenge
| Side | Systems |
|---|---|
| Singapore | **INFO-TECH** for employee records, leave and payroll |
| China HQ | a **customised SAP**, plus an **intranet** for news, policies, claims and approvals |

Two rules from the brief:
- A new employee must be **created in HQ's SAP before they get intranet access**.
- Some payments need **extra HQ Treasury approval**.

The same employee and transaction data is entered in several systems.

### What a good solution does
- Integrates or consolidates data across the local and HQ systems.
- Provides a single view of relevant information, with dashboards and insights.
- Minimises duplicate data entry.
- Could be reused by other Chinese companies operating in Singapore.

### Good to know
- **Suggested starting point:** prove one flow, for example onboarding a new hire into both systems, using mock data exports.
- **Possible extension:** a Lark/Feishu or DingTalk connector.
- **Next step:** a briefing call with the company in the week of **2 Nov 2026**. Sample data, where available, comes through the team's data folder.

## Changes to make

1. **Naming everywhere.**
   - Problem Statement #17 → **#7**.
   - Organisation E / financial services → **LESSO Solar (solar / renewable energy, part of LESSO Group)**.
   - Remove the financial-services-only material: the MAS TRM references and the bank/finance-regulator framing. PDPA and PIPL stay.
   - Files to cover: CLAUDE.md, the README, `docs/problem-statement.md` (rewrite to the brief; keep the old #17 analysis in a short "superseded" appendix), personas, journey maps, GRS, assumptions, traceability, ADRs where relevant, the BUILD_REPORT, i18n copy and seed text.

2. **Systems and mocks.**
   - `mock-sg-hr` becomes an **INFO-TECH-like** mock (employee records, leave, payroll), with an INFO-TECH-style export format.
   - `mock-cn-hq` stays the **customised SAP** mock.
   - `mock-oa` becomes the **HQ intranet** mock: news, policies, claims and approvals, with signed webhooks.
   - Add a **Lark/Feishu** notification adapter as a mocked, labelled extension next to DingTalk.
   - Keep every "Mock" label.

3. **Onboarding flow = the hero journey.** Rework `docs/agile/hero-journey.md` around the brief's suggested flow: a new hire is onboarded into **both** INFO-TECH and SAP from one entry, with the rule that the **SAP record exists before intranet access is granted**.
   - The draft-to-active rule still applies.
   - Writing to the mocks is allowed and must be labelled. Writing to real systems stays out of scope until the client approves it.
   - Keep E2E #2 (a new company or entity's export mapped by AI with HR approval) and E2E #3 (refused fields).

4. **Claims and payments.** Add HQ Treasury approval as a workflow requirement: a claim or payment above a configurable threshold needs an extra Treasury approval step. It belongs to area 2.

5. **Reshape the ownership areas.** Keep the four areas and their owners, but update their scope in `docs/team/module-ownership.md`, CLAUDE.md and the area guides:
   - **Area 1, Integration core:** connectors for INFO-TECH, SAP, the intranet and Lark/DingTalk. Otherwise unchanged.
   - **Area 2, Onboarding and approval workflows:** the new-hire flow into both systems with the SAP-before-intranet rule; claims and payments with the HQ Treasury step; SLA reminders; notifications.
   - **Area 3, Single view, dashboards and insights:** the consolidated cross-system view the brief asks for, including leave and payroll summaries from INFO-TECH, data-consistency and duplicate-entry metrics, and management insights. Leave consolidation becomes one part of this area, not its whole scope.
   - **Area 4, Governance, security and monitoring:** unchanged.

6. **Reuse by other Chinese companies.** Reframe the "new subsidiary" story as "another Chinese company in Singapore joins". Add a small **tenant configuration**: company name, connector set, field mappings and theme tokens. This makes reuse concrete and lets the UI take a client's colours later without code changes. Do not add a LESSO theme yet.

7. **Client questions and assumptions.**
   - Mark the questions the brief now answers (the SG HR product, the HQ system, the intranet's role) and update the assumptions they settle.
   - Re-prioritise for the **week-of-2-Nov briefing call**. Add:
     - INFO-TECH's export and API options.
     - The exact onboarding steps and order across INFO-TECH, SAP and the intranet.
     - Which payments need HQ Treasury approval, and the threshold.
     - Whether they use Lark/Feishu or DingTalk.
     - Permission to use their brand in the prototype.
     - Whether 1–2 HR staff could try the prototype.

8. **Data and document formats.** Until the client's sample exports arrive, make the mocks emulate realistic formats. Record every format as an assumption to confirm at the briefing call.
   - **INFO-TECH:** spreadsheet-style CSV/Excel exports for employees, leave and payroll, with English headers and Singapore date formats.
   - **SAP:** CSV/Excel exports with Chinese or SAP-coded headers and `YYYY/MM/DD` dates, possibly GBK/GB18030-encoded.
   - **Intranet:** claim and approval records as JSON events (signed webhooks) and as Excel exports.
   - **Import path:** every importer reads the documented format through the existing mapping engine, so a real export can replace a mock one with only a mapping change.
   - **Sample folder:** add `docs/data-formats.md`, with one table per system: file type, encoding, key fields, date format, the mock that emulates it, and the open questions. Add an empty `samples/` convention that is git-ignored, for when the real exports arrive through the team's data folder. Real sample data is never committed.

9. **Backlog and timeline.** Update `scripts/github/backlog.mjs` (not the generated markdown):
   - The client meeting moves to the week of 2 Nov.
   - Add stories for the INFO-TECH and intranet mocks, the Treasury approval step, the Lark adapter, tenant configuration and the dashboards.

## Finish

Run every check, update the traceability matrix and the BUILD_REPORT, and summarise what changed per item.
