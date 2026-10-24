# Prompt 005: Retarget the project to Problem Statement #5, ASPRI-IPI

On 23 Oct 2026 LESSO Solar withdrew from this round, so statement #7 is gone. The team resubmitted its choices with **#5 ASPRI-IPI** first, then #4 CLA Asia and #11 Spectra Innovations. The final allocation is announced on 26 Oct; the team expects #5 and starts now. **If Richie tells you the allocation is not #5, stop after the step you are on.**

Keep the repository, its history and the platform. Retarget everything that is specific to LESSO Solar or to HR, so that `main` reads as a #5 project from end to end.

## How to work

- **Prompt 003 is cancelled.** Your unfinished data-formats work on `docs/area1-data-formats`: commit it to that branch as it is and push the branch, so nothing is lost, but do not open a pull request for it. Then start from the latest `main`.
- **Keep the old state reachable.** Before step 1, tag the current `main` as `archive/ps7-lesso-solar` and push the tag. Nothing is deleted from history.
- **Azri's work comes first.** Richie reviews and merges Azri's pull request #147 (`feat/area2-state-machine`) before you start. His state machine is definition-driven and carries over to #5 as it is, so keep the `workflows` module name and never change his code.
- **Respect the owners.** Area 2 is Azri's, area 3 Iok Teck's and area 4 Angelyn's ([AGENTS.md](../../../AGENTS.md)). A change inside their folders goes in its own pull request with that owner as reviewer, and only as step 6 allows.
- **The usual flow:** a branch per step (split the bigger steps), Conventional Commits, pull requests that you open and merge with green checks, ADRs for decisions, a row per step in the AI usage log, and no AI attribution anywhere.
- **Public repository:** never commit ASPRI's documents, sample data or anything from the data folder. Summarise the brief in our own words.
- **Edit, don't rebuild.** Keep the generic modules and their names (`connectors`, `mapping`, `workflows`, `reports`, `governance`, `audit`, `analytics`, `ai`). Rename only what would mislead a reader of a #5 project, such as `employees` (area 1's, rename freely) or `attendance-leave` (area 3's, only if Iok Teck agrees in step 6).

## The brief, in our own words

- **The client.** ASPRI-IPI is the training arm of the Association of Process Industry. It runs about 40 assessment runs a week with more than 30 trainers and assessors, and assesses 2,000 to 2,400 trainees a month. About 80% of its courses are WSQ (half of those MOM-regulated) and 20% are ITE courses.
- **Today.** Practical assessments are observed in real training environments. Assessors tick paper checklists, work out each trainee's competency by hand from the detailed criteria, and re-type the results into the Training Management System (TMS). Operations staff check the TMS entries against the paper records, and the results are then submitted to government portals: MOM (AMS), SSG/WSDA and ITE (STEP). Some portals have no API.
- **Where the effort goes.** Consolidation and TMS entry take about 60% of the post-assessment effort, portal submissions 20%, verification 10%, rework 5% and filing 5%. At about one hour per run, that is roughly 2,000 assessor hours a year before verification and submission.
- **What a good solution does.** Assessors record results on tablet-based digital checklists during the assessment. Competency is calculated automatically from each course's assessment rules. Results flow straight into the TMS, which becomes the single source of truth. Submissions go through an agency's API where one exists, and otherwise as agency-specific submission files.
- **Priorities.** Capture, competency rules and the TMS output first, because that is where most of the time is lost. Generating submission files is the safer route where a portal has no API.
- **Next step.** A briefing call in the week of 2 Nov 2026. Sample data, if any, arrives through the team's data folder.

## Changes to make

1. **Archive, decide and reframe.**
   - ADR 0023: the client's withdrawal, why #5 (it is the statement closest to the platform: data entered once and carried into a system of record, with files where a system has no API), what carries over, what changes, and what was cancelled from prompt 003. Older material stays in the `archive/ps7-lesso-solar` tag, so the current docs keep no LESSO appendix: only ADRs 0022 and 0023, the AI usage log and the build report mention it.
   - Rewrite the README, CLAUDE.md sections 1, 3 and 4, and `docs/problem-statement.md` for #5.
   - Until the allocation is confirmed, write that #5 is the team's first choice, not that it was allocated.

2. **Product scope** (CLAUDE.md section 4, capabilities A to G):
   - **A. Connector hub:** the TMS, the agencies (an API where one exists, otherwise a generated file delivered to the portal), and Excel/CSV import through the mapping engine.
   - **B. Master data:** trainees, assessors, courses and course runs, with each field's source of truth and its history.
   - **C. Assessment capture and verification:** the tablet checklist, which keeps working through a dropped connection and syncs afterwards; the run's lifecycle from planned to submitted; operations' verification queue; corrections with a reason; SLA reminders.
   - **D. Competency, submissions and insights:** course-specific rules (criteria, critical items, outcomes), automatic competency calculation, agency submission files rendered from templates, and dashboards for management and operations.
   - **E. AI with a human in the loop:** an assistant that drafts a course's rules from its assessment plan for a training manager to approve (the mapping assistant's pattern), the existing mapping assistant for TMS and agency layouts, and a verification assistant that flags unusual records for operations to review. AI never changes a result.
   - **F. Governance:** RBAC, a tamper-evident audit trail of every result and correction, PDPA for trainee data, classification and retention, and a per-agency field allowlist that denies by default (reuse the cross-entity allowlist mechanism).
   - **G. Monitoring and analytics:** unchanged.
   - **Roles:** `ASSESSOR`, `OPERATIONS`, `TRAINING_MANAGER`, `MANAGEMENT`, `AUDITOR` and `SYSTEM_ADMIN`, replacing the HR roles.
   - **Data rules:** synthetic data only, and still no national ID numbers. Real submissions need trainees' ID numbers, so record that as an assumption and a client question, and use internal trainee IDs.
   - **Languages:** keep English and 中文 for now, and confirm at the briefing call.

3. **The areas.** Update CLAUDE.md, `docs/team/module-ownership.md` (owners as below, backups TBD) and the area guides. Rename a guide's file if its old name would mislead, and fix every link.
   - **Area 1, Richie: integration core and platform.** The connectors (TMS, agency APIs, and delivery of agency files with their submission status), master data, the mapping engine and its AI assistant, the per-agency allowlist enforcement, the tenant configuration (another training provider joins by configuration) and the platform.
   - **Area 2, Azri: assessment capture and verification.** The tablet checklist with offline sync, the run's state machine (his #147 is its core), the verification queue, corrections, SLA reminders and notifications.
   - **Area 3, Iok Teck: competency, submissions and insights.** Course rules, competency calculation, the rule-drafting assistant (through the `LlmGateway`), agency file rendering, and the dashboards and insights.
   - **Area 4, Angelyn: governance, security and monitoring.** As before, with the audit readiness, PDPA, retention and allowlist administration that assessment data needs, plus observability, clickstream, AI cost and the AWS deployment.

4. **Mocks and synthetic data.** Replace `mock-sg-hr`, `mock-cn-hq` and `mock-oa` with:
   - `mock-tms`: courses, runs, trainees and results through an API and CSV exports;
   - an agency API mock, with asynchronous acknowledgement;
   - an agency portal mock that accepts the MOM and ITE submission files and returns a validation report.

   Generate synthetic courses from the process industry, with their criteria, and synthetic trainees, assessors and runs at realistic volumes. Document every assumed format in `docs/data-formats.md`, to confirm at the briefing call. Keep every "Mock" label.

5. **Area 1 in code.**
   - The connectors and submission tracking.
   - Master data, matching trainees on the TMS trainee ID and never on names alone.
   - The mapping engine for TMS exports and agency templates.
   - The per-agency allowlist and the tenant configuration.
   - The overview page and the 3D integration map, showing assessment to TMS to agencies.

6. **Areas 2 to 4.**
   - Rewrite each area's guide for #5: its scope, what its folders hold today, what the owner changes first, and its interfaces and stories.
   - Make additive changes to the shared contracts.
   - Then ask Richie, one area at a time, whether the owner wants you to rework the head start for #5 (scaffolding, models, contracts, typed sample data, screens and test skeletons) or will do it themselves. If they want you to, do it in one pull request per area, with the owner as reviewer, and never touch the owner's own code. If not, leave the folder alone.

7. **Hero journey and tests.**
   - **E2E #1:** an assessor records a run on a tablet (one record syncs after a dropped connection), the competency is calculated, operations verifies it and corrects one result with a reason, the results reach the TMS mock, and one agency gets them through its API while another gets a validated file. The dashboard shows the status, and the audit trail shows every step.
   - **E2E #2:** a new course's assessment plan, then the AI's draft rules (with the "Mock AI" badge), then a training manager's approval, then the next run uses them with no code change.
   - **E2E #3:** an agency receives only its allowlisted fields, and the denial is audited.
   - Update the test plan's failure matrix: offline conflicts, duplicate submissions, a rule change in the middle of a run, a correction after verification, a rejected file, and the TMS being down.
   - Update the success metrics, labelled as lab estimates on synthetic data.

8. **Design thinking, GRS, assumptions and client questions.**
   - Personas: assessor, operations executive, training manager and management, with the trainee as a secondary persona.
   - Journey maps of today's paper flow and the future flow.
   - HMW statements, and success metrics with the one-hour-per-run baseline.
   - GRS: PDPA, audit readiness, data on tablets, and AI with a human in the loop.
   - The assumptions, and a prioritised question list for the briefing call. Lead with three items to request: sample checklists for two or three courses with their rules, a TMS export, and one submission example per agency.

9. **GitHub.**
   - Rewrite `scripts/github/backlog.mjs` for #5: epics A to G, stories with acceptance criteria, estimates and priorities, T-1 for the owners, T-2 for the briefing call with ASPRI-IPI, and the sprint goals.
   - Render the backlog and the wiki.
   - Rename the area labels so issues keep them, and update the board's Area field, the issue forms and the pull request template.
   - Close the LESSO-only open issues as "not planned", with a comment linking ADR 0023; never delete an issue.
   - Run the sync scripts. The milestones stay.

10. **CI and Docker.** Same pipeline and the same required check names. Update compose, the Dockerfiles, the Trivy scan list and the end-to-end run for the new mocks, and keep every check green.

11. **Slides, diagrams and screenshots.** Retarget the proposal deck, regenerate every diagram (context, containers, data flow, sequences, and the ER diagrams per area), and re-capture the screenshots.

12. **Team setup.** Update `AGENTS.md` (areas, paths, labels and examples), then execute `docs/ai/prompts/004-team-ai-guide.md`.

## Finish

Run every check. Update the traceability matrix, the AI usage log and the build report (a prompt 005 section, with prompt 003 marked cancelled). Summarise what changed per step, then list what only Richie can do:

- download ASPRI's data folder once it is shared and connect it here, without ever committing it;
- relay each owner's answer about their head start;
- make sure the teammates can reach the repository and the board.
