# ADR 0013: Mock external systems as separate Express services

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M1, M2, M4 · capabilities A, B, C, D

## Context

HuiTong's value lies in connecting systems that disagree, yet until the first client meeting we know none of Organisation E's real systems ([R-16](../grs/grs-by-design.md#32-register)):

- the SG HR product, its API and its field names (A-01, Q-01, Q-12);
- HQ's SAP-like HR system and its customisations (A-02, Q-02);
- the OA product, and whether it can send signed webhooks (A-03, Q-03, Q-13);
- the shared employee number, and whether SG staff also sit in HQ's system (A-04, A-05, Q-04, Q-05);
- the volumes (A-11, Q-19).

Sandbox access may never arrive this semester (Q-15), and the PoC uses synthetic data only, with no national ID numbers. Even so, the connector hub, conflict detection, workflow triggers and attendance consolidation all need realistic and _different_ sources to work against. The demo needs systems the client recognises, and the tests need the same data every time.

## Decision

We will run **each external system as a separate Express 5 + TypeScript + zod service** in `services/`, with its own container, port and deliberately different conventions:

| Service      | Port | Stands in for                                                 | Conventions                                                                                                                                                                                                                                                         |
| ------------ | ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mock-sg-hr` | 4101 | Singapore's locally compliant HR, attendance and leave system | English keys, ISO 8601 dates, `page`/`pageSize` pagination, department names with codes such as `SG-COMP`, SG leave names (Annual Leave, Time-off in Lieu)                                                                                                          |
| `mock-cn-hq` | 4102 | HQ's SAP HCM-like system                                      | Chinese keys (员工编号, 姓名, 部门编码, 入职日期), `YYYY/MM/DD` dates, SAP-style codes (雇佣状态 "3" means active), 8-digit org units such as `50001030`, the envelope `{ 返回码, 消息, 数据: { 总数, 列表 } }`, CN leave names (年假, 调休, 探亲假)                |
| `mock-oa`    | 4103 | The OA approvals platform                                     | Five approval types (`MANPOWER_REQUEST`, `OFFICE_RENTAL`, `EXPENSE_CLAIM`, `IT_ASSET_PURCHASE`, `PAYMENT_APPROVAL`); webhooks signed with `X-OA-Signature: sha256=<hex of HMAC(secret, timestamp + "." + rawBody)>`, alongside `X-OA-Event-Id` and `X-OA-Timestamp` |

**One synthetic dataset.** A deterministic generator in `packages/synthetic-data` (seeded pseudo-random, with a fixed default seed) produces the people that every mock renders in its own format:

- about 120 employees: about 50 SG01 staff who appear in SG HR _and_ in CN HQ as overseas staff, and about 70 CN01 staff in CN HQ only;
- mixed English, Malay, Indian and Chinese names, HQ-assigned numbers `E1xxxxx` and emails `firstname.lastname@orge.example`;
- departments, positions and three months of attendance and leave;
- deliberate discrepancies for about 10–15% of SG01 staff (job title, department, phone, hire date, email), which drive conflict detection;
- the legacy Excel master and the MY01 sample export for the AI mapping wizard.

No mock serves national ID numbers or gender. The MY01 sample carries an identity-number column header with non-numeric placeholder values, so the wizard's national-ID block can be shown without any ID-shaped data in the repository.

**Realistic behaviour.** Each mock requires credentials, validates its own requests with zod, and can inject latency and errors (429, 500) through configuration. `mock-oa` retries undelivered webhooks and can send duplicates or stale timestamps on request, so idempotency and the 5-minute replay window can be shown rather than claimed.

**Independence.** The mocks share only the generator. They never import the API's connector code or the canonical schemas for their wire formats, so shared code cannot hide a connector bug ([ADR 0009](0009-shared-zod-contracts.md)).

**Swapping in real systems.** `ConnectorFactory` builds connectors from configuration rows: type, base URL, credentials reference and active mapping version ([ADR 0002](0002-integration-layer-hub-and-spoke.md)). A real system of a known type is a configuration change; a new protocol (SAP OData or BAPI, SFTP file drops) is one new adapter. The mocks then remain as test doubles and as the demo environment.

## Consequences

### Positive

- The integration problem is real in the PoC: different languages, date formats, codes, envelopes and credentials, over a real network.
- The same people appear consistently in every system, test and demo.
- Failure handling (retries, duplicates, replay, schema drift) can be demonstrated on demand.
- Each mock shows its own live status in connector health and on the 3D integration map.

### Negative

- The mocks encode our assumptions. If the real systems differ, the adapters and mappings change (they are designed to), and so do the mocks.
- Three more services to build, run and keep healthy in compose.
- Synthetic data holds none of the real-world quirks we have not thought of; structure-only client samples (Q-50) close that gap.

## Alternatives considered

| Option                                           | Why rejected                                                                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| In-process HTTP mocks (MSW, nock)                | Good for unit tests, and still used there, but no real network behaviour, no webhooks and nothing to show in a demo |
| WireMock or Prism stubs from OpenAPI specs       | No vendor specs exist yet, and static stubs do not model state, HMAC signing or redelivery                          |
| One combined mock service                        | Simpler, but it blurs the system boundaries and cannot show one system failing while the others work                |
| Random data on every request (Faker at run time) | Tests become non-deterministic, and the same person would not match across systems                                  |
| Vendor sandboxes                                 | Not available before the client meeting (Q-15); the adapters switch to them when they are                           |
| Client data exports                              | Ruled out: synthetic data only. Q-50 asks for structures, not records                                               |
