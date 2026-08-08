"""Redis cache-aside for active incidents (Week 8)."""

from __future__ import annotations

import json
import asyncio
from typing import Any

import redis.asyncio as aioredis

from pulsegrid.config import settings
from pulsegrid.models import Incident


class IncidentCache:
    def __init__(self, redis_client: aioredis.Redis, ttl: int | None = None) -> None:
        self.redis = redis_client
        self.ttl = ttl or settings.cache_ttl_seconds
        self._locks: dict[str, asyncio.Lock] = {}

    def _key(self, team_id: str = "default") -> str:
        return f"active_incidents:{team_id}"

    def _lock_for(self, key: str) -> asyncio.Lock:
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

    async def get_active(self, team_id: str = "default") -> list[Incident] | None:
        raw = await self.redis.get(self._key(team_id))
        if raw is None:
            return None
        data = json.loads(raw)
        return [Incident.model_validate(item) for item in data]

    async def set_active(self, incidents: list[Incident], team_id: str = "default") -> None:
        payload = json.dumps([i.model_dump(mode="json") for i in incidents])
        await self.redis.setex(self._key(team_id), self.ttl, payload)

    async def invalidate(self, team_id: str = "default") -> None:
        await self.redis.delete(self._key(team_id))

    async def get_or_load(
        self,
        team_id: str,
        loader: Any,
    ) -> list[Incident]:
        """Cache-aside with singleflight stampede protection."""
        cached = await self.get_active(team_id)
        if cached is not None:
            return cached

        key = self._key(team_id)
        async with self._lock_for(key):
            cached = await self.get_active(team_id)
            if cached is not None:
                return cached
            incidents = await loader()
            await self.set_active(incidents, team_id)
            return incidents


class DedupRedisStore:
    """Redis sorted-set dedup window (Week 8)."""

    def __init__(self, redis_client: aioredis.Redis, window_seconds: float = 300.0) -> None:
        self.redis = redis_client
        self.window_seconds = window_seconds
        self._key = "dedup:window"

    async def is_duplicate(self, dedup_key: str) -> bool:
        import time

        now = time.time()
        cutoff = now - self.window_seconds
        await self.redis.zremrangebyscore(self._key, 0, cutoff)
        score = await self.redis.zscore(self._key, dedup_key)
        return score is not None

    async def record(self, dedup_key: str) -> None:
        import time

        await self.redis.zadd(self._key, {dedup_key: time.time()})


async def get_redis() -> aioredis.Redis:
    return aioredis.from_url(settings.redis_url, decode_responses=True)
