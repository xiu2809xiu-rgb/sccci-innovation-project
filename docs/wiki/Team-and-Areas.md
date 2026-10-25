# Team and areas

Four ownership areas, so that each member owns, writes and can explain distinct code (85% of the module marks are individual).

| Area                                    | Owner              | Scope                                                                                                                                                           |
| --------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Integration core and platform        | Richie (team lead) | Connectors for the TMS and the agencies, master data, the mapping engine and its AI assistant, the per-agency allowlist, the tenant configuration, the platform |
| 2. Assessment capture and verification  | Azri               | The tablet checklist and its offline sync, the run's state machine, the verification queue, corrections with a reason, SLA reminders and notifications          |
| 3. Competency, submissions and insights | Iok Teck           | Course rules, competency calculation, the rule-drafting assistant, agency submission files, dashboards and insights                                             |
| 4. Governance, security and monitoring  | Angelyn            | Access administration, audit readiness, PDPA and retention, the agency allowlists, observability, clickstream, AI cost, AWS                                     |

The ownership guide, [module-ownership.md](https://github.com/xiu2809xiu-rgb/sccci-innovation-project/blob/main/docs/team/module-ownership.md), records each area's folders and the interfaces between the areas. Backup owners are agreed with story T-1, and then the GitHub usernames go into `.github/CODEOWNERS`, so pull requests ask the right reviewer.

Shared code (authentication, the app shell, the API client, queues, logging) belongs to area 1 and is changed through the shared-files protocol in the ownership guide.
