from abc import ABC, abstractmethod
from datetime import date, datetime
from pathlib import Path
from typing import Any, Literal

import yaml
from pydantic import BaseModel, ConfigDict, ValidationError


class EmployeeImport(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    employee_number: str | None = None
    display_name: str
    work_email: str
    department: str | None = None
    job_title: str | None = None
    employment_status: Literal["draft", "active", "on_leave", "terminated"]
    hire_date: date | None = None


class ConnectorRecord(BaseModel):
    source_id: str
    employee: EmployeeImport
    raw_payload: dict[str, Any]


class Connector(ABC):
    def __init__(self, source_path: Path, mapping_path: Path) -> None:
        self.source_path = source_path
        self.mapping_path = mapping_path
        self.mapping = self._load_mapping()

    @property
    @abstractmethod
    def system_name(self) -> str:
        raise NotImplementedError

    @abstractmethod
    def read_records(self) -> list[dict[str, Any]]:
        raise NotImplementedError

    def map_record(self, record: dict[str, Any]) -> ConnectorRecord:
        fields = self.mapping["fields"]
        source_id_column = self.mapping["source_id"]
        source_id = record.get(source_id_column)
        if not source_id:
            raise ValueError(f"Missing source ID column: {source_id_column}")

        values: dict[str, Any] = {}
        date_formats = self.mapping.get("date_formats", {})
        status_mapping = self.mapping.get("employment_status", {})
        for canonical_field, source_field in fields.items():
            value = record.get(source_field)
            if value is None or value == "":
                values[canonical_field] = None
                continue

            if canonical_field in date_formats:
                values[canonical_field] = datetime.strptime(
                    value, date_formats[canonical_field]
                ).date()
            elif canonical_field == "employment_status":
                try:
                    values[canonical_field] = status_mapping[value]
                except KeyError as exc:
                    raise ValueError(
                        f"Unmapped employment status in {self.system_name}"
                    ) from exc
            else:
                values[canonical_field] = value

        try:
            employee = EmployeeImport.model_validate(values)
        except ValidationError as exc:
            raise ValueError(
                f"Invalid employee record from {self.system_name}"
            ) from exc

        return ConnectorRecord(
            source_id=str(source_id),
            employee=employee,
            raw_payload=record,
        )

    def read_and_map(self) -> list[ConnectorRecord]:
        return [self.map_record(record) for record in self.read_records()]

    def _load_mapping(self) -> dict[str, Any]:
        with self.mapping_path.open(encoding="utf-8") as mapping_file:
            mapping = yaml.safe_load(mapping_file)
        if not isinstance(mapping, dict):
            raise ValueError(f"Invalid mapping file: {self.mapping_path}")
        if mapping.get("system_name") != self.system_name:
            raise ValueError(f"Mapping system name does not match {self.system_name}")
        for required_key in ("source_id", "fields"):
            if required_key not in mapping:
                raise ValueError(f"Mapping is missing required key: {required_key}")
        return mapping
