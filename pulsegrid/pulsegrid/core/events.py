"""Domain events and timeline (Weeks 18–19)."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field


class EventType(StrEnum):
    INCIDENT_CREATED = "incident.created"
    INCIDENT_ACKNOWLEDGED = "incident.acknowledged"
    INCIDENT_RESOLVED = "incident.resolved"
    ALERT_RECEIVED = "alert.received"
    COMMENT_ADDED = "comment.added"
    NOTIFICATION_SENT = "notification.sent"
    SUMMARY_GENERATED = "summary.generated"


class DomainEvent(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    event_type: EventType
    incident_id: str | None = None
    payload: dict[str, str | int | float | bool | list[str]] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class TimelineStore:
    """In-memory event store for incident timelines."""

    def __init__(self) -> None:
        self._events: dict[str, list[DomainEvent]] = {}

    def append(self, event: DomainEvent) -> DomainEvent:
        if event.incident_id:
            self._events.setdefault(event.incident_id, []).append(event)
        return event

    def get_timeline(self, incident_id: str) -> list[DomainEvent]:
        return list(self._events.get(incident_id, []))

    def all_events(self) -> list[DomainEvent]:
        return [e for events in self._events.values() for e in events]
