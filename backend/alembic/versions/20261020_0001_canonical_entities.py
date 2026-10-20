"""Create canonical integration entities.

Revision ID: 20261020_0001
Revises:
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "20261020_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "roles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "field_permissions",
            sa.JSON(),
            server_default=sa.text("'[]'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column(
            "is_active",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "user_roles",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("role_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["role_id"], ["roles.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "role_id"),
    )
    op.create_table(
        "employees",
        sa.Column(
            "id",
            sa.Uuid(),
            nullable=False,
            comment="sensitivity: public",
        ),
        sa.Column(
            "employee_number",
            sa.String(length=80),
            nullable=True,
            comment="sensitivity: hr_only",
        ),
        sa.Column(
            "display_name",
            sa.String(length=200),
            nullable=False,
            comment="sensitivity: public",
        ),
        sa.Column(
            "work_email",
            sa.String(length=320),
            nullable=True,
            comment="sensitivity: hr_only",
        ),
        sa.Column(
            "department",
            sa.String(length=160),
            nullable=True,
            comment="sensitivity: hr_only",
        ),
        sa.Column(
            "job_title",
            sa.String(length=160),
            nullable=True,
            comment="sensitivity: hr_only",
        ),
        sa.Column(
            "employment_status",
            sa.String(length=32),
            server_default=sa.text("'draft'"),
            nullable=False,
            comment="sensitivity: hr_only",
        ),
        sa.Column(
            "hire_date",
            sa.Date(),
            nullable=True,
            comment="sensitivity: hr_only",
        ),
        sa.Column(
            "national_id",
            sa.String(length=160),
            nullable=True,
            comment="sensitivity: restricted",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
            comment="sensitivity: hr_only",
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
            comment="sensitivity: hr_only",
        ),
        sa.CheckConstraint(
            "employment_status IN ('draft', 'active', 'on_leave', 'terminated')",
            name="ck_employees_employment_status",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("employee_number"),
        sa.UniqueConstraint("work_email"),
    )
    op.create_table(
        "manpower_requests",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("requested_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("external_request_id", sa.String(length=160), nullable=True),
        sa.Column("role_title", sa.String(length=160), nullable=False),
        sa.Column("department", sa.String(length=160), nullable=False),
        sa.Column(
            "headcount", sa.Integer(), server_default=sa.text("1"), nullable=False
        ),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'draft'"),
            nullable=False,
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "headcount > 0", name="ck_manpower_requests_headcount"
        ),
        sa.CheckConstraint(
            "status IN ('draft', 'pending', 'approved', 'rejected', 'cancelled')",
            name="ck_manpower_requests_status",
        ),
        sa.ForeignKeyConstraint(
            ["requested_by_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "source_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("system_name", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("original_id", sa.String(length=200), nullable=False),
        sa.Column("canonical_id", sa.Uuid(), nullable=True),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "raw_payload",
            sa.JSON(),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "system_name",
            "entity_type",
            "original_id",
            name="uq_source_records_system_entity_original",
        ),
    )
    op.create_index(
        "ix_source_records_canonical_entity",
        "source_records",
        ["entity_type", "canonical_id"],
        unique=False,
    )
    op.create_table(
        "onboarding_tasks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("manpower_request_id", sa.Uuid(), nullable=False),
        sa.Column("employee_id", sa.Uuid(), nullable=True),
        sa.Column("assigned_to_user_id", sa.Uuid(), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'pending'"),
            nullable=False,
        ),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'in_progress', 'completed', 'cancelled')",
            name="ck_onboarding_tasks_status",
        ),
        sa.ForeignKeyConstraint(
            ["assigned_to_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"], ["employees.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["manpower_request_id"],
            ["manpower_requests.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "leave_records",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("employee_id", sa.Uuid(), nullable=False),
        sa.Column("source_record_id", sa.Uuid(), nullable=True),
        sa.Column("original_category", sa.String(length=120), nullable=True),
        sa.Column("reporting_category", sa.String(length=120), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=7, scale=2), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'approved'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "end_date >= start_date", name="ck_leave_records_date_range"
        ),
        sa.CheckConstraint(
            "quantity > 0", name="ck_leave_records_quantity"
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'approved', 'rejected', 'cancelled')",
            name="ck_leave_records_status",
        ),
        sa.ForeignKeyConstraint(
            ["employee_id"], ["employees.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["source_record_id"], ["source_records.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "sync_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("system_name", sa.String(length=120), nullable=False),
        sa.Column(
            "status",
            sa.String(length=32),
            server_default=sa.text("'running'"),
            nullable=False,
        ),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "records_read", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "records_created",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "records_updated",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column(
            "records_failed",
            sa.Integer(),
            server_default=sa.text("0"),
            nullable=False,
        ),
        sa.Column("error_summary", sa.Text(), nullable=True),
        sa.CheckConstraint(
            "status IN ('running', 'succeeded', 'partial', 'failed')",
            name="ck_sync_logs_status",
        ),
        sa.CheckConstraint(
            "records_read >= 0 AND records_created >= 0 AND "
            "records_updated >= 0 AND records_failed >= 0",
            name="ck_sync_logs_record_counts",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_sync_logs_system_started_at",
        "sync_logs",
        ["system_name", "started_at"],
        unique=False,
    )
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), nullable=True),
        sa.Column("action", sa.String(length=120), nullable=False),
        sa.Column("entity_type", sa.String(length=80), nullable=False),
        sa.Column("entity_id", sa.Uuid(), nullable=False),
        sa.Column(
            "changes",
            sa.JSON(),
            server_default=sa.text("'{}'"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["actor_user_id"], ["users.id"], ondelete="SET NULL"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_audit_logs_entity",
        "audit_logs",
        ["entity_type", "entity_id"],
        unique=False,
    )
    op.create_index(
        "ix_audit_logs_created_at",
        "audit_logs",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("ix_audit_logs_entity", table_name="audit_logs")
    op.drop_table("audit_logs")
    op.drop_index("ix_sync_logs_system_started_at", table_name="sync_logs")
    op.drop_table("sync_logs")
    op.drop_table("leave_records")
    op.drop_table("onboarding_tasks")
    op.drop_index(
        "ix_source_records_canonical_entity", table_name="source_records"
    )
    op.drop_table("source_records")
    op.drop_table("manpower_requests")
    op.drop_table("employees")
    op.drop_table("user_roles")
    op.drop_table("users")
    op.drop_table("roles")
