# Working agreement

How the four of us plan, build, review and ship HuiTong. It turns module requirement 5 (team Git workflow) and the assessment calendar into habits. Change it by pull request, after agreeing at a retrospective.

## Roles

| Role                        | Who                                        | Responsibilities                                                                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product owner and team lead | Richie                                     | Owns the backlog and its priorities, speaks for LESSO Solar between client sessions, runs the ceremonies, and owns area 1 and the platform base                                                                                                      |
| Area owners                 | Richie (area 1); areas 2 to 4 agreed in W3 | Write their area's core logic and tests, keep its guide in `docs/team/` current, and review pull requests that touch their folders ([module-ownership.md](../team/module-ownership.md), [T-1](backlog.md#t-1-agree-area-owners-and-fill-codeowners)) |
| Reviewer of the day         | Whoever is not the author                  | Reviews open pull requests within one working day                                                                                                                                                                                                    |

## The sprint

One sprint is one module week, Monday to Sunday, so every assessment falls at a sprint end ([backlog.md](backlog.md#sprints) lists all 19 with their goals). Each sprint is a GitHub milestone and an iteration on the **HuiTong delivery** project board.

| Ceremony           | When                                        | Time box   | Output                                                                              |
| ------------------ | ------------------------------------------- | ---------- | ----------------------------------------------------------------------------------- |
| Sprint planning    | Start of the week (at the weekly lesson)    | 30 minutes | Stories pulled into the sprint, each meeting the Definition of Ready, with an owner |
| Stand-up           | Every working day, written in the team chat | 5 minutes  | Yesterday, today, blockers; a blocker gets the `status: blocked` label              |
| Backlog refinement | Mid-week                                    | 30 minutes | Next sprint's stories split, estimated and given acceptance criteria                |
| Sprint review      | End of the week                             | 20 minutes | Demo of merged work against the acceptance criteria; the board updated              |
| Retrospective      | Straight after the review                   | 15 minutes | One thing to keep, one to change, recorded in the sprint milestone's description    |

**Capacity.** Plan about 8 story points per member per sprint, fewer in assessment weeks. Unfinished stories return to the backlog at the review; they never spill silently into the next sprint.

## The board

The **HuiTong delivery** project (GitHub Projects) shows every epic and story with its Sprint, Estimate, Area and Status. Two views come with it: **Sprint board**, the current sprint with a column per status, and **Backlog**, the full table. Group the Backlog by Sprint once in the browser (View options, then Group by), because GitHub's API cannot set grouping.

| Status      | Means                                                                                                       | Limit        |
| ----------- | ----------------------------------------------------------------------------------------------------------- | ------------ |
| Todo        | In the sprint, not started                                                                                  |              |
| In Progress | Someone is assigned and a branch exists                                                                     | 2 per person |
| Done        | Merged into `main` and meeting the [Definition of Done](definition-of-ready-and-done.md#definition-of-done) |              |

An issue is assigned to the one person doing it. Pairing is welcome; the assignee stays the one who explains it at an assessment.

## From story to main

1. **Pick** a story from the sprint, assign yourself, and move it to In Progress.
2. **Branch** from an up-to-date `main`, one task per branch: `feat/<area>-<description>`, `fix/…`, `docs/…`, `chore/…`, `ci/…` or `test/…`.
3. **Commit** in small Conventional Commits; the hooks run lint, format and the licence-key guard.
4. **Open a pull request** with the template filled in: `Closes #<story>`, the acceptance criteria with evidence, and screenshots for UI.
5. **Checks.** CI, CodeQL, dependency review and the Trivy scans must be green. A finding is fixed or triaged ([security testing](../security/security-testing.md)), never ignored.
6. **Review.** The code owner of the touched folder reviews, or the team lead for shared files. While the team lead builds the platform base alone, the lead's pull requests are checked against the Definition of Done before merging, and teammates may review them afterwards.
7. **Merge** with a merge commit, delete the branch, and the story closes through `Closes #…`.
8. **Pull.** Everyone starts their next branch from the new `main`.

## Communication

- Decisions that change the architecture or a CLAUDE.md rule become an ADR in `docs/adr/`.
- Questions for LESSO Solar go into [questions-for-client.md](../client/questions-for-client.md), and their answers into [assumptions.md](../assumptions.md).
- AI-assisted work is logged in [ai-usage-log.md](../ai/ai-usage-log.md). Nothing in commits, pull requests or code carries AI attribution.
