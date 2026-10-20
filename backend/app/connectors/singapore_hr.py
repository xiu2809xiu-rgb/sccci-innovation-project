import csv
from pathlib import Path
from typing import Any

from app.connectors.base import Connector

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class SingaporeHRConnector(Connector):
    def __init__(
        self,
        source_path: Path | None = None,
        mapping_path: Path | None = None,
    ) -> None:
        super().__init__(
            source_path
            or PROJECT_ROOT / "mock-platforms" / "singapore_hr_leave_attendance.csv",
            mapping_path or PROJECT_ROOT / "config" / "mappings" / "singapore_hr.yaml",
        )

    @property
    def system_name(self) -> str:
        return "singapore_hr"

    def read_records(self) -> list[dict[str, Any]]:
        with self.source_path.open(encoding="utf-8-sig", newline="") as csv_file:
            return list(csv.DictReader(csv_file))
