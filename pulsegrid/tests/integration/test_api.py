"""FastAPI integration tests (Week 9)."""

import pytest
from httpx import ASGITransport, AsyncClient

from pulsegrid.api.main import create_app


@pytest.fixture
def app():
    return create_app()


@pytest.mark.asyncio
async def test_health_endpoint(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_webhook_returns_202(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post(
            "/webhooks/alerts",
            json={"service_id": "api", "title": "Test", "severity": "p2", "source": "custom"},
        )
        assert resp.status_code == 202
        assert resp.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_incidents_require_auth(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.get("/incidents")
        assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_and_list_incidents(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/auth/login", json={"username": "admin", "password": "admin"})
        assert login.status_code == 200
        token = login.json()["access_token"]

        await client.post(
            "/webhooks/alerts/sync",
            json={"service_id": "api", "title": "Sync test", "severity": "p1", "source": "custom"},
        )

        resp = await client.get("/incidents", headers={"Authorization": f"Bearer {token}"})
        assert resp.status_code == 200
        assert len(resp.json()) >= 1


@pytest.mark.asyncio
async def test_acknowledge_incident(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        login = await client.post("/auth/login", json={"username": "admin", "password": "admin"})
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        created = await client.post(
            "/webhooks/alerts/sync",
            json={"service_id": "api", "title": "Ack test", "severity": "p2", "source": "custom"},
        )
        incident_id = created.json()["incident_id"]

        ack = await client.post(f"/incidents/{incident_id}/acknowledge", headers=headers)
        assert ack.status_code == 200
        assert ack.json()["status"] == "acknowledged"


@pytest.mark.asyncio
async def test_invalid_payload_returns_422(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/webhooks/alerts", json={"title": "missing fields"})
        assert resp.status_code == 422
