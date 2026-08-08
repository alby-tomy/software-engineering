# Monolith-first architecture

## Status

Accepted

## Context

PulseGrid spans ingestion, processing, storage, notifications, search, and AI. We need an architecture that supports learning all layers without premature microservice complexity.

## Decision

Start with a **modular monolith**:

- Single Python package with clear module boundaries (`api/`, `worker/`, `core/`, `db/`, `services/`)
- One deployable API process + separate worker process (same codebase)
- PostgreSQL for relational data, Redis for cache/dedup
- Extract gRPC notification service in Week 10 when boundaries are proven

## Why monolith-first?

1. **Faster iteration** during weeks 1–9 while learning fundamentals
2. **Shared domain models** — no distributed transaction pain while schema evolves
3. **Single test suite** — integration tests run against one process
4. **Clear extraction points** — worker and notification service become separate deployables later

## Consequences

- Positive: simpler local dev, one `docker compose up`, unified logging
- Negative: API and worker scale together until Week 17+ (Kafka split)
- Migration path: Week 10 extracts notification gRPC; Week 17 adds Kafka topics between ingestion and workers

## Module boundaries (enforced by imports)

```
api/       → may import core, db, services, models
worker/    → may import core, db, services, models
core/      → may import models only
db/        → may import models only
services/  → may import models only
models/    → no internal imports
```
