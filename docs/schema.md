# Canonical data model

This is the initial relational model for the integration POC. All persisted
entities use UUID primary keys. Timestamps are stored with timezone information;
`created_at` and `updated_at` are present on mutable business records, while
`SyncLog` and `AuditLog` use their event timestamps.

## Entities

| Entity | Purpose and key fields |
| --- | --- |
| `Employee` | Canonical employee record: employee number, display name, work email, department, job title, employment status, hire date, and optional national ID. Status starts as `draft`. Employee columns have explicit sensitivity metadata. |
| `ManpowerRequest` | A hiring request, with its requester, external request ID, role title, department, headcount, approval status, and approval timestamp. Headcount must be positive. |
| `OnboardingTask` | A task associated with a manpower request; it can optionally refer to the employee being onboarded and the user assigned to the task. |
| `LeaveRecord` | An employee's leave interval, source record, original category, normalized reporting category, quantity, and approval status. Date ranges and quantity are checked. |
| `SourceRecord` | Source-system identity and sync state: system name, entity type, original ID, optional canonical UUID, last-synced time, and raw JSON payload. `(system_name, entity_type, original_id)` is unique. |
| `SyncLog` | One connector run, with status, start/end times, record counts, and an error summary. |
| `AuditLog` | An append-oriented event record with optional actor, action, entity type/UUID, JSON change details, and timestamp. The entity reference is generic rather than a foreign key. |
| `User` | Application identity with unique email, active flag, and assigned roles. A nullable password hash is reserved for a future authentication integration; password handling is not implemented here. |
| `Role` | A named role with a unique key and a JSON list of explicit field grants. `User` and `Role` are connected many-to-many. |

## Relationships

- A `ManpowerRequest` can have many `OnboardingTask` records.
- An `OnboardingTask` can refer to one `Employee` and optionally be assigned to a
  `User`.
- An `Employee` can have many `LeaveRecord` records.
- A `LeaveRecord` can link to its `SourceRecord`.
- A `User` can submit manpower requests, be assigned onboarding tasks, act in
  audit events, and have multiple roles.
- `SourceRecord.canonical_id` and `AuditLog.entity_id` are polymorphic UUID
  references; their accompanying `entity_type` identifies the canonical entity.

## Employee field sensitivity

Sensitivity appears in SQLAlchemy column `info`, database column comments, and
Pydantic JSON Schema metadata. The stable labels are `public`, `hr_only`, and
`restricted`.

| Employee field | Sensitivity |
| --- | --- |
| `id`, `display_name` | `public` |
| `employee_number`, `work_email`, `department`, `job_title`, `employment_status`, `hire_date`, `created_at`, `updated_at` | `hr_only` |
| `national_id` | `restricted` |

`Role.field_permissions` is a storage point for explicit grants, conventionally
qualified as `<entity>.<field>` (for example, `employee.national_id`). These
labels and grants are metadata only: this POC does not yet filter API responses
or enforce authorization. Raw source payloads and audit change details may
contain personal data and must be handled accordingly.

## Migrations

The first Alembic revision creates the canonical tables. From the repository
root, start the services and apply it inside the API container:

```sh
docker compose up --build -d
docker compose exec api alembic upgrade head
```

The mock employee connectors are invoked explicitly after applying migrations:
`POST /sync/singapore_hr` and `POST /sync/hq`. Both create `SyncLog` entries and
upsert employees by work email. Each imported source row is retained as a
`SourceRecord`; later imports update that source record and link to the
canonical employee. When sources disagree, the latest successfully synced
non-empty source value wins for mapped fields, while the first imported
employee number is retained.

To create a future migration interactively from the backend directory, run
`alembic revision --autogenerate -m "describe change"` and review the generated
revision before applying it. The application model metadata is the migration
source of truth.
