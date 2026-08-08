# PulseGrid

**AI-Powered Incident Response & Reliability Platform**

PulseGrid is the hands-on capstone for the 6-month software engineering course. You build it week-by-week alongside the curriculum — each module teaches a concept, then you apply it here.

## Problem

During outages, teams drown in duplicate alerts, chase downstream symptoms instead of root causes, and waste minutes finding runbooks. PulseGrid ingests alerts, deduplicates them, correlates service dependencies, pages on-call engineers, and uses AI to summarize incidents and suggest runbooks.

## Full Architecture (24 Weeks)

```
[Monitoring] ──webhook──▶ [FastAPI API] ──▶ [Priority Queue] ──▶ [Worker Pool]
                                │                                      │
                    REST /v1 / GraphQL / WS                           ▼
                                │                              [Incident Processor]
                    ┌───────────┼───────────┐                          │
                    ▼           ▼           ▼                          ▼
              [PostgreSQL]  [Redis]   [Kafka/Events]          [Notifications]
                    │                       │                   Slack/PagerDuty
                    ▼                       ▼
              [Timeline]            [Search Index]
                    │
                    ▼
         [AI: Summarize / RAG / Agent]
                    │
                    ▼
         [React Dashboard] + [Next.js Status Page]
```

## Quick Start

### Prerequisites

- Python 3.12+
- Docker & Docker Compose (optional)
- Node.js 18+ (for dashboards)

### 1. Start full stack

```bash
docker compose up -d   # postgres, redis, redpanda, api, worker
```

Or run locally:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
uvicorn pulsegrid.api.main:app --reload --port 8000
python -m pulsegrid.worker.runner   # separate terminal
```

### 2. Run tests (51 tests)

```bash
pytest -v
python scripts/eval_rag.py   # RAG recall@3 gate
```

### 3. React dashboard (Week 11)

```bash
cd dashboard && npm install && npm run dev
# http://localhost:5173
```

### 4. Next.js status page (Week 12)

```bash
cd dashboard-next && npm install && npm run dev
# http://localhost:3000/status/default
```

## Weekly Code Map

| Weeks | Feature | Key Paths |
|-------|---------|-----------|
| 1–2 | Architecture + models | `docs/`, `pulsegrid/models/` |
| 3–5 | Async ingestion + DSA | `pulsegrid/core/` |
| 6 | Service graph | `pulsegrid/services/service_graph.py` |
| 7–8 | PostgreSQL + Redis | `pulsegrid/db/`, `pulsegrid/cache/` |
| 9 | FastAPI API | `pulsegrid/api/` |
| 10 | REST v1, GraphQL, gRPC | `api/routers/v1.py`, `api/graphql/`, `services/notification/` |
| 11 | React dashboard | `dashboard/` |
| 12 | Next.js SSR + status page | `dashboard-next/` |
| 13 | Git workflow | `.github/`, `docs/contributing.md` |
| 14 | Docker + CI/CD | `infra/docker/`, `.github/workflows/` |
| 15 | Terraform (AWS) | `infra/terraform/` |
| 16 | Kubernetes + security | `infra/k8s/`, `api/middleware/` |
| 17 | Scale + circuit breaker | `core/circuit_breaker.py`, `scripts/load_test.py` |
| 18 | Timeline + postmortem | `api/routers/timeline.py`, `api/routers/postmortem.py` |
| 19 | Kafka + outbox | `core/outbox.py`, `services/event_bus.py` |
| 20 | Performance | `scripts/load_test.py` |
| 21 | AI summarization | `services/ai/summarizer.py` |
| 22 | RAG runbooks | `services/ai/rag.py`, `docs/runbooks/` |
| 23 | AI agent | `services/ai/agent.py` |
| 24 | Production launch | `docs/demo-script.md`, `docs/architecture.md` |

## API Highlights

| Endpoint | Description |
|----------|-------------|
| `POST /webhooks/alerts` | Async ingestion (202) |
| `GET /v1/incidents?cursor=&limit=` | Cursor pagination |
| `POST /graphql` | GraphQL playground |
| `GET /status/{team}` | Public status page data |
| `GET /incidents/{id}/timeline` | Event timeline |
| `POST /ai/incidents/{id}/summarize` | AI summary |
| `GET /ai/incidents/{id}/runbooks` | RAG runbook suggestions |
| `POST /ai/agent` | Incident response agent |
| `WS /ws/incidents` | Real-time updates |

## Demo

See `docs/demo-script.md` for the 5-minute capstone presentation flow.

## License

MIT — built for learning.
