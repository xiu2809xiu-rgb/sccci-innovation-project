# Security policy

HuiTong 汇通 is a student proof of concept (IT2134, Nanyang Polytechnic) that runs on **synthetic data only**. It holds no real employee records and never stores national ID numbers. Security problems in the code or its setup still matter to us, and we fix them.

## Reporting a vulnerability

Report it privately, never in a public issue or pull request:

1. Open the repository's **Security** tab and choose **Report a vulnerability** (GitHub private vulnerability reporting).
2. Describe what you found, how to reproduce it, and what an attacker could do with it.

We acknowledge a report within three working days. A confirmed problem is fixed in a pull request that refers to the advisory, and we credit the reporter in the advisory unless they would rather not be named.

## What is in scope

- The code in this repository: the web app, the API, the mock systems and the shared packages.
- The build and deployment setup: workflows, Dockerfiles, `docker-compose.yml` and `infra/`.

The mock systems imitate third-party products with made-up data. Weaknesses in the real products they stand for are out of scope.

## How the project checks itself

| Practice                                | Where                                                  |
| --------------------------------------- | ------------------------------------------------------ |
| Static analysis (SAST) with CodeQL      | `.github/workflows/codeql.yml`                         |
| Dependency review on every pull request | `.github/workflows/dependency-review.yml`              |
| Dependency audit in CI                  | `pnpm audit` in `.github/workflows/ci.yml`             |
| Dependabot alerts and version updates   | `.github/dependabot.yml`                               |
| Secret scanning with push protection    | Repository settings; a local licence-key guard         |
| Container and configuration scanning    | Trivy in `ci.yml` and `security.yml`                   |
| Supply-chain review                     | OpenSSF Scorecard in `.github/workflows/scorecard.yml` |

The details, and how to triage each kind of finding, are in [docs/security/security-testing.md](docs/security/security-testing.md).
