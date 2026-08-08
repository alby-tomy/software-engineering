"""Service dependency graph endpoints (Week 6)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from pulsegrid.api.auth import get_current_user
from pulsegrid.api.dependencies import StateDep
from pulsegrid.models import User

router = APIRouter(prefix="/services", tags=["services"])


@router.get("/{service_id}/impact")
async def get_blast_radius(
    service_id: str,
    state: StateDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, list[str]]:
    affected = state.service_graph.get_blast_radius(service_id)
    return {"service_id": service_id, "downstream": affected}


@router.get("/{service_id}/root-causes")
async def get_root_causes(
    service_id: str,
    state: StateDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, list[str]]:
    if service_id not in state.service_graph._upstream:
        raise HTTPException(status_code=404, detail="Service not found")
    causes = state.service_graph.find_upstream_root_causes(service_id)
    return {"service_id": service_id, "root_causes": causes}


@router.get("/graph/cycles")
async def detect_cycles(
    state: StateDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> dict[str, list[list[str]]]:
    return {"cycles": state.service_graph.detect_cycles()}
