import type { CapstoneProject } from '../types/curriculum';
import { capstoneSteps } from './capstone-steps';

export const capstoneProject: CapstoneProject = {
  id: 'pulsegrid',
  name: 'PulseGrid',
  tagline: 'AI-Powered Incident Response & Reliability Platform',
  description:
    'Build a production-grade incident management platform from scratch over 24 weeks. PulseGrid ingests real-time alerts, correlates service dependencies, pages on-call engineers, and uses RAG + AI agents to suggest runbooks — solving the same problems PagerDuty, Datadog, and incident.io address.',
  problemStatement: `Engineering teams lose millions during outages because:
- **Alert fatigue**: 200 duplicate "CPU high" pages during one incident
- **Scattered runbooks**: procedures live in Confluence, Slack, and engineers' heads
- **No correlation**: downstream alerts mask the real root cause
- **Slow triage**: 15+ minutes understanding what happened before acting

PulseGrid solves this end-to-end: ingest → deduplicate → correlate → page → suggest runbooks → AI-assisted resolution.`,
  targetUsers: [
    'On-call software engineers responding to production incidents',
    'SRE teams managing service reliability and alert routing',
    'Engineering managers tracking MTTR and incident trends',
    'Platform teams building internal developer tooling',
  ],
  finalArchitecture: `\`\`\`
                    ┌─────────────────────────────────────────┐
                    │           PulseGrid Platform            │
                    └─────────────────────────────────────────┘

  [Prometheus]  ──webhook──▶  [API Gateway / ALB]
  [Datadog]     ──webhook──▶       │
  [Custom]      ──webhook──▶       ▼
                          [FastAPI API Service]
                           │    │    │    │
                    ┌──────┘    │    │    └──────┐
                    ▼           ▼    ▼           ▼
              [PostgreSQL]  [Redis] [MongoDB] [Elasticsearch]
                    │                       │
                    ▼                       ▼
              [Kafka Topics]          [Search Index]
           alerts.raw │ incidents.events
                    ▼
         ┌──────────┴──────────┐
         ▼                     ▼
  [Alert Worker Pool]    [Notification Service (gRPC)]
         │                     │
         ▼                     ▼
  [Incident Service]     [Slack / PagerDuty / Email]
         │
         ▼
  [AI Copilot Service]
   ├─ RAG Runbook Search (pgvector)
   ├─ Incident Summarization (LLM)
   └─ Response Agent (tools + ReAct)
         │
         ▼
  [Next.js Dashboard + Public Status Page]
\`\`\``,
  techStack: [
    'Python 3.12 + FastAPI + Pydantic',
    'PostgreSQL + Redis + MongoDB + Elasticsearch + pgvector',
    'Kafka (event streaming)',
    'gRPC + REST + GraphQL',
    'React + Next.js (App Router)',
    'Docker + Kubernetes + Terraform (AWS)',
    'GitHub Actions CI/CD',
    'OpenAI / Anthropic (LLM + embeddings)',
    'OpenTelemetry + Grafana',
  ],
  repoStructure: `pulsegrid/
├── api/                 # FastAPI application
│   ├── routers/         # incidents, webhooks, auth, graphql
│   ├── dependencies/    # DB, Redis, auth injection
│   └── middleware/      # logging, rate limit, CORS
├── worker/              # Async alert processing workers
├── services/
│   ├── notification/    # gRPC notification service
│   ├── search/          # Elasticsearch indexer
│   └── ai/              # LLM, RAG, agent
├── models/              # Pydantic domain models
├── db/
│   ├── migrations/      # Alembic
│   └── repositories/    # Data access layer
├── dashboard/           # Next.js frontend
├── infra/
│   ├── terraform/       # AWS infrastructure
│   ├── k8s/             # Kubernetes manifests
│   └── docker/          # Dockerfiles
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── adr/             # Architecture decision records
    ├── runbooks/        # Operational runbooks (RAG corpus)
    └── design/          # System design documents`,
  steps: capstoneSteps,
};

export { capstoneSteps, getCapstoneStep, getCapstoneStepsForModule, getCapstoneStepById } from './capstone-steps';
