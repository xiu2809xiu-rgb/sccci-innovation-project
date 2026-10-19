# Design thinking

This folder records how the team grounds HuiTong 汇通 in the needs of Organisation E's HR and administration users (Problem Statement #17). It is the main evidence for module requirement **M1** (design thinking) and feeds **M2** (GRS by design). The matching rows are M1-02 to M1-06 in [`../requirements-traceability.md`](../requirements-traceability.md).

## Where the research stands (W1, 20 October 2026)

| Source                                                                                                                                                          | Status                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Problem Statement #17, verbatim, with our analysis                                                                                                              | Done: [`../problem-statement.md`](../problem-statement.md)                                                                                                |
| Desk research: Singapore PDPA and China PIPL rules for cross-border HR data; how SG and CN offices typically work with OA, HR software, SAP, Teams and DingTalk | Done. Regulatory points are in [`../grs/grs-by-design.md`](../grs/grs-by-design.md)                                                                       |
| Interviews, walkthroughs and artefacts from Organisation E                                                                                                      | **Not started.** The first client meeting is planned for W2 or W3. The agenda is [`../client/questions-for-client.md`](../client/questions-for-client.md) |

Everything in this folder so far comes from the problem statement and desk research. The personas are proto-personas, the journey times are assumed baselines and the quotes are illustrative. Each assumption is logged in [`../assumptions.md`](../assumptions.md) and will be confirmed or replaced after the client meeting. Every artefact carries one of three labels:

| Label                | Meaning                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Assumed**          | From the problem statement or desk research only                                                                       |
| **Partly validated** | Confirmed by the client in conversation, not yet backed by an artefact or a measurement                                |
| **Validated**        | Backed by evidence: a walkthrough, a client artefact (field names, category lists, a template layout) or a measurement |

## Process mapped to the semester

We follow the five design-thinking stages. They overlap and loop: each test result goes back into Define before the next build increment. We treat PS #17 as allocated ahead of the formal allocation in W2 (26 October 2026).

| Stage     | Weeks          | What we do                                                                                                                                                                                                                                                                                                   | Outputs                                                                                                          |
| --------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Empathise | W1–W3          | W1: desk research on PS #17. W2 or W3: first client meeting, with an interview, a walkthrough and an artefact review (plan below)                                                                                                                                                                            | [personas.md](personas.md); anonymised notes in `docs/client/`                                                   |
| Define    | W3             | Replace assumed pain points, stage times and baselines with what we learnt. Re-score the HMW statements. The W3 project plan follows from the prioritised HMWs                                                                                                                                               | [journey-maps.md](journey-maps.md), [how-might-we.md](how-might-we.md), [success-metrics.md](success-metrics.md) |
| Ideate    | W3–W4          | Generate options for each prioritised HMW, for example API, scheduled export or RPA for each connector, and webhook or polling for OA. Judge them on user value, GRS and feasibility, and record decisions as ADRs                                                                                           | [hypotheses.md](hypotheses.md); [`../adr/`](../adr/README.md)                                                    |
| Prototype | W4–W12         | W4: high-fidelity UI prototype on synthetic data. W5: proposal presentation. W8–W12: working increments, built with AI-assisted coding, one per ownership area                                                                                                                                               | Prototype screens; the working app                                                                               |
| Test      | W4–W5, W13–W19 | W4–W5: prototype walkthrough with the client and moderated tasks with proxy users. W13: technical review. W14–W16: in-product evidence from observability (W14), clickstream analytics (W15) and AI token usage tracking (W16). W18: results against targets at the final presentation. W19: client check-in | Hypothesis status in [hypotheses.md](hypotheses.md); measured values in [success-metrics.md](success-metrics.md) |

## Plan for the first client session

- **Goal:** test the riskiest assumptions first, which are the [top five hypotheses](hypotheses.md#the-top-five-to-test-first).
- **Participants:** the Organisation E HR professional behind PS #17. If possible, also a hiring manager, an admin colleague, an HQ HR counterpart and an IT contact who knows the system interfaces.
- **Format (60–90 minutes, online):** context (10 min), then a walkthrough of one recent manpower request and one monthly consolidation (30 min), then prioritised questions (30 min), then how they will judge success and next steps (10 min).
- **Methods:**
  - a semi-structured interview
  - a contextual walkthrough by screen share, with dummy or redacted values
  - an artefact review (field names, category lists, template layouts)
  - the participant ranks the [pain points](journey-maps.md#pain-point-register) by what they cost
- **Data handling:** PS #17 says the project needs company data. We ask for structure, not records: field names, category lists, template layouts, volumes and timings. We do not copy or store real employee data, and HuiTong runs on synthetic data only ([A-31](../assumptions.md)). Notes are anonymised and kept in this private repository. We record a session only with explicit consent.
- **Afterwards:** within two working days, update the personas, journeys, HMW scores, hypotheses and baselines, change their labels, and record the answers in [`../assumptions.md`](../assumptions.md).

## Files

| File                                     | What it contains                                                                                                                                               | Status            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| [personas.md](personas.md)               | Proto-personas Tan Mei Ling (SG HR), Zhou Xinyi 周欣怡 (China HQ HR) and Arjun Menon (hiring manager); secondary roles; validation plan                        | Assumed           |
| [journey-maps.md](journey-maps.md)       | Current and future state for a manpower request to day-1 onboarding and for the monthly attendance and leave consolidation; pain-point register PP-01 to PP-14 | Assumed           |
| [how-might-we.md](how-might-we.md)       | 14 HMW statements in six themes, each traced to pain points; scoring; the five we design for                                                                   | Assumed           |
| [hypotheses.md](hypotheses.md)           | Problem (PH) and solution (SH) hypotheses with signals and validation methods; impact × uncertainty ranking; the top five to test first                        | Untested          |
| [success-metrics.md](success-metrics.md) | Success metrics SM-01 to SM-09 and guardrails GR-01 to GR-09: definition, formula, data source, baseline, target, persona and requirement                      | Baselines assumed |

## How the pieces connect

PS #17 barrier → pain point (PP) → How might we (HMW) → hypothesis (PH, SH) → capability (A to G) and ownership area → success metric (SM) or guardrail (GR) → evidence row in [`../requirements-traceability.md`](../requirements-traceability.md).

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

In running text a capability is written as "capability D", so it cannot be mistaken for an assumption id.

All people named in these files are synthetic. They are also HuiTong's seeded demo users, so a walkthrough or a prototype test can be run as the persona, with the matching role.

## Change log

| Date            | Week | Change                                       |
| --------------- | ---- | -------------------------------------------- |
| 20 October 2026 | W1   | First version, from PS #17 and desk research |
