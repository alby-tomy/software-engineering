import type { CapstoneStep } from '../types/curriculum';

export const capstoneSteps: CapstoneStep[] = [
  {
    id: 'step-01-architecture',
    week: 1,
    month: 1,
    title: 'System Architecture & Domain Design',
    moduleIds: ['cs-fundamentals'],
    realWorldProblem:
      'Before writing code, teams that skip architecture end up rewriting systems after the first outage. PulseGrid must handle alert floods without dropping critical incidents — that requires understanding processes, threads, and where work runs.',
    objectives: [
      'Define PulseGrid domain: Services, Alerts, Incidents, On-call, Runbooks',
      'Draw system architecture: ingestion → processing → storage → UI → AI',
      'Identify sync vs async boundaries and failure domains',
    ],
    implementationTasks: [
      'Create GitHub repo `pulsegrid` with README describing the problem and solution',
      'Draw architecture diagram (use draw.io or Mermaid): webhook ingestion, API layer, workers, databases, dashboard',
      'Document domain entities: `Service`, `Alert`, `Incident`, `User`, `Runbook`, `OnCallSchedule`',
      'Write ADR (Architecture Decision Record) #001: monolith-first with clear module boundaries, extract microservices in Month 5',
      'Map which components are CPU-bound vs I/O-bound (informs concurrency choices in Week 3–4)',
    ],
    deliverables: [
      'README.md with problem statement and architecture diagram',
      'docs/adr/001-monolith-first.md',
      'docs/domain-model.md with entity relationships',
    ],
    conceptsApplied: ['Process vs thread', 'Stack vs heap', 'Sync vs async I/O', 'System boundaries'],
    acceptanceCriteria: [
      'Architecture diagram shows all major components and data flows',
      'Domain model explains alert → incident lifecycle',
      'ADR documents why monolith-first is chosen for learning',
    ],
    architectureNote: `Alert lifecycle: Webhook receives alert → deduplicate (Redis) → persist (PostgreSQL) → 
correlate with service dependencies → create/update Incident → notify on-call → index for search (Elasticsearch) → 
AI copilot suggests runbook steps (Month 6).`,
    codePaths: [
      'pulsegrid/README.md',
      'pulsegrid/docs/adr/001-monolith-first.md',
      'pulsegrid/docs/domain-model.md',
    ],
  },
  {
    id: 'step-02-python-foundation',
    week: 2,
    month: 1,
    title: 'Python Project Scaffold & Domain Models',
    moduleIds: ['python'],
    realWorldProblem:
      'Incident platforms need strongly-typed domain models so alert severity, status transitions, and timestamps are never ambiguous — bugs here cause pages to the wrong engineer at 3 AM.',
    objectives: [
      'Set up production Python project structure with Poetry/uv and type hints',
      'Implement core domain models with Pydantic v2',
      'Write unit tests for model validation and state transitions',
    ],
    implementationTasks: [
      'Initialize `pulsegrid/` package: `api/`, `core/`, `models/`, `services/`, `tests/`',
      'Create Pydantic models: `Alert`, `Incident`, `Service`, `Severity` enum, `IncidentStatus` enum',
      'Implement `Incident.transition_to(status)` with validation (cannot resolve unacknowledged)',
      'Add `pyproject.toml` with ruff, mypy, pytest dependencies',
      'Write tests: invalid severity rejected, status transition rules enforced',
    ],
    deliverables: [
      'Working `pulsegrid/models/` package with typed domain objects',
      '20+ unit tests passing with `pytest`',
      'Type checking passes with `mypy --strict`',
    ],
    conceptsApplied: ['Type hints', 'Pydantic validation', 'Enums', 'Project structure', 'Unit testing'],
    acceptanceCriteria: [
      'Alert cannot be created without service_id and severity',
      'Incident status follows: triggered → acknowledged → resolved',
      'All models serialize to/from JSON correctly',
    ],
    starterCode: `from enum import StrEnum
from datetime import datetime
from pydantic import BaseModel, Field

class Severity(StrEnum):
    P1 = "p1"  # critical — page immediately
    P2 = "p2"
    P3 = "p3"
    P4 = "p4"  # low — ticket only

class IncidentStatus(StrEnum):
    TRIGGERED = "triggered"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

class Alert(BaseModel):
    id: str
    service_id: str
    title: str
    severity: Severity
    source: str  # prometheus, datadog, custom
    received_at: datetime = Field(default_factory=datetime.utcnow)`,
    codePaths: [
      'pulsegrid/pyproject.toml',
      'pulsegrid/pulsegrid/models/domain.py',
      'pulsegrid/pulsegrid/models/enums.py',
      'pulsegrid/tests/unit/test_models.py',
    ],
  },
  {
    id: 'step-03-async-ingestion',
    week: 3,
    month: 1,
    title: 'Async Alert Ingestion Pipeline',
    moduleIds: ['python', 'concurrency'],
    realWorldProblem:
      'During a major outage, monitoring tools send thousands of alerts per minute. A synchronous API that processes each alert fully before responding will timeout and drop alerts.',
    objectives: [
      'Build async alert ingestion with asyncio queue',
      'Understand when asyncio beats threading for I/O-bound webhook bursts',
      'Implement backpressure when queue is full',
    ],
    implementationTasks: [
      'Create `AlertQueue` with `asyncio.Queue(maxsize=1000)`',
      'Implement `POST /webhooks/alerts` that validates payload and enqueues (returns 202 immediately)',
      'Build `AlertWorker` coroutine that consumes queue and logs processed alerts',
      'Add backpressure: return 503 when queue > 90% full with `Retry-After` header',
      'Benchmark: simulate 500 concurrent webhook posts with `httpx` + `asyncio.gather`',
    ],
    deliverables: [
      'Async ingestion endpoint returning 202 Accepted in < 50ms under load',
      'Worker process consuming alerts from queue',
      'Load test script showing throughput vs sync baseline',
    ],
    conceptsApplied: ['asyncio', 'async/await', 'Queues', 'Backpressure', 'GIL and I/O'],
    acceptanceCriteria: [
      'API responds 202 before alert is fully processed',
      'Queue full returns 503 with Retry-After',
      'Worker processes alerts without blocking the event loop',
    ],
    codePaths: [
      'pulsegrid/pulsegrid/core/queue.py',
      'pulsegrid/pulsegrid/api/routers/webhooks.py',
      'pulsegrid/pulsegrid/worker/runner.py',
    ],
  },
  {
    id: 'step-04-worker-pools',
    week: 4,
    month: 1,
    title: 'Worker Pools & Alert Deduplication',
    moduleIds: ['concurrency', 'design-patterns'],
    realWorldProblem:
      'Alert storms during outages create hundreds of duplicate "CPU high" alerts for the same service. Without deduplication, on-call engineers get paged 200 times and miss the real issue.',
    objectives: [
      'Implement worker pool pattern with bounded concurrency',
      'Apply Strategy pattern for deduplication algorithms',
      'Use Factory pattern for alert source parsers (Prometheus, Datadog, custom)',
    ],
    implementationTasks: [
      'Create `WorkerPool` with configurable worker count and `asyncio.Semaphore`',
      'Implement `DeduplicationStrategy`: same service + title within 5-minute window = duplicate',
      'Build `AlertParserFactory` returning correct parser for `source` field',
      'Add Prometheus webhook parser: extract labels, severity, annotations',
      'Integration test: 100 duplicate alerts → only 1 incident created',
    ],
    deliverables: [
      'Worker pool processing alerts with configurable concurrency',
      'Deduplication reducing alert volume by 90%+ in tests',
      'Parser factory supporting Prometheus format',
    ],
    conceptsApplied: ['Worker pools', 'Strategy pattern', 'Factory pattern', 'Semaphore', 'Backpressure'],
    acceptanceCriteria: [
      'Duplicate alerts within window update existing incident, not create new',
      'Worker pool respects max concurrency limit',
      'Prometheus webhook payload correctly parsed to Alert model',
    ],
    codePaths: [
      'pulsegrid/pulsegrid/core/worker_pool.py',
      'pulsegrid/pulsegrid/core/dedup.py',
      'pulsegrid/pulsegrid/core/parsers.py',
      'pulsegrid/tests/unit/test_parsers.py',
    ],
  },
  {
    id: 'step-05-dsa-dedup',
    week: 5,
    month: 2,
    title: 'DSA — Priority Queues & Alert Routing',
    moduleIds: ['dsa'],
    realWorldProblem:
      'P1 (critical) alerts must be processed before P4 (informational). A FIFO queue causes payment-service outages to wait behind log-rotation warnings.',
    objectives: [
      'Implement priority queue for alert processing order',
      'Use hash maps for O(1) incident lookup by dedup key',
      'Analyze time complexity of ingestion pipeline',
    ],
    implementationTasks: [
      'Replace FIFO queue with priority queue (heapq): P1 first, then P2, etc.',
      'Build `DedupIndex`: hash map `service_id:title` → incident_id for O(1) lookup',
      'Implement sliding window counter for alert rate per service (detect flapping)',
      'Write complexity analysis doc: ingestion is O(log n) per alert due to heap',
      'LeetCode-style exercise: implement `TopKAlerts` — return K highest severity unprocessed alerts',
    ],
    deliverables: [
      'Priority-based alert processing',
      'O(1) deduplication via hash map index',
      'Flapping detection: >10 alerts same service in 1 min → suppress + escalate',
    ],
    conceptsApplied: ['Heaps/priority queues', 'Hash maps', 'Sliding window', 'Big-O analysis'],
    acceptanceCriteria: [
      'P1 alert processed before P4 even if P4 arrived first',
      'Dedup lookup is O(1) average case',
      'Flapping service triggers single grouped incident',
    ],
    codePaths: [
      'pulsegrid/pulsegrid/core/priority_queue.py',
      'pulsegrid/pulsegrid/core/dedup.py',
      'pulsegrid/tests/unit/test_priority_queue.py',
      'pulsegrid/tests/unit/test_dedup.py',
    ],
  },
  {
    id: 'step-06-service-graph',
    week: 6,
    month: 2,
    title: 'Service Dependency Graph & Correlation',
    moduleIds: ['dsa'],
    realWorldProblem:
      'When `payment-api` goes down, alerts flood in for checkout, billing, and notifications. Engineers need to see that `postgres-primary` is the root cause, not chase 15 downstream symptoms.',
    objectives: [
      'Model service dependencies as a directed graph',
      'Implement BFS to find root cause candidates during incident correlation',
      'Detect circular dependencies and blast radius',
    ],
    implementationTasks: [
      'Create `ServiceGraph` with adjacency list: `payment-api → postgres-primary`',
      'On new alert, BFS upstream to find potential root causes',
      'Attach `correlated_services` list to Incident model',
      'Build `get_blast_radius(service_id)` — BFS downstream for impact analysis',
      'Seed graph with 10 services mimicking a real e-commerce stack',
    ],
    deliverables: [
      'Service dependency graph with 10+ services',
      'Automatic root cause suggestion on incident creation',
      'Blast radius API: `GET /services/{id}/impact`',
    ],
    conceptsApplied: ['Graphs', 'BFS/DFS', 'Adjacency list', 'Topological sort'],
    acceptanceCriteria: [
      'Alert on leaf service suggests upstream root cause',
      'Blast radius returns all downstream affected services',
      'Circular dependency detected and flagged in graph validation',
    ],
    codePaths: [
      'pulsegrid/pulsegrid/services/service_graph.py',
      'pulsegrid/pulsegrid/api/routers/services.py',
      'pulsegrid/tests/unit/test_service_graph.py',
    ],
  },
  {
    id: 'step-07-sql-schema',
    week: 7,
    month: 2,
    title: 'PostgreSQL Schema & Migrations',
    moduleIds: ['sql'],
    realWorldProblem:
      'Incident data must be queryable: "show all P1 incidents for payment team last 30 days" — requires proper schema, indexes, and migration discipline.',
    objectives: [
      'Design normalized schema for incidents, services, users, on-call',
      'Write efficient queries with JOINs, indexes, and window functions',
      'Set up Alembic migrations',
    ],
    implementationTasks: [
      'Create tables: `services`, `incidents`, `alerts`, `users`, `on_call_schedules`, `incident_timeline`',
      'Add indexes: `(service_id, status)`, `(severity, created_at)`, `(dedup_key)` unique',
      'Write migration 001 with Alembic; migration 002 adds `incident_timeline` audit table',
      'Query: incident MTTR per service using window functions',
      'Query: on-call engineer for service at given timestamp',
    ],
    deliverables: [
      'Alembic migrations applied to local PostgreSQL',
      'ER diagram in docs/schema.md',
      '5 benchmarked SQL queries with EXPLAIN ANALYZE output',
    ],
    conceptsApplied: ['Schema design', 'JOINs', 'Indexes', 'Window functions', 'Migrations', 'Transactions'],
    acceptanceCriteria: [
      'All foreign keys and constraints enforced',
      'Incident list query uses index (no seq scan on 100k rows)',
      'Timeline table records every status transition with timestamp',
    ],
    starterCode: `-- incidents table
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id UUID NOT NULL REFERENCES services(id),
    title TEXT NOT NULL,
    severity VARCHAR(4) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'triggered',
    dedup_key TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_incidents_service_status ON incidents(service_id, status);
CREATE INDEX idx_incidents_severity_created ON incidents(severity, created_at DESC);`,
    codePaths: [
      'pulsegrid/pulsegrid/db/models.py',
      'pulsegrid/pulsegrid/db/repository.py',
      'pulsegrid/alembic/versions/001_initial_schema.py',
      'pulsegrid/alembic/versions/002_incident_timeline.py',
      'pulsegrid/docs/schema.md',
    ],
  },
  {
    id: 'step-08-databases-redis',
    week: 8,
    month: 2,
    title: 'Redis Caching, MongoDB Events & Search Prep',
    moduleIds: ['databases', 'mongodb', 'elasticsearch'],
    realWorldProblem:
      'Dashboard loads "active incidents" on every page view — hitting PostgreSQL 500 times/sec during an outage. Hot data needs caching; alert metadata needs flexible storage; full-text search needs Elasticsearch.',
    objectives: [
      'Implement cache-aside pattern with Redis for active incidents',
      'Store raw alert payloads in MongoDB for flexible schema',
      'Prepare Elasticsearch index mapping for incident search',
    ],
    implementationTasks: [
      'Redis: cache `active_incidents:{team_id}` with 30s TTL, invalidate on status change',
      'Redis: dedup window as sorted set with TTL (replace in-memory dedup)',
      'MongoDB: `alert_payloads` collection storing raw webhook JSON',
      'Elasticsearch: create `incidents` index with mappings for title, service, severity, timeline',
      'Implement read-through cache with cache stampede protection (mutex/singleflight)',
    ],
    deliverables: [
      'Dashboard incident list served from Redis cache (< 5ms p95)',
      'Raw alert payloads queryable in MongoDB',
      'Elasticsearch index created and indexed sample data',
    ],
    conceptsApplied: ['Redis caching', 'Cache-aside', 'TTL', 'MongoDB document modeling', 'ES index mapping'],
    acceptanceCriteria: [
      'Cache hit ratio > 90% for active incident queries',
      'Cache invalidated within 1s of incident status change',
      'ES search returns incidents by title fuzzy match',
    ],
    codePaths: [
      'pulsegrid/pulsegrid/cache/redis_cache.py',
      'pulsegrid/docker-compose.yml',
    ],
  },
  {
    id: 'step-09-fastapi-core',
    week: 9,
    month: 3,
    title: 'FastAPI Production API',
    moduleIds: ['fastapi'],
    realWorldProblem:
      'On-call engineers need a reliable API to list, acknowledge, and resolve incidents from mobile and CLI tools — with auth, validation, observability, and sub-100ms response times.',
    objectives: [
      'Build production FastAPI app with dependency injection',
      'Implement JWT auth, RBAC, and request validation',
      'Add structured logging, metrics, and health checks',
    ],
    implementationTasks: [
      'FastAPI app with routers: `/incidents`, `/services`, `/webhooks`, `/auth`',
      'Dependency injection: `get_db`, `get_redis`, `get_current_user`',
      'Endpoints: `GET /incidents`, `POST /incidents/{id}/acknowledge`, `POST /incidents/{id}/resolve`',
      'JWT auth with access + refresh tokens; RBAC: viewer, responder, admin',
      'Middleware: request ID, timing, structured JSON logging',
      'Health: `GET /health` (liveness), `GET /ready` (DB + Redis connectivity)',
    ],
    deliverables: [
      'Full REST API with OpenAPI docs at `/docs`',
      'Auth flow: login → access token → protected endpoints',
      'Integration tests with TestClient covering happy path + 401/403/422',
    ],
    conceptsApplied: ['FastAPI', 'Dependency injection', 'JWT auth', 'Middleware', 'OpenAPI', 'Health checks'],
    acceptanceCriteria: [
      'All endpoints require auth except /webhooks and /health',
      'Invalid payloads return 422 with field-level errors',
      'p95 latency < 100ms for GET /incidents (cached)',
    ],
    codePaths: [
      'pulsegrid/pulsegrid/api/main.py',
      'pulsegrid/pulsegrid/api/auth.py',
      'pulsegrid/pulsegrid/api/routers/incidents.py',
      'pulsegrid/tests/integration/test_api.py',
    ],
  },
  {
    id: 'step-10-api-protocols',
    week: 10,
    month: 3,
    title: 'REST Design, GraphQL & gRPC Services',
    moduleIds: ['rest-api', 'graphql', 'grpc', 'design-patterns'],
    realWorldProblem:
      'External clients need REST; the dashboard needs flexible GraphQL queries; internal notification service needs high-performance gRPC. One size does not fit all.',
    objectives: [
      'Polish REST API: pagination, filtering, versioning, idempotency',
      'Add GraphQL endpoint for dashboard complex queries',
      'Extract NotificationService as gRPC microservice',
    ],
    implementationTasks: [
      'REST: cursor pagination `?cursor=&limit=`, filter by severity/status/service',
      'REST: `Idempotency-Key` header on POST for webhook retries',
      'GraphQL: schema with `incidents`, `services`, nested `timeline` — solve N+1 with DataLoader',
      'gRPC: `NotificationService.SendPage(on_call_id, incident)` with protobuf schema',
      'Repository pattern: `IncidentRepository` abstracts PostgreSQL access',
    ],
    deliverables: [
      'Versioned REST API `/v1/incidents` with pagination',
      'GraphQL playground querying incident with timeline in one request',
      'gRPC notification service called from incident worker',
    ],
    conceptsApplied: ['REST design', 'GraphQL', 'N+1/DataLoader', 'gRPC/protobuf', 'Repository pattern'],
    acceptanceCriteria: [
      'GraphQL N+1 solved — single DB query for incident list with services',
      'gRPC notification delivers page request in < 20ms',
      'Idempotent webhook replay does not create duplicate incidents',
    ],
  },
  {
    id: 'step-11-react-dashboard',
    week: 11,
    month: 3,
    title: 'React Incident Dashboard',
    moduleIds: ['react'],
    realWorldProblem:
      'During an outage, engineers stare at dashboards for hours. The UI must show active incidents, severity, timeline, and correlated services — updating in real-time without page refresh.',
    objectives: [
      'Build React dashboard with hooks, component architecture, and state management',
      'Implement incident list, detail view, and acknowledge/resolve actions',
      'Optimize rendering for 100+ active incidents',
    ],
    implementationTasks: [
      'Create React app with Vite + TypeScript',
      'Components: `IncidentList`, `IncidentCard`, `IncidentDetail`, `SeverityBadge`, `ServiceGraph`',
      'State: React Query for server state (incidents API), local state for filters',
      'Implement acknowledge/resolve buttons calling FastAPI',
      'Virtualized list with `react-window` for 500+ incidents',
      'WebSocket connection for real-time incident updates',
    ],
    deliverables: [
      'Working dashboard showing live incidents from API',
      'Acknowledge/resolve flow end-to-end from UI',
      'Virtualized list smooth at 500 items',
    ],
    conceptsApplied: ['React hooks', 'React Query', 'Component design', 'Virtualization', 'WebSockets'],
    acceptanceCriteria: [
      'Dashboard loads active incidents on mount',
      'Acknowledge updates UI within 2s without full page reload',
      'Filter by severity and service works client-side + server-side',
    ],
  },
  {
    id: 'step-12-nextjs-fullstack',
    week: 12,
    month: 3,
    title: 'Next.js Full-Stack Dashboard',
    moduleIds: ['nextjs'],
    realWorldProblem:
      'The incident dashboard needs SEO for public status pages, server-side auth checks, and fast initial load — SSR and Server Components solve this.',
    objectives: [
      'Migrate dashboard to Next.js App Router',
      'Implement SSR for incident list and SSG for status page',
      'Add Server Actions for mutations',
    ],
    implementationTasks: [
      'Next.js App Router: `app/incidents/page.tsx` (Server Component fetching incidents)',
      'Client Component: `IncidentActions` for acknowledge/resolve interactivity',
      'Public status page: `app/status/[team]/page.tsx` with ISR (revalidate every 60s)',
      'Server Action: `acknowledgeIncident(id)` with auth check',
      'Middleware: protect `/incidents` routes, redirect unauthenticated users',
    ],
    deliverables: [
      'Next.js app with SSR incident list',
      'Public status page with green/yellow/red service health',
      'Server Actions for incident mutations',
    ],
    conceptsApplied: ['Next.js App Router', 'Server Components', 'SSR/SSG/ISR', 'Server Actions', 'Middleware'],
    acceptanceCriteria: [
      'Incident list renders on server — no loading spinner on first paint',
      'Status page updates within 60s of incident resolution',
      'Unauthenticated users cannot access /incidents',
    ],
  },
  {
    id: 'step-13-git-workflow',
    week: 13,
    month: 4,
    title: 'Git Workflow & Team Collaboration',
    moduleIds: ['git'],
    realWorldProblem:
      'PulseGrid is now complex enough that multiple features (API, UI, workers) develop in parallel. Without branching strategy and PR reviews, main branch breaks during incidents.',
    objectives: [
      'Establish trunk-based development with feature branches',
      'Set up PR template, CODEOWNERS, and conventional commits',
      'Practice hotfix workflow for production bugs',
    ],
    implementationTasks: [
      'Configure branch protection on `main`: require PR, CI pass, 1 review',
      'Add `.github/PULL_REQUEST_TEMPLATE.md` and `CODEOWNERS`',
      'Create feature branch `feature/on-call-scheduling`, implement, PR, squash merge',
      'Simulate hotfix: branch from `main` tag, fix critical bug, merge + tag `v0.1.1`',
      'Document git workflow in `docs/contributing.md`',
    ],
    deliverables: [
      'Branch protection rules configured',
      'At least 3 PRs merged with conventional commit messages',
      'Hotfix tag and documented workflow',
    ],
    conceptsApplied: ['Branching strategies', 'PR workflow', 'Conventional commits', 'Hotfix', 'Rebase'],
    acceptanceCriteria: [
      'Direct push to main is blocked',
      'PR template includes test plan and rollback plan',
      'Hotfix branch merged to main with release tag',
    ],
  },
  {
    id: 'step-14-docker-cicd',
    week: 14,
    month: 4,
    title: 'Docker & CI/CD Pipeline',
    moduleIds: ['docker', 'cicd'],
    realWorldProblem:
      'Deploying PulseGrid manually caused config drift — staging ran different Python versions than production, and broken code reached prod twice last month.',
    objectives: [
      'Containerize API, worker, and dashboard with multi-stage Dockerfiles',
      'Build GitHub Actions CI/CD: lint → test → build → deploy staging',
      'Implement blue-green deployment to staging',
    ],
    implementationTasks: [
      'Dockerfile.api: multi-stage build, non-root user, health check',
      'Dockerfile.worker: same base, different entrypoint',
      'docker-compose.yml: api + worker + postgres + redis + elasticsearch',
      'GitHub Actions: lint (ruff) → mypy → pytest → docker build → push to registry',
      'Deploy to staging on merge to main; manual approval for production',
      'Add Dependabot and Trivy security scan in CI',
    ],
    deliverables: [
      '`docker compose up` runs full stack locally',
      'CI pipeline passes on every PR',
      'Staging auto-deploys on merge to main',
    ],
    conceptsApplied: ['Docker multi-stage', 'docker-compose', 'GitHub Actions', 'CI/CD', 'Blue-green deploy'],
    acceptanceCriteria: [
      'Docker images < 200MB for API',
      'CI fails on lint errors or test failures',
      'Staging deployment completes in < 5 minutes',
    ],
  },
  {
    id: 'step-15-networking-cloud',
    week: 15,
    month: 4,
    title: 'Cloud Deployment & Networking',
    moduleIds: ['networking', 'linux', 'cloud'],
    realWorldProblem:
      'PulseGrid must be reachable 24/7 globally with TLS, load balancing, and DNS — engineers page from phones during outages; downtime of the incident tool itself is unacceptable.',
    objectives: [
      'Deploy to AWS/GCP with VPC, ALB, and RDS',
      'Configure TLS, DNS, and CDN for static assets',
      'Debug networking with Linux tools',
    ],
    implementationTasks: [
      'Terraform: VPC, subnets, security groups, RDS PostgreSQL, ElastiCache Redis',
      'Deploy API behind Application Load Balancer with TLS (ACM certificate)',
      'Route53 DNS: `api.pulsegrid.example.com` → ALB',
      'CloudFront CDN for Next.js static assets',
      'Configure security groups: API only accessible via ALB, DB only via API subnet',
      'Runbook: debug connectivity with `curl`, `dig`, `ss`, `tcpdump`',
    ],
    deliverables: [
      'Terraform modules for infrastructure',
      'PulseGrid accessible via HTTPS at custom domain',
      'docs/runbooks/networking-debug.md',
    ],
    conceptsApplied: ['DNS', 'TLS', 'Load balancing', 'VPC', 'AWS services', 'Linux debugging'],
    acceptanceCriteria: [
      'HTTPS enforced — HTTP redirects to HTTPS',
      'DB not publicly accessible',
      'ALB health checks route only to healthy instances',
    ],
  },
  {
    id: 'step-16-k8s-security',
    week: 16,
    month: 4,
    title: 'Kubernetes, Testing & Security Hardening',
    moduleIds: ['kubernetes', 'testing', 'security', 'observability'],
    realWorldProblem:
      'PulseGrid handles sensitive on-call data and receives webhooks from production monitoring — security vulnerabilities could expose infrastructure details to attackers.',
    objectives: [
      'Deploy to Kubernetes with probes, limits, and rolling updates',
      'Achieve 80%+ test coverage with integration and E2E tests',
      'Harden against OWASP Top 10',
    ],
    implementationTasks: [
      'K8s manifests: Deployment, Service, Ingress, ConfigMap, Secret for API and worker',
      'Liveness/readiness probes, resource requests/limits, HPA on CPU',
      'Integration tests with testcontainers (PostgreSQL, Redis)',
      'E2E test: webhook → incident created → visible in API → acknowledge',
      'Security: parameterized queries, rate limiting, CORS whitelist, CSP headers',
      'OWASP scan with ZAP; fix any high/critical findings',
    ],
    deliverables: [
      'Running on Kubernetes (local kind or cloud EKS/GKE)',
      'Test coverage report ≥ 80%',
      'Security audit checklist completed',
    ],
    conceptsApplied: ['Kubernetes', 'Testing pyramid', 'OWASP', 'JWT security', 'Observability basics'],
    acceptanceCriteria: [
      'Rolling update deploys with zero downtime',
      'E2E test passes in CI',
      'No high/critical OWASP findings unresolved',
    ],
  },
  {
    id: 'step-17-system-design-scale',
    week: 17,
    month: 5,
    title: 'Scale to 10K Alerts/Minute',
    moduleIds: ['system-design'],
    realWorldProblem:
      'Black Friday: monitoring alerts spike 50x. PulseGrid must not drop alerts or page the wrong team when processing 10,000 alerts per minute.',
    objectives: [
      'Design horizontal scaling strategy for ingestion and processing',
      'Implement rate limiting, circuit breakers, and load shedding',
      'Document system design with capacity estimates',
    ],
    implementationTasks: [
      'Capacity estimate: 10k alerts/min = 167/sec; size workers, DB connections, Redis memory',
      'Horizontal scale: 4 API pods behind ALB, 8 worker pods with Kafka consumer groups',
      'Circuit breaker on downstream notification service (fail gracefully)',
      'Load shedding: drop P4 alerts when queue depth > threshold',
      'Write design doc: `docs/design/scale-10k-apm.md` with diagrams',
      'Load test with Locust: verify 10k alerts/min sustained for 10 minutes',
    ],
    deliverables: [
      'System design document with capacity planning',
      'Load test report: throughput, p95 latency, error rate',
      'Circuit breaker and load shedding implemented',
    ],
    conceptsApplied: ['System design framework', 'Capacity estimation', 'Caching', 'Load shedding', 'Circuit breaker'],
    acceptanceCriteria: [
      'System handles 10k alerts/min with < 1% dropped (P1-P3)',
      'p95 ingestion latency < 200ms under load',
      'Circuit breaker opens when notification service is down',
    ],
  },
  {
    id: 'step-18-incident-timeline',
    week: 18,
    month: 5,
    title: 'Incident Timeline & Status Page Design',
    moduleIds: ['system-design'],
    realWorldProblem:
      'Executives ask "when did we know about the outage?" and "how long until resolution?" — without a detailed incident timeline and public status page, trust erodes.',
    objectives: [
      'Design incident timeline with event sourcing',
      'Build public status page architecture',
      'Design notification fan-out (Slack, PagerDuty, email)',
    ],
    implementationTasks: [
      'Event sourcing: `IncidentCreated`, `IncidentAcknowledged`, `IncidentResolved`, `CommentAdded` events',
      'Timeline API: `GET /incidents/{id}/timeline` returns chronological events',
      'Status page: aggregate service health from recent incidents',
      'Notification design: fan-out to Slack webhook + email + PagerDuty API',
      'Write postmortem template auto-generated from timeline events',
    ],
    deliverables: [
      'Incident timeline with all state transitions',
      'Public status page showing per-service health',
      'Postmortem template populated from incident data',
    ],
    conceptsApplied: ['Event sourcing', 'Status page design', 'Fan-out pattern', 'Notification systems'],
    acceptanceCriteria: [
      'Timeline shows exact timestamps for detect → ack → resolve',
      'Status page reflects current incident state within 60s',
      'Postmortem draft generated with MTTR and timeline',
    ],
  },
  {
    id: 'step-19-kafka-events',
    week: 19,
    month: 5,
    title: 'Kafka Event Streaming & Microservices',
    moduleIds: ['distributed-systems', 'microservices', 'message-queues', 'event-driven'],
    realWorldProblem:
      'As PulseGrid grows, the monolith worker cannot scale independently from the API. Alert processing, notifications, and search indexing need separate scaling and failure isolation.',
    objectives: [
      'Extract event-driven architecture with Kafka',
      'Implement outbox pattern for reliable event publishing',
      'Split into IncidentService, NotificationService, SearchIndexer',
    ],
    implementationTasks: [
      'Kafka topics: `alerts.raw`, `incidents.events`, `notifications.pending`',
      'Outbox pattern: write event to `outbox` table in same transaction as incident',
      'Outbox publisher: poll outbox → publish to Kafka → mark published',
      'Consumer: `SearchIndexer` listens to `incidents.events` → updates Elasticsearch',
      'Saga: create incident → publish event → notification service pages on-call → compensate on failure',
      'Docker compose add Kafka + Zookeeper (or Redpanda)',
    ],
    deliverables: [
      'Kafka pipeline: alert → incident → notification → search index',
      'Outbox pattern ensuring no lost events',
      '3 services communicating via events',
    ],
    conceptsApplied: ['Kafka', 'Event-driven architecture', 'Outbox pattern', 'Saga', 'Microservices'],
    acceptanceCriteria: [
      'No events lost when API crashes after DB write',
      'Search index updated within 5s of incident creation',
      'Notification failure does not block incident creation',
    ],
  },
  {
    id: 'step-20-performance',
    week: 20,
    month: 5,
    title: 'Performance Optimization & Load Testing',
    moduleIds: ['performance', 'go', 'cpp'],
    realWorldProblem:
      'Dashboard p99 latency is 4 seconds during incidents — engineers waste precious minutes waiting for the tool that should help them respond faster.',
    objectives: [
      'Profile and optimize API hot paths',
      'Reduce p99 latency from 4s to < 500ms',
      'Implement connection pooling and query optimization',
    ],
    implementationTasks: [
      'Profile with py-spy and pprof: identify slow endpoints',
      'Optimize: N+1 queries → eager loading; add missing DB indexes',
      'PgBouncer for connection pooling; tune pool size per worker',
      'Optional: rewrite alert dedup hot path in Go microservice for 10x throughput',
      'Load test before/after: document p50, p95, p99 improvements',
      'Set SLO: API p99 < 500ms, ingestion p99 < 200ms',
    ],
    deliverables: [
      'Performance report: before/after metrics',
      'p99 latency < 500ms for dashboard API',
      'SLO dashboard in Grafana',
    ],
    conceptsApplied: ['Profiling', 'p99 latency', 'Connection pooling', 'Query optimization', 'SLOs'],
    acceptanceCriteria: [
      'p99 improved by at least 5x from baseline',
      'No endpoint does full table scan under load',
      'Grafana SLO dashboard shows green during load test',
    ],
  },
  {
    id: 'step-21-generative-ai',
    week: 21,
    month: 6,
    title: 'AI Incident Summarization',
    moduleIds: ['generative-ai'],
    realWorldProblem:
      'On-call engineers waste 15 minutes reading Slack threads and alert dumps to understand what happened. An AI-generated incident summary saves critical time during outages.',
    objectives: [
      'Integrate LLM for automatic incident summarization',
      'Design prompts for reliable, factual summaries',
      'Implement streaming summary generation in UI',
    ],
    implementationTasks: [
      'Add `AIService` calling OpenAI/Anthropic API',
      'Prompt: given alerts + timeline + service context → generate summary, likely cause, suggested next steps',
      'Endpoint: `POST /incidents/{id}/summarize` with streaming SSE response',
      'Display streaming summary in dashboard IncidentDetail panel',
      'Cost control: cache summaries, use cheaper model for P4, cap tokens',
      'Eval dataset: 20 historical incidents with human-written summaries for comparison',
    ],
    deliverables: [
      'AI-generated incident summary on detail page',
      'Streaming response in UI',
      'Eval report: summary quality vs human baseline',
    ],
    conceptsApplied: ['LLM APIs', 'Prompt engineering', 'Streaming', 'Token cost control', 'Evals'],
    acceptanceCriteria: [
      'Summary generated within 10s for typical incident',
      'Summary includes: what happened, affected services, timeline, suggested actions',
      'Eval score ≥ 0.8 on faithfulness to source data',
    ],
  },
  {
    id: 'step-22-rag-runbooks',
    week: 22,
    month: 6,
    title: 'RAG Runbook Assistant',
    moduleIds: ['rag-embeddings'],
    realWorldProblem:
      'Runbooks live in Confluence, GitHub, and engineers\' heads. During a Redis outage at 2 AM, nobody can find the "Redis failover" procedure.',
    objectives: [
      'Build RAG pipeline over runbook documents',
      'Suggest relevant runbooks when incident is created',
      'Implement semantic search across past incidents',
    ],
    implementationTasks: [
      'Ingest runbooks: chunk markdown files, embed with OpenAI embeddings, store in pgvector',
      'On incident create: embed title + alerts → retrieve top-3 runbook chunks',
      'Display "Suggested Runbooks" card on incident detail page',
      'Semantic search: `GET /incidents/search?q=redis connection timeout`',
      'Hybrid search: BM25 + vector similarity for best recall',
      'Eval: 30 test queries with expected runbook in top-3',
    ],
    deliverables: [
      'Runbook ingestion pipeline',
      'Suggested runbooks on every new incident',
      'Semantic incident search',
      'RAG eval report with recall@3',
    ],
    conceptsApplied: ['Embeddings', 'RAG pipeline', 'Chunking', 'Vector search', 'Hybrid search', 'RAG eval'],
    acceptanceCriteria: [
      'Recall@3 ≥ 0.85 on eval dataset',
      'Runbook suggestions appear within 3s of incident creation',
      'Search returns relevant past incidents by natural language query',
    ],
  },
  {
    id: 'step-23-agentic-ai',
    week: 23,
    month: 6,
    title: 'AI Incident Response Agent',
    moduleIds: ['agentic-ai'],
    realWorldProblem:
      'Senior engineers follow a mental checklist during incidents: check metrics, find similar past incidents, page the right team, execute runbook steps. An AI agent can assist juniors through this workflow.',
    objectives: [
      'Build tool-using agent with ReAct pattern',
      'Agent tools: query incidents, search runbooks, check service health, draft postmortem',
      'Implement human-in-the-loop for destructive actions',
    ],
    implementationTasks: [
      'Define agent tools: `search_incidents`, `get_service_health`, `search_runbooks`, `get_on_call`, `add_timeline_comment`',
      'Implement ReAct loop with max 10 steps and cost cap',
      'Chat UI: "What should I do about the payment-api P1?" → agent investigates and responds',
      'MCP server exposing PulseGrid tools for Cursor/Claude integration',
      'Safety: agent cannot resolve incidents or page on-call without human approval',
      'Log all agent steps for debugging and audit',
    ],
    deliverables: [
      'Working incident response agent in chat UI',
      '5 tool definitions with secure execution',
      'MCP server for external agent clients',
      'Agent trace logs for every conversation',
    ],
    conceptsApplied: ['AI agents', 'Tool use', 'ReAct', 'MCP', 'Human-in-the-loop', 'Agent safety'],
    acceptanceCriteria: [
      'Agent correctly identifies similar past incident in 4/5 test scenarios',
      'Agent never executes destructive action without approval',
      'Full trace logged for audit',
    ],
  },
  {
    id: 'step-24-production-launch',
    week: 24,
    month: 6,
    title: 'Production Launch & Capstone Demo',
    moduleIds: ['ai-engineering', 'behavioral', 'senior-engineering'],
    realWorldProblem:
      'Building PulseGrid is not enough — you must deploy AI features safely, present the system in interviews, and demonstrate senior-level engineering judgment.',
    objectives: [
      'Deploy AI features with evals, monitoring, and fallbacks',
      'Write production runbook and architecture documentation',
      'Prepare capstone demo and interview presentation',
    ],
    implementationTasks: [
      'AI production: fallback to non-AI summary if LLM fails; monitor token cost and latency',
      'CI eval gate: RAG recall@3 ≥ 0.85, summary faithfulness ≥ 0.8',
      'Complete README: architecture, setup, API docs, demo video script',
      'Record 5-minute demo: ingest alert → incident created → AI summary → runbook suggested → agent assists → resolve',
      'Write behavioral stories: "Tell me about a production incident" using PulseGrid development',
      'Prepare system design whiteboard: scale PulseGrid to 1M events/day',
    ],
    deliverables: [
      'Production deployment with all features',
      'Demo video or live demo script',
      'Architecture document and interview talking points',
      'Postmortem template filled for a simulated outage drill',
    ],
    conceptsApplied: ['AI in production', 'Evals', 'Behavioral interviews', 'System design', 'Senior engineering'],
    acceptanceCriteria: [
      'Full end-to-end flow works in production environment',
      'AI features have monitoring and fallback',
      'Can present PulseGrid in 5-minute interview format covering architecture, trade-offs, and lessons learned',
    ],
  },
];

export function getCapstoneStep(week: number): CapstoneStep | undefined {
  return capstoneSteps.find((s) => s.week === week);
}

export function getCapstoneStepsForModule(moduleId: string): CapstoneStep[] {
  return capstoneSteps.filter((s) => s.moduleIds.includes(moduleId));
}

export function getCapstoneStepById(id: string): CapstoneStep | undefined {
  return capstoneSteps.find((s) => s.id === id);
}
