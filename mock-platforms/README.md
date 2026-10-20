# Mock platform exports

All records in this directory are invented for the school-project POC. Names,
addresses, IDs, requests, dates, and business details are synthetic; the
`.example` email domain is reserved for documentation and is not deliverable.

## Files

- `oa_approved_manpower_request.json` is one OA webhook-style approved
  manpower-request event. Its request ID, field names, timestamp, and
  organization labels are source-specific.
- `singapore_hr_leave_attendance.csv` is a Singapore HR export with one
  leave/attendance event for each of 20 distinct employees and a few roster
  fields. Dates use `DD/MM/YYYY`; `local_code` values are deliberately unmapped
  source codes. Rows combine leave and attendance events, so columns
  irrelevant to a row can be empty.
- `hq_employees.csv` is a China HQ export of 20 employees with Chinese headers
  and values. It has a separate `HQ-EMP-...` identifier scheme and ISO
  `YYYY-MM-DD` dates.

## Reconciliation exercise

The Singapore and HQ exports contain 10 overlapping employees, identifiable
by matching `Work Email` to `邮箱地址`; their source IDs do not match. Together
the two exports represent 30 distinct people. These overlaps include purposeful
conflicts, such as:

- `li.wei@example.com`: different department and employment status.
- `emily.chen@example.com`: different job title and hire date.
- `raj.kumar@example.com`: different department.
- `wang.mei@example.com`: English preferred name in Singapore versus Chinese
  name at HQ.

Other values differ only in language or formatting. Do not assume that every
different string indicates a business conflict. No mapping or reconciliation
logic is provided here; these are raw fixtures for connector exercises.
