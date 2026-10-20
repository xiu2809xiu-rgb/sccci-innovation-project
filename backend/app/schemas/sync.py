from uuid import UUID

from pydantic import BaseModel


class SyncResultSchema(BaseModel):
    sync_log_id: UUID
    system_name: str
    status: str
    records_read: int
    records_created: int
    records_updated: int
    records_failed: int
