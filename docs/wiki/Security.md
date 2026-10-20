# Security

Report a vulnerability privately from the repository's **Security** tab (**Report a vulnerability**), never in a public issue. The policy is in [SECURITY.md](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/main/SECURITY.md).

## What runs on every pull request

- **SAST:** CodeQL over JavaScript and TypeScript (it understands React, JSX and NestJS) and over the GitHub workflows.
- **Dependency review:** blocks a high or critical vulnerability, or an AGPL, GPL-3 or SSPL licence.
- **Images and configuration:** Trivy scans every Docker image and the Dockerfiles, compose file and `infra/`.
- **Tests:** access control, masking, CSRF, token reuse and webhook signatures are covered by integration tests.

Dependabot, secret scanning with push protection and the OpenSSF Scorecard run continuously or weekly. A DAST scan joins once the demo is deployed.

Every layer, and what to do with a finding, is explained in [security-testing.md](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/main/docs/security/security-testing.md).
