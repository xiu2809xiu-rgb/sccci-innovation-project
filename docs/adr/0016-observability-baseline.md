# ADR 0016: Observability baseline and first-party clickstream analytics

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M2, M4, M6 · capability G

## Context

M6 requires observability (W14), clickstream analytics (W15) and AI token usage tracking (W16), each with an in-app dashboard. The work is split between two owners ([module ownership](../team/module-ownership.md)). Area 1 owns logging, health checks, the telemetry bootstrap and the recording of clickstream and AI usage. Area 4 owns tracing, metrics, the dashboards, the analytics built on the recorded data, and CloudWatch.

Forces:

- **Correlation from the first endpoint.** Areas 2–4 build their endpoints in W8–W12. Every error envelope carries a `traceId`, and a user's error report must lead to the matching log lines long before OpenTelemetry lands.
- **Health checks gate deployment:** Docker, docker compose `depends_on`, and the load balancer and ECS on AWS ([ADR 0014](0014-deployment-docker-aws.md)).
- **Users in mainland China.** Google Analytics and many SaaS endpoints are blocked or unreliable there ([R-15](../grs/grs-by-design.md#32-register)).
- **Privacy.** Behavioural data about identifiable employees is personal data. Sending it to a SaaS vendor would add a processor and a cross-border transfer for both SG01 and CN01 users ([R-01, R-02](../grs/grs-by-design.md#32-register)).
- **Success metrics need product data,** for example active time on the consolidation screens ([problem statement 2.6](../problem-statement.md#26-success-metrics)).

## Decision

**1. Baseline, built now by area 1.**

- **Structured logs.** nestjs-pino 5 with pino 10, as JSON on stdout: one line per request, plus application events. Each line carries the request id, the internal user id (never an email), the route pattern, the status and the duration. Cookie, authorisation and CSRF headers are redacted, and no CONFIDENTIAL or RESTRICTED values are logged. The mock services log the same way.
- **Correlation.** `X-Request-Id` is accepted if it is a valid UUID and generated otherwise. It is echoed on the response, attached to every log line, carried into BullMQ job data and outbound connector calls, and returned as `traceId` in the error envelope.
- **Health.** `@nestjs/terminus` 12, with its `HealthIndicatorService` API for custom indicators. `/health/live` reports that the process is alive, and `/health` reports readiness (PostgreSQL and Redis). Both sit outside `/api/v1` and report only up or down, never versions or hostnames.
- **Telemetry bootstrap.** A module in `apps/api/src/infrastructure/telemetry/`, loaded with `node --import` before the application, because OpenTelemetry's auto-instrumentation must hook ESM imports at start-up ([ADR 0004](0004-typescript-6-esm.md)).

**2. Built by area 4 in W14–W16.**

- OpenTelemetry traces across API requests, BullMQ jobs and connector calls, propagated with W3C trace context. Once traces exist, the span's trace id replaces the request id as `traceId`.
- prom-client metrics at `/metrics`: request latency, queue depth, job and sync outcomes per connector, webhook verification results and AI tokens. The endpoint is reachable inside the network but is not routed through the public web origin.
- CloudWatch logs, metrics and alarms on AWS. The local dashboard tooling (Grafana, for example) is the owner's choice.
- The `/analytics` tabs for observability, clickstream and AI usage.

**3. First-party clickstream.**

- **Browser (area 1).** The `AnalyticsTracker` class batches events and sends them with `fetch` and `keepalive`, including when the tab is being hidden. It sends route patterns (`/employees/:id`), never raw URLs, query strings, input values or page text. Events carry a random per-session id and the viewer's role, not the user id. When the consent toggle in `/settings` is off or the browser signals Global Privacy Control, nothing is sent.
- **Ingest (area 1).** `POST /api/v1/analytics/events` validates each batch against a closed zod schema (allow-listed event names and properties, size limits), is rate-limited, and stores raw `ClickstreamEvent` rows without IP addresses.
- **Analytics (area 4).** Funnels and page statistics built on those rows. Raw events are kept for 13 months, and aggregates after that ([GRS 2.8](../grs/grs-by-design.md#28-retention-defaults)).

**4. AI usage.** `AiUsageTracker` records every model call ([ADR 0011](0011-ai-gateway-human-in-the-loop.md)), and area 4's dashboard, budgets and alerts read those records.

## Consequences

### Positive

- Every error a user sees can be traced from day one, before tracing exists.
- Behavioural data never leaves HuiTong, so the same access control, retention and audit apply to it as to everything else.
- The app behaves the same for users in Singapore and in mainland China, and the CSP keeps `connect-src 'self'`.
- Area 4 extends a working baseline instead of retrofitting logging into four areas' code.

### Negative

- We build analytics that a SaaS tool would provide; funnels and page statistics are area 4's work, not a settings screen.
- Without user ids, individual journeys cannot be analysed. This is a deliberate privacy trade-off.
- Consent choices and Global Privacy Control leave gaps in the data, and the dashboards must say so.
- Request ids and trace ids coexist until W14, and the switch must not break saved log searches.

## Alternatives considered

| Option                                                      | Why rejected                                                                                                                                    |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Analytics 4                                          | Blocked in mainland China, and it sends employees' behaviour to a third party                                                                   |
| SaaS product analytics (Mixpanel, Amplitude, PostHog Cloud) | A new processor and a cross-border transfer for SG01 and CN01 users, extra CSP origins, and data outside our retention controls                 |
| Self-hosted PostHog, Matomo or Plausible                    | Privacy-friendly and capable, but another stateful system to run (PostHog alone brings ClickHouse), and the analytics is area 4's assessed work |
| SaaS APM (Datadog, New Relic, Sentry)                       | Cost, and telemetry that may contain personal data leaves our boundary. OpenTelemetry keeps the exporter choice open                            |
| Winston or `console` logging                                | pino is faster, writes structured JSON by default and carries request context in Nest through nestjs-pino                                       |
| No correlation until OpenTelemetry (W14)                    | Areas 2–4 need correlated logs and `traceId`s while they build in W8–W12                                                                        |

## Amendment, 21 Oct 2026: the telemetry bootstrap

Decision 1 lists the telemetry bootstrap among what area 1 builds now. The platform build did not build it. Its prompt leaves OpenTelemetry, metrics and Grafana to area 4's owner, and an empty module would only have looked like tracing that does not exist.

- **Who builds it.** Area 4 writes the bootstrap with the tracing it starts (G-1, W14), so one person owns the exporter choice from start to finish.
- **Why area 1 still reviews it.** The bootstrap loads with `node --import` before every area's code, so it changes through the shared-files protocol in [module ownership](../team/module-ownership.md#shared-files-protocol), with area 1 as reviewer.
- **Unchanged until then.** The request id (`X-Request-Id`) is the error envelope's `traceId` and is on every log line, as decision 1 describes, so every error a user sees can already be traced to its logs.
