"""Worker pool with bounded concurrency (Week 4)."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")


class WorkerPool:
    """Process items from a queue with a semaphore-limited worker count."""

    def __init__(self, worker_count: int = 4, max_concurrency: int | None = None) -> None:
        self.worker_count = worker_count
        self._semaphore = asyncio.Semaphore(max_concurrency or worker_count)
        self._tasks: list[asyncio.Task[None]] = []
        self._running = False

    async def start(
        self,
        dequeue: Callable[[], Awaitable[T]],
        handler: Callable[[T], Awaitable[None]],
        task_done: Callable[[], None] | None = None,
    ) -> None:
        self._running = True

        async def worker() -> None:
            while self._running:
                try:
                    item = await dequeue()
                except asyncio.CancelledError:
                    break
                async with self._semaphore:
                    await handler(item)
                if task_done:
                    task_done()

        self._tasks = [asyncio.create_task(worker()) for _ in range(self.worker_count)]

    async def stop(self) -> None:
        self._running = False
        for task in self._tasks:
            task.cancel()
        await asyncio.gather(*self._tasks, return_exceptions=True)
        self._tasks.clear()
