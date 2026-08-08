"""Async alert ingestion queue with backpressure."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

from pulsegrid.models import Alert


@dataclass
class AlertQueue:
    """Bounded asyncio queue for webhook ingestion (Week 3)."""

    maxsize: int = 1000
    _queue: asyncio.Queue[Alert] = field(init=False)

    def __post_init__(self) -> None:
        self._queue = asyncio.Queue(maxsize=self.maxsize)

    @property
    def size(self) -> int:
        return self._queue.qsize()

    @property
    def utilization(self) -> float:
        return self.size / self.maxsize if self.maxsize else 0.0

    @property
    def is_near_capacity(self) -> bool:
        return self.utilization >= 0.9

    async def enqueue(self, alert: Alert) -> None:
        await self._queue.put(alert)

    def try_enqueue(self, alert: Alert) -> bool:
        try:
            self._queue.put_nowait(alert)
            return True
        except asyncio.QueueFull:
            return False

    async def dequeue(self) -> Alert:
        return await self._queue.get()

    def task_done(self) -> None:
        self._queue.task_done()
