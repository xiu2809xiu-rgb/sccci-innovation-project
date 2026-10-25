# Mock external systems

Until the interfaces of LESSO Solar's systems are known ([A-20](../assumptions.md)), HuiTong talks to three stand-ins: INFO-TECH in Singapore, and HQ's customised SAP and intranet. Their technical ids keep the names they were given first ([ADR 0022](../adr/0022-final-statement-7-lesso-solar.md)); so far only the Singapore mock behaves like its system, and the intranet's news, policies and claims come with story A-10. Each one deliberately looks like a different vendor, so the connector framework, the mapping engine and the consolidation are built against real-world friction rather than a tidy shared schema.

All data is synthetic, generated deterministically by [`@huitong/synthetic-data`](../../packages/synthetic-data/) (seed `20261020`): the same 120 people, the same drift and the same records on every start. No national ID numbers exist anywhere in the dataset.

| System                   | Package               | Port | Auth                    | Keys and formats                                                                                               |
| ------------------------ | --------------------- | ---- | ----------------------- | -------------------------------------------------------------------------------------------------------------- |
| INFO-TECH (Singapore HR) | `services/mock-sg-hr` | 4101 | `X-API-Key` header      | API: English camelCase, ISO dates, `page`/`pageSize`. Exports: CSV with English headers and `DD/MM/YYYY` dates |
| China HQ (SAP-like)      | `services/mock-cn-hq` | 4102 | HTTP Basic              | Chinese keys, `YYYY/MM/DD` values, `YYYYMMDD` query dates, string numbers, SAP codes, OData `$top`/`$skip`     |
| OA approvals             | `services/mock-oa`    | 4103 | `Authorization: Bearer` | English top level, Chinese form fields, HMAC-signed webhooks                                                   |

Default credentials (local only) are in [`.env.example`](../../.env.example). Every service answers `GET /health` without authentication.

## The synthetic workforce

- **120 employees:** 50 in `SG01` (Singapore) and 70 in `CN01` (HQ, Shanghai, Beijing and Shenzhen), across 11 departments.
- **Who appears where:**
  - SG HR holds the 50 Singapore staff.
  - CN HQ holds all 120: its own staff plus the Singapore staff as overseas employees.
- **Fixed people:** the seven demo users and two leaders always have the same numbers:
  - E100001 Li Guoqiang 李国强
  - E100002 Lim Wei Jie 林伟杰
  - E100003 Tan Mei Ling 谭美玲
  - E100004 Siti Rahmah
  - E100005 Zhou Xinyi 周欣怡
  - E100006 Arjun Menon
  - E100007 Nur Aisyah
  - E100008 Farhan Ismail
  - E100009 Grace Lim 林慧敏
- **Activity, Q3 2026 (1 July to 30 September):**
  - about 7,700 daily attendance records;
  - about 140 leave records, each in its system's own categories;
  - 25 OA requests across five request types.
- **Public holidays (synthetic):**
  - SG 10 August (National Day, observed);
  - CN 25 September (Mid-Autumn Festival).

### Deliberate drift (the conflicts HuiTong must find)

Eight Singapore employees differ between SG HR and CN HQ. Each difference has a story, so the conflict queue reads like real work:

| Field               | Stale system | Story                                                                    | Expected outcome (source-of-truth policy, [A-06](../assumptions.md)) |
| ------------------- | ------------ | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| `departmentCode`    | CN HQ        | Moved from Operations to Compliance in August; HQ still shows Operations | Open conflict (no single owner)                                      |
| `hireDate`          | CN HQ        | Keyed one month late when copied into SAP by hand                        | Open conflict                                                        |
| `workEmail`         | SG HR        | HQ IT reissued the address in the standard format; SG HR has the old one | Open conflict                                                        |
| `jobTitle`          | CN HQ        | Promoted to Senior Relationship Manager in September; HQ not yet updated | Open conflict                                                        |
| `workPhone`         | CN HQ        | Tan Mei Ling changed her work mobile                                     | SG HR wins automatically                                             |
| `employmentStatus`  | CN HQ        | Left at the end of August; offboarding never reached HQ                  | SG HR wins automatically                                             |
| `managerEmployeeNo` | CN HQ        | Reporting line moved; HQ has the previous manager                        | SG HR wins automatically                                             |
| `familyName`        | CN HQ        | The surname 吴 is "Ng" in Singapore and "Wu" in pinyin                   | SG HR wins automatically                                             |

`employeeAsSeenBy(employee, drift, system)` in the generator applies these, keeping related fields consistent. For example, an "active" leaver also has no termination date at HQ.

## INFO-TECH, the Singapore HR system (`mock-sg-hr`, port 4101)

| Method and path                                 | Purpose                                                     |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `GET /api/employees?page&pageSize&updatedSince` | Employees (pageSize ≤ 100, default 50), sorted by number    |
| `GET /api/employees/:employeeNo`                | One employee                                                |
| `POST /api/employees`                           | Create (used later by onboarding); 409 if the number exists |
| `PATCH /api/employees/:employeeNo`              | Partial update; the number cannot change                    |
| `GET /api/leave-types`                          | AL, SL, HL, CCL, ML, PL, CL, TOIL, NPL                      |
| `GET /api/attendance?from&to&page&pageSize`     | Daily attendance (pageSize ≤ 500)                           |
| `GET /api/leave?from&to&page&pageSize`          | Leave overlapping the range                                 |
| `GET /api/exports/employees.csv`                | Export: the employee master, as a CSV file                  |
| `GET /api/exports/leave.csv?from&to`            | Export: the leave that overlaps the range                   |
| `GET /api/exports/payroll.csv?month=YYYY-MM`    | Export: the month's payroll summary                         |
| `POST /api/_admin/employees/:employeeNo/update` | Demo: simulate an edit made directly in SG HR               |
| `POST /api/_admin/reset`                        | Demo: restore the generated dataset                         |

```bash
curl -H "X-API-Key: sg-hr-local-key" "http://localhost:4101/api/attendance?from=2026-08-11&to=2026-08-11&pageSize=1"
```

```json
{
  "data": [
    {
      "employeeNo": "E100002",
      "date": "2026-08-11",
      "clockIn": "10:03",
      "clockOut": "19:08",
      "status": "Late",
      "otHours": 1
    }
  ],
  "page": 1,
  "pageSize": 1,
  "total": 49
}
```

An employee record has `employeeNo`, `firstName` (given), `lastName` (family), `fullName` (as on the person's identity card), `preferredName`, `email`, `mobile` (`+65 9123 4567`), `department`, `departmentCode` (`SG-HR`), `jobTitle`, `employmentType` (Permanent, Contract, Part-Time, Intern), `status` (Active, Probation, On Leave, Resigned), `hireDate`, `resignationDate`, `dateOfBirth`, `basicSalary`, `currency`, `bankName`, `bankAccountNo`, `workLocation`, `reportsTo` and `lastModified`. SG HR has no job grade, cost centre or Chinese name. Errors look like `{ "error": "not_found", "message": "Employee E000000 not found" }`.

### INFO-TECH-style exports

We assume INFO-TECH hands HR spreadsheet exports besides any API ([A-59](../assumptions.md)), so the mock offers them: one file per dataset, in a layout we assume until the client shares a real export through the team's data folder ([Q-58](../client/questions-for-client.md)). The headers, the leave codes and the file names are ours, not INFO-TECH's.

- **File:** CSV, UTF-8 with a byte-order mark (as Excel's "CSV UTF-8" writes it), CRLF line ends, RFC 4180 quoting, downloaded as an attachment.
- **Headers:** English, in a spreadsheet's wording (`Employee No`, `Date Joined`, `Designation`).
- **Dates:** day first, `DD/MM/YYYY`; a pay period is `MM/YYYY`; "Applied On" is the day in Singapore. An empty cell means no value.
- **Values as they are:** like a vendor's export, the mock does not neutralise a cell that a spreadsheet would read as a formula (a value starting with `=`, `+`, `-` or `@`). HuiTong's own exports must (area 3, story D-4).
- **No national ID column** in any export. The employee master carries no pay or bank columns; the payroll summary carries the bank account in full, as a payroll export would, and HuiTong keeps only its last four digits.

| File                    | Columns                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `employees.csv`         | Employee No, Employee Name, Surname, Given Name, Preferred Name, Department Code, Department, Designation, Employment Type, Employee Status, Date Joined, Date Left, Date of Birth, Email, Mobile No, Reporting Officer, Work Location |
| `leave_<from>_<to>.csv` | Leave ID, Employee No, Employee Name, Leave Code, Leave Type, Date From, Date To, No. of Days, Half Day, Status, Applied On (the day in Singapore)                                                                                     |
| `payroll_<YYYY-MM>.csv` | Pay Period, Employee No, Employee Name, Department Code, Basic Salary, OT Hours, No-pay Leave Days, Currency, Bank Name, Bank Account No                                                                                               |

The payroll summary lists everyone on the books at any time in the month, with the overtime hours recorded that month and the approved no-pay leave days that fall inside it: a leave across a month end is split by its working days. It computes no statutory amounts such as CPF contributions.

```bash
curl -H "X-API-Key: sg-hr-local-key" "http://localhost:4101/api/exports/payroll.csv?month=2026-09"
```

```csv
Pay Period,Employee No,Employee Name,Department Code,Basic Salary,OT Hours,No-pay Leave Days,Currency,Bank Name,Bank Account No
09/2026,E100002,Lim Wei Jie,SG-EXEC,27100.00,11.25,0,SGD,OCBC Bank,934-284117-7
09/2026,E100003,Tan Mei Ling,SG-HR,6700.00,11.5,0,SGD,OCBC Bank,945-108766-6
```

The exports come from the same records as the API, so the fields they share agree; the employee master leaves pay and bank details to the payroll summary. The employee master export imports through a file connector and its approved mapping version (story [A-5](../agile/backlog.md#a-5-import-a-file-through-its-approved-mapping)): HR stages it on the connector's page and syncs it like any other source. An integration test reads the mock's export through a mapping that differs from the seeded SG HR mapping only in its column names and date layout, and leaves out the pay and bank fields the employee export does not carry, so a real INFO-TECH export can replace the mock's with only a mapping change. The leave file feeds area 3's leave ingestion (story D-1) and the payroll summary its single view (story D-6); the mapping engine has no targets for them yet.

## China HQ (`mock-cn-hq`, port 4102)

| Method and path                                                             | Purpose                                                                                             |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `GET /sap/opu/hr/employees?$top&$skip`                                      | All 120 employees (`$top` ≤ 200, default 50)                                                        |
| `GET /sap/opu/hr/employees/:employeeNo`                                     | One employee                                                                                        |
| `GET /sap/opu/hr/org-units`                                                 | Organisational units; 50001000 (executive office) is the root                                       |
| `GET /sap/opu/hr/leave-types`                                               | NJ 年假, BJ 病假, SJ 事假, TX 调休, HJ 婚假, CJ 产假, PCJ 陪产假, SANG 丧假, YEJ 育儿假, TQJ 探亲假 |
| `GET /sap/opu/hr/attendance?beginDate=YYYYMMDD&endDate=YYYYMMDD&$top&$skip` | CN01 attendance only                                                                                |
| `GET /sap/opu/hr/leave?beginDate&endDate&$top&$skip`                        | CN01 leave only                                                                                     |
| `POST /sap/opu/hr/_admin/employees/:employeeNo/update`                      | Demo: simulate an edit in SAP (timestamp in China Standard Time)                                    |
| `POST /sap/opu/hr/_admin/reset`                                             | Demo: restore the generated dataset                                                                 |

```bash
curl -u huitong_rfc:cn-hq-local-pass "http://localhost:4102/sap/opu/hr/leave?beginDate=20260701&endDate=20260930&\$top=1"
```

```json
{
  "返回码": "0",
  "消息": "成功",
  "数据": {
    "总数": 83,
    "列表": [
      {
        "请假单号": "QJ2026070001",
        "员工编号": "E100015",
        "假期类型": "年假",
        "假期代码": "NJ",
        "开始日期": "2026/07/01",
        "结束日期": "2026/07/03",
        "天数": "3.0",
        "半天": "",
        "审批状态": "已批准"
      }
    ]
  }
}
```

Things the connector has to handle:

- Every value is a string, and `""` means empty.
- `雇佣状态` is SAP STAT2: `3` is active (including probation and leave), `0` is withdrawn. Probation and leave sit in separate `试用期` and `休假中` flags.
- `用工类型` codes: 01 permanent, 02 contract, 03 intern, 04 part-time.
- `组织单位` is an 8-digit SAP org unit, mapped to the canonical department code.
- `英文名` is `FAMILY Given`, and `姓名` holds Chinese characters when the person has them.
- Singapore banks appear under their Chinese names (星展银行, 华侨银行, 大华银行).
- Errors look like `{ "返回码": "E404", "消息": "员工不存在" }`.

## OA approvals (`mock-oa`, port 4103)

| Method and path                                   | Purpose                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `GET /openapi/v1/approvals?type&status&page&size` | Requests, newest first (size ≤ 100)                                     |
| `GET /openapi/v1/approvals/:requestId`            | One request                                                             |
| `POST /openapi/v1/approvals`                      | Raise a request (`type`, `title`, `applicantEmployeeNo`, `formData`)    |
| `POST /openapi/v1/approvals/:requestId/actions`   | `{ action: APPROVE or REJECT, approver, comment? }` on the current node |
| `POST /openapi/v1/_simulate/manpower-request`     | Demo: Arjun Menon's Wealth Management request, approved at once         |
| `POST /openapi/v1/webhooks/subscriptions`         | `{ url, events: ["approval.completed"] }`                               |
| `GET /openapi/v1/webhooks/deliveries`             | Recent delivery attempts                                                |

Approval chains:

| Request type      | Nodes                              |
| ----------------- | ---------------------------------- |
| Manpower request  | 部门负责人审批 → HR审核 → 总部审批 |
| Expense claim     | 部门负责人审批 → 财务审核          |
| IT asset purchase | 部门负责人审批 → IT审核 → 财务审核 |
| Office rental     | 行政审核 → 财务审核 → 总部审批     |
| Payment approval  | 财务审核 → 总部审批                |

A request completes when the last node approves or any node rejects. The seeded data includes:

- four approved manpower requests;
- one manpower request pending at HR审核, for the demo;
- one rejected at 总部审批.

### Webhooks

On completion, OA posts this body to every subscriber:

```json
{
  "eventId": "<uuid>",
  "eventType": "approval.completed",
  "occurredAt": "<ISO>",
  "data": { "requestId": "OA-2026-000126", "...": "..." }
}
```

It also sends these headers:

- `X-OA-Event-Id: <eventId>`
- `X-OA-Timestamp: <unix seconds>`
- `X-OA-Signature: sha256=<hex HMAC-SHA256(OA_WEBHOOK_SECRET, "<timestamp>.<raw body>")>`

Failed deliveries are retried three times in total, after 1 s and 4 s. A receiver must:

1. verify the signature over the raw bytes, with a constant-time comparison;
2. reject timestamps more than 5 minutes old;
3. ignore an `eventId` it has already processed.

Docker compose sets `OA_WEBHOOK_URL` once the API's webhook endpoint exists (Phase 5).

## How HuiTong uses them

Each system sits behind a `SystemConnector` adapter in `apps/api/src/modules/connectors/`, created from its row in the `connectors` table (Factory), so swapping a mock for a real system is configuration:

1. change `baseUrl` and the credentials;
2. adjust the versioned field mapping;
3. keep the adapter if the vendor's API shape matches, otherwise add one adapter class.

The mapping engine turns these vendor shapes into the canonical employee model; the area 1 guide (`docs/team/area-1-integration-core.md`, added with the integration core) explains the pipeline.
