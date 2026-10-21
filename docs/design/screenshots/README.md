# Screenshots

Every page of HuiTong in the light and dark themes, and in Chinese where the area captured it. All of them were taken with Playwright from the Docker stack:

- synthetic demo data
- a 1440 × 900 viewport
- reduced motion
- the Singapore time zone

Each area's folder also keeps the states and moments its pull requests showed, such as dialogs, masked fields and the mapping wizard's steps.

| Page              | Route                        | Light                                                       | Dark                                                            | 中文                                                     |
| ----------------- | ---------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| Sign-in           | `/login`                     | [sign-in-light](platform/sign-in-light.png)                 | [sign-in-dark](platform/sign-in-dark.png)                       |                                                          |
| Overview          | `/overview`                  | [overview-light](platform/overview-light.png)               | [overview-dark](platform/overview-dark.png)                     | [overview-zh](platform/overview-zh.png)                  |
| Employees         | `/employees`                 | [employees-light](employees/employees-light.png)            | [employees-dark](employees/employees-dark.png)                  | [employees-zh](employees/employees-zh.png)               |
| Connectors        | `/connectors`                | [connectors-light](connectors/connectors-light.png)         | [connectors-dark](connectors/connectors-dark.png)               | [connectors-zh](connectors/connectors-zh.png)            |
| Connector detail  | `/connectors/:connectorId`   | [connector-detail](connectors/connector-detail.png)         | [connector-detail-dark](connectors/connector-detail-dark.png)   |                                                          |
| New mapping       | `/connectors/new-mapping`    | [wizard-upload](connectors/wizard-upload.png)               | [wizard-upload-dark](connectors/wizard-upload-dark.png)         | [wizard-review-zh](connectors/wizard-review-zh.png)      |
| Integration map | `/integration-map` | [integration-map-light](platform/integration-map-light.png) | [integration-map-dark](platform/integration-map-dark.png) | [integration-map-zh](platform/integration-map-zh.png) |
| Workflow board    | `/workflows`                 | [board-light](workflows/board-light.png)                    | [board-dark](workflows/board-dark.png)                          | [board-zh](workflows/board-zh.png)                       |
| Workflow timeline | `/workflows?view=timeline`   | [timeline](workflows/timeline.png)                          | [timeline-dark](workflows/timeline-dark.png)                    |                                                          |
| Workflow instance | `/workflows/:instanceId`     | [instance-light](workflows/instance-light.png)              | [instance-dark](workflows/instance-dark.png)                    | [instance-zh](workflows/instance-zh.png)                 |
| My tasks          | `/workflows/tasks`           | [tasks-light](workflows/tasks-light.png)                    | [tasks-dark](workflows/tasks-dark.png)                          | [tasks-zh](workflows/tasks-zh.png)                       |
| Consolidation     | `/attendance-leave`          | [runs-light](attendance-leave/runs-light.png)               | [runs-dark](attendance-leave/runs-dark.png)                     | [runs-zh](attendance-leave/runs-zh.png)                  |
| Category rules    | `/attendance-leave/mappings` | [rules-light](attendance-leave/rules-light.png)             | [rules-dark](attendance-leave/rules-dark.png)                   | [rules-zh](attendance-leave/rules-zh.png)                |
| Template preview  | `/attendance-leave/template` | [template-light](attendance-leave/template-light.png)       | [template-dark](attendance-leave/template-dark.png)             | [template-zh](attendance-leave/template-zh.png)          |
| Reports           | `/reports`                   | [report-light](attendance-leave/report-light.png)           | [report-dark](attendance-leave/report-dark.png)                 | [report-zh](attendance-leave/report-zh.png)              |
| Access            | `/governance`                | [access-light](governance/access-light.png)                 | [access-dark](governance/access-dark.png)                       | [access-zh](governance/access-zh.png)                    |
| Classification    | `/governance/classification` | [classification-light](governance/classification-light.png) | [classification-dark](governance/classification-dark.png)       |                                                          |
| Transfers         | `/governance/transfers`      | [transfers-light](governance/transfers-light.png)           | [transfers-dark](governance/transfers-dark.png)                 | [transfers-zh](governance/transfers-zh.png)              |
| Retention         | `/governance/retention`      | [retention-light](governance/retention-light.png)           | [retention-dark](governance/retention-dark.png)                 |                                                          |
| Audit log         | `/governance/audit`          | [audit-light](governance/audit-light.png)                   | [audit-dark](governance/audit-dark.png)                         | [audit-zh](governance/audit-zh.png)                      |
| Observability     | `/analytics`                 | [observability-light](analytics/observability-light.png)    | [observability-dark](analytics/observability-dark.png)          | [observability-zh](analytics/observability-zh.png)       |
| Clickstream       | `/analytics/clickstream`     | [clickstream-light](analytics/clickstream-light.png)        | [clickstream-dark](analytics/clickstream-dark.png)              | [clickstream-zh](analytics/clickstream-zh.png)           |
| AI usage          | `/analytics/ai-usage`        | [ai-usage-light](analytics/ai-usage-light.png)              | [ai-usage-dark](analytics/ai-usage-dark.png)                    | [ai-usage-zh](analytics/ai-usage-zh.png)                 |
| Settings          | `/settings`                  | [settings-light](platform/settings-light.png)               | [settings-dark](platform/settings-dark.png)                     |                                                          |
| Not found         | any unknown path             | [not-found-light](platform/not-found-light.png)             | [not-found-dark](platform/not-found-dark.png)                   |                                                          |

The integration map's folder keeps three more moments: a pod's name on hover ([hover-light](integration-map/hover-light.png)), the scene running in the dark theme with its pause control ([running-dark](integration-map/running-dark.png), taken with motion on) and the still shown without WebGL ([no-webgl-light](integration-map/no-webgl-light.png)).
