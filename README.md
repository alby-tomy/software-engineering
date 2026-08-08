# Software Engineering Interview Prep

A complete interview preparation and learning platform for **3+ years experienced** and **senior-level** software engineering interviews.

Built for engineers targeting roles like Micro1, senior backend, full-stack, and systems positions — with focus on **engineering reasoning**, not memorization.

## What's Inside

- **36 modules** covering CS fundamentals through staff-level engineering
- **10 curriculum stages** from beginner to senior
- **4 learning paths** (Backend Senior, Full-Stack, Systems, Micro1 Prep)
- **200+ interview questions** at 9 depth levels (Recall → Senior)
- **Senior scenarios** with structured approach and follow-ups
- **Progress tracking** (saved in browser localStorage)
- **Full-text search** across modules and questions

## Topics Covered

| Category | Modules |
|----------|---------|
| Foundations | CS Fundamentals, DSA, Concurrency |
| Languages | Python, Go, C++ |
| Databases | SQL, PostgreSQL/Redis, MongoDB, Elasticsearch |
| Backend | FastAPI, REST API, GraphQL, gRPC |
| Architecture | Design Patterns, System Design, Microservices |
| Messaging | Message Queues (Kafka), Event-Driven Architecture |
| Frontend | React, Next.js |
| Infrastructure | Networking, Linux, Git, Docker, CI/CD, Kubernetes, Cloud |
| Distributed | Distributed Systems, Message Queues, Event-Driven |
| Quality | Testing, Performance, Observability, Security |
| Career | Behavioral Interviews, AI Engineering, Senior Engineering |

## Quick Start

```bash
cd interview-prep
npm install
npm run dev
```

Open http://localhost:5173

## Build for Production

```bash
cd interview-prep
npm run build
npm run preview
```

## New Modules Added

- **Concurrency & Parallelism** — threads, async, worker pools, backpressure
- **Message Queues** — Kafka, RabbitMQ, SQS, delivery guarantees
- **Microservices** — service decomposition, API gateway, sagas
- **Design Patterns** — GoF patterns, architectural patterns
- **Behavioral Interviews** — STAR method, leadership questions
- **gRPC** — Protocol Buffers, streaming, vs REST
- **CI/CD** — pipelines, blue-green, canary deployments
- **Event-Driven Architecture** — event sourcing, CQRS
- **MongoDB** — document modeling, aggregation
- **Elasticsearch** — full-text search, inverted indexes

## Learning Framework

Every topic progresses through 9 levels:

| Level | Focus | Example |
|-------|-------|---------|
| A — Recall | What is it? | "What is a coroutine?" |
| B — Understanding | How does it work? | "How does a coroutine differ from a thread?" |
| C — Application | When do you use it? | "When would you choose async over threads?" |
| D — Debugging | How do you investigate? | "Your async API has high latency. How do you debug?" |
| E — Optimization | How do you improve? | "Improve throughput without increasing CPU?" |
| F — Architecture | How do you design? | "Design a highly concurrent async API." |
| G — Trade-offs | What are alternatives? | "Async vs threads vs processes?" |
| H — Production | What happens at scale? | "50k concurrent requests, downstream timing out?" |
| I — Senior | Complete system design | "Design architecture with failure modes and observability." |

## Recommended Learning Path

For Micro1 / senior backend interviews:

```
CS Fundamentals → Python → Concurrency → DSA → SQL → FastAPI
→ System Design → Microservices → Message Queues → Security
→ Behavioral → Senior Engineering
```

Use the **Micro1 Interview Prep** learning path in the app for an 8-week structured plan.

## License

MIT
