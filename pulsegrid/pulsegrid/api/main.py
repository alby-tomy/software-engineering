"""FastAPI production application (Week 9)."""

from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pulsegrid.api.routers import auth, incidents, services, webhooks
from pulsegrid.api.state import AppState, app_state
from pulsegrid.config import settings

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    state = AppState(
        queue=app_state.queue,
        service_graph=app_state.service_graph,
    )
    state.init_processor()
    app.state.pulsegrid = state
    logger.info("pulsegrid_started", worker_count=settings.worker_count)
    yield
    logger.info("pulsegrid_stopped")


def create_app() -> FastAPI:
    app = FastAPI(
        title="PulseGrid API",
        description="AI-powered incident response platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def request_logging(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = f"{duration_ms:.2f}"
        logger.info(
            "request",
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            duration_ms=round(duration_ms, 2),
        )
        return response

    app.include_router(auth.router)
    app.include_router(webhooks.router)
    app.include_router(incidents.router)
    app.include_router(services.router)

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/ready")
    async def ready() -> JSONResponse:
        checks: dict[str, str] = {"api": "ok"}
        try:
            import redis.asyncio as aioredis

            r = aioredis.from_url(settings.redis_url)
            await r.ping()
            await r.aclose()
            checks["redis"] = "ok"
        except Exception as exc:
            checks["redis"] = f"error: {exc}"
        # DB optional for in-memory mode
        if all(v == "ok" for v in checks.values()):
            return JSONResponse({"status": "ready", "checks": checks})
        return JSONResponse(
            {"status": "not_ready", "checks": checks},
            status_code=503,
        )

    return app


app = create_app()


def run() -> None:
    import uvicorn

    uvicorn.run("pulsegrid.api.main:app", host="0.0.0.0", port=8000, reload=True)


if __name__ == "__main__":
    run()
