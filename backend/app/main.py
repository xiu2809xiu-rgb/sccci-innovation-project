from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.connectors import HQConnector, SingaporeHRConnector
from app.core.database import get_db
from app.models import Employee
from app.schemas import EmployeeSchema, SyncResultSchema
from app.services.sync import synchronize_employees

app = FastAPI(title="SCCCI Integration Platform")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/employees", response_model=list[EmployeeSchema])
def list_employees(session: Session = Depends(get_db)) -> list[Employee]:
    return list(session.scalars(select(Employee).order_by(Employee.display_name)))


@app.post("/sync/{connector_name}", response_model=SyncResultSchema)
def sync_employees(
    connector_name: str, session: Session = Depends(get_db)
) -> SyncResultSchema:
    connector_types = {
        "singapore_hr": SingaporeHRConnector,
        "hq": HQConnector,
    }
    connector_type = connector_types.get(connector_name)
    if connector_type is None:
        raise HTTPException(status_code=404, detail="Unknown connector")

    try:
        return synchronize_employees(session, connector_type())
    except RuntimeError as exc:
        raise HTTPException(
            status_code=500, detail="Connector synchronization failed"
        ) from exc
