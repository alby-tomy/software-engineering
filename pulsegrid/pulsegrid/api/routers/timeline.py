"""Incident timeline API (Week 18)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from pulsegrid.api.auth import get_current_user
from pulsegrid.api.dependencies import ProcessorDep, StateDep
from pulsegrid.core.events import DomainEvent, EventType
from pulsegrid.models import User
from pydantic import BaseModel

router = APIRouter(tags=["timeline"])


class CommentRequest(BaseModel):
    message: str


@router.get("/incidents/{incident_id}/timeline")
async def get_timeline(
    incident_id: str,
    state: StateDep,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> list[DomainEvent]:
    if processor.get_incident(incident_id) is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return state.timeline.get_timeline(incident_id)


@router.post("/incidents/{incident_id}/comments")
async def add_comment(
    incident_id: str,
    body: CommentRequest,
    state: StateDep,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> DomainEvent:
    if processor.get_incident(incident_id) is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    event = DomainEvent(
        event_type=EventType.COMMENT_ADDED,
        incident_id=incident_id,
        payload={"message": body.message},
    )
    return state.timeline.append(event)
