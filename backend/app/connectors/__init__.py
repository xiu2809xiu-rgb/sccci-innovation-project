from app.connectors.base import Connector, ConnectorRecord, EmployeeImport
from app.connectors.hq import HQConnector
from app.connectors.singapore_hr import SingaporeHRConnector

__all__ = [
    "Connector",
    "ConnectorRecord",
    "EmployeeImport",
    "HQConnector",
    "SingaporeHRConnector",
]