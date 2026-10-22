# How might we

How-Might-We (HMW) statements turn the pain points in [journey-maps.md](journey-maps.md#pain-point-register) into design questions. They are broad enough to allow more than one answer and narrow enough to act on.

**Status: Assumed.** Scores are the team's estimates and are re-scored after the briefing call.

## The statements

### Theme 1: data consistency

| ID     | How might we ...                                                                                        | Pain points  |
| ------ | ------------------------------------------------------------------------------------------------------- | ------------ |
| HMW-01 | give management a single view across INFO-TECH, SAP and the intranet without replacing any system?      | PP-09, PP-10 |
| HMW-02 | surface every disagreement between systems with the sources side by side, so HR resolves it in minutes? | PP-09        |
| HMW-03 | let each fact be entered once, at its source, and flow everywhere it is allowed to go?                  | PP-01        |

### Theme 2: workflow hand-offs

| ID     | How might we ...                                                                                                                | Pain points  |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| HMW-04 | let one new-hire entry reach SAP and INFO-TECH, and then the intranet, in the order the rules require, with nobody carrying it? | PP-01, PP-02 |
| HMW-05 | show hiring managers where a hire stands without them having to ask?                                                            | PP-03, PP-12 |
| HMW-06 | make sure the laptop, desk, accounts and intranet access are ready before day 1?                                                | PP-04        |
| HMW-15 | route only the claims and payments that need it to HQ Treasury, and show everyone where each one stands?                        | PP-15        |

### Theme 3: the single view

| ID     | How might we ...                                                                                                   | Pain points  |
| ------ | ------------------------------------------------------------------------------------------------------------------ | ------------ |
| HMW-07 | turn differently structured feeds into management's dashboards and summaries without anyone reformatting a column? | PP-05, PP-06 |
| HMW-08 | map leave categories once, approve the rules, and reuse them every month with confidence?                          | PP-07        |
| HMW-09 | get the monthly management summary out on the day the month closes?                                                | PP-08, PP-13 |

### Theme 4: cross-border trust

| ID     | How might we ...                                                                                      | Pain points |
| ------ | ----------------------------------------------------------------------------------------------------- | ----------- |
| HMW-10 | share with each side only the fields it may hold, and make that visible to the people using the data? | PP-11       |
| HMW-11 | show compliance who saw or changed what, when and why, without extra work for HR?                     | PP-11       |

### Theme 5: reuse by other companies

| ID     | How might we ...                                                                                                | Pain points  |
| ------ | --------------------------------------------------------------------------------------------------------------- | ------------ |
| HMW-12 | connect another Chinese company in Singapore in a day instead of weeks, through configuration rather than code? | PP-14, PP-05 |

### Theme 6: AI assistance with human control

| ID     | How might we ...                                                                                | Pain points  |
| ------ | ----------------------------------------------------------------------------------------------- | ------------ |
| HMW-13 | let AI take on the tedious field mapping while HR keeps every decision?                         | PP-05, PP-14 |
| HMW-14 | explain a discrepancy between systems in plain English or 中文 so either HR team can act on it? | PP-09, PP-12 |

## Scoring

Each statement is scored 1 (low) to 5 (high) on four criteria. Priority = impact × reach × feasibility × evidence; the six highest are the ones the PoC is designed around.

| ID     | Impact | Reach (how often, how many) | Feasible this semester | Evidence in the brief | Priority |
| ------ | ------ | --------------------------- | ---------------------- | --------------------- | -------- |
| HMW-01 | 5      | 5                           | 4                      | 5                     | **500**  |
| HMW-02 | 4      | 4                           | 4                      | 4                     | 256      |
| HMW-03 | 5      | 4                           | 3                      | 5                     | 300      |
| HMW-04 | 5      | 4                           | 5                      | 5                     | **500**  |
| HMW-05 | 3      | 3                           | 5                      | 3                     | 135      |
| HMW-06 | 4      | 3                           | 4                      | 3                     | 144      |
| HMW-07 | 5      | 5                           | 4                      | 5                     | **500**  |
| HMW-08 | 4      | 5                           | 5                      | 4                     | 400      |
| HMW-09 | 4      | 3                           | 4                      | 4                     | 192      |
| HMW-10 | 5      | 4                           | 4                      | 5                     | **400**  |
| HMW-11 | 4      | 3                           | 5                      | 4                     | 240      |
| HMW-12 | 5      | 3                           | 4                      | 5                     | **300**  |
| HMW-13 | 4      | 3                           | 4                      | 4                     | 192      |
| HMW-14 | 3      | 3                           | 4                      | 3                     | 108      |
| HMW-15 | 4      | 3                           | 5                      | 5                     | **300**  |

HMW-08 (400) and HMW-03 (300) score as high as some of the chosen six, but they are delivered inside HMW-07 and HMW-01 respectively, so they are not separate design targets.

## The six we design for

| Priority HMW                      | Our answer                                                                                                                                                          | Capability | Area                                 | Measured by         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------ | ------------------- |
| HMW-01 one trusted record         | Canonical employee master with per-field source of truth, provenance and a conflict queue (covers HMW-02 and HMW-03)                                                | B          | 1                                    | SM-02, SM-05        |
| HMW-04 one entry, the right order | One new-hire entry creates a draft record, then the SAP and INFO-TECH records after an approved preview, then intranet access, idempotently (covers HMW-05, HMW-06) | A, C       | 1 (connectors), 2 (workflow)         | SM-03, SM-04, SM-10 |
| HMW-07 feeds into the single view | Connectors for every source, approved mapping rules, validation, dashboards and the management summary (covers HMW-08 and HMW-09)                                   | A, D       | 1 (connectors), 3                    | SM-01, SM-07        |
| HMW-10 share only what is allowed | Field-level masking by role and entity, data-classification badges, cross-border transfer register, append-only audit (covers HMW-11)                               | F          | 1 (baseline), 4                      | GR-03, GR-04, SM-08 |
| HMW-12 another company in a day   | Connector framework, a tenant configuration and the AI schema-mapping assistant with confidence scores and an approval step (covers HMW-13)                         | A, E       | 1                                    | SM-06, SM-09, GR-01 |
| HMW-15 Treasury when it matters   | A configurable threshold routes claims and payments above it to an HQ Treasury approval step, with the status on the workflow board                                 | C          | 2 (with area 1's intranet connector) | SM-11, GR-06        |

HMW-14 (discrepancy explainer) is delivered as a smaller AI feature in area 1 ([A-45](../assumptions.md)). Each answer becomes a solution hypothesis in [hypotheses.md](hypotheses.md).
