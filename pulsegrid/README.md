# PulseGrid

**AI-Powered Incident Response & Reliability Platform**

PulseGrid is the hands-on capstone for the 6-month software engineering course. You build it week-by-week alongside the curriculum — each module teaches a concept, then you apply it here.

## Problem

During outages, teams drown in duplicate alerts, chase downstream symptoms instead of root causes, and waste minutes finding runbooks. PulseGrid ingests alerts, deduplicates them, correlates service dependencies, and exposes a production API for on-call engineers.

## Architecture (Weeks 1–9)

```
[Prometheus/Datadog] ──webhook──▶ [FastAPI /webhooks/alerts]
                                        │
                                        ▼ (202 Accepted)
                                  [Priority Queue]
                                        │
                                        ▼
                              [Worker Pool + Dedup]
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
              [PostgreSQL]          [Redis]           [Service Graph]
              incidents,            cache +           BFS root-cause
              alerts, users           dedup window      correlation
```

## Quick Start

### Prerequisites

- Python 3.12+
- Docker & Docker Compose

### 1. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (5432) and Redis (6379).

### 2. Install dependencies

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

### 3. Run migrations

```bash
alembic upgrade head
```

### 4. Start API + worker

```bash
# Terminal 1 — API server
uvicorn pulsegrid.api.main:app --reload --port 8000

# Terminal 2 — background alert processor
python -m pulsegrid.worker.runner
```

### 5. Send a test alert

```bash
curl -X POST http://localhost:8000/webhooks/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "service_id": "payment-api",
    "title": "High error rate",
    "severity": "p1",
    "source": "custom"
  }'
```

### 6. List incidents (login first)

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | python -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/incidents
```

## Project Structure

| Path | Week | Purpose |
|------|------|---------|
| `docs/adr/001-monolith-first.md` | 1 | Architecture decision record |
| `docs/domain-model.md` | 1 | Entity relationships |
| `pulsegrid/models/` | 2 | Pydantic domain models |
| `pulsegrid/core/queue.py` | 3 | Async alert ingestion |
| `pulsegrid/core/worker_pool.py` | 4 | Worker pool + dedup |
| `pulsegrid/core/priority_queue.py` | 5 | P1-first processing |
| `pulsegrid/services/service_graph.py` | 6 | Dependency graph + BFS |
| `pulsegrid/db/` | 7 | PostgreSQL schema + Alembic |
| `pulsegrid/cache/` | 8 | Redis cache-aside |
| `pulsegrid/api/` | 9 | FastAPI production API |

## Running Tests

```bash
pytest -v
mypy pulsegrid
ruff check pulsegrid tests
```

## Course Integration

Each weekly step in the learning platform (`/capstone`) maps to real files in this repo. Complete the textbook lesson, then implement or verify the corresponding code path.

## License

MIT — built for learning.
