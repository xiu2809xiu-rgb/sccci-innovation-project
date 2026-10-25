# Design thinking

This folder records how the team grounds HuiTong 汇通 in the needs of ASPRI-IPI's assessors, operations staff and training managers (Problem Statement #5, the team's first choice). It is the main evidence for module requirement **M1** (design thinking) and feeds **M2** (GRS by design). The matching rows are M1-02 to M1-06 in [`../requirements-traceability.md`](../requirements-traceability.md).

## Where the research stands (W1, 24 October 2026)

| Source                                                                                                                                                                                                      | Status                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The brief for Problem Statement #5, summarised in our own words, with our analysis                                                                                                                          | Done: [`../problem-statement.md`](../problem-statement.md)                                                                                                        |
| Desk research: Singapore PDPA and the PDPC's NRIC guidelines for trainee data; how training providers record practical assessments and submit results to MOM, SSG/WSDA and ITE; offline web apps on tablets | Done. Regulatory points are in [`../problem-statement.md`](../problem-statement.md#24-constraints) and the GRS design                                             |
| Interviews, walkthroughs and artefacts from ASPRI-IPI                                                                                                                                                       | **Not started.** The briefing call is in the week of 2 November 2026 (W3). The agenda is [`../client/questions-for-client.md`](../client/questions-for-client.md) |

Everything in this folder so far comes from the brief and desk research. The team worked on two earlier statements and moved to #5 on 24 October 2026 ([ADR 0023](../adr/0023-retarget-ps5-aspri-ipi.md)). The personas are proto-personas, the journey times come from the brief's shares and our arithmetic, and the quotes are illustrative. Each assumption is logged in [`../assumptions.md`](../assumptions.md) and will be confirmed or replaced after the briefing call. Every artefact carries one of three labels:

| Label                | Meaning                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Assumed**          | From the brief or desk research only                                                                                     |
| **Partly validated** | Confirmed by the client in conversation, not yet backed by an artefact or a measurement                                  |
| **Validated**        | Backed by evidence: a walkthrough, a client artefact (a checklist, a TMS export, a submission template) or a measurement |

## Process mapped to the semester

We follow the five design-thinking stages. They overlap and loop: each test result goes back into Define before the next build increment.

| Stage     | Weeks          | What we do                                                                                                                                                                                                                                                                                                                                                                      | Outputs                                                                                                          |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Empathise | W1–W3          | W1: desk research. W3: the briefing call with ASPRI-IPI, with an interview, a walkthrough of one run and an artefact review (plan below)                                                                                                                                                                                                                                        | [personas.md](personas.md); anonymised summaries in `docs/client/`                                               |
| Define    | W3             | Replace assumed pain points, stage times and baselines with what we learnt. Re-score the HMW statements. The W3 project plan follows from the prioritised HMWs                                                                                                                                                                                                                  | [journey-maps.md](journey-maps.md), [how-might-we.md](how-might-we.md), [success-metrics.md](success-metrics.md) |
| Ideate    | W3–W4          | Generate options for each prioritised HMW, for example an API, an import file or a generated upload for each agency, and how long the checklist must work offline. Judge them on user value, GRS and feasibility, and record decisions as ADRs                                                                                                                                  | [hypotheses.md](hypotheses.md); [`../adr/`](../adr/README.md)                                                    |
| Prototype | W4–W12         | W4: high-fidelity UI prototype on synthetic data, the tablet checklist included. W5: proposal presentation. W8–W12: working increments, built with AI-assisted coding, one per ownership area                                                                                                                                                                                   | Prototype screens; the working app                                                                               |
| Test      | W4–W5, W13–W19 | W4–W5: prototype walkthrough with the client and moderated tasks, ideally with an assessor and an operations executive (Q-63), otherwise proxy users. W13: technical review. W14–W16: in-product evidence from observability (W14), clickstream analytics (W15) and AI token usage tracking (W16). W18: results against targets at the final presentation. W19: client check-in | Hypothesis status in [hypotheses.md](hypotheses.md); measured values in [success-metrics.md](success-metrics.md) |

## Plan for the briefing call

- **Goal:** test the riskiest assumptions first, which are the [top five hypotheses](hypotheses.md#the-top-five-to-test-first).
- **Participants:** ideally an assessor, an operations executive, a training manager and an IT contact who knows the TMS and the portals.
- **Format (60–90 minutes, online):** context (10 min), then a walkthrough of one recent run from the checklist to the submissions, with dummy values (30 min), then prioritised questions (30 min), then how they will judge success and next steps (10 min).
- **Methods:**
  - a semi-structured interview
  - a contextual walkthrough by screen share, with dummy or redacted values
  - an artefact review (sample checklists, a TMS export's headers, a submission template)
  - the participants rank the [pain points](journey-maps.md#pain-point-register) by what they cost
- **Data handling:** the brief says sample data, if any, comes through the team's data folder. We ask for structure, not records: checklists, field names, code lists, templates, volumes and timings. We do not copy or store real trainee data, samples stay out of the repository, and HuiTong runs on synthetic data only ([A-31](../assumptions.md)). The repository is public, so meeting notes stay outside it; only anonymised summaries that hold nothing confidential are committed. We record a session only with explicit consent.
- **Afterwards:** within two working days, update the personas, journeys, HMW scores, hypotheses and baselines, change their labels, and record the answers in [`../assumptions.md`](../assumptions.md).

## Files

| File                                     | What it contains                                                                                                                                                                                                             | Status                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [personas.md](personas.md)               | Proto-personas Hafiz Rahman (assessor), Joanne Lim (operations executive), Priya Nair (training manager) and Ronald Seah (head of training operations); the trainee as a secondary persona; secondary roles; validation plan | Assumed                                    |
| [journey-maps.md](journey-maps.md)       | Current and future state for a run from the training ground to the agencies (D), a course's rules changing (E) and a rejected submission (F); pain-point register PP-16 to PP-26                                             | Assumed                                    |
| [how-might-we.md](how-might-we.md)       | 11 HMW statements in six themes (HMW-16 to HMW-26), each traced to pain points; scoring; the six we design for                                                                                                               | Assumed                                    |
| [hypotheses.md](hypotheses.md)           | Problem (PH-08 to PH-13) and solution (SH-09 to SH-15) hypotheses with signals and validation methods; impact × uncertainty ranking; the top five to test first                                                              | Untested                                   |
| [success-metrics.md](success-metrics.md) | Success metrics SM-12 to SM-20 with SM-06, SM-08 and SM-09, and guardrails GR-01 to GR-10: definition, formula, data source, baseline, target, persona and requirement; the measurement protocol                             | Baselines from the brief, the rest assumed |

## How the pieces connect

Pain point in the brief → pain point (PP) → How might we (HMW) → hypothesis (PH, SH) → capability (A to G) and ownership area → success metric (SM) or guardrail (GR) → evidence row in [`../requirements-traceability.md`](../requirements-traceability.md).

## Conventions

| Id                | Meaning                             | Defined in                                                                                                                                                               |
| ----------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PP-nn             | Pain point                          | [journey-maps.md](journey-maps.md#pain-point-register)                                                                                                                   |
| HMW-nn            | How-might-we statement              | [how-might-we.md](how-might-we.md)                                                                                                                                       |
| PH-nn, SH-nn      | Problem and solution hypotheses     | [hypotheses.md](hypotheses.md)                                                                                                                                           |
| SM-nn, GR-nn      | Success metric and guardrail metric | [success-metrics.md](success-metrics.md)                                                                                                                                 |
| A-nn, Q-nn, R-nn  | Assumption, client question, risk   | [`../assumptions.md`](../assumptions.md), [`../client/questions-for-client.md`](../client/questions-for-client.md), [`../grs/grs-by-design.md`](../grs/grs-by-design.md) |
| M1 to M6          | Module requirements                 | [CLAUDE.md](../../CLAUDE.md) section 2                                                                                                                                   |
| Capability A to G | Product capabilities                | [CLAUDE.md](../../CLAUDE.md) section 4                                                                                                                                   |

In running text a capability is written as "capability D", so it cannot be mistaken for an assumption id. Ids are never renumbered or reused: a new item takes the next free id. The #5 items start at PP-16, HMW-16, PH-08, SH-09, SM-12 and GR-10, with journeys D to F; the earlier statements' items are kept in the tag `archive/ps7-lesso-solar`, except SM-06, SM-08, SM-09 and GR-01 to GR-09, which still hold and are reworded for #5.

All people named in these files are synthetic. They become HuiTong's seeded demo users when the #5 roles reach the code, so a walkthrough or a prototype test can be run as the persona, with the matching role.

## Change log

| Date                  | Week | Change                                                                                                                                                                                                                                                            |
| --------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 20 to 22 October 2026 | W1   | Versions for the earlier statements; they are kept in the tag `archive/ps7-lesso-solar`                                                                                                                                                                           |
| 24 October 2026       | W1   | Retargeted to statement #5, ASPRI-IPI ([ADR 0023](../adr/0023-retarget-ps5-aspri-ipi.md)): new personas, journeys D to F, HMW-16 to HMW-26, PH-08 to PH-13 and SH-09 to SH-15, SM-12 to SM-20 and GR-10, with the metrics and guardrails that still hold reworded |
