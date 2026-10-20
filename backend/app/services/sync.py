import logging
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connectors.base import Connector
from app.models import Employee, SourceRecord, SyncLog
from app.schemas.sync import SyncResultSchema

logger = logging.getLogger(__name__)


def synchronize_employees(
    session: Session, connector: Connector
) -> SyncResultSchema:
    sync_log = SyncLog(system_name=connector.system_name, status="running")
    session.add(sync_log)
    session.commit()
    sync_log_id = sync_log.id

    try:
        records = connector.read_and_map()
        sync_log.records_read = len(records)
        synced_at = datetime.now(timezone.utc)

        for record in records:
            employee = session.scalar(
                select(Employee).where(
                    Employee.work_email == record.employee.work_email
                )
            )
            created = employee is None
            if created:
                employee = Employee(
                    display_name=record.employee.display_name,
                    work_email=record.employee.work_email,
                    employment_status=record.employee.employment_status,
                )
                session.add(employee)
                sync_log.records_created += 1
            else:
                sync_log.records_updated += 1

            assert employee is not None
            for field in (
                "display_name",
                "department",
                "job_title",
                "employment_status",
                "hire_date",
            ):
                value = getattr(record.employee, field)
                if value is not None:
                    setattr(employee, field, value)
            if employee.employee_number is None:
                employee.employee_number = record.employee.employee_number

            session.flush()
            source_record = session.scalar(
                select(SourceRecord).where(
                    SourceRecord.system_name == connector.system_name,
                    SourceRecord.entity_type == "employee",
                    SourceRecord.original_id == record.source_id,
                )
            )
            if source_record is None:
                source_record = SourceRecord(
                    system_name=connector.system_name,
                    entity_type="employee",
                    original_id=record.source_id,
                    canonical_id=employee.id,
                )
                session.add(source_record)
            source_record.canonical_id = employee.id
            source_record.last_synced_at = synced_at
            source_record.raw_payload = record.raw_payload

        sync_log.status = "succeeded"
        sync_log.finished_at = datetime.now(timezone.utc)
        session.commit()
    except Exception as exc:
        session.rollback()
        failed_log = session.get(SyncLog, sync_log_id)
        if failed_log is not None:
            failed_log.status = "failed"
            failed_log.finished_at = datetime.now(timezone.utc)
            failed_log.records_failed = 1
            failed_log.error_summary = f"Synchronization failed ({type(exc).__name__})"
            session.commit()
        logger.exception("Employee synchronization failed for %s", connector.system_name)
        raise RuntimeError("Connector synchronization failed") from exc

    return SyncResultSchema(
        sync_log_id=sync_log.id,
        system_name=sync_log.system_name,
        status=sync_log.status,
        records_read=sync_log.records_read,
        records_created=sync_log.records_created,
        records_updated=sync_log.records_updated,
        records_failed=sync_log.records_failed,
    )
