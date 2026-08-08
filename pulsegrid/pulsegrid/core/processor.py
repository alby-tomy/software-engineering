"""Incident processing pipeline — ties queue, dedup, and graph together."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from pulsegrid.core.dedup import (
    DedupIndex,
    FlappingDetector,
    WindowDeduplicationStrategy,
)
from pulsegrid.core.priority_queue import PriorityAlertQueue
from pulsegrid.models import Alert, Incident
from pulsegrid.services.service_graph import ServiceGraph

logger = logging.getLogger(__name__)


class AlertProcessor:
    """Consumes alerts and creates/updates incidents."""

    def __init__(
        self,
        queue: PriorityAlertQueue,
        service_graph: ServiceGraph,
        on_incident: Callable[[Incident], Awaitable[None]] | None = None,
        dedup_window_seconds: float = 300.0,
    ) -> None:
        self.queue = queue
        self.service_graph = service_graph
        self.on_incident = on_incident
        self.dedup_strategy = WindowDeduplicationStrategy(window_seconds=dedup_window_seconds)
        self.dedup_timestamps: dict[str, float] = {}
        self.dedup_index = DedupIndex()
        self.flapping = FlappingDetector()
        self._incidents: dict[str, Incident] = {}

    @property
    def incidents(self) -> dict[str, Incident]:
        return self._incidents

    async def process_alert(self, alert: Alert) -> Incident:
        if self.flapping.record(alert.service_id):
            logger.warning("Flapping detected for service %s — grouping alerts", alert.service_id)

        existing_id = self.dedup_index.get_incident_id(alert)
        if existing_id and existing_id in self._incidents:
            incident = self._incidents[existing_id]
            incident.alert_count += 1
            if self.on_incident:
                await self.on_incident(incident)
            return incident

        if self.dedup_strategy.is_duplicate(alert, self.dedup_timestamps):
            existing_id = self.dedup_index.get_incident_id(alert)
            if existing_id and existing_id in self._incidents:
                incident = self._incidents[existing_id]
                incident.alert_count += 1
                if self.on_incident:
                    await self.on_incident(incident)
                return incident

        root_causes = self.service_graph.find_upstream_root_causes(alert.service_id)
        correlated = self.service_graph.get_blast_radius(alert.service_id)

        incident = Incident(
            service_id=alert.service_id,
            title=alert.title,
            severity=alert.severity,
            dedup_key=alert.dedup_key,
            correlated_services=list(set(root_causes + correlated)),
        )
        self._incidents[incident.id] = incident
        self.dedup_index.bind(alert, incident.id)
        self.dedup_strategy.record(alert, self.dedup_timestamps)

        logger.info(
            "Created incident %s for %s [%s]",
            incident.id,
            alert.service_id,
            alert.severity.value,
        )
        if self.on_incident:
            await self.on_incident(incident)
        return incident

    def get_incident(self, incident_id: str) -> Incident | None:
        return self._incidents.get(incident_id)

    def list_incidents(
        self,
        *,
        status: str | None = None,
        severity: str | None = None,
        service_id: str | None = None,
    ) -> list[Incident]:
        results = list(self._incidents.values())
        if status:
            results = [i for i in results if i.status.value == status]
        if severity:
            results = [i for i in results if i.severity.value == severity]
        if service_id:
            results = [i for i in results if i.service_id == service_id]
        results.sort(key=lambda i: (i.severity.priority, i.created_at))
        return results
