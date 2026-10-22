# ADR 0014: Docker images locally and AWS as the cloud target

- **Status:** Accepted
- **Date:** 2026-10-20
- **Traceability:** M2, M4, M6 · capabilities F, G

## Context

M6 requires a cloud deployment with observability, and `docker compose up --build` from a clean clone must bring up the whole stack with seeded data. `CLAUDE.md` names the AWS target: ECS Fargate or App Runner, RDS PostgreSQL, ElastiCache, S3 + CloudFront, CloudWatch and Secrets Manager.

Forces:

- **Windows laptops.** The team runs Docker Desktop on Windows; images must behave the same there, in CI and on AWS.
- **Security.** Non-root containers, health checks and secrets kept out of images (M4.1-16).
- **Unknown residency rules.** Where the client's employee data may be stored is open (A-15, Q-37), as is critical information infrastructure status (A-13, Q-38) and the SG–CN network (A-19, Q-16). Wherever the hub sits, the other entity's data crosses a border to reach it ([R-01, R-02](../grs/grs-by-design.md#32-register)).
- **Mainland China is a different cloud.** AWS's China regions form a separate partition.

## Decision

**1. Images** in `infra/docker/`, multi-stage and pinned to exact base-image tags.

- **Node services** (the API and the three mocks) on `node:24` Alpine: `pnpm fetch` from the lockfile, an offline frozen install, the build, then `pnpm deploy --prod` into a minimal runtime stage. Files stay root-owned and the process runs as the unprivileged `node` user, so the app cannot modify its own code.
- **Web:** the Vite build served by unprivileged nginx on port 8080, with a strict CSP and other security headers, an SPA fallback, long-lived caching for fingerprinted assets, a proxy for `/api/` and an unbuffered route for `/api/v1/events` ([ADR 0008](0008-jobs-events-realtime.md)).
- Every image declares a `HEALTHCHECK`: `/health/live` for the API, `/health` for the mocks, `/healthz` for nginx.

**2. Local stack.** `docker-compose.yml` runs PostgreSQL 18, Redis 8, the API, the web app and the three mocks, with a health check on every service and `depends_on` health conditions. The API migrates and seeds on start ([ADR 0007](0007-prisma-postgresql.md)). Secrets come from an untracked `.env`, and `.env.example` documents every variable with a local-only default.

**3. AWS target,** built by area 4 and documented in `infra/aws/`, in **ap-southeast-1 (Singapore)**:

| Concern            | Service                                                                                                                                                                                                     |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web                | A private S3 bucket behind CloudFront. CloudFront also routes `/api/*` to the API, so the app stays same-origin and `SameSite=Strict` cookies keep working ([ADR 0010](0010-auth-sessions-rbac-masking.md)) |
| API and mocks      | ECS Fargate services behind an Application Load Balancer in private subnets; App Runner is the simpler alternative for a demo. Mocks run only in demo environments                                          |
| Data               | RDS for PostgreSQL 18 (KMS encryption, TLS required, automated backups, Multi-AZ for production) and ElastiCache (Valkey or Redis OSS, with `noeviction` for BullMQ)                                        |
| Secrets and access | Secrets Manager values injected into tasks as environment variables; task IAM roles for Bedrock and other AWS services                                                                                      |
| Monitoring         | CloudWatch logs (pino JSON on stdout), metrics and alarms ([ADR 0016](0016-observability-baseline.md))                                                                                                      |
| Delivery           | Images in Amazon ECR. GitHub Actions deploys through OIDC federation, so no long-lived AWS keys are stored in GitHub                                                                                        |

The infrastructure-as-code tool is area 4's choice, recorded in its own ADR. The demo environment scales down outside demo windows and uses Graviton (ARM64) where dependencies allow.

**4. China-side data.** The PoC runs in Singapore with synthetic data only, so no real transfer takes place. In production, CN01 personal data may have to stay in mainland China: PIPL Arts. 38–39 require a mechanism for every transfer out, and Art. 40 requires local storage if HQ is a critical information infrastructure operator. That would mean a second deployment in AWS's China regions (cn-north-1 Beijing, operated by Sinnet; cn-northwest-1 Ningxia, operated by NWCD). They form a separate partition with separate accounts and credentials, need ICP filing for public endpoints and MLPS grading, and some services arrive there later or not at all. Such a deployment would be operated separately, by or for HQ IT, from the same images and configuration, with only register-approved, minimised flows between the two. One hub or regional deployments is a later ADR, once Q-37 to Q-39 are answered. These are design considerations, not legal advice.

## Consequences

### Positive

- One set of images runs on laptops, in CI and on AWS, and `docker compose up --build` is the shared definition of "it works".
- Non-root, health-checked containers and external secrets meet M4.1-16 and give the client's IT review evidence to check (Q-54).
- Static hosting leaves no web server to patch on AWS, and same-origin routing keeps the cookie and CSP design intact.
- Region-agnostic images and configuration keep a China-side deployment possible without a redesign.

### Negative

- Docker Desktop on Windows is slower than native Linux, especially with bind mounts. Day-to-day development runs the apps natively and uses compose for the databases and the full-stack check.
- ECS, the load balancer, RDS and ElastiCache cost money even when idle, so the demo environment must be scaled down deliberately.
- A China-side deployment would double operations and need China-specific approvals.
- If the client prefers another cloud or on-premises hosting (Q-55), `infra/aws/` is rewritten, although the images carry over.

## Alternatives considered

| Option                                      | Why rejected                                                                                                                                                                                                                                |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amazon EKS (Kubernetes)                     | Far more to operate and explain than four kinds of service need                                                                                                                                                                             |
| One EC2 instance running docker compose     | Cheapest and simplest, but manual patching, no managed backups or high availability, and a weaker deployment story for M6                                                                                                                   |
| AWS Lambda with API Gateway                 | A poor fit for NestJS with BullMQ workers and long-lived SSE streams                                                                                                                                                                        |
| Hosting platforms such as Render or Railway | Less control over region, network isolation and data residency, and not where the client's IT would run it                                                                                                                                  |
| Alibaba Cloud or Azure                      | Credible for the client (Alibaba Cloud in China; Azure if the Singapore office runs on Microsoft 365, which is to confirm). `CLAUDE.md` fixes AWS for the PoC, and the containers are portable if the client chooses otherwise (Q-37, Q-55) |
