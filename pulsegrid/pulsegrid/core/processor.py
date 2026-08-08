"""Enhanced incident processor with timeline, events, and search (Weeks 10–20)."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable

from pulsegrid.core.dedup import (
    DedupIndex,
    FlappingDetector,
    WindowDeduplicationStrategy,
)
from pulsegrid.core.events import DomainEvent, EventType, TimelineStore
from pulsegrid.core.load_shedding import should_shed_alert
from pulsegrid.core.outbox import OutboxStore
from pulsegrid.core.priority_queue import PriorityAlertQueue
from pulsegrid.models import Alert, Incident, IncidentStatus
from pulsegrid.services.event_bus import EventBus
from pulsegrid.services.notification.service import NotificationService
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
        timeline: TimelineStore | None = None,
        event_bus: EventBus | None = None,
        outbox: OutboxStore | None = None,
        notifications: NotificationService | None = None,
        load_shed_threshold: int = 800,
        ws_broadcast: Callable[[dict[str, object]], Awaitable[None]] | None = None,
    ) -> None:
        self.queue = queue
        self.service_graph = service_graph
        self.on_incident = on_incident
        self.timeline = timeline or TimelineStore()
        self.event_bus = event_bus
        self.outbox = outbox or OutboxStore()
        self.notifications = notifications or NotificationService()
        self.load_shed_threshold = load_shed_threshold
        self.ws_broadcast = ws_broadcast
        self.dedup_strategy = WindowDeduplicationStrategy(window_seconds=dedup_window_seconds)
        self.dedup_timestamps: dict[str, float] = {}
        self.dedup_index = DedupIndex()
        self.flapping = FlappingDetector()
        self._incidents: dict[str, Incident] = {}

    @property
    def incidents(self) -> dict[str, Incident]:
        return self._incidents

    async def _emit(self, event: DomainEvent) -> None:
        self.timeline.append(event)
        self.outbox.add(event)
        if self.event_bus:
            await self.event_bus.publish("incidents.events", event)

    async def _broadcast(self, incident: Incident, action: str) -> None:
        if self.ws_broadcast:
            await self.ws_broadcast({"action": action, "incident": incident.model_dump(mode="json")})

    async def process_alert(self, alert: Alert) -> Incident | None:
        if should_shed_alert(alert, self.queue.size, self.load_shed_threshold):
            logger.warning("Load shedding P4 alert for %s", alert.service_id)
            return None

        if self.flapping.record(alert.service_id):
            logger.warning("Flapping detected for service %s", alert.service_id)

        existing_id = self.dedup_index.get_incident_id(alert)
        if existing_id and existing_id in self._incidents:
            incident = self._incidents[existing_id]
            incident.alert_count += 1
            await self._broadcast(incident, "updated")
            if self.on_incident:
                await self.on_incident(incident)
            return incident

        if self.dedup_strategy.is_duplicate(alert, self.dedup_timestamps):
            existing_id = self.dedup_index.get_incident_id(alert)
            if existing_id and existing_id in self._incidents:
                incident = self._incidents[existing_id]
                incident.alert_count += 1
                await self._broadcast(incident, "updated")
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

        await self._emit(
            DomainEvent(
                event_type=EventType.INCIDENT_CREATED,
                incident_id=incident.id,
                payload={"title": incident.title, "severity": incident.severity.value},
            )
        )
        await self._broadcast(incident, "created")

        try:
            await self.notifications.fan_out(incident)
        except Exception as exc:
            logger.warning("Notification fan-out failed (non-blocking): %s", exc)

        if self.on_incident:
            await self.on_incident(incident)
        return incident

    async def acknowledge_incident(self, incident_id: str) -> Incident:
        incident = self._incidents[incident_id]
        incident.acknowledge()
        await self._emit(
            DomainEvent(
                event_type=EventType.INCIDENT_ACKNOWLEDGED,
                incident_id=incident.id,
                payload={"status": incident.status.value},
            )
        )
        await self._broadcast(incident, "acknowledged")
        return incident

    async def resolve_incident(self, incident_id: str) -> Incident:
        incident = self._incidents[incident_id]
        incident.resolve()
        await self._emit(
            DomainEvent(
                event_type=EventType.INCIDENT_RESOLVED,
                incident_id=incident.id,
                payload={"status": incident.status.value},
            )
        )
        await self._broadcast(incident, "resolved")
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

    def search(self, query: str) -> list[Incident]:
        q = query.lower()
        return [
            i
            for i in self._incidents.values()
            if q in i.title.lower() or q in i.service_id.lower()
        ]

    def paginate(
        self,
        *,
        cursor: str | None = None,
        limit: int = 20,
        status: str | None = None,
        severity: str | None = None,
        service_id: str | None = None,
    ) -> tuple[list[Incident], str | None]:
        items = self.list_incidents(status=status, severity=severity, service_id=service_id)
        start = 0
        if cursor:
            for i, item in enumerate(items):
                if item.id == cursor:
                    start = i + 1
                    break
        page = items[start : start + limit]
        next_cursor = page[-1].id if len(page) == limit and start + limit < len(items) else None
        return page, next_cursor
