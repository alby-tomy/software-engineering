"""Public status page API (Weeks 12, 18)."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from pulsegrid.api.dependencies import ProcessorDep, StateDep
from pulsegrid.models import IncidentStatus

router = APIRouter(prefix="/status", tags=["status"])


class ServiceHealth(BaseModel):
    service_id: str
    status: str  # operational | degraded | outage
    active_incidents: int


class StatusPage(BaseModel):
    team: str
    overall: str
    services: list[ServiceHealth]


@router.get("/{team}", response_model=StatusPage)
async def get_status_page(team: str, processor: ProcessorDep, state: StateDep) -> StatusPage:
    services = list(state.service_graph._upstream.keys())
    health_list: list[ServiceHealth] = []
    degraded_count = 0

    for svc in services:
        active = [
            i
            for i in processor.list_incidents(service_id=svc)
            if i.status != IncidentStatus.RESOLVED
        ]
        if not active:
            svc_status = "operational"
        elif any(i.severity.value in ("p1", "p2") for i in active):
            svc_status = "outage"
            degraded_count += 1
        else:
            svc_status = "degraded"
            degraded_count += 1
        health_list.append(
            ServiceHealth(service_id=svc, status=svc_status, active_incidents=len(active))
        )

    if degraded_count == 0:
        overall = "operational"
    elif degraded_count > len(services) // 2:
        overall = "major_outage"
    else:
        overall = "degraded"

    return StatusPage(team=team, overall=overall, services=health_list)
