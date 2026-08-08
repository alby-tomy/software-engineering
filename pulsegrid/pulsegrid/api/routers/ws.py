"""WebSocket real-time incident updates (Week 11)."""

from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from pulsegrid.api.state import AppState

router = APIRouter(tags=["websocket"])


def _get_ws_state(websocket: WebSocket) -> AppState:
    state = getattr(websocket.app.state, "pulsegrid", None)
    if state is None:
        state = AppState()
        state.init_processor()
        websocket.app.state.pulsegrid = state
    return state


@router.websocket("/ws/incidents")
async def incidents_websocket(websocket: WebSocket) -> None:
    await websocket.accept()
    state = _get_ws_state(websocket)
    state.ws_clients.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        if websocket in state.ws_clients:
            state.ws_clients.remove(websocket)
