"""Idempotency key store for webhook retries (Week 10)."""

from __future__ import annotations

import time
from dataclasses import dataclass, field


@dataclass
class IdempotencyStore:
    """Maps idempotency keys to incident IDs with TTL."""

    ttl_seconds: float = 86400.0
    _keys: dict[str, tuple[str, float]] = field(default_factory=dict)

    def get(self, key: str) -> str | None:
        self._evict()
        entry = self._keys.get(key)
        return entry[0] if entry else None

    def set(self, key: str, incident_id: str) -> None:
        self._evict()
        self._keys[key] = (incident_id, time.time())

    def _evict(self) -> None:
        now = time.time()
        expired = [k for k, (_, ts) in self._keys.items() if now - ts > self.ttl_seconds]
        for k in expired:
            del self._keys[k]
