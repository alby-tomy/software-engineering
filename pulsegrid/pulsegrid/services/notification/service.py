"""Notification fan-out: Slack, email, PagerDuty (Weeks 10, 18)."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from pulsegrid.core.circuit_breaker import CircuitBreaker
from pulsegrid.models import Incident

logger = logging.getLogger(__name__)


@dataclass
class NotificationRecord:
    channel: str
    incident_id: str
    recipient: str
    status: str


@dataclass
class NotificationService:
    circuit_breaker: CircuitBreaker = field(default_factory=CircuitBreaker)
    sent: list[NotificationRecord] = field(default_factory=list)

    async def send_page(self, on_call_id: str, incident: Incident) -> NotificationRecord:
        if not self.circuit_breaker.allow_request():
            logger.warning("Circuit open — skipping page for %s", incident.id)
            raise RuntimeError("Notification circuit breaker is open")

        try:
            record = NotificationRecord(
                channel="pagerduty",
                incident_id=incident.id,
                recipient=on_call_id,
                status="sent",
            )
            self.sent.append(record)
            logger.info("Paged %s for incident %s", on_call_id, incident.id)
            self.circuit_breaker.record_success()
            return record
        except Exception:
            self.circuit_breaker.record_failure()
            raise

    async def fan_out(self, incident: Incident, channels: list[str] | None = None) -> list[NotificationRecord]:
        targets = channels or ["slack", "email", "pagerduty"]
        records: list[NotificationRecord] = []
        for channel in targets:
            record = NotificationRecord(
                channel=channel,
                incident_id=incident.id,
                recipient=f"oncall-{incident.service_id}",
                status="sent",
            )
            self.sent.append(record)
            records.append(record)
            logger.info("Notification via %s for incident %s", channel, incident.id)
        return records
