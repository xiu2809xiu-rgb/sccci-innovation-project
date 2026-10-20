# ADR 0001: Record architecture decisions

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M3, M5

## Context

Four students build HuiTong over one semester, and 85% of the IT2134 marks are individual. Each member has to explain the decisions behind their own area at the mock interview (week 7), the technical review (week 13) and the final presentation (week 18). That includes platform decisions they did not make themselves but build on.

Three things make the reasoning easy to lose:

- **AI-assisted coding.** Code arrives quickly, and the module expects us to own every line we submit. A record of why each significant design was chosen shows that a person made the decision and understands it.
- **Unknown client systems.** Until the first client meeting, everything about Organisation E's real systems is an assumption (see [`../assumptions.md`](../assumptions.md)). Some decisions will change, so we need to see which assumption each one rests on.
- **Parallel work.** Areas 2–4 start from scaffolding written by area 1. Their owners need the reasons behind the platform choices, not just the code.

[`CLAUDE.md`](../../CLAUDE.md) section 5 already requires an ADR for any deviation from the decided stack.

## Decision

We record architecturally significant decisions as Architecture Decision Records (ADRs) in `docs/adr/`. We use Michael Nygard's lightweight format with two additions: a date, and the alternatives we rejected.

**A decision needs an ADR when it** is costly to reverse, affects more than one ownership area, adds a framework or infrastructure component, changes a choice in `CLAUDE.md` section 5, or changes how personal data is stored, protected or moved across borders. Choices inside one module that are cheap to change do not need one.

| Item       | Rule                                                                                             |
| ---------- | ------------------------------------------------------------------------------------------------ |
| File       | `docs/adr/NNNN-kebab-case-title.md`                                                              |
| Number     | The next free four-digit number in [the index](README.md); never reused, even for a rejected ADR |
| Scope      | One decision per record, roughly one to two pages                                                |
| Index      | `docs/adr/README.md` gets its row in the same pull request                                       |
| Review     | At least one other member, plus the owner of every affected area                                 |
| Acceptance | The ADR is Accepted when its pull request merges                                                 |

**Status lifecycle.** An ADR starts as Proposed. It becomes Accepted when it merges, and may later become Deprecated or Superseded. A Proposed ADR can also end as Rejected.

**Superseding.** An accepted ADR is never rewritten; only typos and broken links may be fixed. To change a decision:

1. Write a new ADR that names the one it supersedes and explains what changed.
2. In the same pull request, set the old ADR's status to "Superseded by NNNN" with a link, and update the index.

If two branches claim the same number, the one that merges second renumbers.

### Template

```markdown
# ADR NNNN: Short decision title

- **Status:** Proposed
- **Date:** YYYY-MM-DD
- **Traceability:** module requirements (M1–M6) and capabilities (A–G) it serves

## Context

The forces at play: the problem, constraints, assumptions (A-nn) and open client questions (Q-nn).

## Decision

What we will do, stated plainly ("We will ...").

## Consequences

### Positive

### Negative

## Alternatives considered

| Option | Why rejected |
| ------ | ------------ |
```

## Consequences

### Positive

- The reasoning behind each choice is versioned with the code and reviewed like code.
- Each member can prepare for the interview and the technical review from a short, stable source.
- After the client meeting, we can find every decision that depended on an assumption and decide whether to supersede it.
- Assessors can trace module requirements to concrete decisions through [`../requirements-traceability.md`](../requirements-traceability.md).

### Negative

- Writing an ADR takes time. Recording small choices would bury the important ones; the significance test above limits this.
- ADRs go stale if the code changes without a new record. Reviewers check for this in any pull request that changes dependencies or architecture.
- Superseded ADRs stay in the folder, so readers must check the status line.

## Alternatives considered

| Option                                                     | Why rejected                                                                                                                                                                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No written record (decisions live in chat and PR comments) | Lost within weeks, cannot be cited at the technical review, and invisible to a teammate who joins an area later                                                                                                              |
| A wiki or shared document outside the repository           | Not versioned with the code, not reviewed in pull requests, and drifts away from what is built                                                                                                                               |
| MADR (Markdown Any Decision Records)                       | A good format, but its extra sections (decision drivers, pros and cons for every option) are more than a four-person team needs. Our alternatives table keeps the useful part, and we could switch later without renumbering |
| Full design documents or RFCs                              | Too slow for a 13-week build; they suit cross-team decisions in large organisations                                                                                                                                          |
