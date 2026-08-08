"""Application state shared between API and worker."""

from __future__ import annotations

from dataclasses import dataclass, field

from pulsegrid.core.priority_queue import PriorityAlertQueue
from pulsegrid.core.processor import AlertProcessor
from pulsegrid.services.service_graph import ServiceGraph, seed_ecommerce_graph


@dataclass
class AppState:
    queue: PriorityAlertQueue = field(default_factory=lambda: PriorityAlertQueue(maxsize=1000))
    service_graph: ServiceGraph = field(default_factory=seed_ecommerce_graph)
    processor: AlertProcessor | None = None

    def init_processor(self) -> AlertProcessor:
        self.processor = AlertProcessor(
            queue=self.queue,
            service_graph=self.service_graph,
        )
        return self.processor


app_state = AppState()
