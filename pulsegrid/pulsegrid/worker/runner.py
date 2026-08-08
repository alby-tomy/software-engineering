"""Background alert worker (Weeks 3–4)."""

from __future__ import annotations

import asyncio
import logging
import signal

from pulsegrid.api.state import AppState
from pulsegrid.config import settings
from pulsegrid.core.worker_pool import WorkerPool
from pulsegrid.services.service_graph import seed_ecommerce_graph

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


async def run_worker() -> None:
    state = AppState(service_graph=seed_ecommerce_graph())
    processor = state.init_processor()
    pool = WorkerPool(worker_count=settings.worker_count)

    async def handle_alert(alert):
        await processor.process_alert(alert)

    async def dequeue():
        return await state.queue.dequeue()

    logger.info("Starting %d workers (queue maxsize=%d)", settings.worker_count, settings.queue_maxsize)
    await pool.start(dequeue=dequeue, handler=handle_alert, task_done=state.queue.task_done)

    stop_event = asyncio.Event()

    def _signal_handler(*_):
        logger.info("Shutdown signal received")
        stop_event.set()

    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, _signal_handler)

    await stop_event.wait()
    await pool.stop()
    logger.info("Worker stopped")


def run() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    run()
