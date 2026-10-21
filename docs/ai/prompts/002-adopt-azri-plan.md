# Prompt 002: Adopt the best of Azri's integrated plan

Azri produced a separate plan for Problem Statement #17 ("Full Integrated Agile Implementation Plan", v3). The team reviewed it against this repository.

- **What stays:** our structure, stack, ownership areas and 19-sprint backlog. They already match the module calendar and all six module requirements.
- **What this prompt does:** fold the ideas below from Azri's plan into the repo, crediting Azri wherever they are used (e.g. "Adopted from Azri's integrated plan").

## How to work

- **When:** finish the phase you are in first.
- **Branch:** create `docs/adopt-azri-plan` from the latest integration branch, following `docs/agile/working-agreement.md`.
- **Order:** for every item, check what already exists, then extend or tighten it rather than duplicating it.
- **Backlog:** edit the backlog data (`scripts/github/backlog.mjs`), not the generated markdown.
- **Checks:** run the usual checks, commit with Conventional Commits, and do not push.

## Adopt

### 1. One hero journey across all four areas
Add `docs/agile/hero-journey.md`. This is the demo spine for the W5 proposal and the W18 final presentation:

1. OA manpower request approved → event ingested once (duplicates ignored)
2. Onboarding / recruitment / IT tasks created (area 2)
3. A linked **draft** employee record (area 1)
4. Verified SG HR record later activates it (area 1)
5. Reconciled against the China HQ identity (area 1)
6. Later SG leave imported and mapped (area 3)
7. A permission-filtered HQ report exported (areas 3 + 4)
8. History and exceptions shown on the dashboard

Make this journey Playwright **E2E #1**. Name each area's step, and give each area a presenter slot in a W18 presentation plan.

Add two more end-to-end scenarios:
- **E2E #2:** an unfamiliar subsidiary CSV → AI mapping suggestion → human approval → persisted mapping → import with no code change.
- **E2E #3:** the HQ role cannot get an excluded field through the UI, the raw API or a report export, and the denial is audited.

### 2. Draft → active lifecycle
- An OA approval creates only a draft (`PRE_HIRE`) record.
- A record becomes active only after the agreed onboarding milestones **and** verified HR source input.
- Outbound write-back to a system of record stays behind an explicit, audited approval step. Against real client systems it is out of scope until the client approves it; mocks may demonstrate it, clearly labelled.
- Update CLAUDE.md, the relevant ADR/assumption (A-21) and the area 1 / area 2 guides.

### 3. Identity matching rule
- Never match people on names, romanisation/transliteration or name similarity alone.
- Distinguish **possible matches** (shown for HR review) from **confirmed matches** (a stable ID, or an HR decision that is audited).
- Add this to CLAUDE.md and area 1. Add tests with look-alike Chinese and romanised names.

### 4. Per-destination field allowlist, default deny
- Each destination (e.g. HQ) receives only fields explicitly allowlisted for it; anything not listed is withheld.
- Enforce this in the API **and** in export generation, not just by hiding UI.
- Changes to the policy are versioned and audited.
- Align this with the existing masking and cross-border transfer register rather than building a second mechanism. Area 4 owns the policy administration; area 1's baseline enforces it.

### 5. Chinese-data robustness
- Fixtures and tests for UTF-8, UTF-8 BOM, GBK and GB18030 CSV/Excel input, with user confirmation when the encoding is ambiguous.
- Explicitly documented date formats, time zones and effective dates.
- Fill gaps only; some of this already exists.

### 6. Honesty labels
- Every mocked connector shows a visible "Mock" badge in the UI and docs. Never imply a mock integration is live.
- When the AI provider is the deterministic `mock`, the AI mapping wizard shows a "Mock AI" badge. Never present a deterministic or hard-coded mapping as working AI.
- Document how to switch to the real provider for demos.
- Employee identifiers or sensitive HR data are never sent to a third-party AI service without written client permission. Record this in GRS and CLAUDE.md.

### 7. Client discovery: three sample packs first
At the top of `docs/client/questions-for-client.md`, add "Three items to request first":
- **A.** SG HR employee-master sample with attendance and leave examples, plus any data dictionary.
- **B.** The HQ reporting template, one manually completed example and the approved category map.
- **C.** An example approved OA manpower request, plus the downstream onboarding checklist or workflow history.

Map Azri's six consolidated questions onto our existing Q-IDs rather than adding duplicates.

### 8. Failure and edge-case test matrix
Extend `docs/agile/test-plan.md` with:

| Group | Cases |
|---|---|
| Approvals | duplicate, cancelled or incomplete OA approval; blocked onboarding task |
| Identity and sync | unmatched source ID; duplicate import; conflicting update; stale event |
| Input files | malformed CSV; encoding mismatch; invalid date; unknown leave code; missing required mapping |
| AI and policy | incorrect AI suggestion; rejected mapping; unsafe destination field; denied export |
| Recovery | interrupted sync with retry after partial failure; report requested while source data is incomplete |

Name the owning area for each case.

### 9. Measurement protocol
Add the protocol to `docs/design-thinking/success-metrics.md`:
- manual steps removed (current vs PoC flow)
- leave-report preparation time on the same dataset
- new-subsidiary setup effort (approved CSV mapping vs a bespoke parser)

Keep labelling results as lab estimates on synthetic data until the client provides baselines.

### 10. Demo reliability and backups
- In P-8 / hardening: a one-click seed/reset that can never touch real data, a timed full rehearsal, a recorded backup demo, and a tested Docker fallback.
- In `docs/team/module-ownership.md`: a named backup owner per area (TBD until owners are agreed). Every member reviews at least one teammate's critical PR.

## Do not adopt (record the reasons in a short ADR)

| From Azri's plan | Why not |
|---|---|
| Python FastAPI backend | The NestJS/TypeScript base is built and tested. Node covers the same needs (iconv-lite for GBK/GB18030, ExcelJS for spreadsheets), with shared types end to end. |
| Its ownership split | It has no owner for the module's "Deploy and monitor" requirement (observability, clickstream, AI token tracking). Our four areas cover all six requirements. |
| The generic 12-week roadmap | It doesn't follow the NYP calendar (W5 proposal, W7 interview, W13 technical review, W14–16 monitoring topics, term break). The existing backlog does. |

## Finish

- Update `docs/requirements-traceability.md`, `docs/ai/ai-usage-log.md` and `docs/BUILD_REPORT.md`.
- Summarise what changed, item by item.
