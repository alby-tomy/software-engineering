"""Incident and service REST endpoints (Week 9)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from pulsegrid.api.auth import get_current_user, require_role
from pulsegrid.api.dependencies import ProcessorDep
from pulsegrid.models import Incident, User, UserRole

router = APIRouter(tags=["incidents"])


@router.get("/incidents")
async def list_incidents(
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
    status: str | None = Query(None),
    severity: str | None = Query(None),
    service_id: str | None = Query(None),
) -> list[Incident]:
    return processor.list_incidents(status=status, severity=severity, service_id=service_id)


@router.get("/incidents/{incident_id}")
async def get_incident(
    incident_id: str,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> Incident:
    incident = processor.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@router.post("/incidents/{incident_id}/acknowledge")
async def acknowledge_incident(
    incident_id: str,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(require_role(UserRole.RESPONDER, UserRole.ADMIN))],
) -> Incident:
    incident = processor.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    try:
        incident.acknowledge()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return incident


@router.post("/incidents/{incident_id}/resolve")
async def resolve_incident(
    incident_id: str,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(require_role(UserRole.RESPONDER, UserRole.ADMIN))],
) -> Incident:
    incident = processor.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    try:
        incident.resolve()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return incident
