"""Postmortem generation (Week 18, 24)."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from pulsegrid.api.auth import get_current_user
from pulsegrid.api.dependencies import ProcessorDep, StateDep
from pulsegrid.models import IncidentStatus, User

router = APIRouter(tags=["postmortem"])


class PostmortemDraft(BaseModel):
    incident_id: str
    title: str
    mttr_seconds: float | None
    timeline_summary: str
    markdown: str


@router.get("/incidents/{incident_id}/postmortem", response_model=PostmortemDraft)
async def generate_postmortem(
    incident_id: str,
    state: StateDep,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> PostmortemDraft:
    incident = processor.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")

    events = state.timeline.get_timeline(incident_id)
    timeline_lines = [
        f"- {e.created_at.isoformat()} [{e.event_type.value}] {e.payload}"
        for e in events
    ]
    timeline_summary = "\n".join(timeline_lines) or "No events recorded."

    mttr = None
    if incident.resolved_at and incident.created_at:
        mttr = (incident.resolved_at - incident.created_at).total_seconds()

    md = f"""# Postmortem: {incident.title}

## Summary
- **Service:** {incident.service_id}
- **Severity:** {incident.severity.value}
- **Status:** {incident.status.value}
- **MTTR:** {f"{mttr:.0f}s" if mttr else "N/A"}

## Timeline
{timeline_summary}

## Impact
Affected downstream services: {", ".join(incident.correlated_services) or "None identified"}

## Action Items
- [ ] Root cause analysis
- [ ] Update runbook
- [ ] Add monitoring alert
"""
    return PostmortemDraft(
        incident_id=incident_id,
        title=incident.title,
        mttr_seconds=mttr,
        timeline_summary=timeline_summary,
        markdown=md,
    )
