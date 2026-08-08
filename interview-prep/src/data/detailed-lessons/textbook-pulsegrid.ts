import { buildTextbookLesson } from '../textbook-format';

/** Textbook-depth chapters for each PulseGrid capstone week — read before coding. */
export const pulsegridTextbookLessons: Record<string, string> = {};

function register(id: string, lesson: Parameters<typeof buildTextbookLesson>[0]) {
  pulsegridTextbookLessons[id] = buildTextbookLesson(lesson);
}

register('step-01-architecture', {
  chapter: 'Week 1 — System Architecture & Domain Design',
  overview:
    'Before writing a single line of production code, senior engineers define **what** the system does, **who** it serves, and **where** failure can occur. Architecture is not a diagram for stakeholders — it is a set of decisions that constrain every future change. In PulseGrid, you are building an incident response platform: it must ingest thousands of alerts per minute, deduplicate them, correlate service dependencies, page on-call engineers, and eventually assist with AI-driven runbooks. This chapter teaches you to think in **domains**, **boundaries**, and **failure domains** — the same lens used at PagerDuty, Datadog, and Google SRE teams.',
  objectives: [
    'Define PulseGrid domain entities and their relationships (Service, Alert, Incident, User, Runbook)',
    'Draw sync vs async boundaries and explain why webhooks must return before processing finishes',
    'Write an Architecture Decision Record (ADR) justifying monolith-first with clear module boundaries',
    'Identify CPU-bound vs I/O-bound components to inform concurrency choices in later weeks',
  ],
  definitions: [
    {
      term: 'Domain model',
      definition:
        'A conceptual map of the business entities, their attributes, and rules (e.g. an Incident cannot skip from triggered to resolved without acknowledgment in some workflows). Code should mirror this model.',
    },
    {
      term: 'Failure domain',
      definition:
        'The blast radius when a component fails. If the worker crashes, can the API still accept webhooks? If Redis dies, can we degrade to database reads?',
    },
    {
      term: 'Sync boundary',
      definition:
        'Operations where the caller blocks until work completes. Webhook ingestion must NOT be fully synchronous during alert storms.',
    },
    {
      term: 'ADR (Architecture Decision Record)',
      definition:
        'A short document capturing context, decision, and consequences. Future engineers understand *why* monolith-first was chosen instead of microservices on day one.',
    },
  ],
  sections: [
    {
      title: 'Why Architecture Comes First',
      content: `Teams that skip architecture during an outage rewrite their systems twice: once under pressure, once properly. PulseGrid exists because **alert fatigue** costs money — engineers get paged 200 times for one CPU spike and miss the real database failure underneath.

Architecture answers four questions:
1. **What enters the system?** Webhooks from Prometheus, Datadog, custom monitors.
2. **What leaves the system?** Pages to Slack/PagerDuty, dashboard updates, AI summaries.
3. **What is stored?** Incidents, timelines, users, runbooks.
4. **What fails independently?** API, workers, cache, database, notification service.

The alert lifecycle in PulseGrid: **Webhook → validate → enqueue (202) → worker deduplicates → create/update Incident → correlate via service graph → notify on-call → index for search → AI suggests runbook**. Each arrow is a boundary you will implement in code over 24 weeks.`,
    },
    {
      title: 'Domain Entities and Relationships',
      content: `A **Service** is anything you monitor (payment-api, postgres-primary). An **Alert** is a raw signal ("CPU > 90%"). An **Incident** is the human-actionable grouping of one or more alerts ("Payment API degraded"). **Users** are on-call engineers with roles (viewer, responder, admin). **Runbooks** are procedures ("how to failover Redis").

Relationships:
- One Service has many Alerts and Incidents.
- Services form a **dependency graph** (checkout-api depends on payment-api).
- Incidents have a **timeline** of state transitions (created → acknowledged → resolved).

The **dedup key** \`service_id:title\` is a domain rule: duplicate "CPU high" alerts within five minutes should update one incident, not create fifty. Encoding this in the domain model (not scattered in handlers) prevents 3 AM paging bugs.`,
    },
    {
      title: 'Monolith-First vs Microservices',
      content: `PulseGrid starts as a **modular monolith**: one codebase, clear package boundaries (\`api/\`, \`worker/\`, \`core/\`, \`models/\`), two deployable processes (API + worker). Why not microservices immediately?

**Pros of monolith-first for learning and early product:**
- Single test suite and shared domain models
- No distributed transactions while schema evolves
- Faster local dev: one \`docker compose up\`

**When to extract services (Weeks 10, 19):**
- Notification gRPC when paging latency must scale independently
- Kafka consumers when workers must scale to 8+ pods
- Search indexer when Elasticsearch load isolates from API

The ADR documents this path so you do not prematurely split services and drown in operational complexity.`,
    },
    {
      title: 'CPU-Bound vs I/O-Bound Work',
      content: `**I/O-bound** work waits on network or disk: parsing JSON webhooks, writing to PostgreSQL, calling Slack API. **CPU-bound** work saturates the processor: complex correlation algorithms, embedding generation for RAG.

Python's **GIL** means threads help I/O-bound work but not CPU-bound parallelism. That is why PulseGrid uses:
- **asyncio** for webhook ingestion (many concurrent connections, mostly waiting)
- **worker pools** with bounded concurrency for alert processing
- Optional Go rewrite (Week 20) only for proven CPU hot paths

Mapping components: webhook API = I/O; dedup hash lookup = CPU-light; LLM summarization = I/O (waiting on OpenAI); embedding batch = CPU/GPU.`,
    },
  ],
  example: {
    title: 'Documenting the Alert Lifecycle',
    language: 'text',
    code: `Webhook POST /webhooks/alerts
  → validate Pydantic model
  → enqueue (return 202 immediately)
Worker dequeues by priority (P1 first)
  → dedup check (service_id:title)
  → create or update Incident
  → BFS service graph for root cause hints
  → fan-out notifications (non-blocking)
  → append timeline event`,
    explanation:
      'This sequence is the backbone of PulseGrid. Every week adds one box or hardens one arrow. Keep this diagram visible while coding.',
  },
  pitfalls: [
    'Drawing architecture without data flows — boxes without arrows do not help implementation',
    'Microservices on day one — operational cost kills learning velocity',
    'Mixing domain rules into HTTP handlers instead of the Incident model',
  ],
  summary: [
    'Architecture defines domain entities, boundaries, and failure domains before code',
    'PulseGrid domain: Alert → Incident lifecycle with dedup and correlation',
    'Monolith-first with extraction points at notification, Kafka, and search',
    'I/O-bound ingestion uses asyncio; CPU-heavy paths profiled later',
  ],
  reviewQuestions: [
    { q: 'Why must webhooks return 202 before processing completes?', hint: 'Think alert storms and client timeouts' },
    { q: 'What is the dedup key and why is it a domain concept?', hint: 'service_id + title' },
  ],
});

register('step-02-python-foundation', {
  chapter: 'Week 2 — Python Project Scaffold & Domain Models',
  overview:
    'Production Python is not "scripts in a folder." It is typed, tested, packaged modules where invalid states are **unrepresentable**. PulseGrid uses Pydantic v2 to enforce that every Alert has a service_id and severity, and every Incident follows valid status transitions. This chapter explains project structure, enums, validation, and why domain models are the contract between API, workers, and database.',
  objectives: [
    'Structure a Python package with api/, core/, models/, services/, tests/',
    'Implement Pydantic v2 models with field validators and JSON serialization',
    'Enforce Incident state machine: triggered → acknowledged → resolved',
    'Configure pytest, ruff, and mypy for continuous quality',
  ],
  definitions: [
    { term: 'Pydantic', definition: 'A library that validates data at runtime using Python type hints. Invalid API payloads fail before business logic runs.' },
    { term: 'StrEnum', definition: 'String enumeration — values serialize to JSON strings like "p1" and compare type-safely in code.' },
    { term: 'State machine', definition: 'Rules governing valid transitions between states. Invalid transitions raise errors instead of corrupting data.' },
  ],
  sections: [
    {
      title: 'Project Layout as Architecture',
      content: `The \`pulsegrid/\` package mirrors responsibilities:
- \`models/\` — pure domain types, no database or HTTP imports
- \`core/\` — ingestion queue, dedup, processor (business logic)
- \`api/\` — FastAPI routers, auth, middleware
- \`services/\` — graph, notifications, AI
- \`tests/\` — unit (fast, isolated) and integration (API end-to-end)

**Dependency rule:** models import nothing internal; api imports core and models; core imports models only. This prevents circular imports and keeps domain logic testable without starting a web server.`,
    },
    {
      title: 'Modeling Severity and Status',
      content: `Severity is an ordered enum: P1 (critical) < P2 < P3 < P4 (informational). Storing severity as strings without enums invites typos ("P1" vs "p1" vs "critical"). \`Severity.P1\` is validated at parse time.

\`IncidentStatus\` implements \`can_transition_to()\`: from TRIGGERED you may go to ACKNOWLEDGED or RESOLVED; from RESOLVED you may go nowhere. Method \`transition_to()\` mutates status and sets timestamps. This is **domain-driven design** — the model enforces rules, not the API handler.`,
    },
    {
      title: 'Validation and Serialization',
      content: `Pydantic rejects blank titles, missing service_id, and invalid severity at construction. \`model_dump_json()\` and \`model_validate_json()\` round-trip for Redis cache and API responses.

Field \`default_factory\` generates UUIDs and UTC timestamps per instance — never use mutable defaults. \`@field_validator\` strips whitespace from titles. These small rules prevent garbage from entering the incident pipeline.`,
    },
    {
      title: 'Testing Domain Models',
      content: `Unit tests for models require no database: assert invalid severity raises \`ValidationError\`, assert double-resolve raises \`ValueError\`, assert \`dedup_key\` property returns \`service_id:title\`.

Twenty-plus model tests give confidence before building async pipelines. Tests are documentation: they show allowed and forbidden behaviors explicitly.`,
    },
  ],
  example: {
    title: 'Incident State Transition',
    language: 'python',
    code: `incident = Incident(service_id="payment-api", title="High errors",
                       severity=Severity.P1, dedup_key="payment-api:High errors")
incident.acknowledge()  # status → acknowledged, sets acknowledged_at
incident.resolve()      # auto-acknowledges if needed, sets resolved_at`,
    explanation: 'Invalid paths like resolve-then-acknowledge raise ValueError — bugs surface in tests, not at 3 AM.',
  },
  pitfalls: ['Using raw dicts instead of models in processor code', 'Mutable default arguments in Pydantic fields', 'Skipping mypy on "simple" model files'],
  summary: ['Package structure enforces architectural boundaries', 'Pydantic validates at the edge; domain methods enforce transitions', 'Enums prevent severity/status typos', 'Unit test models before integration complexity'],
  reviewQuestions: [
    { q: 'Why should Incident.transition_to live on the model?', hint: 'Single place for rules' },
    { q: 'What does dedup_key compute?', hint: 'service_id and title' },
  ],
});

register('step-03-async-ingestion', {
  chapter: 'Week 3 — Async Alert Ingestion Pipeline',
  overview:
    'During a major outage, monitoring systems send **thousands of alerts per minute**. If your API processes each alert fully before responding, clients timeout, retry, and **duplicate the flood**. Async ingestion accepts the alert, enqueues it, and returns **202 Accepted** in milliseconds. This chapter explains asyncio, queues, backpressure, and why the event loop suits I/O-bound webhook bursts.',
  objectives: [
    'Build bounded asyncio queue for alert buffering',
    'Return 202 before processing; worker consumes separately',
    'Implement backpressure: 503 + Retry-After when queue > 90% full',
    'Explain GIL implications for I/O vs CPU work',
  ],
  definitions: [
    { term: 'asyncio', definition: 'Python cooperative concurrency — one thread, many coroutines yielding on I/O waits.' },
    { term: 'Backpressure', definition: 'Signaling upstream to slow down when downstream is saturated. HTTP 503 tells senders to retry later.' },
    { term: '202 Accepted', definition: 'HTTP status meaning "received, will process asynchronously" — correct for webhook ingestion.' },
  ],
  sections: [
    {
      title: 'Why Synchronous Ingestion Fails',
      content: `Sync flow: receive JSON → dedup → write DB → correlate → notify → return 200. Under load, each request takes 200–500ms. At 500 concurrent webhooks, threads exhaust, connections pile up, **new alerts drop**.

Async flow: validate → enqueue → return 202 in <5ms. Workers drain the queue at sustainable rate. Senders get immediate acknowledgment; processing lag becomes a **queue depth metric**, not client timeouts.`,
    },
    {
      title: 'asyncio.Queue and Bounded Buffers',
      content: `\`asyncio.Queue(maxsize=1000)\` blocks producers when full (or use \`put_nowait\` + handle \`QueueFull\`). Bounded queues prevent unbounded memory growth during incidents.

\`AlertQueue.utilization\` = size/maxsize. Above 0.9 triggers **near capacity** responses. This protects the API process from OOM when workers fall behind.`,
    },
    {
      title: 'Worker Coroutines',
      content: `A worker loop: \`while True: alert = await queue.dequeue(); await process(alert)\`. Multiple workers run concurrently on the event loop — while one awaits DB, another parses JSON.

Separate **API process** from **worker process** in production so CPU-heavy processing does not starve webhook acceptance. Same codebase, two entrypoints: \`uvicorn\` and \`python -m pulsegrid.worker.runner\`.`,
    },
    {
      title: 'The GIL and I/O-Bound Workloads',
      content: `CPython's Global Interpreter Lock allows one thread to execute Python bytecode at a time. **Threads** help when code waits on I/O. **asyncio** avoids thread overhead with explicit await points.

For PulseGrid ingestion, payloads are small JSON — parsing is fast; waiting on network dominates. asyncio shines. CPU-heavy dedup at massive scale may later move to multiprocessing or Rust/Go — measure first (Week 20).`,
    },
  ],
  example: {
    title: 'Webhook Handler Pattern',
    language: 'python',
    code: `@router.post("/webhooks/alerts", status_code=202)
async def ingest(payload: dict, state: StateDep):
    if state.queue.is_near_capacity:
        raise HTTPException(503, headers={"Retry-After": "5"})
    alert = AlertParserFactory.parse(source, payload)
    await state.queue.enqueue(alert)
    return {"status": "accepted", "alert_id": alert.id}`,
    explanation: 'No DB write in the request path — that happens in the worker, keeping p95 acceptance latency low.',
  },
  pitfalls: ['Blocking calls (time.sleep, sync DB) inside async handlers stall the entire event loop', 'Unbounded queues hide overload until OOM', 'Processing before respond defeats the purpose of async ingestion'],
  summary: ['Return 202 quickly; process in background workers', 'Bounded queues + backpressure protect under alert storms', 'asyncio fits I/O-bound webhook bursts', 'Separate API and worker deployables'],
  reviewQuestions: [{ q: 'What header tells clients to retry after backpressure?', hint: 'Retry-After' }],
});

register('step-04-worker-pools', {
  chapter: 'Week 4 — Worker Pools & Alert Deduplication',
  overview:
    'Alert storms generate hundreds of duplicate "CPU high" pages for the same service. **Deduplication** collapses them into one incident. **Worker pools** bound concurrency so you do not overwhelm PostgreSQL with 500 simultaneous writes. This chapter covers the Strategy and Factory patterns, semaphores, and Prometheus webhook parsing.',
  objectives: [
    'Implement worker pool with asyncio.Semaphore limiting concurrency',
    'Apply Strategy pattern for time-window deduplication',
    'Build Factory pattern for Prometheus, Datadog, and custom parsers',
    'Integration test: 100 duplicate alerts → 1 incident',
  ],
  definitions: [
    { term: 'Strategy pattern', definition: 'Pluggable algorithm (dedup window) interchangeable at runtime without changing processor code.' },
    { term: 'Factory pattern', definition: 'Central place that returns the correct parser based on alert source field.' },
    { term: 'Semaphore', definition: 'Concurrency limiter — at most N workers enter critical section simultaneously.' },
  ],
  sections: [
    {
      title: 'The Alert Storm Problem',
      content: `When payment-api degrades, every monitor fires: CPU, memory, error rate, latency. Without dedup, on-call receives 200 pages in 2 minutes. They silence alerts and **miss the root cause**.

Dedup rule: same \`service_id:title\` within **5 minutes** → increment \`alert_count\` on existing incident, do not create new. After window expires, a new incident may form — the issue might be recurring.`,
    },
    {
      title: 'Worker Pool with Semaphore',
      content: `\`WorkerPool(worker_count=4)\` spawns four coroutines dequeuing alerts. \`asyncio.Semaphore(4)\` ensures at most four handlers run process logic concurrently — even if queue has 1000 items.

This prevents connection pool exhaustion and CPU thrashing. Tune worker_count vs database pool size: rule of thumb **pool_size ≥ workers + API connections**.`,
    },
    {
      title: 'Parser Factory for Multiple Sources',
      content: `Prometheus sends \`{"alerts": [{"labels":..., "annotations":...}]}\`. Datadog uses different JSON. Custom monitors send flat fields.

\`AlertParserFactory.get_parser(source)\` returns \`PrometheusAlertParser\`, \`DatadogAlertParser\`, or \`CustomAlertParser\`. Adding a new source means one new class — Open/Closed Principle.`,
    },
    {
      title: 'Eviction and Memory',
      content: `In-memory dedup stores \`dedup_key → timestamp\`. Evict entries older than window on each record — prevents unbounded growth. Week 8 moves this to **Redis sorted sets** with TTL for multi-pod deployments.`,
    },
  ],
  example: {
    title: 'Window Deduplication Strategy',
    language: 'python',
    code: `class WindowDeduplicationStrategy:
    window_seconds = 300
    def is_duplicate(self, alert, store):
        return (time.time() - store.get(alert.dedup_key, 0)) < self.window_seconds`,
    explanation: 'Strategy is swappable — you could add fingerprint-based dedup for Prometheus without rewriting the processor.',
  },
  pitfalls: ['Unbounded in-memory dedup dict on long-running workers', 'Parsing Prometheus payload as flat custom JSON', 'No semaphore — thundering herd on database'],
  summary: ['Dedup prevents alert fatigue during storms', 'Worker pool + semaphore bounds concurrency', 'Factory isolates source-specific parsing', 'Evict expired dedup keys to control memory'],
  reviewQuestions: [{ q: 'Why Factory for parsers instead of one giant if-chain?', hint: 'Open/Closed Principle' }],
});

register('step-05-dsa-dedup', {
  chapter: 'Week 5 — DSA: Priority Queues & Alert Routing',
  overview:
    'Not all alerts are equal. A P1 payment outage must process before a P4 log-rotation warning — even if P4 arrived first. This chapter applies **heaps**, **hash maps**, and **sliding windows** from data structures and algorithms to the incident pipeline, with explicit Big-O analysis.',
  objectives: [
    'Replace FIFO with heap-based priority queue (P1 first)',
    'Build O(1) dedup index: dedup_key → incident_id',
    'Implement flapping detection with sliding window counter',
    'Analyze ingestion complexity: O(log n) per alert for heap push',
  ],
  definitions: [
    { term: 'Binary heap', definition: 'Tree-based structure where parent is smaller than children (min-heap). Push/pop in O(log n); peek min in O(1).' },
    { term: 'Hash map', definition: 'Key-value store with O(1) average lookup — used for dedup_key → incident_id.' },
    { term: 'Sliding window', definition: 'Count events in last T seconds by evicting timestamps outside window — detects alert flapping.' },
  ],
  sections: [
    {
      title: 'Why FIFO Fails for Incidents',
      content: `FIFO is fair but wrong for severity. During multi-service outages, low-priority noise blocks critical payment alerts for seconds — unacceptable when SLA is sub-minute response.

Priority queue orders by \`severity.priority\` (P1=0, P4=3). Python \`heapq\` implements min-heap; tie-break with monotonic sequence counter for stable ordering among equal priorities.`,
    },
    {
      title: 'DedupIndex — Hash Map',
      content: `Linear scan over incidents for dedup is O(n). \`DedupIndex\` maps \`dedup_key\` → \`incident_id\` for O(1) average lookup and update.

When incident resolves, remove key from index (or let window expiry handle re-fire). Space O(unique active dedup keys) — typically far smaller than total alerts.`,
    },
    {
      title: 'Flapping Detection',
      content: `A flapping service sends >10 alerts in 60 seconds — often misconfigured threshold. \`FlappingDetector\` keeps per-service timestamp lists, prunes old entries, returns True when threshold exceeded.

Response: group alerts, escalate once, optionally suppress notifications until stable. Reduces noise without hiding genuine sustained outages.`,
    },
    {
      title: 'Complexity Analysis',
      content: `Per alert: heap push O(log n), dedup lookup O(1), flapping record O(k) where k = alerts in window (small). Overall pipeline handles thousands/sec on single worker if I/O is async.

Document assumptions in \`docs/design/\` — interviewers ask "how does this scale?" with numbers, not hand-waving.`,
    },
  ],
  example: {
    title: 'Priority Queue Push',
    language: 'python',
    code: `heapq.heappush(heap, (alert.severity.priority, sequence, alert))`,
    explanation: 'Lower priority number pops first. Sequence preserves FIFO among same severity.',
  },
  pitfalls: ['Using sorted(list) each dequeue — O(n log n) instead of heap', 'Forgetting to evict flapping timestamps — memory leak'],
  summary: ['Heap ensures P1 before P4', 'Hash map gives O(1) dedup', 'Sliding window catches flapping', 'Document Big-O for interviews'],
  reviewQuestions: [{ q: 'Complexity of heap push?', hint: 'log n' }],
});

register('step-06-service-graph', {
  chapter: 'Week 6 — Service Dependency Graph & Correlation',
  overview:
    'When payment-api fails, checkout, billing, and notifications all alert — but the root cause may be postgres-primary. A **service dependency graph** lets PulseGrid suggest upstream root causes using **BFS**. This chapter teaches directed graphs, adjacency lists, blast radius, and cycle detection.',
  objectives: [
    'Model dependencies as directed graph: service → depends_on upstream',
    'BFS upstream to find root cause candidates',
    'BFS downstream for blast radius impact analysis',
    'Detect circular dependencies in graph validation',
  ],
  definitions: [
    { term: 'Directed graph', definition: 'Nodes (services) with directed edges (A depends on B). Edge direction: dependent → dependency.' },
    { term: 'BFS', definition: 'Breadth-first search — explores neighbors level by level, ideal for shortest upstream path.' },
    { term: 'Blast radius', definition: 'All downstream services affected if this node fails.' },
  ],
  sections: [
    {
      title: 'Correlation vs Causation',
      content: `PulseGrid does not prove causation — it **prioritizes investigation**. If checkout-api alerts and graph shows postgres-primary upstream with no dependencies, suggest postgres as likely root cause.

Attach \`correlated_services\` to Incident at creation. Dashboard shows "possibly related: postgres-primary, redis-cache" — saves minutes during outages.`,
    },
    {
      title: 'Adjacency List Representation',
      content: `\`_upstream[service] = set of dependencies\`
\`_downstream[dep] = set of dependents\`

Add edge \`payment-api → postgres-primary\` means payment depends on postgres. Space O(V+E), neighbor iteration O(degree).

Seed e-commerce graph: checkout → payment → postgres; catalog → postgres + redis — realistic for exercises.`,
    },
    {
      title: 'BFS Upstream for Root Causes',
      content: `Start from alerting service, walk to dependencies, then their dependencies. Leaf nodes with no upstream (postgres, kafka) are **root cause candidates**.

Limit depth (max_depth=5) to avoid traversing entire company topology. Return list for incident metadata.`,
    },
    {
      title: 'Blast Radius API',
      content: `\`GET /services/{id}/impact\` runs downstream BFS — "if postgres dies, who breaks?" Used for status pages and change risk assessment during deploys.`,
    },
  ],
  example: {
    title: 'Downstream BFS',
    language: 'python',
    code: `queue = deque(graph.get_downstream(service_id))
while queue:
    node = queue.popleft()
    affected.append(node)
    queue.extend(graph.get_downstream(node))`,
    explanation: 'Visited set prevents infinite loops if cycle exists — but cycles should be flagged in validation.',
  },
  pitfalls: ['Treating graph as undirected — dependency direction matters', 'No cycle detection — infinite BFS loops'],
  summary: ['Directed graph models service dependencies', 'BFS upstream suggests root causes', 'Blast radius = downstream BFS', 'Cycles indicate architectural tech debt'],
  reviewQuestions: [{ q: 'Difference between upstream and downstream BFS?', hint: 'root cause vs impact' }],
});

register('step-07-sql-schema', {
  chapter: 'Week 7 — PostgreSQL Schema & Migrations',
  overview:
    'Incidents must be queryable years later: "all P1s for payment team last quarter" requires normalized schema, indexes, and migration discipline. This chapter covers relational design, foreign keys, Alembic migrations, window functions for MTTR, and EXPLAIN ANALYZE for performance proof.',
  objectives: [
    'Design tables: services, incidents, alerts, users, on_call_schedules, incident_timeline',
    'Add composite indexes for common query patterns',
    'Use Alembic for versioned, reversible schema changes',
    'Write MTTR queries with window functions',
  ],
  definitions: [
    { term: 'Migration', definition: 'Versioned SQL change applied in order — never edit production schema by hand.' },
    { term: 'MTTR', definition: 'Mean Time To Recovery — average(resolved_at - created_at) per service.' },
    { term: 'Composite index', definition: 'Index on (service_id, status) speeds filters matching both columns.' },
  ],
  sections: [
    {
      title: 'Schema Design Principles',
      content: `**incidents** holds actionable records: severity, status, dedup_key UNIQUE, timestamps. **alerts** reference incidents. **incident_timeline** is append-only audit log.

Foreign keys enforce integrity. UNIQUE dedup_key is the database backstop if application dedup regresses.`,
    },
    {
      title: 'Indexing Strategy',
      content: `idx_incidents_service_status for dashboard filters. idx_incidents_severity_created for priority lists. Run EXPLAIN ANALYZE — verify Index Scan, not Seq Scan on 100k rows.`,
    },
    {
      title: 'Alembic Workflow',
      content: `Migration 001: core tables. Migration 002: timeline. upgrade() and downgrade() in each file. alembic upgrade head in CI and deploy.`,
    },
    {
      title: 'Window Functions for SRE Metrics',
      content: `AVG(resolved_at - created_at) per service_id gives MTTR. Foundation for executive reliability dashboards.`,
    },
  ],
  example: {
    title: 'Incidents Table',
    language: 'sql',
    code: 'CREATE TABLE incidents (id UUID PRIMARY KEY, dedup_key TEXT UNIQUE, status VARCHAR(20));',
    explanation: 'UNIQUE dedup_key enforces deduplication at the database layer.',
  },
  pitfalls: ['Missing indexes on filter columns', 'Editing applied migrations'],
  summary: ['Normalized schema with timeline audit', 'Indexes match queries', 'Alembic versions schema', 'MTTR from timestamps'],
  reviewQuestions: [{ q: 'Why UNIQUE on dedup_key?', hint: 'DB-level safety' }],
});

register('step-08-databases-redis', {
  chapter: 'Week 8 — Redis Caching & Multi-Store Architecture',
  overview:
    'Dashboards read active incidents hundreds of times per second during outages. Cache-aside with Redis serves hot data in milliseconds. This chapter explains TTL, invalidation, stampede protection, and when to use document stores for raw alert payloads.',
  objectives: [
    'Implement cache-aside pattern with 30s TTL',
    'Invalidate cache on incident status change',
    'Move dedup window to Redis sorted sets for multi-pod',
    'Use singleflight mutex against cache stampede',
  ],
  definitions: [
    { term: 'Cache-aside', definition: 'App reads cache first; on miss loads DB and populates cache.' },
    { term: 'TTL', definition: 'Key auto-expires — bounds staleness without manual cleanup.' },
    { term: 'Cache stampede', definition: 'Many concurrent cache misses hammer DB — use one loader with lock.' },
  ],
  sections: [
    { title: 'Read-Heavy Incident Lists', content: 'Key active_incidents:{team_id} stores JSON list. 30s TTL acceptable for internal dashboard.' },
    { title: 'Invalidation on Write', content: 'DELETE cache key on acknowledge/resolve. Stale active list during outage destroys trust.' },
    { title: 'Redis Dedup', content: 'ZADD dedup:window score=timestamp. Shared across pods — in-memory dedup fails with horizontal scale.' },
    { title: 'MongoDB for Raw JSON', content: 'Store full webhook payload for forensics without altering relational schema per source.' },
  ],
  example: { title: 'Cache-Aside', language: 'python', code: 'if cached := await redis.get(key): return loads(cached)', explanation: 'Miss path loads DB then setex.' },
  pitfalls: ['No invalidation', 'Infinite TTL'],
  summary: ['Redis for hot reads', 'Invalidate on writes', 'Redis dedup multi-pod', 'Document store for raw alerts'],
  reviewQuestions: [{ q: 'What is cache stampede?', hint: 'thundering herd' }],
});

register('step-09-fastapi-core', {
  chapter: 'Week 9 — FastAPI Production API',
  overview:
    'FastAPI combines Python type hints, automatic OpenAPI, and async handlers. Production APIs need auth, validation, observability, and probes. This chapter is the reference for how PulseGrid exposes incidents to the world.',
  objectives: [
    'Structure routers with dependency injection',
    'JWT auth and RBAC roles',
    'Structured JSON logging with request ID',
    'Liveness /health and readiness /ready endpoints',
  ],
  definitions: [
    { term: 'Dependency injection', definition: 'FastAPI resolves get_current_user per request — testable with overrides.' },
    { term: 'JWT', definition: 'Signed token with claims — stateless API authentication.' },
    { term: 'Readiness probe', definition: 'K8s removes pod from LB if /ready fails — DB or Redis unreachable.' },
  ],
  sections: [
    { title: 'Router Layout', content: 'auth, webhooks (public), incidents (protected), services. lifespan initializes AppState.' },
    { title: 'JWT and RBAC', content: 'viewer read-only; responder acknowledge/resolve; admin all. require_role dependency on mutations.' },
    { title: 'Middleware', content: 'X-Request-ID, duration_ms, JSON logs. Correlate API and worker during debugging.' },
    { title: 'Health Checks', content: '/health = process up. /ready = dependencies OK. Different K8s probe types.' },
  ],
  example: { title: 'Protected Route', language: 'python', code: 'Depends(require_role(RESPONDER))', explanation: 'Role enforced before handler runs.' },
  pitfalls: ['Blocking DB in async route', 'CORS * in production'],
  summary: ['Routers + DI', 'JWT RBAC', 'Structured logs', 'Health vs ready'],
  reviewQuestions: [{ q: '/health vs /ready?', hint: 'alive vs can serve' }],
});

register('step-10-api-protocols', {
  chapter: 'Week 10 — REST, GraphQL & gRPC',
  overview:
    'One protocol does not fit all clients. REST for public API, GraphQL for flexible dashboard queries, gRPC for internal low-latency paging. Learn cursor pagination, idempotency, and N+1 prevention.',
  objectives: ['REST /v1 cursor pagination', 'Idempotency-Key on webhooks', 'GraphQL nested timeline', 'gRPC notification service'],
  definitions: [
    { term: 'Cursor pagination', definition: 'Stable pagination using last item id — not OFFSET.' },
    { term: 'Idempotency', definition: 'Retry-safe operations — same key, same result.' },
    { term: 'N+1', definition: 'One query per child row — fix with batching or join.' },
  ],
  sections: [
    { title: 'REST Maturity', content: 'GET /v1/incidents?cursor=&limit=20&severity=p1. Version path for breaking changes.' },
    { title: 'Idempotency Keys', content: 'Store Idempotency-Key → incident_id 24h. Webhook retries do not duplicate incidents.' },
    { title: 'GraphQL', content: 'One query for incidents + timeline. Strawberry on FastAPI at /graphql.' },
    { title: 'gRPC', content: 'Protobuf SendPage RPC. Binary HTTP/2 for internal east-west traffic.' },
  ],
  example: { title: 'Idempotent POST', language: 'python', code: 'if store.get(key): return existing', explanation: 'At-least-once delivery, exactly-once effect.' },
  pitfalls: ['OFFSET on large tables', 'Unbounded GraphQL depth'],
  summary: ['REST v1 cursors', 'Idempotency keys', 'GraphQL dashboard', 'gRPC notifications'],
  reviewQuestions: [{ q: 'Why cursors?', hint: 'concurrent inserts' }],
});

register('step-11-react-dashboard', {
  chapter: 'Week 11 — React Incident Dashboard',
  overview:
    'React powers the engineer-facing UI during outages. Master hooks, React Query, virtualization, and WebSockets for a dashboard that stays fast with 500+ active incidents.',
  objectives: ['Component architecture', 'React Query server state', 'react-window virtualization', 'WebSocket live updates'],
  definitions: [
    { term: 'Server state', definition: 'API-owned data cached by React Query — not useState.' },
    { term: 'Virtualization', definition: 'Render visible rows only — O(viewport) DOM nodes.' },
    { term: 'WebSocket', definition: 'Push updates without polling.' },
  ],
  sections: [
    { title: 'Components', content: 'IncidentList → IncidentCard → SeverityBadge. Props down, callbacks up.' },
    { title: 'React Query', content: 'useQuery + invalidateQueries after mutations. refetchInterval fallback.' },
    { title: 'Virtualization', content: 'FixedSizeList — smooth scroll at 500 items.' },
    { title: 'WebSocket', content: 'ws message → invalidate incidents query → UI updates <2s.' },
  ],
  example: { title: 'Invalidate on WS', language: 'typescript', code: 'ws.onmessage = () => queryClient.invalidateQueries(["incidents"])', explanation: 'Push-driven UI.' },
  pitfalls: ['useState for API data', 'No virtualization'],
  summary: ['Component tree', 'React Query', 'Virtual lists', 'WebSocket'],
  reviewQuestions: [{ q: 'Why React Query?', hint: 'cache invalidation' }],
});

register('step-12-nextjs-fullstack', {
  chapter: 'Week 12 — Next.js Full-Stack Dashboard',
  overview:
    'Next.js App Router brings SSR, ISR, middleware, and Server Components. Public status pages need SEO; internal pages need server-side auth checks before HTML ships.',
  objectives: ['SSR incident list', 'ISR status page 60s', 'Middleware auth', 'Client Components for actions'],
  definitions: [
    { term: 'SSR', definition: 'HTML with data on each request.' },
    { term: 'ISR', definition: 'Static page regenerated on interval.' },
    { term: 'Server Component', definition: 'Runs on server — no client JS for data fetch.' },
  ],
  sections: [
    { title: 'App Router', content: 'page.tsx async Server Component fetches incidents server-side.' },
    { title: 'Status ISR', content: 'revalidate=60 for public /status/[team]. Green/yellow/red per service.' },
    { title: 'Middleware', content: 'Redirect unauthenticated from /incidents to /login.' },
    { title: 'Server Actions', content: 'acknowledgeIncident on server with auth — optional pattern.' },
  ],
  example: { title: 'SSR Fetch', language: 'typescript', code: 'const data = await getIncidents()', explanation: 'Data in first HTML — no spinner.' },
  pitfalls: ['Entire page use client', 'ISR too slow during outage'],
  summary: ['Server Components', 'ISR status', 'Middleware', 'Client leaves only'],
  reviewQuestions: [{ q: 'ISR vs SSR?', hint: 'public cacheable' }],
});

register('step-13-git-workflow', {
  chapter: 'Week 13 — Git Workflow & Team Collaboration',
  overview:
    'PulseGrid spans API, workers, dashboards, and infra — multiple engineers ship in parallel. Without branching strategy, PR reviews, and conventional commits, main breaks during real incidents. This chapter teaches trunk-based development, hotfixes, and collaboration patterns used at every mature engineering org.',
  objectives: [
    'Use short-lived feature branches merged via PR',
    'Write conventional commits and PR descriptions with test/rollback plans',
    'Simulate hotfix branch from release tag',
    'Configure CODEOWNERS and branch protection',
  ],
  definitions: [
    { term: 'Trunk-based development', definition: 'Main branch always deployable; features merge via small, frequent PRs.' },
    { term: 'Conventional commits', definition: 'feat:, fix:, docs: prefixes — enable automated changelogs.' },
    { term: 'Hotfix', definition: 'Emergency fix branched from production tag, merged to main immediately.' },
  ],
  sections: [
    { title: 'Why Branch Protection', content: 'Direct push to main bypasses CI and review. Require PR + passing tests + 1 approval. PulseGrid touching production paging cannot afford silent regressions.' },
    { title: 'Feature Branch Flow', content: 'git checkout -b feature/on-call-scheduling. Small commits. PR with test plan. Squash merge keeps history readable.' },
    { title: 'Hotfix Flow', content: 'Branch from v0.1.0 tag. Fix critical dedup bug. Merge to main. Tag v0.1.1. Deploy before feature branches.' },
    { title: 'PR Template', content: 'Summary, test plan checklist, rollback plan. Reviewers know what could break and how to revert.' },
  ],
  example: { title: 'Conventional Commit', language: 'text', code: 'fix(worker): evict expired dedup keys to prevent memory leak', explanation: 'Scope + type + description.' },
  pitfalls: ['Long-lived branches diverging from main', 'Merging without CI green'],
  summary: ['Protected main', 'Feature branches + PR', 'Hotfix from tags', 'PR template discipline'],
  reviewQuestions: [{ q: 'When squash merge?', hint: 'clean history one feature' }],
});

register('step-14-docker-cicd', {
  chapter: 'Week 14 — Docker & CI/CD Pipeline',
  overview:
    'Manual deploys cause config drift — staging on Python 3.11, production on 3.12. Docker packages the runtime; GitHub Actions automates lint → test → build → deploy. This chapter explains multi-stage images, compose stacks, and pipeline gates.',
  objectives: [
    'Multi-stage Dockerfile with non-root user and HEALTHCHECK',
    'docker-compose for api + worker + postgres + redis + kafka',
    'CI: ruff, pytest, docker build on every PR',
    'Auto-deploy staging on merge to main',
  ],
  definitions: [
    { term: 'Multi-stage build', definition: 'Builder stage installs deps; runtime stage copies only artifacts — smaller, safer images.' },
    { term: 'CI/CD', definition: 'Continuous Integration (test every change) + Continuous Delivery (automate deploy).' },
    { term: 'Blue-green deploy', definition: 'Two environments; switch traffic atomically — instant rollback.' },
  ],
  sections: [
    { title: 'Dockerfile Best Practices', content: 'python:3.12-slim, non-root user, HEALTHCHECK curl /health. Separate api and worker images, same base layers.' },
    { title: 'Compose Local Stack', content: 'One command brings up full system for integration testing. depends_on with healthchecks waits for postgres ready.' },
    { title: 'GitHub Actions', content: 'on pull_request: lint, mypy, pytest, eval_rag. on push main: docker build push. Fail fast on red tests.' },
    { title: 'Security in CI', content: 'Trivy scans images for CVEs. Dependabot bumps dependencies. Security is pipeline stage, not afterthought.' },
  ],
  example: { title: 'CI Job', language: 'yaml', code: 'run: pytest -v --cov=pulsegrid', explanation: 'No merge without green tests.' },
  pitfalls: ['Running as root in container', 'No healthcheck — K8s routes to dead pods'],
  summary: ['Multi-stage Docker', 'Compose dev stack', 'CI gates', 'Security scan'],
  reviewQuestions: [{ q: 'Why multi-stage?', hint: 'smaller image' }],
});

register('step-15-networking-cloud', {
  chapter: 'Week 15 — Cloud Deployment & Networking',
  overview:
    'PulseGrid must be reachable 24/7 with TLS, load balancing, and private databases. This chapter covers VPC design, ALB, RDS, ElastiCache, Route53, and debugging with curl, dig, and ss — the skills SREs use when "it works locally" fails in AWS.',
  objectives: [
    'Terraform modules for VPC, RDS, Redis',
    'ALB + ACM TLS termination',
    'Security groups: DB only from API subnet',
    'Network debugging runbook',
  ],
  definitions: [
    { term: 'VPC', definition: 'Virtual Private Cloud — isolated network in AWS with public/private subnets.' },
    { term: 'Security group', definition: 'Stateful firewall per resource — allow 5432 only from API security group.' },
    { term: 'ALB', definition: 'Application Load Balancer — HTTP/HTTPS routing to healthy targets.' },
  ],
  sections: [
    { title: 'Network Topology', content: 'Public subnets: ALB. Private subnets: API, worker, RDS, Redis. No database public IP.' },
    { title: 'TLS Everywhere', content: 'ACM certificate on ALB. HTTP redirects to HTTPS. Engineers page from phones — certificate errors block response.' },
    { title: 'DNS', content: 'Route53 api.pulsegrid.example.com → ALB alias. Health checks remove bad targets.' },
    { title: 'Debugging', content: 'curl -v for TLS. dig for DNS. ss -tlnp for listening ports. tcpdump for packet-level mysteries.' },
  ],
  example: { title: 'Security Group Rule', language: 'text', code: 'RDS: allow 5432 from sg-api only', explanation: 'Principle of least privilege.' },
  pitfalls: ['RDS publicly accessible', 'Security group 0.0.0.0/0 on database'],
  summary: ['VPC public/private', 'TLS at ALB', 'Private DB', 'Debug runbook'],
  reviewQuestions: [{ q: 'Why private subnets for DB?', hint: 'attack surface' }],
});

register('step-16-k8s-security', {
  chapter: 'Week 16 — Kubernetes, Testing & Security',
  overview:
    'Kubernetes orchestrates containers at scale: rolling updates, autoscaling, probes. Security hardening — rate limits, CORS, CSP, OWASP — protects on-call data and webhook endpoints. Testing pyramid adds integration and E2E confidence.',
  objectives: [
    'K8s Deployment, Service, Ingress, HPA',
    'Liveness and readiness probes',
    'Rate limiting and security headers middleware',
    'E2E test: webhook → incident → acknowledge',
  ],
  definitions: [
    { term: 'Rolling update', definition: 'Replace pods gradually — maxUnavailable 0 for zero downtime.' },
    { term: 'HPA', definition: 'Horizontal Pod Autoscaler — scale replicas on CPU.' },
    { term: 'OWASP Top 10', definition: 'Common web vulnerabilities — injection, broken auth, XSS.' },
  ],
  sections: [
    { title: 'K8s Manifests', content: 'Deployment 2 replicas, resource requests/limits, probes on /health and /ready. Service ClusterIP. Ingress for external HTTPS.' },
    { title: 'Probes', content: 'Liveness restart crashed pods. Readiness remove from service endpoints until DB connected.' },
    { title: 'Security Middleware', content: 'Rate limit 120/min per IP. CORS whitelist. CSP, X-Frame-Options. Parameterized SQL — no string concat.' },
    { title: 'Testing Pyramid', content: 'Many unit tests, fewer integration (TestClient), few E2E. test_weeks_10_24.py covers full flow.' },
  ],
  example: { title: 'Readiness Probe', language: 'yaml', code: 'httpGet: { path: /ready, port: 8000 }', explanation: 'No traffic until dependencies OK.' },
  pitfalls: ['No resource limits — noisy neighbor', 'CORS * with credentials'],
  summary: ['K8s deploy + HPA', 'Probes', 'Rate limit + headers', 'E2E in CI'],
  reviewQuestions: [{ q: 'Liveness vs readiness?', hint: 'restart vs route' }],
});

register('step-17-system-design-scale', {
  chapter: 'Week 17 — Scale to 10K Alerts/Minute',
  overview:
    'Black Friday multiplies alert volume 50x. System design asks: how many workers, DB connections, Redis memory? This chapter covers capacity estimation, horizontal scaling, circuit breakers, and load shedding — interview-grade system design applied to PulseGrid.',
  objectives: [
    'Capacity math: 10k/min = 167/sec',
    'Horizontal scale API and worker pods',
    'Circuit breaker on notification service',
    'Load shed P4 when queue > threshold',
  ],
  definitions: [
    { term: 'Capacity estimation', definition: 'Back-of-envelope QPS, storage, bandwidth before building.' },
    { term: 'Circuit breaker', definition: 'Stop calling failing dependency after N failures — fail fast, recover after timeout.' },
    { term: 'Load shedding', definition: 'Drop low-priority work under overload — save P1-P3.' },
  ],
  sections: [
    { title: 'Capacity Planning', content: '167 alerts/sec. API pod ~50 req/s → 4 pods. Worker ~25 alerts/s → 8 pods. Document in scale-10k-apm.md.' },
    { title: 'Horizontal Scaling', content: 'Stateless API behind ALB. Workers with shared Redis dedup and Kafka consumer groups.' },
    { title: 'Circuit Breaker', content: 'NotificationService opens after 5 failures. Incidents still created — paging degrades gracefully.' },
    { title: 'Load Shedding', content: 'should_shed_alert: drop P4 when queue depth > 800. Never shed P1-P3.' },
  ],
  example: { title: 'Circuit Breaker', language: 'python', code: 'if not breaker.allow_request(): raise CircuitOpen', explanation: 'Protect downstream and caller.' },
  pitfalls: ['Scaling without measuring bottleneck', 'Shedding P1 under load'],
  summary: ['Capacity math', 'Horizontal scale', 'Circuit breaker', 'Shed P4 only'],
  reviewQuestions: [{ q: '167/sec from 10k/min?', hint: 'divide by 60' }],
});

register('step-18-incident-timeline', {
  chapter: 'Week 18 — Incident Timeline & Status Page',
  overview:
    'Executives ask "when did we know?" and "how long to fix?" Event sourcing builds an append-only timeline. Status pages aggregate service health. Notification fan-out reaches Slack, email, and PagerDuty. Postmortems auto-generate from timeline data.',
  objectives: [
    'Domain events: created, acknowledged, resolved, comment',
    'GET /incidents/{id}/timeline API',
    'Public status page per team',
    'Postmortem markdown from timeline + MTTR',
  ],
  definitions: [
    { term: 'Event sourcing', definition: 'Store sequence of events; current state is fold over events.' },
    { term: 'Fan-out', definition: 'One incident triggers multiple notification channels in parallel.' },
    { term: 'MTTR', definition: 'Time from created_at to resolved_at — key SRE metric.' },
  ],
  sections: [
    { title: 'Timeline Events', content: 'DomainEvent with event_type, incident_id, payload, created_at. Append-only — audit trail for compliance.' },
    { title: 'Status Page Logic', content: 'Per service: operational if no active P1/P2; degraded if P3; outage if P1/P2. ISR cache 60s.' },
    { title: 'Notification Fan-out', content: 'fan_out(incident, [slack, email, pagerduty]). Non-blocking — failure logs warning, incident still created.' },
    { title: 'Postmortem Generation', content: 'Template fills title, MTTR, timeline bullets, action items. Starting point for blameless postmortem meeting.' },
  ],
  example: { title: 'Timeline Event', language: 'python', code: 'EventType.INCIDENT_ACKNOWLEDGED', explanation: 'Emitted on every state change.' },
  pitfalls: ['Updating timeline rows in place — loses audit', 'Blocking incident on notification failure'],
  summary: ['Append-only timeline', 'Status aggregation', 'Fan-out notifications', 'Postmortem template'],
  reviewQuestions: [{ q: 'Why append-only timeline?', hint: 'audit' }],
});

register('step-19-kafka-events', {
  chapter: 'Week 19 — Kafka & Event-Driven Architecture',
  overview:
    'Monolith workers scale with API — wasteful when search indexing lags but ingestion is fine. Kafka decouples producers and consumers. Outbox pattern guarantees no lost events when API crashes after DB commit.',
  objectives: [
    'Topics: alerts.raw, incidents.events, notifications.pending',
    'Outbox table in same transaction as incident',
    'Outbox publisher polls and publishes to Kafka',
    'Search indexer consumer updates Elasticsearch',
  ],
  definitions: [
    { term: 'Kafka', definition: 'Distributed log — producers append, consumers read at own pace with consumer groups.' },
    { term: 'Outbox pattern', definition: 'Write event to outbox table in same DB transaction as business data; separate process publishes.' },
    { term: 'Saga', definition: 'Multi-step distributed transaction with compensating actions on failure.' },
  ],
  sections: [
    { title: 'Why Event-Driven', content: 'Loose coupling: incident service does not call notification synchronously. Scale consumers independently.' },
    { title: 'Outbox Pattern', content: 'INSERT incident + INSERT outbox in one transaction. Publisher marks published after Kafka ack. No dual-write inconsistency.' },
    { title: 'Consumer Groups', content: '8 workers in group share partitions — each alert processed once. Rebalance on scale.' },
    { title: 'In-Memory Bus for Dev', content: 'InMemoryEventBus same interface as Kafka — local dev without Zookeeper. PULSEGRID_USE_KAFKA=true in prod.' },
  ],
  example: { title: 'Outbox', language: 'python', code: 'outbox.add(event)  # same txn as incident save', explanation: 'At-least-once publish, no lost events.' },
  pitfalls: ['Dual write DB + Kafka without outbox', 'No idempotent consumers'],
  summary: ['Kafka decoupling', 'Outbox reliability', 'Consumer groups', 'Dev bus abstraction'],
  reviewQuestions: [{ q: 'Why outbox?', hint: 'crash after DB before Kafka' }],
});

register('step-20-performance', {
  chapter: 'Week 20 — Performance Optimization',
  overview:
    'Dashboard p99 of 4 seconds wastes minutes during outages. Profile before optimizing: py-spy, EXPLAIN ANALYZE, missing indexes. Connection pooling (PgBouncer), eager loading, and SLO dashboards turn guesses into measured improvements.',
  objectives: [
    'Profile hot paths with py-spy',
    'Fix N+1 queries and add indexes',
    'PgBouncer connection pooling',
    'Load test before/after with scripts/load_test.py',
  ],
  definitions: [
    { term: 'p99 latency', definition: '99th percentile — 1% of requests slower. SREs optimize tail latency.' },
    { term: 'Connection pool', definition: 'Reuse DB connections — avoid TCP+auth per query.' },
    { term: 'SLO', definition: 'Service Level Objective — e.g. API p99 < 500ms.' },
  ],
  sections: [
    { title: 'Measure First', content: 'X-Response-Time-Ms header. Load test baseline. Do not optimize blind.' },
    { title: 'Query Optimization', content: 'EXPLAIN ANALYZE. Index filters. Batch timeline fetch for incident list — no N+1.' },
    { title: 'Pooling', content: 'pool_size = (max_connections - overhead) / pods. PgBouncer multiplexes thousands of clients to dozens of DB connections.' },
    { title: 'SLO Dashboard', content: 'Grafana panels for p50/p95/p99 ingestion and API. Green during load test = ship.' },
  ],
  example: { title: 'Load Test', language: 'bash', code: 'python scripts/load_test.py --rate 167 --duration 600', explanation: '10 min sustained load report.' },
  pitfalls: ['Optimizing without profile data', 'pool_size > postgres max_connections'],
  summary: ['Profile first', 'Indexes + batch queries', 'PgBouncer', 'SLO metrics'],
  reviewQuestions: [{ q: 'p99 meaning?', hint: '99th percentile' }],
});

register('step-21-generative-ai', {
  chapter: 'Week 21 — AI Incident Summarization',
  overview:
    'Engineers waste 15 minutes reading Slack during outages. LLMs summarize alerts, timeline, and correlated services into actionable text. This chapter covers prompt design, streaming SSE, cost control, and evals for faithfulness — production AI is not "call OpenAI and hope."',
  objectives: [
    'AIService builds prompt from incident + timeline',
    'POST /summarize with cached results',
    'SSE stream for progressive UI display',
    'Mock fallback when no API key',
  ],
  definitions: [
    { term: 'Prompt engineering', definition: 'Structuring input so LLM output is factual and formatted — include only verifiable context.' },
    { term: 'SSE', definition: 'Server-Sent Events — stream tokens to browser over HTTP.' },
    { term: 'Faithfulness', definition: 'Summary does not hallucinate facts not in source data — measured in evals.' },
  ],
  sections: [
    { title: 'What to Summarize', content: 'Title, service, severity, status, correlated services, timeline events. Prompt asks: what happened, impact, suggested next steps.' },
    { title: 'Caching', content: 'Cache summary per incident_id — regenerating on every page view burns tokens and adds latency.' },
    { title: 'Streaming UX', content: 'summarize_stream yields word chunks. Dashboard types out summary — feels faster than waiting 10s blank.' },
    { title: 'Production Fallback', content: 'No OPENAI_API_KEY → mock template summary. LLM failure must not block incident response.' },
  ],
  example: { title: 'SSE Stream', language: 'python', code: 'yield f"data: {json.dumps({chunk})}\\n\\n"', explanation: 'Event-stream media type.' },
  pitfalls: ['Hallucinating root cause not in data', 'No cache — cost explosion'],
  summary: ['Structured prompts', 'Cache summaries', 'SSE streaming', 'Fallback without LLM'],
  reviewQuestions: [{ q: 'Why cache summaries?', hint: 'cost and latency' }],
});

register('step-22-rag-runbooks', {
  chapter: 'Week 22 — RAG Runbook Assistant',
  overview:
    'Runbooks live in Confluence, GitHub, and engineers heads. RAG (Retrieval-Augmented Generation) embeds runbook chunks, retrieves top matches for incident context, and surfaces "Suggested Runbooks" on the dashboard. This chapter explains chunking, vector search, hybrid BM25+vector, and recall@3 evals.',
  objectives: [
    'Ingest markdown runbooks from docs/runbooks/',
    'TF-IDF / embedding search for top-3 chunks',
    'Suggest runbooks on incident create',
    'Eval gate recall@3 >= 0.85 in CI',
  ],
  definitions: [
    { term: 'RAG', definition: 'Retrieve relevant documents, then (optionally) generate answer grounded in them.' },
    { term: 'Embedding', definition: 'Dense vector representing semantic meaning — similar text → nearby vectors.' },
    { term: 'Recall@3', definition: 'Fraction of queries where correct runbook appears in top 3 results.' },
  ],
  sections: [
    { title: 'Chunking', content: 'One markdown file per runbook topic. Chunk size balances context vs precision. Metadata: title, source path.' },
    { title: 'Retrieval', content: 'Query = incident title + service + correlated. TF-IDF cosine similarity for dev without API keys. Production: OpenAI embeddings + pgvector.' },
    { title: 'Hybrid Search', content: 'BM25 keyword + vector semantic — catches exact error codes and paraphrases.' },
    { title: 'Eval Pipeline', content: 'scripts/eval_rag.py — 3 test queries, assert recall@3 >= 0.85 in CI. Regressions block merge.' },
  ],
  example: { title: 'Suggest Runbooks', language: 'python', code: 'runbooks.suggest_for_incident(incident, top_k=3)', explanation: 'Called after incident creation.' },
  pitfalls: ['Chunks too large — irrelevant text', 'No eval — quality drifts silently'],
  summary: ['Ingest runbooks', 'Semantic search', 'Suggest on create', 'CI eval gate'],
  reviewQuestions: [{ q: 'What is recall@3?', hint: 'correct in top 3' }],
});

register('step-23-agentic-ai', {
  chapter: 'Week 23 — AI Incident Response Agent',
  overview:
    'Senior engineers follow mental checklists: check health, find similar incidents, search runbooks, page on-call. An AI agent with tools automates investigation using ReAct (Reason + Act). Human-in-the-loop prevents destructive actions — agents suggest, humans approve.',
  objectives: [
    'Tools: search_incidents, get_service_health, search_runbooks, get_on_call',
    'ReAct loop with max steps and audit trace',
    'POST /ai/agent chat endpoint',
    'Agent cannot resolve or page without approval',
  ],
  definitions: [
    { term: 'AI Agent', definition: 'LLM loop that chooses tools, observes results, iterates toward goal.' },
    { term: 'ReAct', definition: 'Reasoning trace + Action — thought, tool call, observation per step.' },
    { term: 'Human-in-the-loop', definition: 'Destructive or high-impact actions require human confirmation.' },
  ],
  sections: [
    { title: 'Tool Design', content: 'Each tool: clear name, typed inputs, read-only or safe writes. search_incidents, get_service_health, search_runbooks, add_timeline_comment.' },
    { title: 'ReAct Loop', content: 'Query → pick tool → observation → next tool or final answer. Max 10 steps, cost cap.' },
    { title: 'Safety', content: 'No resolve_incident or send_page in autonomous loop. Final answer recommends actions; engineer executes.' },
    { title: 'Audit Trace', content: 'AgentTrace stores every step — debug hallucinations, compliance, postmortem "what did AI suggest?"' },
  ],
  example: { title: 'Agent Query', language: 'json', code: '{"query": "What should I do about payment-api P1?"}', explanation: 'Agent investigates health + runbooks.' },
  pitfalls: ['Giving agent write tools without approval', 'No trace logging'],
  summary: ['Tool-based agent', 'ReAct loop', 'Human approval for mutations', 'Full audit trace'],
  reviewQuestions: [{ q: 'Why human-in-the-loop?', hint: 'safety' }],
});

register('step-24-production-launch', {
  chapter: 'Week 24 — Production Launch & Capstone Demo',
  overview:
    'Building PulseGrid is half the journey — shipping AI safely, presenting in interviews, and demonstrating senior judgment completes it. This chapter covers production checklists, demo scripts, behavioral interview stories, and scaling whiteboard exercises.',
  objectives: [
    'AI fallbacks and monitoring in production',
    'CI eval gates for RAG and summarization',
    '5-minute demo script end-to-end',
    'Interview system design: scale to 1M events/day',
  ],
  definitions: [
    { term: 'Eval gate', definition: 'Automated quality check in CI — merge blocked if RAG recall drops.' },
    { term: 'Blameless postmortem', definition: 'Focus on systems and process, not individual blame.' },
    { term: 'Trade-off narrative', definition: 'Interview answers explain why monolith-first, why shed P4, why outbox — not just what.' },
  ],
  sections: [
    { title: 'Production AI Checklist', content: 'Fallback mock summary. Monitor token cost and latency. Cache embeddings. Never block incident path on LLM timeout.' },
    { title: 'Demo Flow', content: 'Ingest alert → incident → dashboard → AI summary → runbooks → agent → acknowledge → resolve → postmortem. docs/demo-script.md timing.' },
    { title: 'Interview Stories', content: '"Tell me about a production incident" → PulseGrid dedup bug, how you fixed, what you learned. STAR format.' },
    { title: 'Scale Whiteboard', content: '1M events/day → Kafka partitions, read replicas, CDN, regional failover. Connect to Week 17 capacity doc.' },
  ],
  example: { title: 'Demo Command', language: 'bash', code: 'curl -X POST .../webhooks/alerts/sync -d \'{"severity":"p1",...}\'', explanation: 'Start demo with live ingestion.' },
  pitfalls: ['Demo without fallback if OpenAI down', 'Only showing code — explain trade-offs'],
  summary: ['AI production safety', 'Demo script', 'Interview narratives', 'Scale design'],
  reviewQuestions: [{ q: 'Why eval gate in CI?', hint: 'prevent RAG regression' }],
});

export function getCapstoneTextbookLesson(stepId: string): string | undefined {
  return pulsegridTextbookLessons[stepId];
}
