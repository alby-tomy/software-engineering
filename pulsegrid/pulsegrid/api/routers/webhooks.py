"""Webhook ingestion endpoints (Weeks 3–4)."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response, status

from pulsegrid.api.dependencies import ProcessorDep, StateDep
from pulsegrid.core.parsers import AlertParserFactory
from pulsegrid.models import Alert

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/alerts", status_code=status.HTTP_202_ACCEPTED)
async def ingest_alert(
    payload: dict[str, Any],
    request: Request,
    state: StateDep,
    processor: ProcessorDep,
) -> dict[str, str]:
    """Accept alert webhook — returns 202 before full processing (async ingestion)."""
    if state.queue.is_near_capacity:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Alert queue near capacity",
            headers={"Retry-After": "5"},
        )

    source = payload.get("source", request.headers.get("X-Alert-Source", "custom"))
    try:
        alert: Alert = AlertParserFactory.parse(source, payload)
    except (KeyError, ValueError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    accepted = await state.queue.enqueue(alert)
    if not accepted:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Alert queue full",
            headers={"Retry-After": "10"},
        )

    return {"status": "accepted", "alert_id": alert.id}


@router.post("/alerts/sync", status_code=status.HTTP_201_CREATED)
async def ingest_alert_sync(
    payload: dict[str, Any],
    request: Request,
    processor: ProcessorDep,
) -> dict[str, Any]:
    """Synchronous ingestion for testing — processes immediately."""
    source = payload.get("source", request.headers.get("X-Alert-Source", "custom"))
    alert = AlertParserFactory.parse(source, payload)
    incident = await processor.process_alert(alert)
    return {"incident_id": incident.id, "status": incident.status.value}
