from datetime import date, datetime
from decimal import Decimal
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.core.sensitivity import Sensitivity


class EntitySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class EmployeeSchema(EntitySchema):
    id: UUID = Field(json_schema_extra={"sensitivity": Sensitivity.PUBLIC.value})
    employee_number: str | None = Field(
        default=None,
        json_schema_extra={"sensitivity": Sensitivity.HR_ONLY.value},
    )
    display_name: str = Field(
        json_schema_extra={"sensitivity": Sensitivity.PUBLIC.value}
    )
    work_email: str | None = Field(
        default=None,
        json_schema_extra={"sensitivity": Sensitivity.HR_ONLY.value},
    )
    department: str | None = Field(
        default=None,
        json_schema_extra={"sensitivity": Sensitivity.HR_ONLY.value},
    )
    job_title: str | None = Field(
        default=None,
        json_schema_extra={"sensitivity": Sensitivity.HR_ONLY.value},
    )
    employment_status: Literal["draft", "active", "on_leave", "terminated"] = Field(
        json_schema_extra={"sensitivity": Sensitivity.HR_ONLY.value}
    )
    hire_date: date | None = Field(
        default=None,
        json_schema_extra={"sensitivity": Sensitivity.HR_ONLY.value},
    )
    national_id: str | None = Field(
        default=None,
        json_schema_extra={"sensitivity": Sensitivity.RESTRICTED.value},
    )
    created_at: datetime = Field(
        json_schema_extra={"sensitivity": Sensitivity.HR_ONLY.value}
    )
    updated_at: datetime = Field(
        json_schema_extra={"sensitivity": Sensitivity.HR_ONLY.value}
    )


class ManpowerRequestSchema(EntitySchema):
    id: UUID
    requested_by_user_id: UUID | None = None
    external_request_id: str | None = None
    role_title: str
    department: str
    headcount: int = Field(gt=0)
    status: Literal["draft", "pending", "approved", "rejected", "cancelled"]
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class OnboardingTaskSchema(EntitySchema):
    id: UUID
    manpower_request_id: UUID
    employee_id: UUID | None = None
    assigned_to_user_id: UUID | None = None
    title: str
    description: str | None = None
    status: Literal["pending", "in_progress", "completed", "cancelled"]
    due_date: date | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class LeaveRecordSchema(EntitySchema):
    id: UUID
    employee_id: UUID
    source_record_id: UUID | None = None
    original_category: str | None = None
    reporting_category: str
    start_date: date
    end_date: date
    quantity: Decimal = Field(gt=0)
    status: Literal["pending", "approved", "rejected", "cancelled"]
    created_at: datetime
    updated_at: datetime


class SourceRecordSchema(EntitySchema):
    id: UUID
    system_name: str
    entity_type: str
    original_id: str
    canonical_id: UUID | None = None
    last_synced_at: datetime | None = None
    raw_payload: dict[str, Any]
    created_at: datetime
    updated_at: datetime


class SyncLogSchema(EntitySchema):
    id: UUID
    system_name: str
    status: Literal["running", "succeeded", "partial", "failed"]
    started_at: datetime
    finished_at: datetime | None = None
    records_read: int = Field(ge=0)
    records_created: int = Field(ge=0)
    records_updated: int = Field(ge=0)
    records_failed: int = Field(ge=0)
    error_summary: str | None = None


class AuditLogSchema(EntitySchema):
    id: UUID
    actor_user_id: UUID | None = None
    action: str
    entity_type: str
    entity_id: UUID
    changes: dict[str, Any]
    created_at: datetime


class RoleSchema(EntitySchema):
    id: UUID
    key: str
    name: str
    description: str | None = None
    field_permissions: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class UserSchema(EntitySchema):
    id: UUID
    email: str
    is_active: bool
    roles: list[RoleSchema] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
