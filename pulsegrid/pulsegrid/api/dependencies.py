"""FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from pulsegrid.api.state import AppState
from pulsegrid.core.processor import AlertProcessor
from pulsegrid.db.session import get_session


def get_app_state(request: Request) -> AppState:
    state = getattr(request.app.state, "pulsegrid", None)
    if state is None:
        state = AppState()
        state.init_processor()
        request.app.state.pulsegrid = state
    return state


def get_processor(state: Annotated[AppState, Depends(get_app_state)]) -> AlertProcessor:
    if state.processor is None:
        state.init_processor()
    assert state.processor is not None
    return state.processor


SessionDep = Annotated[AsyncSession, Depends(get_session)]
ProcessorDep = Annotated[AlertProcessor, Depends(get_processor)]
StateDep = Annotated[AppState, Depends(get_app_state)]
