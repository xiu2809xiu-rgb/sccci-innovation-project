from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Table,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.sensitivity import Sensitivity


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", Uuid(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", Uuid(as_uuid=True), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
)


class Role(TimestampMixin, Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    key: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    field_permissions: Mapped[list[str]] = mapped_column(
        JSON, default=list, server_default=text("'[]'"), nullable=False
    )

    users: Mapped[list[User]] = relationship(
        secondary=user_roles, back_populates="roles"
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default=text("true"), nullable=False
    )

    roles: Mapped[list[Role]] = relationship(
        secondary=user_roles, back_populates="users"
    )
    requested_manpower: Mapped[list[ManpowerRequest]] = relationship(
        back_populates="requested_by"
    )
    assigned_onboarding_tasks: Mapped[list[OnboardingTask]] = relationship(
        back_populates="assigned_to"
    )
    audit_events: Mapped[list[AuditLog]] = relationship(back_populates="actor")


class Employee(TimestampMixin, Base):
    __tablename__ = "employees"
    __table_args__ = (
        CheckConstraint(
            "employment_status IN ('draft', 'active', 'on_leave', 'terminated')",
            name="ck_employees_employment_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        info={"sensitivity": Sensitivity.PUBLIC.value},
        comment=f"sensitivity: {Sensitivity.PUBLIC.value}",
    )
    employee_number: Mapped[str | None] = mapped_column(
        String(80),
        unique=True,
        info={"sensitivity": Sensitivity.HR_ONLY.value},
        comment=f"sensitivity: {Sensitivity.HR_ONLY.value}",
    )
    display_name: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        info={"sensitivity": Sensitivity.PUBLIC.value},
        comment=f"sensitivity: {Sensitivity.PUBLIC.value}",
    )
    work_email: Mapped[str | None] = mapped_column(
        String(320),
        unique=True,
        info={"sensitivity": Sensitivity.HR_ONLY.value},
        comment=f"sensitivity: {Sensitivity.HR_ONLY.value}",
    )
    department: Mapped[str | None] = mapped_column(
        String(160),
        info={"sensitivity": Sensitivity.HR_ONLY.value},
        comment=f"sensitivity: {Sensitivity.HR_ONLY.value}",
    )
    job_title: Mapped[str | None] = mapped_column(
        String(160),
        info={"sensitivity": Sensitivity.HR_ONLY.value},
        comment=f"sensitivity: {Sensitivity.HR_ONLY.value}",
    )
    employment_status: Mapped[str] = mapped_column(
        String(32),
        default="draft",
        server_default=text("'draft'"),
        nullable=False,
        info={"sensitivity": Sensitivity.HR_ONLY.value},
        comment=f"sensitivity: {Sensitivity.HR_ONLY.value}",
    )
    hire_date: Mapped[date | None] = mapped_column(
        Date,
        info={"sensitivity": Sensitivity.HR_ONLY.value},
        comment=f"sensitivity: {Sensitivity.HR_ONLY.value}",
    )
    national_id: Mapped[str | None] = mapped_column(
        String(160),
        info={"sensitivity": Sensitivity.RESTRICTED.value},
        comment=f"sensitivity: {Sensitivity.RESTRICTED.value}",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        info={"sensitivity": Sensitivity.HR_ONLY.value},
        comment=f"sensitivity: {Sensitivity.HR_ONLY.value}",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        info={"sensitivity": Sensitivity.HR_ONLY.value},
        comment=f"sensitivity: {Sensitivity.HR_ONLY.value}",
    )

    leave_records: Mapped[list[LeaveRecord]] = relationship(back_populates="employee")


class ManpowerRequest(TimestampMixin, Base):
    __tablename__ = "manpower_requests"
    __table_args__ = (
        CheckConstraint("headcount > 0", name="ck_manpower_requests_headcount"),
        CheckConstraint(
            "status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled')",
            name="ck_manpower_requests_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    requested_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    external_request_id: Mapped[str | None] = mapped_column(String(160))
    role_title: Mapped[str] = mapped_column(String(160), nullable=False)
    department: Mapped[str] = mapped_column(String(160), nullable=False)
    headcount: Mapped[int] = mapped_column(
        Integer, default=1, server_default=text("1"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32), default="draft", server_default=text("'draft'"), nullable=False
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    requested_by: Mapped[User | None] = relationship(
        back_populates="requested_manpower"
    )
    onboarding_tasks: Mapped[list[OnboardingTask]] = relationship(
        back_populates="manpower_request"
    )


class OnboardingTask(TimestampMixin, Base):
    __tablename__ = "onboarding_tasks"
    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed', 'cancelled')",
            name="ck_onboarding_tasks_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    manpower_request_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("manpower_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL")
    )
    assigned_to_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(
        String(32),
        default="pending",
        server_default=text("'pending'"),
        nullable=False,
    )
    due_date: Mapped[date | None] = mapped_column(Date)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    manpower_request: Mapped[ManpowerRequest] = relationship(
        back_populates="onboarding_tasks"
    )
    employee: Mapped[Employee | None] = relationship()
    assigned_to: Mapped[User | None] = relationship(
        back_populates="assigned_onboarding_tasks"
    )


class SourceRecord(TimestampMixin, Base):
    __tablename__ = "source_records"
    __table_args__ = (
        UniqueConstraint(
            "system_name",
            "entity_type",
            "original_id",
            name="uq_source_records_system_entity_original",
        ),
        Index("ix_source_records_canonical_entity", "entity_type", "canonical_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    system_name: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    original_id: Mapped[str] = mapped_column(String(200), nullable=False)
    canonical_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True))
    last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    raw_payload: Mapped[dict[str, Any]] = mapped_column(
        JSON, default=dict, server_default=text("'{}'"), nullable=False
    )


class LeaveRecord(TimestampMixin, Base):
    __tablename__ = "leave_records"
    __table_args__ = (
        CheckConstraint("end_date >= start_date", name="ck_leave_records_date_range"),
        CheckConstraint("quantity > 0", name="ck_leave_records_quantity"),
        CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'cancelled')",
            name="ck_leave_records_status",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    employee_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    source_record_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("source_records.id", ondelete="SET NULL")
    )
    original_category: Mapped[str | None] = mapped_column(String(120))
    reporting_category: Mapped[str] = mapped_column(String(120), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        default="approved",
        server_default=text("'approved'"),
        nullable=False,
    )

    employee: Mapped[Employee] = relationship(back_populates="leave_records")


class SyncLog(Base):
    __tablename__ = "sync_logs"
    __table_args__ = (
        CheckConstraint(
            "status IN ('running', 'succeeded', 'partial', 'failed')",
            name="ck_sync_logs_status",
        ),
        CheckConstraint(
            "records_read >= 0 AND records_created >= 0 AND "
            "records_updated >= 0 AND records_failed >= 0",
            name="ck_sync_logs_record_counts",
        ),
        Index("ix_sync_logs_system_started_at", "system_name", "started_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    system_name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), default="running", server_default=text("'running'"), nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    records_read: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    records_created: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    records_updated: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    records_failed: Mapped[int] = mapped_column(
        Integer, default=0, server_default=text("0"), nullable=False
    )
    error_summary: Mapped[str | None] = mapped_column(Text)


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    action: Mapped[str] = mapped_column(String(120), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False)
    entity_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    changes: Mapped[dict[str, Any]] = mapped_column(
        JSON, default=dict, server_default=text("'{}'"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    actor: Mapped[User | None] = relationship(back_populates="audit_events")
