"""Rate limiting middleware (Week 16)."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from pulsegrid.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int | None = None) -> None:
        super().__init__(app)
        self.limit = requests_per_minute or settings.rate_limit_per_minute
        self._counts: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.url.path in ("/health", "/ready", "/docs", "/openapi.json"):
            return await call_next(request)

        client = request.client.host if request.client else "unknown"
        now = time.time()
        window = self._counts[client]
        window[:] = [t for t in window if now - t < 60]
        if len(window) >= self.limit:
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        window.append(now)
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(self.limit)
        return response
