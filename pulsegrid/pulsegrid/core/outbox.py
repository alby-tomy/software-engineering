"""Outbox pattern for reliable event publishing (Week 19)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import uuid4

from pulsegrid.core.events import DomainEvent


@dataclass
class OutboxEntry:
    id: str
    event: DomainEvent
    published: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))


class OutboxStore:
    def __init__(self) -> None:
        self._entries: list[OutboxEntry] = []

    def add(self, event: DomainEvent) -> OutboxEntry:
        entry = OutboxEntry(id=str(uuid4()), event=event)
        self._entries.append(entry)
        return entry

    def pending(self) -> list[OutboxEntry]:
        return [e for e in self._entries if not e.published]

    def mark_published(self, entry_id: str) -> None:
        for entry in self._entries:
            if entry.id == entry_id:
                entry.published = True
                break
