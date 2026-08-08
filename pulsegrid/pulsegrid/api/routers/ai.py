"""AI endpoints: summarize, RAG, agent (Weeks 21–23)."""

from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from pulsegrid.api.auth import get_current_user
from pulsegrid.api.dependencies import ProcessorDep, StateDep
from pulsegrid.models import User
from pulsegrid.services.ai.agent import AgentTrace

router = APIRouter(prefix="/ai", tags=["ai"])


class AgentRequest(BaseModel):
    query: str


class SummaryResponse(BaseModel):
    incident_id: str
    summary: str


@router.post("/incidents/{incident_id}/summarize", response_model=SummaryResponse)
async def summarize_incident(
    incident_id: str,
    state: StateDep,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> SummaryResponse:
    incident = processor.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    assert state.ai_service is not None
    summary = await state.ai_service.summarize(incident)
    return SummaryResponse(incident_id=incident_id, summary=summary)


@router.post("/incidents/{incident_id}/summarize/stream")
async def summarize_stream(
    incident_id: str,
    state: StateDep,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
):
    incident = processor.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    assert state.ai_service is not None

    async def event_generator():
        async for chunk in state.ai_service.summarize_stream(incident):
            yield f"data: {json.dumps({'chunk': chunk})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/incidents/{incident_id}/runbooks")
async def suggest_runbooks(
    incident_id: str,
    state: StateDep,
    processor: ProcessorDep,
    _user: Annotated[User, Depends(get_current_user)],
):
    incident = processor.get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    chunks = state.runbooks.suggest_for_incident(incident)
    return [{"title": c.title, "source": c.source_file, "excerpt": c.content[:300]} for c in chunks]


@router.post("/agent", response_model=AgentTrace)
async def run_agent(
    body: AgentRequest,
    state: StateDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> AgentTrace:
    assert state.agent is not None
    return await state.agent.run(body.query)


@router.get("/agent/traces")
async def list_agent_traces(
    state: StateDep,
    _user: Annotated[User, Depends(get_current_user)],
) -> list[AgentTrace]:
    assert state.agent is not None
    return state.agent.traces
