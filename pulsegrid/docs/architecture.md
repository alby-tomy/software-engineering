# PulseGrid Architecture (Production)

## Overview

PulseGrid is a modular monolith evolving toward event-driven microservices.

## Components

- **API** (FastAPI): REST, GraphQL, WebSocket, AI endpoints
- **Worker**: Async alert processing with priority queue
- **Notification** (gRPC): Pages on-call engineers
- **Dashboard** (React/Next.js): Incident management UI
- **AI Layer**: Summarization, RAG runbooks, response agent

## Data Stores

- PostgreSQL: incidents, users, on-call schedules
- Redis: cache, dedup window
- Kafka (optional): event streaming with outbox pattern
- Elasticsearch (future): full-text incident search

## Deployment

- Local: `docker compose up`
- Staging/Prod: Kubernetes on AWS (Terraform + EKS)
- CI: GitHub Actions → Docker registry → K8s rolling update

## AI Production

- LLM calls cached per incident
- Mock fallback when no API key
- RAG eval gate: recall@3 ≥ 0.85
- Agent requires human approval for destructive actions
