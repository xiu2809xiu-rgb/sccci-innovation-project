from sqlalchemy import inspect

from app.core.sensitivity import Sensitivity
from app.models import (
    AuditLog,
    Employee,
    LeaveRecord,
    ManpowerRequest,
    OnboardingTask,
    Role,
    SourceRecord,
    SyncLog,
    User,
)
from app.schemas import EmployeeSchema


def test_all_requested_entities_are_mapped() -> None:
    mapped_entities = {
        Employee,
        ManpowerRequest,
        OnboardingTask,
        LeaveRecord,
        SourceRecord,
        SyncLog,
        AuditLog,
        User,
        Role,
    }

    assert {entity.__tablename__ for entity in mapped_entities} == {
        "employees",
        "manpower_requests",
        "onboarding_tasks",
        "leave_records",
        "source_records",
        "sync_logs",
        "audit_logs",
        "users",
        "roles",
    }


def test_employee_sensitivity_is_present_in_model_and_schema() -> None:
    employee_columns = inspect(Employee).columns
    model_tags = {
        column.name: column.info["sensitivity"]
        for column in employee_columns
        if "sensitivity" in column.info
    }
    schema_fields = EmployeeSchema.model_json_schema()["properties"]
    schema_tags = {
        name: field["sensitivity"]
        for name, field in schema_fields.items()
        if "sensitivity" in field
    }
    expected_tags = {
        "id": Sensitivity.PUBLIC.value,
        "display_name": Sensitivity.PUBLIC.value,
        "employee_number": Sensitivity.HR_ONLY.value,
        "work_email": Sensitivity.HR_ONLY.value,
        "department": Sensitivity.HR_ONLY.value,
        "job_title": Sensitivity.HR_ONLY.value,
        "employment_status": Sensitivity.HR_ONLY.value,
        "hire_date": Sensitivity.HR_ONLY.value,
        "national_id": Sensitivity.RESTRICTED.value,
        "created_at": Sensitivity.HR_ONLY.value,
        "updated_at": Sensitivity.HR_ONLY.value,
    }

    assert model_tags == expected_tags
    assert schema_tags == expected_tags
    assert {
        column.name: column.comment
        for column in employee_columns
    } == {
        name: f"sensitivity: {tag}" for name, tag in expected_tags.items()
    }
