from collections.abc import Generator
from pathlib import Path

from fastapi.testclient import TestClient
import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.connectors import HQConnector, SingaporeHRConnector
from app.core.database import Base, get_db
from app.main import app
from app.models import Employee, SourceRecord, SyncLog
from app.services.sync import synchronize_employees


def make_session_factory() -> sessionmaker[Session]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


def test_syncs_both_sources_and_tracks_provenance() -> None:
    session_factory = make_session_factory()
    with session_factory() as session:
        singapore_result = synchronize_employees(session, SingaporeHRConnector())
        hq_result = synchronize_employees(session, HQConnector())

        assert singapore_result.records_read == 20
        assert singapore_result.records_created == 20
        assert singapore_result.records_updated == 0
        assert hq_result.records_read == 20
        assert hq_result.records_created == 10
        assert hq_result.records_updated == 10
        assert session.scalar(select(func.count()).select_from(Employee)) == 30
        assert session.scalar(select(func.count()).select_from(SourceRecord)) == 40

        li_wei = session.scalar(
            select(Employee).where(Employee.work_email == "li.wei@example.com")
        )
        assert li_wei is not None
        assert li_wei.display_name == "李伟"
        assert li_wei.employment_status == "terminated"
        assert li_wei.employee_number == "SG-0083"

        logs = list(session.scalars(select(SyncLog).order_by(SyncLog.system_name)))
        assert [(log.system_name, log.status) for log in logs] == [
            ("hq", "succeeded"),
            ("singapore_hr", "succeeded"),
        ]


def test_employees_api_and_sync_endpoint_use_database() -> None:
    session_factory = make_session_factory()

    def override_get_db() -> Generator[Session, None, None]:
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    try:
        client = TestClient(app)
        assert client.get("/employees").json() == []

        response = client.post("/sync/singapore_hr")
        assert response.status_code == 200
        assert response.json()["records_created"] == 20

        employees_response = client.get("/employees")
        assert employees_response.status_code == 200
        assert len(employees_response.json()) == 20
        assert employees_response.json()[0]["id"]
    finally:
        app.dependency_overrides.clear()


def test_failed_sync_is_written_to_sync_log() -> None:
    session_factory = make_session_factory()
    connector = SingaporeHRConnector(source_path=Path("/missing/mock-source.csv"))

    with session_factory() as session:
        with pytest.raises(RuntimeError, match="Connector synchronization failed"):
            synchronize_employees(session, connector)

        failed_log = session.scalar(select(SyncLog))
        assert failed_log is not None
        assert failed_log.status == "failed"
        assert failed_log.records_failed == 1
        assert failed_log.finished_at is not None
