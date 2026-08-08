"""Tests for weeks 10+ features."""

import pytest
from httpx import ASGITransport, AsyncClient

from pulsegrid.api.main import create_app
from pulsegrid.core.circuit_breaker import CircuitBreaker, CircuitState
from pulsegrid.core.idempotency import IdempotencyStore
from pulsegrid.services.ai.rag import RunbookIndex
from pulsegrid.services.notification.service import NotificationService
from pathlib import Path


@pytest.fixture
def app():
    return create_app()


async def _auth_headers(client: AsyncClient) -> dict[str, str]:
    login = await client.post("/auth/login", json={"username": "admin", "password": "admin"})
    token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_v1_pagination(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = await _auth_headers(client)
        await client.post(
            "/webhooks/alerts/sync",
            json={"service_id": "a", "title": "t1", "severity": "p1", "source": "custom"},
        )
        resp = await client.get("/v1/incidents?limit=10", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert "next_cursor" in data


@pytest.mark.asyncio
async def test_idempotency_key(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = {"Idempotency-Key": "test-key-123"}
        payload = {"service_id": "api", "title": "Idem", "severity": "p2", "source": "custom"}
        r1 = await client.post("/webhooks/alerts/sync", json=payload, headers=headers)
        r2 = await client.post("/webhooks/alerts/sync", json=payload, headers=headers)
        assert r1.json()["incident_id"] == r2.json()["incident_id"]


@pytest.mark.asyncio
async def test_timeline_on_create(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = await _auth_headers(client)
        created = await client.post(
            "/webhooks/alerts/sync",
            json={"service_id": "api", "title": "Timeline", "severity": "p1", "source": "custom"},
        )
        iid = created.json()["incident_id"]
        timeline = await client.get(f"/incidents/{iid}/timeline", headers=headers)
        assert timeline.status_code == 200
        assert len(timeline.json()) >= 1


@pytest.mark.asyncio
async def test_status_page(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/status/default")
        assert resp.status_code == 200
        assert "services" in resp.json()


@pytest.mark.asyncio
async def test_ai_summarize(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = await _auth_headers(client)
        created = await client.post(
            "/webhooks/alerts/sync",
            json={"service_id": "payment-api", "title": "Errors", "severity": "p1", "source": "custom"},
        )
        iid = created.json()["incident_id"]
        resp = await client.post(f"/ai/incidents/{iid}/summarize", headers=headers)
        assert resp.status_code == 200
        assert "summary" in resp.json()


@pytest.mark.asyncio
async def test_agent(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = await _auth_headers(client)
        resp = await client.post(
            "/ai/agent",
            json={"query": "What is the health of payment-api?"},
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["final_answer"]


@pytest.mark.asyncio
async def test_postmortem(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = await _auth_headers(client)
        created = await client.post(
            "/webhooks/alerts/sync",
            json={"service_id": "api", "title": "PM test", "severity": "p2", "source": "custom"},
        )
        iid = created.json()["incident_id"]
        resp = await client.get(f"/incidents/{iid}/postmortem", headers=headers)
        assert resp.status_code == 200
        assert "markdown" in resp.json()


class TestCircuitBreaker:
    def test_opens_after_failures(self):
        cb = CircuitBreaker(failure_threshold=3)
        for _ in range(3):
            cb.record_failure()
        assert cb.state == CircuitState.OPEN
        assert cb.allow_request() is False


class TestIdempotencyStore:
    def test_get_set(self):
        store = IdempotencyStore()
        store.set("key1", "inc-1")
        assert store.get("key1") == "inc-1"


class TestRAG:
    def test_runbook_search(self):
        index = RunbookIndex()
        path = Path(__file__).resolve().parents[2] / "docs" / "runbooks"
        index.ingest_directory(path)
        results = index.search("redis connection refused")
        assert len(results) >= 1


@pytest.mark.asyncio
async def test_e2e_flow(app):
    """E2E: webhook → incident → acknowledge → timeline → postmortem."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        headers = await _auth_headers(client)
        created = await client.post(
            "/webhooks/alerts/sync",
            json={"service_id": "checkout-api", "title": "E2E", "severity": "p1", "source": "custom"},
        )
        iid = created.json()["incident_id"]
        ack = await client.post(f"/incidents/{iid}/acknowledge", headers=headers)
        assert ack.json()["status"] == "acknowledged"
        resolve = await client.post(f"/incidents/{iid}/resolve", headers=headers)
        assert resolve.json()["status"] == "resolved"
        pm = await client.get(f"/incidents/{iid}/postmortem", headers=headers)
        assert "Postmortem" in pm.json()["markdown"]
