# How might we

How-Might-We (HMW) statements turn the pain points in [journey-maps.md](journey-maps.md#pain-point-register) into design questions. They are broad enough to allow more than one answer and narrow enough to act on. Ids continue from HMW-16: HMW-01 to HMW-15 belonged to the earlier statements and are kept in the tag `archive/ps7-lesso-solar`.

**Status: Assumed.** Scores are the team's estimates and are re-scored after the briefing call.

## The statements

### Theme 1: capture once

| ID     | How might we ...                                                                             | Pain points         |
| ------ | -------------------------------------------------------------------------------------------- | ------------------- |
| HMW-16 | let assessors record each result once, during the assessment, even where there is no signal? | PP-16, PP-18, PP-24 |
| HMW-17 | make it impossible to finish a trainee with a critical item unmarked?                        | PP-17               |

### Theme 2: rules as configuration

| ID     | How might we ...                                                                                               | Pain points  |
| ------ | -------------------------------------------------------------------------------------------------------------- | ------------ |
| HMW-18 | turn each course's rules into configuration that HuiTong applies, and a training manager changes without code? | PP-17, PP-23 |
| HMW-19 | set up a new course's rules in an afternoon while the training manager stays in control of every rule?         | PP-23        |

### Theme 3: verification

| ID     | How might we ...                                                                                                  | Pain points  |
| ------ | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| HMW-20 | let operations verify a run with the evidence in front of them, and correct a result without losing the original? | PP-19, PP-26 |
| HMW-21 | point operations at the few records worth a second look?                                                          | PP-19        |

### Theme 4: submissions

| ID     | How might we ...                                                                              | Pain points  |
| ------ | --------------------------------------------------------------------------------------------- | ------------ |
| HMW-22 | deliver results to each agency in its own format, by API or by file, accepted the first time? | PP-20, PP-21 |
| HMW-23 | show where every run and submission stands, and catch a rejection before a deadline?          | PP-21, PP-25 |

### Theme 5: trust and audit

| ID     | How might we ...                                                                                | Pain points                |
| ------ | ----------------------------------------------------------------------------------------------- | -------------------------- |
| HMW-24 | give an agency's auditor the evidence for any result in minutes?                                | PP-22, PP-26               |
| HMW-25 | share with each agency only the fields it needs, and never hold a trainee's national ID number? | PP-20 (and the GRS design) |

### Theme 6: reuse

| ID     | How might we ...                                                                            | Pain points                                                 |
| ------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| HMW-26 | let another training provider join with its own TMS, agencies and courses by configuration? | None in the brief; the tenant configuration in capability A |

## Scoring

Each statement is scored 1 (low) to 5 (high) on four criteria. Priority = impact × reach × feasibility × evidence; the six highest are the ones the PoC is designed around.

| ID     | Impact | Reach (how often, how many) | Feasible this semester | Evidence in the brief | Priority |
| ------ | ------ | --------------------------- | ---------------------- | --------------------- | -------- |
| HMW-16 | 5      | 5                           | 4                      | 5                     | **500**  |
| HMW-17 | 5      | 5                           | 5                      | 4                     | **500**  |
| HMW-18 | 5      | 5                           | 4                      | 4                     | **400**  |
| HMW-19 | 4      | 3                           | 4                      | 3                     | 144      |
| HMW-20 | 4      | 5                           | 5                      | 4                     | **400**  |
| HMW-21 | 3      | 4                           | 4                      | 2                     | 96       |
| HMW-22 | 5      | 5                           | 4                      | 5                     | **500**  |
| HMW-23 | 4      | 4                           | 5                      | 3                     | 240      |
| HMW-24 | 4      | 3                           | 5                      | 3                     | 180      |
| HMW-25 | 5      | 4                           | 5                      | 3                     | **300**  |
| HMW-26 | 4      | 2                           | 4                      | 1                     | 32       |

HMW-23 (240) is delivered inside HMW-22 and HMW-20, HMW-24 (180) inside HMW-25, HMW-19 (144) inside HMW-18 and HMW-21 (96) inside HMW-20, so none of them is a separate design target. HMW-26 scores low on evidence because the brief does not ask for reuse; the tenant configuration delivers it as a platform feature.

## The six we design for

| Priority HMW                       | Our answer                                                                                                                                                                                 | Capability | Area                                | Measured by         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ----------------------------------- | ------------------- |
| HMW-16 capture once, offline too   | A tablet checklist that keeps every record on the device until it syncs, and a TMS connector that takes the verified results, so nothing is typed twice                                    | A, C       | 2 (checklist), 1 (connector)        | SM-12, SM-13, SM-19 |
| HMW-17 no missed critical item     | The checklist marks critical items and refuses to finish a trainee until each is marked                                                                                                    | C, D       | 2 (checklist), 3 (rules)            | SM-14               |
| HMW-18 rules as configuration      | Versioned course rules (criteria, critical items, outcome rule) and automatic competency; a new version from the rule-drafting assistant, approved by the training manager (covers HMW-19) | D, E       | 3                                   | SM-14, SM-09        |
| HMW-20 verify with the evidence    | A verification queue with the evidence beside each result, corrections that keep the original and record a reason, and a verification assistant that flags unusual records (covers HMW-21) | C, E       | 2                                   | SM-15, SM-18        |
| HMW-22 each agency, first time     | A connector per agency, by API or by delivered file; files rendered from the agency's template and validated before delivery; the status of every submission (covers HMW-23)               | A, D       | 1 (connectors), 3 (files)           | SM-16, SM-17        |
| HMW-25 only what each agency needs | A per-agency field allowlist that denies by default, no national ID numbers stored, and a tamper-evident audit trail (covers HMW-24)                                                       | F          | 1 (enforcement), 4 (administration) | GR-02, GR-04, SM-08 |

Each answer becomes a solution hypothesis in [hypotheses.md](hypotheses.md).
