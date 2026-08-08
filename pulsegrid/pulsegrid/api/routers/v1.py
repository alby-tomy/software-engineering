"""Versioned REST API with cursor pagination (Week 10)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from pulsegrid.api.auth import get_current_user
from pulsegrid.api.dependencies import ProcessorDep
from pulsegrid.models import Incident, User

router = APIRouter(prefix="/v1", tags=["v1"])


class PaginatedIncidents(BaseModel):
    items: list[Incident]
    next_cursor: str | None
    count: int


@router.get("/incidents", response_model=PaginatedIncidents)
async def list_incidents_v1(
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    severity: str | None = Query(None),
    service_id: str | None = Query(None),
) -> PaginatedIncidents:
    items, next_cursor = processor.paginate(
        cursor=cursor, limit=limit, status=status, severity=severity, service_id=service_id
    )
    return PaginatedIncidents(items=items, next_cursor=next_cursor, count=len(items))


@router.get("/incidents/search")
async def search_incidents(
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
    q: str = Query(..., min_length=1),
) -> list[Incident]:
    return processor.search(q)
