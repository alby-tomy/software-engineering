"""Application state shared between API and worker."""

from __future__ import annotations

from dataclasses import dataclass, field

from pulsegrid.config import settings
from pulsegrid.core.events import TimelineStore
from pulsegrid.core.idempotency import IdempotencyStore
from pulsegrid.core.outbox import OutboxStore
from pulsegrid.core.priority_queue import PriorityAlertQueue
from pulsegrid.core.processor import AlertProcessor
from pulsegrid.services.ai.agent import IncidentAgent
from pulsegrid.services.ai.rag import RunbookIndex
from pulsegrid.services.ai.summarizer import AIService
from pulsegrid.services.event_bus import EventBus, create_event_bus
from pulsegrid.services.notification.service import NotificationService
from pulsegrid.services.service_graph import ServiceGraph, seed_ecommerce_graph


@dataclass
class AppState:
    queue: PriorityAlertQueue = field(default_factory=lambda: PriorityAlertQueue(maxsize=1000))
    service_graph: ServiceGraph = field(default_factory=seed_ecommerce_graph)
    timeline: TimelineStore = field(default_factory=TimelineStore)
    outbox: OutboxStore = field(default_factory=OutboxStore)
    idempotency: IdempotencyStore = field(default_factory=IdempotencyStore)
    notifications: NotificationService = field(default_factory=NotificationService)
    event_bus: EventBus = field(
        default_factory=lambda: create_event_bus(settings.use_kafka, settings.kafka_bootstrap)
    )
    runbooks: RunbookIndex = field(default_factory=RunbookIndex)
    processor: AlertProcessor | None = None
    ai_service: AIService | None = None
    agent: IncidentAgent | None = None
    ws_clients: list = field(default_factory=list)

    def init_processor(self) -> AlertProcessor:
        from pathlib import Path

        runbooks_path = Path(__file__).resolve().parents[2] / "docs" / "runbooks"
        if runbooks_path.exists():
            self.runbooks.ingest_directory(runbooks_path)

        async def broadcast(msg: dict[str, object]) -> None:
            import json

            dead: list = []
            for ws in self.ws_clients:
                try:
                    await ws.send_json(msg)
                except Exception:
                    dead.append(ws)
            for ws in dead:
                self.ws_clients.remove(ws)

        self.processor = AlertProcessor(
            queue=self.queue,
            service_graph=self.service_graph,
            timeline=self.timeline,
            event_bus=self.event_bus,
            outbox=self.outbox,
            notifications=self.notifications,
            load_shed_threshold=settings.load_shed_p4_threshold,
            ws_broadcast=broadcast,
        )
        self.ai_service = AIService(self.timeline)
        self.agent = IncidentAgent(self.processor, self.service_graph, self.runbooks)
        return self.processor


app_state = AppState()
