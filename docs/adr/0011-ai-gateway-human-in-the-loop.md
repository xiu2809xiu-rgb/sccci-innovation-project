# ADR 0011: LLM gateway with usage tracking and human approval

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M1, M2, M6 · capabilities E, G

## Context

Capability E uses AI in two places:

- **Schema-mapping assistant.** For a sample export from a new system, such as the MY01 Malaysia file with mixed English and 简体中文 headers, it proposes a canonical field per column with a confidence score and a rationale. HR approves before anything is used.
- **Discrepancy explainer.** It explains a conflict between SG HR and CN HQ in plain English or 中文.

Forces:

- **Human in the loop.** AI never writes to a system of record without human approval (`CLAUDE.md` section 4); PIPL Art. 24 is another reason to keep automated decisions about people out of scope ([GRS 2.6](../grs/grs-by-design.md#26-ai-governance)).
- **Risks** ([register](../grs/grs-by-design.md#32-register)): wrong mappings approved (R-07), prompt injection through uploads (R-08), personal data reaching a provider (R-09), national ID numbers in samples (R-13).
- **Unknown policy.** Approved AI providers and regions are still open (A-17, Q-42).
- **Cost and repeatability.** Demos, CI and development need no key and no cost, and tests need deterministic output.
- **Measurement.** W16 requires AI token usage tracking; area 4 builds dashboards, budgets and alerts on area 1's records.

## Decision

**1. One gateway.** `LlmGateway` in `apps/api/src/infrastructure/llm/` is the only way to call a model. Providers sit behind an injection token (Strategy) and are chosen by configuration:

| Provider         | Use                                                                                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mock` (default) | Deterministic, with no key and no network. Matches headers against a bilingual synonym dictionary (for example 入职日期 → `hireDate`, 员工编号 → `employeeNo`), returns fixed confidences and estimates token counts, so the dashboards have realistic data |
| `bedrock`        | AWS Bedrock through the Converse API, in the deployment region without cross-region inference, using the task's IAM role rather than keys. Token counts and latency come from the response                                                                  |
| `openai`         | Optional. Off for client data unless Organisation E approves it in writing                                                                                                                                                                                  |

**2. Every call is tracked.** `AiUsageTracker` wraps each provider call, failures included, and stores an `AiUsageRecord`: feature, user, provider, model, tokens in and out, latency, a cost estimate from a price table in configuration, and the outcome (success, invalid output, provider error or timeout). HR's later decision (accepted, edited or rejected) is added to the same record. Prompt and completion text are not stored.

**3. Minimised, untrusted input.**

- Uploads (`.csv` or `.xlsx`, within size and row limits) are parsed inside HuiTong. The prompt carries only column headers and computed profiles (type, format pattern, fill rate), never cell values. (Amended on 21 Oct 2026: the distinct codes of a category column may be sent; see the end of this record.)
- National ID columns (NRIC/FIN, PRC resident ID, MyKad; detected by header and by value pattern) and gender columns are blocked before the prompt is built and never imported. The wizard shows them as "Not ingested".
- Explainer prompts use `employeeNo` instead of names and never include RESTRICTED values.
- Uploaded content sits in delimited data fields of a fixed, versioned prompt template; the model has no tools, and nothing in its output is executed.

**4. Validated proposals.** Output must parse against a zod schema in `@huitong/shared`: one row per column with a target canonical field (or none), a transformer, a confidence from 0 to 1 and a length-capped rationale. Type-compatibility, duplicate-target and blocked-field checks follow. Invalid rows are dropped, and the outcome is recorded.

**5. Approval enforced on the server.** A proposal is a draft. HR accepts, edits or rejects each row, and low-confidence rows start unselected. Only a separate, audited approval by the data steward of the connector's entity creates a new versioned mapping config; the AI is never recorded as an approver. An integration test proves that an unapproved mapping cannot be activated (M2-11). The explainer has no write path at all.

**6. Efficiency.** All columns go in one request, an identical header set reuses the earlier proposal, and approved mappings become synonym rules that resolve known headers without a model call.

## Consequences

### Positive

- The demo, CI and every laptop run the full feature with no key, no cost and no data leaving the API.
- Providers can change (Bedrock, an approved domestic model for a China-side deployment, a self-hosted model) without touching features.
- Every token is accounted for, so the W16 dashboards and the acceptance-rate target (at least 80% accepted without edits) rest on data.
- Wrong or malicious output must pass validation and a person before it affects anything.

### Negative

- The mock provider is only as good as its synonym dictionary, so demos state which provider produced a proposal.
- Cost estimates depend on a price table that must follow model and price changes.
- Header-only prompts give the model less context, so ambiguous headers (部门 against 部门编码) get lower confidence and more HR review.
- Bedrock's model availability and data-use terms must be checked for the region before it is enabled.

## Alternatives considered

| Option                                            | Why rejected                                                                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Provider SDKs called directly from features       | Tracking and minimisation would rely on every caller remembering them, and providers would be hard to swap                                |
| LangChain, LlamaIndex or a similar framework      | Large, fast-moving abstractions for two narrow calls; harder to explain and to pin                                                        |
| Auto-apply proposals above a confidence threshold | Breaks human-in-the-loop; confidence is not correctness                                                                                   |
| Sample rows in the prompt                         | Better accuracy on ambiguous columns, but personal data would reach a third party (R-09)                                                  |
| Rules only, no AI                                 | The mock's dictionary is exactly that, and it stays. It cannot handle headers it has never seen, which is what each new subsidiary brings |
| Fine-tuning on mapping data                       | No client data may be used for training, and the volume would not justify it                                                              |

## Amendment, 21 Oct 2026: category codes in the mapping prompt

**Context.** The decision above says the mapping prompt carries column headers and computed profiles, never cell values. To propose a value map, for example from SAP status codes or department names to canonical codes, the assistant needs the codes a category column holds. The implementation sends them: for a column whose header names a category (department, status, location, grade and similar) and whose values repeat, the request includes its distinct values, at most 8 of up to 40 characters each (`describeColumn` in `sample-shapes.ts`). A column of names, emails, numbers or dates never qualifies: its header is not a category, or its values do not repeat. The wizard, the area 1 guide and story E-1 said that no value reaches the AI, which was wrong ([#67](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/issues/67)).

**Decision.** The distinct codes of a category column may reach the model, within those limits. No personal value does. Every other column is described by its header and value shapes only, and national ID columns are withheld entirely. The approved mapping keeps the codes in its value maps.

**Consequences.**

- Assumption A-17 now allows category codes, and client question Q-42 asks Organisation E to confirm it. If its policy forbids any cell value, `describeColumn` stops sending categories, and value maps are written by hand.
- Prompt injection (R-08): category codes are untrusted text, like headers. They sit in the same delimited DATA block, which the prompt tells the model to treat as data; the output schema and HR's approval still apply.
- The wizard says exactly what is sent, in English and Chinese.

## Amendment, 21 Oct 2026: no employee identifiers in any prompt

**Context.** Azri's integrated plan asks that employee identifiers and sensitive HR data never reach a third-party AI service without the client's written permission (prompt 002, story E-5). Two gaps remained against that rule. The explainer sent the employee number (decision bullet "Explainer prompts use `employeeNo` instead of names"). Its values for fields such as the work email or a name were sent as they were, because those fields are INTERNAL. And a category column whose header named a person under a category word, such as "Department Head" (部门负责人), would have sent the repeated names as "codes".

**Decision.**

- **The explainer names nobody.** Its request carries the entity, the field and each system's value, but no employee number or name. The values of identifying fields are withheld like values above INTERNAL: the employee number, names, work email and phone, and a manager's number (`IDENTIFYING_EMPLOYEE_FIELDS` in `@huitong/shared`). The model is told why a value is missing, and calls the person "this employee".
- **Category codes stay codes.** A header that names a person (head, manager, approver, 负责人, 上级 and similar) is never a category column. A value shaped like an identifier (an email address, an id or account number, a phone number) is never sent as a category.
- **Written permission first.** No identifier or sensitive HR value goes to a third-party AI service unless Organisation E gives written permission. That would need a new amendment, and a new GRS assessment.

**Consequences.**

- The explainer cannot say whose record it explains. HR reads its advice beside the record, so nothing is lost.
- A mapping for a column like "Department Head" gets no value map from the model; HR maps it by hand.
- The decision bullet about `employeeNo` above no longer applies. The rule is written in CLAUDE.md and in the GRS register (R-09).
