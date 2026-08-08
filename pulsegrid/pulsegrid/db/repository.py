"""Repository layer for incident persistence (Week 7)."""

from __future__ import annotations

import json

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from pulsegrid.db.models import IncidentRow, TimelineEventRow
from pulsegrid.models import Incident, IncidentStatus, Severity


class IncidentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def save(self, incident: Incident) -> IncidentRow:
        row = IncidentRow(
            id=incident.id,
            service_id=incident.service_id,
            title=incident.title,
            severity=incident.severity.value,
            status=incident.status.value,
            dedup_key=incident.dedup_key,
            alert_count=incident.alert_count,
            correlated_services=json.dumps(incident.correlated_services),
            acknowledged_at=incident.acknowledged_at,
            resolved_at=incident.resolved_at,
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return row

    async def get_by_id(self, incident_id: str) -> IncidentRow | None:
        result = await self.session.execute(
            select(IncidentRow).where(IncidentRow.id == incident_id)
        )
        return result.scalar_one_or_none()

    async def get_by_dedup_key(self, dedup_key: str) -> IncidentRow | None:
        result = await self.session.execute(
            select(IncidentRow).where(IncidentRow.dedup_key == dedup_key)
        )
        return result.scalar_one_or_none()

    async def list_active(self, team_id: str | None = None) -> list[IncidentRow]:
        query = select(IncidentRow).where(IncidentRow.status != IncidentStatus.RESOLVED.value)
        query = query.order_by(IncidentRow.severity, IncidentRow.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update_status(
        self, incident: Incident, event_type: str, message: str
    ) -> IncidentRow:
        row = await self.get_by_id(incident.id)
        if row is None:
            raise ValueError(f"Incident {incident.id} not found")
        row.status = incident.status.value
        row.alert_count = incident.alert_count
        row.acknowledged_at = incident.acknowledged_at
        row.resolved_at = incident.resolved_at
        self.session.add(
            TimelineEventRow(
                incident_id=incident.id,
                event_type=event_type,
                message=message,
            )
        )
        await self.session.commit()
        await self.session.refresh(row)
        return row

    @staticmethod
    def to_domain(row: IncidentRow) -> Incident:
        correlated: list[str] = []
        if row.correlated_services:
            correlated = json.loads(row.correlated_services)
        return Incident(
            id=row.id,
            service_id=row.service_id,
            title=row.title,
            severity=Severity(row.severity),
            status=IncidentStatus(row.status),
            dedup_key=row.dedup_key or "",
            alert_count=row.alert_count,
            correlated_services=correlated,
            created_at=row.created_at,
            acknowledged_at=row.acknowledged_at,
            resolved_at=row.resolved_at,
        )
