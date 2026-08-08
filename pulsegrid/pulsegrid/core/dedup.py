"""Deduplication strategies and index (Weeks 4–5)."""

from __future__ import annotations

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field

from pulsegrid.models import Alert


class DeduplicationStrategy(ABC):
    @abstractmethod
    def is_duplicate(self, alert: Alert, existing_keys: dict[str, float]) -> bool:
        ...

    @abstractmethod
    def record(self, alert: Alert, store: dict[str, float]) -> None:
        ...


@dataclass
class WindowDeduplicationStrategy(DeduplicationStrategy):
    """Same service + title within window seconds = duplicate."""

    window_seconds: float = 300.0

    def is_duplicate(self, alert: Alert, existing_keys: dict[str, float]) -> bool:
        key = alert.dedup_key
        if key not in existing_keys:
            return False
        return (time.time() - existing_keys[key]) < self.window_seconds

    def record(self, alert: Alert, store: dict[str, float]) -> None:
        store[alert.dedup_key] = time.time()
        self._evict_expired(store)

    def _evict_expired(self, store: dict[str, float]) -> None:
        now = time.time()
        expired = [k for k, ts in store.items() if now - ts >= self.window_seconds]
        for k in expired:
            del store[k]


@dataclass
class DedupIndex:
    """O(1) lookup: dedup_key → incident_id (Week 5)."""

    _key_to_incident: dict[str, str] = field(default_factory=dict)

    def get_incident_id(self, alert: Alert) -> str | None:
        return self._key_to_incident.get(alert.dedup_key)

    def bind(self, alert: Alert, incident_id: str) -> None:
        self._key_to_incident[alert.dedup_key] = incident_id

    def remove(self, dedup_key: str) -> None:
        self._key_to_incident.pop(dedup_key, None)

    def __len__(self) -> int:
        return len(self._key_to_incident)


@dataclass
class FlappingDetector:
    """Detect alert storms: > threshold alerts per service in window."""

    threshold: int = 10
    window_seconds: float = 60.0
    _counts: dict[str, list[float]] = field(default_factory=dict)

    def record(self, service_id: str) -> bool:
        now = time.time()
        timestamps = self._counts.setdefault(service_id, [])
        timestamps.append(now)
        cutoff = now - self.window_seconds
        self._counts[service_id] = [t for t in timestamps if t >= cutoff]
        return len(self._counts[service_id]) > self.threshold

    def reset(self, service_id: str) -> None:
        self._counts.pop(service_id, None)
