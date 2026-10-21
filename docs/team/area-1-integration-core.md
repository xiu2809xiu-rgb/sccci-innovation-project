# Area 1: Integration Core

This guide explains how area 1 works, the design patterns it uses, what it gives the other areas, and where to extend it once the client meeting confirms the real systems. Area 1 is owned by Richie and covers three capabilities from [CLAUDE.md](../../CLAUDE.md) section 4:

| Capability                  | What area 1 builds                                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| A Connector hub             | One adapter per external system behind `SystemConnector`, built by a factory from configuration; the sync job; OA webhooks  |
| B Canonical employee master | One record per person with a source of truth and provenance for every field, change history, and conflicts for HR to settle |
| E AI assistance             | The schema-mapping assistant and the discrepancy explainer, both advice that a person must approve                          |

Everything external is mocked until the client meeting ([A-20](../assumptions.md)). The rules that shape the design are in the [GRS document](../grs/grs-by-design.md) and the ADRs, above all [0002](../adr/0002-integration-layer-hub-and-spoke.md) (hub and spoke), [0008](../adr/0008-jobs-events-realtime.md) (jobs, events and live updates) and [0011](../adr/0011-ai-gateway-human-in-the-loop.md) (AI with a human in the loop).

## The architecture at a glance

```mermaid
flowchart LR
  subgraph External["External systems (mocked)"]
    SG["SG HR<br/>English keys, ISO dates"]
    CN["CN HQ SAP<br/>Chinese keys, YYYY/MM/DD"]
    OA["OA platform<br/>signed webhooks"]
    FILE["Sample exports<br/>CSV or Excel"]
  end
  subgraph Core["Integration core (apps/api)"]
    ADP["Adapters<br/>SystemConnector"]
    JOB["Sync job on BullMQ<br/>extract, map, validate, load, audit"]
    MAP["Mapping engine<br/>Strategy transformers"]
    MASTER["Employee master<br/>provenance and conflicts"]
    AI["LlmGateway<br/>mapping assistant, explainer"]
    HOOK["OA webhook<br/>HMAC, stored once"]
  end
  SG --> ADP
  CN --> ADP
  ADP --> JOB --> MAP --> MASTER
  FILE --> AI
  OA --> HOOK --> BUS(["oa.approval.completed"])
  MASTER --> UI["Employees and Connectors pages"]
  AI --> UI
  BUS --> AREA2["Area 2 workflows"]
```

The code lives in four API modules and two web features:

| Where                                                                                                             | What                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [`modules/connectors`](../../apps/api/src/modules/connectors/)                                                    | Adapters, the factory, the sync pipeline and job, sync runs, OA webhooks                   |
| [`modules/mapping`](../../apps/api/src/modules/mapping/)                                                          | The mapping engine, transformers, versioned mapping configs, the mapping wizard's back end |
| [`modules/employees`](../../apps/api/src/modules/employees/)                                                      | The employee master, the field merge rules, conflicts and their resolution                 |
| [`modules/ai`](../../apps/api/src/modules/ai/) and [`infrastructure/llm`](../../apps/api/src/infrastructure/llm/) | The two AI features, the gateway, the providers and usage tracking                         |
| [`features/employees`](../../apps/web/src/features/employees/)                                                    | The Employees page                                                                         |
| [`features/connectors`](../../apps/web/src/features/connectors/)                                                  | The connector pages, the Run sync dialog and the mapping wizard                            |

The contracts both sides share are zod schemas in [`packages/shared/src`](../../packages/shared/src/): `connectors/`, `mapping/`, `employees/`, `events/` and `realtime/`.

## Connectors

Every external system sits behind [`SystemConnector`](../../apps/api/src/modules/connectors/adapters/system-connector.ts) (Adapter). The sync never sees a vendor's API shape, paging or authentication, only `checkHealth` and `fetchEmployees`, so replacing a mock with the client's real system means writing one class.

| Adapter                                                                                        | System                                                                                                        |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| [`SgHrRestConnector`](../../apps/api/src/modules/connectors/adapters/sg-hr-rest.connector.ts)  | SG HR: an `X-API-Key` header, English keys, `page`/`pageSize` paging ([A-01](../assumptions.md))              |
| [`CnHqSapConnector`](../../apps/api/src/modules/connectors/adapters/cn-hq-sap.connector.ts)    | China HQ's SAP-like system: HTTP Basic, Chinese keys, OData `$top`/`$skip` paging ([A-02](../assumptions.md)) |
| [`OaWebhookConnector`](../../apps/api/src/modules/connectors/adapters/oa-webhook.connector.ts) | OA pushes approvals by webhook, so it has no employees to pull                                                |
| [`OfflineConnector`](../../apps/api/src/modules/connectors/adapters/offline.connector.ts)      | File imports (the Excel master, a new subsidiary's export) and the mocked Teams and DingTalk                  |

[`ConnectorFactory`](../../apps/api/src/modules/connectors/connector-factory.ts) (Factory) builds the right adapter from a `connectors` row. Settings come from the row; credentials come only from the typed configuration (environment or secret store), so the database never holds a secret. [`HttpJsonClient`](../../apps/api/src/modules/connectors/adapters/http-json-client.ts) validates every response against a zod schema before anyone uses it and retries transient failures, and [`minimise.ts`](../../apps/api/src/modules/connectors/adapters/minimise.ts) cuts a bank account number to its last four digits inside the adapter, so the full number is never stored.

**Mock labels.** A connector's `isMock` column says that a HuiTong mock stands in for the client's system. Today that is SG HR, CN HQ and OA (the `services/mock-*` apps) and the Teams and DingTalk notification stubs; only the Excel file import is real. The connector cards, the connector page and the overview's sync health show a "Mock" badge for each, with a tooltip saying the data is synthetic and the system is not the client's live one ([A-8](../agile/backlog.md#a-8-label-mocked-systems-and-the-mock-ai)). Adopted from Azri's integrated plan: a mock is never presented as a live integration. When a connector is pointed at a real system, its `isMock` is set to false in the same change.

## How a sync works

A sync is always previewed first. HR sees what would change, then applies exactly that preview.

1. **Start.** `POST /api/v1/connectors/:connectorId/sync` with `mode: PREVIEW` ([`SyncService`](../../apps/api/src/modules/connectors/sync/sync.service.ts)). The run is queued as a BullMQ job whose id is the run id. The `Idempotency-Key` header maps a repeated request to the same run, and a connector runs one sync at a time.
2. **Run.** [`SyncProcessor`](../../apps/api/src/modules/connectors/sync/sync.processor.ts) runs one job at a time, through [`SyncPipeline`](../../apps/api/src/modules/connectors/sync/sync-pipeline.ts) (Template Method): extract, map, validate, load and audit, always in that order. [`EmployeeSyncPipeline`](../../apps/api/src/modules/connectors/sync/employee-sync.pipeline.ts) supplies the five steps for employees. A record that fails a step is reported and dropped; the rest carry on, and the run ends `PARTIAL`.
3. **Progress.** [`SyncProgressReporter`](../../apps/api/src/modules/connectors/sync/sync-progress.reporter.ts) writes progress to the run and publishes `sync.progress` on the live stream. Live messages carry ids, status and counts only, never field values; the browser fetches details through the masked REST endpoints.
4. **Preview.** In `PREVIEW` mode the load step computes what it would create, update or mark as a conflict, and writes nothing. The first 200 changes are kept on the run for the Run sync dialog. The run also stores a fingerprint of all of them: `changeDigest`, from [`change-digest.ts`](../../apps/api/src/modules/connectors/sync/change-digest.ts), which covers each change and the values of each new record.
5. **Apply.** `mode: APPLY` must name a successful or partial preview of the same connector that finished in the last 30 minutes (`PREVIEW_VALID_MINUTES`, checked in [`SyncService`](../../apps/api/src/modules/connectors/sync/sync.service.ts)); the server refuses anything else, whatever the UI does. Before it writes, the apply plans every record again without writing and compares the fingerprint with the preview's. If the source has changed since, it stops with `SOURCE_CHANGED`, writes nothing, and HR previews again. So an apply writes exactly what HR saw.
6. **Retries.** A job that throws is retried by BullMQ, three attempts with backoff, and only the last attempt marks the run `FAILED`. `SOURCE_CHANGED` is not retried, because only a new preview can help. A retry is safe: unchanged records are skipped and every write is an upsert.
7. **Recovery.** A run whose job is gone (for example after Redis was reset) would stay `QUEUED` and block its connector. [`SyncRecovery`](../../apps/api/src/modules/connectors/sync/sync-recovery.ts) settles such a run as `FAILED` with the code `INTERRUPTED` and audits it, so the next sync can start.

With `BOOTSTRAP_SYNC=true`, [`BootstrapSyncService`](../../apps/api/src/modules/connectors/sync/bootstrap-sync.service.ts) loads the master from both HR systems when a fresh stack starts; `docker compose` turns it on so the demo opens with data and the expected conflicts.

## Mappings

A mapping says how one system's fields become canonical fields: for each target, a source column and a transform. Mappings are configuration, not code, so a new subsidiary needs a mapping rather than a release.

- **Transforms.** Each `kind` in [`transformSpecSchema`](../../packages/shared/src/mapping/field-mapping.ts) is one Strategy class in [`transformers/`](../../apps/api/src/modules/mapping/transformers/), found through [`TransformerRegistry`](../../apps/api/src/modules/mapping/transformers/transformer-registry.ts): `copy`, `date`, `value-map`, `name-part`, `name-full`, `phone`, `number`, `last-four-digits`, `lowercase`, `contains-script`, `constant` and `rules`. For example, `rules` reads SAP's employment status from three columns, and `name-part` splits `TAN Mei Ling` into family and given names.
- **The engine.** [`MappingEngine`](../../apps/api/src/modules/mapping/mapping-engine.ts) runs every field mapping of a record through its transformer. A value that fails is reported, never guessed, and an error message repeats a source value only when the target field's classification allows it.
- **Versions.** [`MappingConfigsRepository`](../../apps/api/src/modules/mapping/mapping-configs.repository.ts) keeps every version; one is active per connector. Each run records the version it used. The baseline mappings for SG HR and CN HQ are seeded from [`baseline-mappings.ts`](../../apps/api/prisma/seed/baseline-mappings.ts).

## The employee master

One row per person, keyed by the group-wide employee number ([A-04](../assumptions.md)), never by a national ID ([A-33](../assumptions.md)).

- **Identity.** Only the same employee number confirms that two records are one person. [`possibleMatchReasons`](../../apps/api/src/modules/employees/domain/identity-matcher.ts) finds existing employees a new record may duplicate: the same Chinese name, the same name in Latin script (ignoring case, spaces, hyphens and accents), the same names in another order, or the same work email in another letter case. A preview reads every employee's identity details once and compares them in memory, so the normalising applies to every comparison. The Run sync preview lists the matches under the new record, each linking to the existing record, and the sync still creates the record on its own. A record whose work email another employee already has is refused as a `WORK_EMAIL_IN_USE` sync error, because the email is unique in the master. Romanisation is never proof: 陈伟 and 陈玮 are both "Chen Wei" (story [B-5](../agile/backlog.md#b-5-possible-matches-for-hr-review-never-name-only-merges), [ADR 0002 amendment](../adr/0002-integration-layer-hub-and-spoke.md#amendment-21-oct-2026-identity-matching)). Adopted from Azri's integrated plan.

- **Provenance.** Every source's value for every field is kept as a source record, so the record drawer can show the master beside what each system holds.
- **Source of truth.** [`FieldSourcePolicy`](../../apps/api/prisma/schema.prisma) rows name, per entity and field, the connector that owns the value, or none ([A-06](../assumptions.md)). They are seeded in [`integration.ts`](../../apps/api/prisma/seed/integration.ts): for SG01, SG HR owns identity, personal and pay data, HQ owns grading and cost centres, and job title, department, work email and hire date have no single owner. HQ owns every CN01 field.
- **The merge.** [`mergeField`](../../apps/api/src/modules/employees/domain/field-merger.ts) decides each field: an owned field takes the owner's value (or the source HR chose for this record) and never opens a conflict; an unowned field takes the value the sources agree on, and a disagreement opens a conflict while the master keeps what it had. A value HR typed in stands until a source changes. [`EmployeeMasterService`](../../apps/api/src/modules/employees/employee-master.service.ts) applies the decisions; a master change, its provenance, its history line and any conflict commit in one transaction.
- **Conflicts.** [`ConflictsService`](../../apps/api/src/modules/employees/conflicts.service.ts) lists them, and resolves each one by choosing a source (`SOURCE_SELECTED`, which also makes that source the record's owner of the field) or typing the value with a note (`MANUAL_VALUE`). The decision, the master change and the history line commit together and are audited. A conflict the sources settle themselves, because they agree again or a source of truth now decides, closes as `DISMISSED`.
- **Lifecycle: draft before active.** An approved OA request leads only to a draft (`PRE_HIRE`) record, created through the draft-from-hire use case area 2 calls. The master activates it only when both conditions hold: area 2 reports the agreed onboarding milestones met, and the verified record has arrived from the HR system of record (SG HR for SG01). The rule belongs to the master, not to the workflow, so no trigger can skip it. It is built with C-3 under story B-6; until then nothing creates drafts ([ADR 0002 amendment](../adr/0002-integration-layer-hub-and-spoke.md#amendment-21-oct-2026-draft-records-and-write-back), [A-21](../assumptions.md)).
- **Masking.** Reads go through [`EmployeesService`](../../apps/api/src/modules/employees/employees.service.ts): the list carries `INTERNAL` fields only, and the drawer masks every value, the master's and each source's, for the viewer's role and the record's entity. The platform's field-masking interceptor ([`field-masking.interceptor.ts`](../../apps/api/src/common/interceptors/field-masking.interceptor.ts)) applies the shared [`masking-policy.ts`](../../packages/shared/src/governance/masking-policy.ts), and a masked value carries the reason the UI shows as "why is this hidden".
- **Across entities: the transfer register as an allowlist.** A field of another entity's record is shown only when an ACTIVE entry of the cross-border transfer register shares it with the viewer's own entity, whatever the role's clearance ([`destination-policy.ts`](../../apps/api/src/modules/access/destination-policy.ts), [`FieldMasker`](../../apps/api/src/modules/access/field-masker.ts)). Another entity's records appear in the list, the conflict queues and the overview only while every field the list shows, searches, filters or sorts by is shared; otherwise they read as missing. Opening a record that withholds fields writes an `access.fields_withheld` audit event naming the fields and the entry versions. Area 4 administers the register and calls `AccessPolicyService.reload()` after a change; an export leaves out what `FieldMasker.withheld` names (story [B-7](../agile/backlog.md#b-7-per-destination-field-allowlist-enforced-by-default-deny), [ADR 0010 amendment](../adr/0010-auth-sessions-rbac-masking.md#amendment-21-oct-2026-a-per-destination-field-allowlist-default-deny)). Adopted from Azri's integrated plan.

## AI assistance

Every model call goes through [`LlmGateway`](../../apps/api/src/infrastructure/llm/llm.gateway.ts), which picks the configured provider (Strategy) and records the call, failed ones included, through [`AiUsageTracker`](../../apps/api/src/infrastructure/llm/ai-usage.tracker.ts): tokens in and out, model, latency, estimated cost ([A-52](../assumptions.md)), feature, user and outcome. The gateway never writes to a system of record.

| Provider                                                                                        | When                                                                                                                     |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| [`MockLlmProvider`](../../apps/api/src/infrastructure/llm/providers/mock-llm.provider.ts)       | The default: deterministic, offline, no API key. Each feature registers a responder that gives the answer a model would. |
| [`BedrockLlmProvider`](../../apps/api/src/infrastructure/llm/providers/bedrock-llm.provider.ts) | `LLM_PROVIDER=bedrock`: AWS Bedrock through the Converse API, in `ap-southeast-1` by default                             |
| [`OpenAiLlmProvider`](../../apps/api/src/infrastructure/llm/providers/openai-llm.provider.ts)   | `LLM_PROVIDER=openai` with `OPENAI_API_KEY`                                                                              |

**The schema-mapping assistant.** HR uploads a sample export (CSV or Excel, up to 1 MB) in the mapping wizard. [`SampleFileReader`](../../apps/api/src/modules/mapping/proposals/sample-file-reader.ts) reads the headers and at most 20 rows, evaluates nothing and stores nothing. It decodes a CSV file as UTF-8 (with or without a byte-order mark) or GB18030, which covers the GBK that Chinese-locale Excel writes; when both readings are plausible, the wizard shows the header row both ways and HR chooses ([`text-encoding.ts`](../../apps/api/src/modules/mapping/proposals/text-encoding.ts), [dates, time zones and encodings](../architecture/data-formats.md)). [`buildMappingRequest`](../../apps/api/src/modules/mapping/proposals/mapping-request.builder.ts) tells the model each column's header and the shape of its values (`E######`, `YYYY/MM/DD`). For a category column whose values repeat, such as a department or a status, it also sends the distinct codes (at most eight), so that the model can propose a value map. A header that names a person (a department head, an approver) is never a category column, and a value shaped like an identifier is never sent. It never sends a personal value ([A-17](../assumptions.md), [ADR 0011](../adr/0011-ai-gateway-human-in-the-loop.md#amendment-21-oct-2026-category-codes-in-the-mapping-prompt)), and columns that hold national ID numbers or gender are left out of the prompt entirely, not even their headers ([`prohibited-columns.ts`](../../apps/api/src/modules/mapping/proposals/prohibited-columns.ts)). [`SchemaMappingAssistant`](../../apps/api/src/modules/ai/schema-mapping/schema-mapping.assistant.ts) re-checks the answer on the server. The proposal shows each column's target, transform, confidence and reasons, labelled "Requires approval". Only an approval by someone with `mappings:approve` saves a new mapping version ([`MappingProposalsService`](../../apps/api/src/modules/mapping/proposals/mapping-proposals.service.ts)); a mapping that reads a national ID column is never saved.

**The discrepancy explainer.** [`DiscrepancyExplainer`](../../apps/api/src/modules/ai/discrepancy/discrepancy-explainer.ts) explains a conflict in English or 中文 for HR to read before deciding. The model learns the entity, the field and each system's value, but never who the employee is, not even their number. Values above `INTERNAL`, and values that identify a person (names, work email and phone, a manager's number), are withheld ([ADR 0011](../adr/0011-ai-gateway-human-in-the-loop.md#amendment-21-oct-2026-no-employee-identifiers-in-any-prompt)). The answer is advice only: it never changes a record.

**The "Mock AI" label.** With the `mock` provider, the answers come from deterministic rules, not from a model. The wizard's review step and the explainer then show a "Mock AI" badge next to the output, so a hard-coded answer is never presented as working AI. The label follows the provider recorded on each proposal and explanation, so output from a real model carries none.

### Switching the AI provider for a demo

The `mock` provider is the default for development, CI and rehearsals: it needs no key and no data leaves the API. To show a real model:

1. **Check the data first.** Demos use synthetic data only. Prompts never carry an employee identifier or a value above `INTERNAL`, and client data may reach an outside AI service only with Organisation E's written permission ([GRS R-09](../grs/grs-by-design.md)).
2. **Configure Bedrock** in `.env`, or in the deployment's secrets: `LLM_PROVIDER=bedrock`, `LLM_MODEL` set to a model id enabled in the AWS account, and `BEDROCK_REGION` (default `ap-southeast-1`). AWS credentials come from the standard AWS credential chain (a named profile locally, the task role on AWS), never from the repository. `openai` works the same way with `OPENAI_API_KEY`, but stays off for client data.
3. **Restart the API** (`docker compose up -d api`, or restart `pnpm dev`). The API refuses to start if `LLM_MODEL` is missing.
4. **Check the switch.** Upload the Malaysia sample: the proposal carries no "Mock AI" badge, and its AI usage record shows the real provider, model and token counts.
5. **Switch back** to `LLM_PROVIDER=mock` after the demo.

With a real model, answers vary between runs, take seconds rather than milliseconds, and cost money; every call is still costed by `AiUsageTracker`. Rehearse with the model the demo will use (story [E-4](../agile/backlog.md#e-4-run-the-assistants-on-aws-bedrock)).

## OA webhooks and the events other areas use

OA calls `POST /api/v1/webhooks/oa` when an approval completes ([A-03](../assumptions.md)). [`OaWebhookService`](../../apps/api/src/modules/connectors/webhooks/oa-webhook.service.ts) verifies the HMAC signature over the raw body with a constant-time comparison and a replay window ([`oa-signature.ts`](../../apps/api/src/modules/connectors/webhooks/oa-signature.ts)), validates the body, stores it once (`(source, eventId)` is unique, so a redelivery is a no-op) and then publishes the domain event. The stored row doubles as the outbox: it becomes `PROCESSED` once a subscriber has taken the event and `FAILED` if a subscriber throws, and [`WebhookOutboxProcessor`](../../apps/api/src/modules/connectors/webhooks/webhook-outbox.processor.ts) republishes events still waiting every two minutes. Until area 2 subscribes, every approval waits there.

| Event                                                                            | Where                                                                                        | Payload                                                                                                                                                                             | Who uses it                                                       |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `oa.approval.completed`                                                          | [`DomainEventBus`](../../apps/api/src/infrastructure/events/domain-event-bus.ts), in-process | [`oaApprovalCompletedSchema`](../../packages/shared/src/events/domain-events.ts): the stored event id, OA's event id, request id and type, outcome, entity, applicant and form data | Area 2: a `MANPOWER_REQUEST` that is `APPROVED` starts a workflow |
| `sync.progress`, `sync.run.completed`, `sync.run.failed`                         | The live stream (`GET /api/v1/events`)                                                       | Run id, connector, mode, status, stage and counts                                                                                                                                   | The Run sync dialog, the connector pages and the overview         |
| `conflict.detected`, `conflict.resolved`, `mapping.proposed`, `mapping.approved` | The live stream                                                                              | Ids (and a conflict's field name), never values                                                                                                                                     | The Employees and Connectors pages refetch                        |

**For area 2.** Subscribe with `@OnEvent(DOMAIN_EVENTS.oaApprovalCompleted)`, validate the payload with `oaApprovalCompletedSchema`, ignore an `oaEventId` you have already handled (the outbox may deliver an event again), and enqueue the durable work on a BullMQ queue. Keep the handler thin, and throw only when the event could not be accepted: the handler runs after area 1's transaction has committed, and a throw marks the stored event `FAILED`.

## The web UI

- **Employees** ([`employees-page.tsx`](../../apps/web/src/features/employees/employees-page.tsx)): the list keeps its search, filters, sort and page in the URL; the record drawer shows the master beside each source, with masked values explained, the record's conflicts and its history, and links to its audit trail. A conflict is settled in a dialog that takes a deliberate press and hold (HoldButton), and the explainer runs from the same dialog (ThoughtLine).
- **Run sync** ([`run-sync-dialog.tsx`](../../apps/web/src/features/connectors/components/sync/run-sync-dialog.tsx)): preview, then apply with a slide or two taps (SlideCommit). The dialog follows the run live and polls when the live stream is down, and its description follows the outcome: in sync, applied, partly applied or failed, with errors translated by code.
- **Connectors** ([`connector-list-page.tsx`](../../apps/web/src/features/connectors/pages/connector-list-page.tsx), [`connector-detail-page.tsx`](../../apps/web/src/features/connectors/pages/connector-detail-page.tsx)): each system's status, health, last sync and mapping version, its settings and its sync history.
- **The mapping wizard** ([`mapping-wizard-page.tsx`](../../apps/web/src/features/connectors/pages/mapping-wizard-page.tsx)): upload a sample, review the proposal, then approve it for a new or an existing file connector, or reject it with a reason. The proposal's id is in the URL, so a review can be resumed or shared.

## Design patterns

| Pattern              | Where                              | Why                                                                             |
| -------------------- | ---------------------------------- | ------------------------------------------------------------------------------- |
| Adapter              | `SystemConnector` and its adapters | One class per system; the sync never sees a vendor's API                        |
| Factory              | `ConnectorFactory`                 | Adapters from configuration, credentials from the environment                   |
| Strategy             | Transformers; LLM providers        | A new transform or model is one class, chosen by configuration                  |
| Template Method      | `SyncPipeline`                     | Every sync runs the same five steps with the same counting and failure handling |
| Observer             | `DomainEventBus`, `@OnEvent`       | Area 2 reacts to OA approvals without area 1 knowing about it                   |
| Repository           | `*.repository.ts`                  | The only place Prisma is called                                                 |
| Transactional outbox | The stored OA webhook rows         | An event published after a crash is not lost                                    |

Each one, and the platform's, is described with its files in [patterns.md](../architecture/patterns.md).

## Extending area 1 after the client meeting

| To                                           | Do this                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Replace a mock with the client's real system | Change the adapter's base URL and credentials through the environment, and set the connector's `isMock` to false so the "Mock" badge goes. If the vendor's API differs, write a new class that implements `SystemConnector`, add a case to `ConnectorFactory`, and give it a mapping version. Check the source-timestamp field in [`source-timestamps.ts`](../../apps/api/src/modules/employees/source-timestamps.ts). |
| Connect a new subsidiary                     | Upload its HR export in the mapping wizard and approve the proposal for a new file connector, as the MY01 demo does ([A-23](../assumptions.md)). Add the entity's field-ownership rows.                                                                                                                                                                                                                                |
| Add a canonical field                        | Add it to the shared classification map and canonical schema, a Prisma migration, the masking classification and both locale files; then map it in each system's mapping.                                                                                                                                                                                                                                              |
| Add a transform                              | Add a `kind` to `transformSpecSchema`, one Strategy class in `transformers/`, register it, and add its unit test.                                                                                                                                                                                                                                                                                                      |
| Use a real model                             | Set `LLM_PROVIDER` (and `LLM_MODEL`) and the provider's credentials; the prompts already mark uploaded content as untrusted.                                                                                                                                                                                                                                                                                           |
| Change who owns a field                      | Change its `FieldSourcePolicy` row. Conflicts on that field stop opening once it has an owner.                                                                                                                                                                                                                                                                                                                         |
| Schedule syncs                               | A daily schedule is assumed ([A-50](../assumptions.md)); add a repeatable BullMQ job that starts a preview and an apply as the system user.                                                                                                                                                                                                                                                                            |

Open questions for the client are listed in [questions-for-client.md](../client/questions-for-client.md).

## Tests

| Kind            | Where                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Covers                                                                                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit            | `*.spec.ts` beside the code: [`mapping-engine.spec.ts`](../../apps/api/src/modules/mapping/mapping-engine.spec.ts), [`field-merger.spec.ts`](../../apps/api/src/modules/employees/domain/field-merger.spec.ts), [`field-masking.interceptor.spec.ts`](../../apps/api/src/common/interceptors/field-masking.interceptor.spec.ts), [`schema-mapping.spec.ts`](../../apps/api/src/modules/ai/schema-mapping/schema-mapping.spec.ts), [`sample-guards.spec.ts`](../../apps/api/src/modules/mapping/proposals/sample-guards.spec.ts) | Transformers, the field merge, masking, mapping-proposal validation                                                                                                        |
| API integration | [`integration-core.int-spec.ts`](../../apps/api/test/integration-core.int-spec.ts), [`mapping-proposals.int-spec.ts`](../../apps/api/test/mapping-proposals.int-spec.ts), [`oa-webhook.int-spec.ts`](../../apps/api/test/oa-webhook.int-spec.ts)                                                                                                                                                                                                                                                                                | Sync preview and apply, idempotency, conflicts and their resolution, masking by role, the wizard, webhook signatures and replays, with the mock systems running in-process |
| Web             | `*.test.tsx` in the two features and `components/reactbits`                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Each page's states, the sync dialog's outcomes, the wizard, the conflict decision, and every React Bits item's keyboard and reduced-motion behaviour                       |
| End to end      | [`smoke.spec.ts`](../../apps/web/e2e/smoke.spec.ts)                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Sign-in to an approved mapping through the Docker stack, with axe on every step                                                                                            |

Run them with `pnpm test` (the API integration tests need PostgreSQL and Redis, as the CI job provides) and `pnpm test:e2e` against `docker compose up --build`.

## Known limitations

- The real systems, their APIs and data volumes are unknown until the client meeting; every adapter talks to a mock ([A-20](../assumptions.md)).
- One sync runs at a time per API instance, and live updates fan out in-process; a multi-replica deployment would move them to Redis pub/sub ([ADR 0008](../adr/0008-jobs-events-realtime.md)).
- The mock model's mapping comes from a word list; a real model needs the prompts reviewed against real exports.
- Scheduled syncs are not built yet.
- Writing back to a system of record is not built yet. When it is, each write needs HR's explicit, audited approval of a preview, and it runs only against the mocks until the client agrees to writes ([Q-17](../client/questions-for-client.md)).
