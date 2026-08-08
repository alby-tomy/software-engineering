"""Priority queue for P1-first alert processing (Week 5)."""

from __future__ import annotations

import asyncio
import heapq
from dataclasses import dataclass, field

from pulsegrid.models import Alert


@dataclass(order=True)
class _PrioritizedAlert:
    priority: int
    sequence: int
    alert: Alert = field(compare=False)


class PriorityAlertQueue:
    """Heap-based priority queue — P1 alerts processed before P4."""

    def __init__(self, maxsize: int = 1000) -> None:
        self._maxsize = maxsize
        self._heap: list[_PrioritizedAlert] = []
        self._sequence = 0
        self._lock = asyncio.Lock()
        self._not_empty = asyncio.Condition(self._lock)

    @property
    def size(self) -> int:
        return len(self._heap)

    @property
    def utilization(self) -> float:
        return self.size / self._maxsize if self._maxsize else 0.0

    @property
    def is_near_capacity(self) -> bool:
        return self.utilization >= 0.9

    async def enqueue(self, alert: Alert) -> bool:
        async with self._lock:
            if len(self._heap) >= self._maxsize:
                return False
            heapq.heappush(
                self._heap,
                _PrioritizedAlert(
                    priority=alert.severity.priority,
                    sequence=self._sequence,
                    alert=alert,
                ),
            )
            self._sequence += 1
            self._not_empty.notify()
            return True

    async def dequeue(self) -> Alert:
        async with self._not_empty:
            while not self._heap:
                await self._not_empty.wait()
            item = heapq.heappop(self._heap)
            return item.alert
