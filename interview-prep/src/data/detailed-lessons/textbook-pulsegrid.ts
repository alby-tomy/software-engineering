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
      content: `Relational schema is the contract between application and database for years of incident history. PulseGrid separates **actionable** data (incidents) from **raw signals** (alerts) and **audit** data (timeline).

**incidents** is the core table: \`service_id\`, \`title\`, \`severity\`, \`status\`, \`dedup_key\` (UNIQUE), \`alert_count\`, \`correlated_services\`, timestamps (\`created_at\`, \`acknowledged_at\`, \`resolved_at\`). Status follows the domain state machine: triggered → acknowledged → resolved.

**alerts** store individual webhook payloads linked to \`incident_id\` via foreign key — one incident may aggregate hundreds of alerts during a storm.

**incident_timeline** is append-only: every state change and comment becomes a row. Never UPDATE timeline rows in place — compliance and postmortems depend on immutable history.

Foreign keys enforce referential integrity at the database layer. If application code regresses and tries to create an alert for a deleted incident, PostgreSQL rejects it. The UNIQUE constraint on \`dedup_key\` is the **last line of defense** against duplicate incidents when in-memory dedup fails across pod restarts.`,
    },
    {
      title: 'Indexing Strategy',
      content: `Indexes must match **actual query patterns**, not hypothetical ones. PulseGrid's dashboard runs these filters constantly:

- \`WHERE service_id = ? AND status IN ('triggered', 'acknowledged')\` → composite index \`(service_id, status)\`
- \`WHERE severity = 'p1' ORDER BY created_at DESC\` → index \`(severity, created_at DESC)\`
- Timeline lookup: \`WHERE incident_id = ? ORDER BY created_at\` → index on \`(incident_id, created_at)\`

Run \`EXPLAIN ANALYZE\` on every slow query. You want **Index Scan** or **Index Only Scan**, not **Seq Scan** on tables with 100k+ rows. A sequential scan on incidents during an outage adds seconds to every dashboard refresh.

Partial indexes can help: \`CREATE INDEX idx_active ON incidents(service_id) WHERE status != 'resolved'\` — smaller index, faster lookups for the hot "active incidents" path only.`,
    },
    {
      title: 'Alembic Workflow',
      content: `Never edit production schema by hand. **Alembic** versions every change in Python migration files with \`upgrade()\` and \`downgrade()\` functions.

PulseGrid migration history:
- **001_initial_schema** — services, incidents, alerts, users, on_call_schedules
- **002_incident_timeline** — append-only audit table

Workflow for new changes:
1. \`alembic revision -m "add_column_x"\` — generates new file
2. Write \`upgrade()\` SQL and reversible \`downgrade()\`
3. Test locally: \`alembic upgrade head\` then \`alembic downgrade -1\`
4. CI runs \`alembic upgrade head\` against test database
5. Deploy applies migrations before new code rolls out

**Rule:** Never edit a migration that has already been applied in staging or production. Create a new migration instead. Editing applied migrations causes drift between environments.`,
    },
    {
      title: 'Window Functions for SRE Metrics',
      content: `Executives and SRE teams measure reliability with **MTTR** (Mean Time To Recovery) and incident frequency. Window functions make these queries elegant:

\`\`\`sql
SELECT service_id,
       AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) AS avg_mttr_seconds,
       COUNT(*) AS incident_count
FROM incidents
WHERE resolved_at IS NOT NULL
  AND created_at > now() - interval '30 days'
GROUP BY service_id
ORDER BY avg_mttr_seconds DESC;
\`\`\`

This powers reliability dashboards: "payment-api MTTR increased 40% this quarter — investigate runbook gaps."

You can also use \`ROW_NUMBER() OVER (PARTITION BY service_id ORDER BY created_at DESC)\` to find the latest incident per service without a correlated subquery. These patterns appear in senior backend interviews — know them cold.`,
    },
  ],
  example: {
    title: 'Incidents Table',
    language: 'sql',
    code: `CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    severity VARCHAR(4) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'triggered',
    dedup_key TEXT UNIQUE,
    alert_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);
CREATE INDEX idx_incidents_service_status ON incidents(service_id, status);`,
    explanation: 'UNIQUE dedup_key enforces deduplication at the database layer. Composite index matches dashboard filter queries.',
  },
  pitfalls: [
    'Missing indexes on filter columns — Seq Scan kills dashboard latency during outages',
    'Editing applied migrations — causes environment drift',
    'Storing correlated_services as comma-separated string without normalization — acceptable for MVP, document trade-off',
  ],
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
    {
      title: 'Read-Heavy Incident Lists',
      content: `During an outage, every engineer refreshes the dashboard. A single incident list endpoint might serve **hundreds of requests per second** while writes (new incidents, acknowledges) happen at tens per second. This is a classic **read-heavy** workload — perfect for caching.

PulseGrid uses **cache-aside** pattern with Redis key \`active_incidents:{team_id}\` storing a JSON-serialized list of active incidents. TTL of **30 seconds** is acceptable for internal dashboards: engineers tolerate slight staleness if acknowledge/resolve invalidates immediately.

Cache hit path: Redis GET → deserialize → return (<5ms).
Cache miss path: query PostgreSQL → SETEX with TTL → return (50–200ms).

Hit ratio above 90% during steady-state means PostgreSQL handles only cache misses and writes — dramatically reducing load during incidents.`,
    },
    {
      title: 'Invalidation on Write',
      content: `The worst failure mode is a stale cache showing resolved incidents as active during a real outage. Engineers lose trust and revert to manual Slack threads.

**Rule:** DELETE cache key on every mutation:
- \`acknowledge_incident\` → invalidate \`active_incidents:{team_id}\`
- \`resolve_incident\` → invalidate
- \`create_incident\` → invalidate (new active incident)

Write-through caching (update cache on write) is an alternative but harder to get right with complex list queries. Cache-aside with aggressive invalidation is simpler and correct.

Monitor cache invalidation rate vs hit rate in metrics. Sudden drop in hit rate after deploy may indicate invalidation bug flooding the database.`,
    },
    {
      title: 'Redis Dedup for Multi-Pod',
      content: `In-memory dedup (Week 4) fails when you run **multiple worker pods**. Pod A deduplicates an alert; Pod B never saw it and creates a duplicate incident.

**Redis sorted set** solution:
- Key: \`dedup:window\`
- Member: \`dedup_key\` (e.g. \`payment-api:High CPU\`)
- Score: Unix timestamp
- On check: \`ZREMRANGEBYSCORE\` evict entries older than 300s, then \`ZSCORE\` — if exists, duplicate
- On record: \`ZADD\` with current timestamp

All pods share the same Redis instance — dedup is consistent across the fleet. TTL eviction happens automatically via score pruning. This is a standard pattern for distributed rate limiting and deduplication.`,
    },
    {
      title: 'Cache Stampede Protection',
      content: `When cache expires during high traffic, **thousands of concurrent requests** may miss simultaneously and all query PostgreSQL — the "thundering herd" or **cache stampede**.

**Singleflight** pattern: only one request loads from DB; others wait on the same lock/future.

\`\`\`python
async with self._lock_for(team_id):
    cached = await self.get_active(team_id)
    if cached is not None:
        return cached  # another request populated while we waited
    incidents = await loader()
    await self.set_active(incidents, team_id, ttl=30)
    return incidents
\`\`\`

Optional: **probabilistic early expiration** — refresh cache at 25s TTL randomly before hard 30s expiry to spread miss load.`,
    },
  ],
  example: {
    title: 'Cache-Aside Pattern',
    language: 'python',
    code: `async def get_or_load(self, team_id: str, loader) -> list[Incident]:
    cached = await self.redis.get(f"active_incidents:{team_id}")
    if cached:
        return json.loads(cached)  # HIT — <5ms
    async with self._lock_for(team_id):
        cached = await self.redis.get(key)
        if cached:
            return json.loads(cached)
        incidents = await loader()  # MISS — load DB
        await self.redis.setex(key, 30, json.dumps(incidents))
        return incidents`,
    explanation: 'Singleflight lock prevents stampede. TTL bounds staleness.',
  },
  pitfalls: [
    'No invalidation on write — stale dashboard during outages destroys trust',
    'Infinite TTL — memory growth and permanent staleness',
    'In-memory dedup with multiple pods — duplicate incidents',
  ],
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
    {
      title: 'Router Layout and Dependency Injection',
      content: `Production FastAPI apps split routes by domain, not one giant \`main.py\`. PulseGrid structure:

- \`routers/auth.py\` — login, token refresh (public)
- \`routers/webhooks.py\` — alert ingestion (public, rate-limited)
- \`routers/incidents.py\` — CRUD, acknowledge, resolve (protected)
- \`routers/services.py\` — service graph, root causes (protected)
- \`routers/v1.py\` — versioned REST API (Week 10)

**Dependency injection** via \`Depends()\` wires shared state per request:
\`ProcessorDep\`, \`get_current_user\`, \`require_role(RESPONDER)\`.

Tests override dependencies: \`app.dependency_overrides[get_current_user] = lambda: mock_admin\`. This makes integration tests fast without real JWT infrastructure.

The \`lifespan\` context manager initializes \`AppState\` (queue, processor, cache, timeline) on startup and cleans up on shutdown — critical for K8s graceful termination.`,
    },
    {
      title: 'JWT Authentication and RBAC',
      content: `PulseGrid uses **stateless JWT** tokens — the API does not store sessions in Redis. Login validates credentials, returns signed token with claims (\`sub\`, \`role\`, \`exp\`).

**Role-Based Access Control (RBAC):**

| Role | Permissions |
|------|-------------|
| viewer | Read incidents, services, timeline |
| responder | Acknowledge, resolve, add comments |
| admin | All operations including user management |

\`require_role(RESPONDER, ADMIN)\` dependency runs **before** the handler — unauthorized requests get 403 without touching business logic.

Security notes: short token expiry (1 hour), HTTPS only in production, never log tokens, validate \`exp\` claim on every request. For webhook endpoints, use separate API keys or HMAC signatures — not user JWT.`,
    },
    {
      title: 'Observability Middleware',
      content: `During incidents, you need to trace a single alert from webhook → worker → database → notification. Structured logging makes this possible.

Every request gets:
- **X-Request-ID** — propagated to worker logs via alert metadata
- **duration_ms** — logged in JSON format for log aggregation (Datadog, CloudWatch)
- **user_id** and **route** — for audit

\`\`\`json
{"level": "info", "request_id": "abc-123", "method": "POST", "path": "/webhooks/alerts", "duration_ms": 4.2, "status": 202}
\`\`\`

Correlate API and worker logs by \`request_id\`. When an engineer says "incident X is wrong," grep both services for the same ID.`,
    },
    {
      title: 'Health vs Readiness Probes',
      content: `Kubernetes runs two different probes — confusing them causes outages.

**/health (liveness):** Is the process alive? Returns 200 if Python is running. Failure → K8s **restarts** the pod. Keep this check lightweight — no database calls.

**/ready (readiness):** Can this pod serve traffic? Pings Redis, PostgreSQL connection. Failure → K8s **removes pod from load balancer** but does not restart. Use during startup (DB not connected yet) and dependency failures (Redis down — pod should not receive traffic but may recover).

Wrong configuration: liveness probe hits /ready → transient DB blip restarts all pods simultaneously → **thundering herd on database**.`,
    },
  ],
  example: {
    title: 'Protected Route with RBAC',
    language: 'python',
    code: `@router.post("/incidents/{id}/acknowledge")
async def acknowledge(
    id: str,
    processor: ProcessorDep,
    user: Annotated[User, Depends(require_role(UserRole.RESPONDER, UserRole.ADMIN))],
) -> Incident:
    return await processor.acknowledge_incident(id)`,
    explanation: 'Role enforced before handler runs. Viewer gets 403.',
  },
  pitfalls: [
    'Blocking sync database calls inside async routes — stalls entire event loop',
    'CORS allow_origins=["*"] with credentials in production',
    'Using /ready for liveness probe — causes restart storms',
  ],
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
    {
      title: 'REST API Maturity — Versioning and Pagination',
      content: `Public APIs need **stable contracts**. PulseGrid exposes \`/v1/incidents\` so breaking changes ship as \`/v2\` without breaking existing integrations.

**Cursor pagination** beats OFFSET for large tables:
- OFFSET 10000 scans and discards 10000 rows — O(n) per page
- Cursor uses \`WHERE id > last_seen_id LIMIT 20\` — O(log n) with index

Filters: \`?severity=p1&status=triggered&service_id=payment-api\`. Combine with cursor for filtered pagination.

Response shape:
\`\`\`json
{"items": [...], "next_cursor": "uuid-of-last-item", "count": 20}
\`\`\`

Clients loop until \`next_cursor\` is null. Document max \`limit=100\` to prevent abuse.`,
    },
    {
      title: 'Idempotency Keys for Webhook Retries',
      content: `Monitoring systems deliver webhooks **at-least-once**. Network timeout → retry → duplicate incident without idempotency.

**Idempotency-Key** header (or derived from alert fingerprint):
1. Client sends \`Idempotency-Key: prom-alert-abc123\`
2. Server checks store: if key exists, return same \`incident_id\` with 200
3. If new, process and store \`key → incident_id\` with 24h TTL

This gives **exactly-once effect** on top of at-least-once delivery — the same pattern Stripe and payment APIs use.

Store in Redis for multi-pod consistency. Evict expired keys to bound memory.`,
    },
    {
      title: 'GraphQL for Dashboard Flexibility',
      content: `REST forces multiple round trips: GET incidents, then GET timeline for each. GraphQL lets the dashboard request exactly what it needs in **one query**.

Strawberry integrates with FastAPI at \`/graphql\`. Schema defines \`Incident\` type with nested \`timeline\` resolver.

**N+1 problem:** Naive resolver runs one DB query per incident's timeline. Fix with **DataLoader** — batch load all timelines in one query per request.

GraphQL risks: unbounded query depth, expensive nested fields. Mitigate with query complexity limits and max depth validation in production.`,
    },
    {
      title: 'gRPC for Internal Notification Service',
      content: `Paging on-call engineers is **latency-sensitive** and **internal** — no browser clients. gRPC uses Protocol Buffers over HTTP/2:

- Binary serialization — smaller payloads than JSON
- HTTP/2 multiplexing — persistent connections
- Strong typing via \`.proto\` schema — codegen for Python, Go clients

\`NotificationService.SendPage(on_call_id, incident_id, title, severity)\` runs on port 50051. Worker calls gRPC after incident creation; API process stays lightweight.

Extract to microservice when paging load exceeds monolith capacity (Week 10 extraction point from ADR #001).`,
    },
  ],
  example: {
    title: 'Idempotent Webhook Handler',
    language: 'python',
    code: `@router.post("/webhooks/alerts/sync")
async def sync_ingest(
    payload: dict,
    idempotency_key: str | None = Header(None, alias="Idempotency-Key"),
):
    if idempotency_key and (existing := store.get(idempotency_key)):
        return {"incident_id": existing, "status": "duplicate"}
    incident = await processor.process_alert(alert)
    if idempotency_key:
        store.set(idempotency_key, incident.id)
    return {"incident_id": incident.id}`,
    explanation: 'At-least-once delivery, exactly-once effect. Same key returns same incident.',
  },
  pitfalls: [
    'OFFSET pagination on million-row tables',
    'GraphQL without N+1 protection — database meltdown',
    'Exposing gRPC publicly without TLS and auth',
  ],
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
    {
      title: 'Component Architecture',
      content: `During outages, engineers stare at dashboards for hours. Component design must balance **clarity under stress** with **performance at scale**.

PulseGrid component tree:
\`\`\`
App
├── IncidentList (virtualized)
│   └── IncidentCard[]
│       ├── SeverityBadge
│       ├── ServiceTag
│       └── ActionButtons (Ack / Resolve)
├── IncidentDetail (selected incident)
│   ├── Timeline
│   └── CorrelatedServices
└── Filters (severity, service, status)
\`\`\`

**Props down, callbacks up:** parent owns server state; children receive \`incident\` and \`onAcknowledge(id)\`. No prop drilling beyond two levels — React Context for auth token if needed.

Keep components **pure** where possible — same props → same render. Side effects (API calls) live in hooks or event handlers.`,
    },
    {
      title: 'React Query for Server State',
      content: `\`useState\` for API data causes duplicate fetches, stale UI, and manual loading/error flags. **TanStack React Query** treats server state as a cache:

\`\`\`tsx
const { data, isLoading, error } = useQuery({
  queryKey: ['incidents', filters],
  queryFn: () => fetchIncidents(filters),
  refetchInterval: 30000,  // fallback polling
});
\`\`\`

After mutation (acknowledge):
\`\`\`tsx
await acknowledgeIncident(id);
queryClient.invalidateQueries({ queryKey: ['incidents'] });
\`\`\`

React Query deduplicates concurrent requests, caches by key, and provides \`isFetching\` for background refresh indicators. This is the standard pattern for production React dashboards.`,
    },
    {
      title: 'Virtualization for 500+ Incidents',
      content: `Rendering 500 \`<IncidentCard>\` elements creates 500 DOM nodes — scroll jank, slow paint, high memory. **react-window** renders only visible rows:

\`\`\`tsx
<FixedSizeList height={600} itemCount={incidents.length} itemSize={120}>
  {({ index, style }) => (
    <div style={style}>
      <IncidentCard incident={incidents[index]} />
    </div>
  )}
</FixedSizeList>
\`\`\`

Complexity drops from O(n) DOM nodes to O(viewport) — typically 5–8 visible cards. Variable height lists use \`VariableSizeList\` with measured row heights.

Test with 1000 mock incidents in Storybook — scroll must stay at 60fps.`,
    },
    {
      title: 'WebSocket Live Updates',
      content: `Polling every 5s means up to 5s delay seeing new P1 incidents. **WebSocket** pushes updates instantly:

1. Dashboard connects to \`ws://api/ws/incidents\`
2. Worker publishes \`incidents_updated\` after processing
3. Client receives message → \`invalidateQueries(['incidents'])\`
4. React Query refetches → UI updates in <2s

Fallback: \`refetchInterval: 30000\` when WebSocket disconnects. Reconnect with exponential backoff.

Do not push full incident payloads over WS — invalidate cache and let React Query fetch authoritative data.`,
    },
  ],
  example: {
    title: 'WebSocket-Driven Cache Invalidation',
    language: 'typescript',
    code: `useEffect(() => {
  const ws = connectWebSocket(() => {
    queryClient.invalidateQueries({ queryKey: ['incidents'] });
  });
  return () => ws.close();
}, [queryClient]);`,
    explanation: 'Push triggers refetch — authoritative data from API, not stale WS payload.',
  },
  pitfalls: [
    'useState for API data — manual cache invalidation hell',
    'No virtualization — janky scroll during major outages',
    'Pushing full incident objects over WebSocket — stale data conflicts',
  ],
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
    {
      title: 'App Router and Server Components',
      content: `Next.js 13+ **App Router** defaults to React Server Components (RSC) — components run on the server, zero client JavaScript for data fetching.

\`app/incidents/page.tsx\` is an async Server Component:
\`\`\`tsx
export default async function IncidentsPage() {
  const incidents = await getIncidents();  // runs on server
  return <IncidentTable incidents={incidents} />;
}
\`\`\`

Benefits for PulseGrid:
- **No loading spinner** on first paint — HTML includes data
- API credentials stay on server — token never exposed to browser
- Smaller client bundle — data fetching code not shipped to client

Mark interactive parts with \`'use client'\` — buttons, filters, modals only.`,
    },
    {
      title: 'ISR for Public Status Pages',
      content: `Status pages (\`status.company.com\`) must be **public**, **SEO-friendly**, and **fast**. Incremental Static Regeneration (ISR) regenerates static HTML every N seconds:

\`\`\`tsx
export const revalidate = 60;  // regenerate at most every 60s

export default async function StatusPage({ params }) {
  const services = await getServiceHealth(params.team);
  return <StatusGrid services={services} />;
}
\`\`\`

First request after 60s triggers background regeneration — users always get cached HTML instantly. Green/yellow/red per service based on active P1/P2/P3 incidents.

Trade-off: up to 60s staleness on public status. Acceptable for external customers; internal dashboard uses WebSocket for real-time.`,
    },
    {
      title: 'Middleware for Auth Gates',
      content: `\`middleware.ts\` runs on the **Edge** before the request reaches your page — perfect for auth redirects:

\`\`\`typescript
export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');
  if (!token && request.nextUrl.pathname.startsWith('/incidents')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
export const config = { matcher: ['/incidents/:path*'] };
\`\`\`

Unauthenticated users never receive incident HTML — security check happens before render, not in a client-side \`useEffect\`. Public \`/status/*\` routes bypass middleware.`,
    },
    {
      title: 'Server Actions for Mutations',
      content: `Server Actions let you call server functions directly from Client Components:

\`\`\`typescript
'use server';
export async function acknowledgeIncident(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  await api.post(\`/incidents/\${id}/acknowledge\`, { token: session.token });
}
\`\`\`

Alternative: traditional API route (\`app/api/incidents/[id]/acknowledge/route.ts\`). Server Actions reduce boilerplate for simple mutations. Both patterns validate auth server-side — never trust client-only checks.`,
    },
  ],
  example: {
    title: 'SSR Incident Fetch',
    language: 'typescript',
    code: `// app/incidents/page.tsx — Server Component
async function getIncidents(): Promise<Incident[]> {
  const res = await fetch(\`\${process.env.API_URL}/incidents\`, {
    headers: { Authorization: \`Bearer \${await getServerToken()}\` },
    next: { revalidate: 0 },  // always fresh for internal dashboard
  });
  return res.json();
}`,
    explanation: 'Data in first HTML byte — no client-side loading spinner.',
  },
  pitfalls: [
    'Marking entire page use client — loses SSR benefits',
    'ISR revalidate=3600 on status page — customers see stale outage info',
    'Auth check only in client useEffect — security hole',
  ],
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
    {
      title: 'Why Branch Protection Matters',
      content: `PulseGrid pages on-call engineers during real outages. A broken deploy at 3 AM because someone pushed directly to \`main\` is unacceptable. **Branch protection** enforces:

- Require pull request before merging
- Require status checks (CI test, lint, docker build)
- Require at least one approving review
- Block force pushes

Direct push to main bypasses all safety nets. Even solo developers benefit — future you will thank present you when CI catches a regression.

For PulseGrid specifically: changes touch ingestion, dedup, paging, and AI — any regression can cause duplicate pages or missed P1 alerts.`,
    },
    {
      title: 'Feature Branch Workflow',
      content: `**Trunk-based development** with short-lived feature branches:

\`\`\`bash
git checkout main && git pull
git checkout -b feature/on-call-scheduling
# small commits, each with conventional message
git commit -m "feat(scheduler): add weekly rotation model"
git push -u origin feature/on-call-scheduling
# open PR, wait for CI + review
# squash merge to main
\`\`\`

Keep branches alive **less than 2–3 days**. Long-lived branches diverge, merge conflicts explode, and integration pain grows. If a feature is large, ship behind feature flags in small PRs.

**Squash merge** combines all commits into one clean commit on main — readable history, one feature per commit.`,
    },
    {
      title: 'Hotfix Workflow for Production Bugs',
      content: `Critical dedup bug in production — feature branches wait. **Hotfix flow:**

1. Branch from production tag: \`git checkout -b hotfix/dedup-leak v0.1.0\`
2. Fix with minimal change, full test suite
3. Merge to \`main\` immediately
4. Tag \`v0.1.1\` and deploy
5. Cherry-pick or merge hotfix into any in-flight feature branches

Hotfixes skip normal feature review timeline but still require CI green and at least one reviewer. Document in PR: "HOTFIX — production dedup memory leak, paging affected since 14:00 UTC."

Never hotfix without a rollback plan — tag previous version before deploy.`,
    },
    {
      title: 'PR Template and CODEOWNERS',
      content: `PR template forces authors to think before merge:

\`\`\`markdown
## Summary
What changed and why.

## Test Plan
- [ ] pytest passes
- [ ] Manual webhook test
- [ ] Dashboard acknowledge flow

## Rollback Plan
Revert commit ABC or redeploy tag v0.1.0
\`\`\`

**CODEOWNERS** auto-requests reviewers by path:
\`\`\`
/pulsegrid/pulsegrid/api/  @backend-team
/pulsegrid/dashboard/       @frontend-team
/pulsegrid/infra/           @platform-team
\`\`\`

Reviewers know their domain. Platform team reviews Terraform changes; backend team reviews dedup logic.`,
    },
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
    {
      title: 'Multi-Stage Dockerfile Best Practices',
      content: `A naive Dockerfile \`COPY . .\` + \`pip install\` creates 1GB+ images with build tools in production. **Multi-stage builds** separate concerns:

**Builder stage:** install dependencies, compile assets
**Runtime stage:** copy only installed packages and application code

Additional production requirements:
- **Non-root user** (\`USER pulsegrid\`) — container escape exploits get limited privileges
- **HEALTHCHECK** — \`curl -f http://localhost:8000/health\` so orchestrators detect dead containers
- **python:3.12-slim** base — smaller attack surface than full image
- Separate **api** and **worker** images with shared base layers for cache efficiency

Target: API image under 200MB. Smaller images = faster deploys, less registry cost, faster cold starts.`,
    },
    {
      title: 'docker-compose Local Development Stack',
      content: `\`docker compose up\` should bring up the **entire PulseGrid system** for integration testing:

- postgres (with healthcheck)
- redis (with healthcheck)
- redpanda/kafka (event bus)
- api (depends_on postgres healthy)
- worker (depends_on api)

\`depends_on: condition: service_healthy\` prevents API from starting before PostgreSQL accepts connections — eliminates race condition flakes in local dev.

Environment variables inject connection strings:
\`PULSEGRID_DATABASE_URL=postgresql+asyncpg://pulsegrid:pulsegrid@postgres:5432/pulsegrid\`

One command reproduces production topology locally. New engineers onboard in minutes, not days.`,
    },
    {
      title: 'GitHub Actions CI Pipeline',
      content: `Every PR triggers:

1. **Lint** — \`ruff check\` (fast, catches style and some bugs)
2. **Type check** — \`mypy pulsegrid\`
3. **Test** — \`pytest -v --cov=pulsegrid\`
4. **AI eval gate** — \`python scripts/eval_rag.py\` (recall@3 >= 0.85)
5. **Docker build** — verify images build (after tests pass)

Merge to \`main\` triggers staging deploy. Production requires manual approval (blue-green or rolling).

**Fail fast:** lint runs before expensive integration tests. Broken formatting should not waste 10 minutes of CI time.`,
    },
    {
      title: 'Security Scanning in CI',
      content: `Dependencies and images have CVEs. Automate detection:

- **Trivy** scans Docker images for known vulnerabilities — fail build on CRITICAL
- **Dependabot** opens PRs for dependency bumps weekly
- **ruff** security rules catch some anti-patterns

Security is a **pipeline stage**, not a quarterly audit. When log4shell-style vulnerabilities hit, you want automated PRs, not manual grep across repos.`,
    },
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
    {
      title: 'VPC Network Topology',
      content: `AWS **VPC** isolates PulseGrid infrastructure. Standard three-tier layout:

**Public subnets** (10.0.1.0/24, 10.0.2.0/24):
- Application Load Balancer (ALB) — only internet-facing component
- NAT Gateway — outbound internet for private subnets

**Private subnets** (10.0.10.0/24, 10.0.11.0/24):
- API and worker pods/containers
- RDS PostgreSQL — **no public IP**
- ElastiCache Redis — internal only

Principle: **defense in depth**. Even if ALB is compromised, attacker cannot reach database directly. Security groups enforce least privilege at every hop.`,
    },
    {
      title: 'TLS Termination at the Load Balancer',
      content: `Engineers respond to pages from phones on cellular networks. **Certificate errors block incident response.**

**ACM (AWS Certificate Manager)** provides free TLS certificates for \`api.pulsegrid.example.com\`. Attach to ALB listener on port 443. HTTP (80) redirects to HTTPS.

Internal east-west traffic (API → gRPC notification) may use mTLS in high-security environments. For PulseGrid MVP, TLS at ALB edge is sufficient.

Certificate renewal is automatic via ACM — no midnight expiry incidents.`,
    },
    {
      title: 'DNS and Health Checks',
      content: `**Route53** alias record: \`api.pulsegrid.example.com\` → ALB DNS name.

Configure Route53 health checks on \`/health\` endpoint. If all targets unhealthy, DNS can failover to secondary region (advanced) or at minimum alert on-call.

ALB target group health checks use \`/ready\` — only routes traffic to pods that can reach PostgreSQL and Redis.

TTL considerations: low TTL (60s) enables faster failover; higher TTL (300s) reduces DNS query load.`,
    },
    {
      title: 'Network Debugging Runbook',
      content: `When "it works locally" fails in AWS, SREs use systematic debugging:

\`\`\`bash
# TLS handshake and certificate chain
curl -v https://api.pulsegrid.example.com/health

# DNS resolution
dig api.pulsegrid.example.com
nslookup api.pulsegrid.example.com

# Is the process listening?
ss -tlnp | grep 8000

# Connectivity from API pod to RDS
nc -zv postgres.internal 5432

# Packet capture (last resort)
tcpdump -i eth0 port 5432 -w db.pcap
\`\`\`

Document these in \`docs/runbooks/network-debugging.md\`. During outages, structured runbooks beat improvisation.`,
    },
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
    {
      title: 'Kubernetes Deployment Manifests',
      content: `K8s **Deployment** manages pod lifecycle — rolling updates, rollbacks, replica count.

PulseGrid API deployment essentials:
- \`replicas: 2\` minimum for availability
- \`strategy.rollingUpdate.maxUnavailable: 0\` — zero downtime deploys
- \`resources.requests\` and \`limits\` — CPU/memory bounds prevent noisy neighbor
- \`livenessProbe\` on \`/health\`, \`readinessProbe\` on \`/ready\`

**Service** (ClusterIP) provides stable internal DNS: \`pulsegrid-api.default.svc.cluster.local\`.

**Ingress** exposes HTTPS externally with TLS cert (cert-manager + Let's Encrypt).

**HPA** scales replicas on CPU: min 2, max 10, target 70% utilization.`,
    },
    {
      title: 'Liveness vs Readiness Probes',
      content: `Misconfigured probes cause cascading failures.

**Liveness probe** — "should K8s restart this pod?"
- Check: \`/health\` (process alive only)
- Failure action: **restart container**
- Use when: deadlocked process, infinite loop

**Readiness probe** — "should this pod receive traffic?"
- Check: \`/ready\` (PostgreSQL + Redis reachable)
- Failure action: **remove from Service endpoints**
- Use when: startup (DB connecting), dependency blip

**Never** put database checks on liveness — transient RDS failover would restart ALL pods simultaneously, causing thundering herd on database recovery.`,
    },
    {
      title: 'Security Middleware and OWASP',
      content: `PulseGrid handles sensitive on-call data and accepts public webhooks. Harden the API:

**Rate limiting:** 120 requests/minute per IP on webhook endpoints — prevents abuse and DDoS.

**Security headers:**
- \`Content-Security-Policy\` — restrict script sources
- \`X-Frame-Options: DENY\` — prevent clickjacking
- \`X-Content-Type-Options: nosniff\`

**CORS:** whitelist dashboard origins only — never \`*\` with credentials.

**SQL injection:** parameterized queries via SQLAlchemy — never string concatenation.

**Auth:** JWT validation on every protected route; webhook HMAC signatures for external sources.`,
    },
    {
      title: 'Testing Pyramid and E2E',
      content: `PulseGrid test strategy:

| Layer | Count | Speed | Example |
|-------|-------|-------|---------|
| Unit | Many | <1s | test_models, test_dedup |
| Integration | Some | 1-10s | TestClient API tests |
| E2E | Few | 10-60s | webhook → incident → acknowledge |

\`test_weeks_10_24.py\` covers full flow: ingest alert, verify incident, acknowledge, check timeline, AI summary.

E2E tests run in CI against docker-compose stack. Flaky E2E erodes trust — use healthcheck waits and deterministic test data.`,
    },
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
    {
      title: 'Capacity Planning — Back-of-Envelope Math',
      content: `Black Friday multiplies alert volume 50x. Before scaling infrastructure, **estimate**:

\`\`\`
10,000 alerts/minute ÷ 60 = ~167 alerts/second sustained

API pod throughput: ~50 webhook req/s (I/O bound, async)
→ Need 4 API pods (with 2x headroom)

Worker pod throughput: ~25 alerts/s (DB writes, dedup, notify)
→ Need 8 worker pods

PostgreSQL: 167 INSERT/s + dashboard reads
→ Connection pool: 10 per pod × 12 pods = 120 connections
→ Ensure max_connections > 150, consider PgBouncer

Redis: dedup keys + cache — ~10k active keys × 200 bytes = 2MB (trivial)
\`\`\`

Document assumptions in \`docs/design/scale-10k-apm.md\`. Interviewers want numbers, not "we'll scale horizontally."`,
    },
    {
      title: 'Horizontal Scaling Architecture',
      content: `Scale **stateless** components horizontally:

**API pods:** behind ALB, any pod handles any webhook. No sticky sessions needed.

**Worker pods:** share Redis dedup and Kafka consumer group. Each alert processed exactly once via partition assignment.

**What does NOT scale horizontally without changes:**
- In-memory dedup (Week 4) → Redis (Week 8)
- Single PostgreSQL writer → read replicas for dashboard (Week 20)
- Monolithic notification → gRPC microservice (Week 10)

Identify stateful bottlenecks before adding pods — more workers with broken dedup creates more duplicate incidents.`,
    },
    {
      title: 'Circuit Breaker Pattern',
      content: `When PagerDuty API is down, retrying every page request amplifies the outage. **Circuit breaker** fails fast:

States:
- **CLOSED** — normal operation, track failures
- **OPEN** — after 5 failures, reject calls immediately for 30s
- **HALF_OPEN** — allow one test request, close on success

\`\`\`python
if not breaker.allow_request():
    logger.warning("Notification circuit open — skipping page")
    return  # incident still created, paging degraded
\`\`\`

Critical: **incident creation must not depend on notification success**. Page failure is logged; engineer sees incident in dashboard.`,
    },
    {
      title: 'Load Shedding Under Overload',
      content: `When queue depth exceeds 800, the system is overloaded. **Load shedding** drops low-priority work:

\`\`\`python
def should_shed_alert(alert: Alert, queue_depth: int) -> bool:
    if queue_depth < 800:
        return False
    return alert.severity == Severity.P4  # NEVER shed P1-P3
\`\`\`

P4 alerts (informational log rotation warnings) can wait. P1 payment outages cannot.

Return 503 with \`Retry-After\` for shed webhooks so senders back off. Monitor shed rate — sustained shedding means need more workers, not higher threshold.`,
    },
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
    {
      title: 'Append-Only Timeline Events',
      content: `Executives ask: "When did we know about the outage?" and "Who acknowledged it?" An **append-only timeline** answers both with legal-grade audit trail.

Every state change emits a \`DomainEvent\`:
- \`incident.created\` — from first alert
- \`incident.acknowledged\` — who, when
- \`incident.resolved\` — who, when
- \`comment.added\` — engineer notes during investigation

**Never UPDATE timeline rows.** If you need to correct a mistake, append a \`comment.corrected\` event. Mutable audit logs destroy trust in postmortems and compliance reviews.

\`GET /incidents/{id}/timeline\` returns chronological event list for dashboard and postmortem generation.`,
    },
    {
      title: 'Public Status Page Aggregation',
      content: `External customers check \`status.company.com\` — not your internal dashboard. Status logic per service:

| Condition | Status |
|-----------|--------|
| No active incidents | operational (green) |
| Active P3 only | degraded (yellow) |
| Active P1 or P2 | outage (red) |

Next.js ISR (\`revalidate=60\`) caches status page HTML. API endpoint \`GET /status/{team}\` returns JSON for programmatic consumers.

During major outages, status page traffic spikes 100x — CDN + ISR handles load without hammering PostgreSQL.`,
    },
    {
      title: 'Notification Fan-Out',
      content: `One P1 incident triggers multiple channels simultaneously:

\`\`\`python
async def fan_out(incident: Incident) -> None:
    results = await asyncio.gather(
        slack.send(incident),
        email.send(incident),
        pagerduty.page(incident),
        return_exceptions=True,
    )
    for r in results:
        if isinstance(r, Exception):
            logger.warning("Notification channel failed: %s", r)
\`\`\`

**Non-blocking:** Slack failure does not prevent PagerDuty page. Incident is already created — notifications are best-effort side effects.

Use circuit breaker (Week 17) on each channel. Parallel \`gather\` minimizes total notification latency.`,
    },
    {
      title: 'Automated Postmortem Generation',
      content: `Blameless postmortems capture learning. PulseGrid auto-generates a **starting template**:

- Incident title, service, severity
- MTTR: \`resolved_at - created_at\`
- Timeline bullets from append-only events
- Correlated services from graph
- Placeholder action items

\`GET /incidents/{id}/postmortem.md\` returns markdown. Engineer edits in the postmortem meeting — template saves 30 minutes of copy-paste from Slack.

Postmortem culture: focus on **systems and process**, not individual blame. "Why did dedup fail?" not "Who deployed the bug?"`,
    },
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
    {
      title: 'Why Event-Driven Architecture',
      content: `Monolith workers scale with API — wasteful when search indexing lags but ingestion is fine. **Event-driven architecture** decouples producers from consumers:

- Incident service publishes \`incident.created\` event
- Notification consumer pages on-call (independent scale)
- Search indexer updates Elasticsearch (independent scale)
- Analytics consumer writes to data warehouse (batch, slow)

Loose coupling means each consumer scales, deploys, and fails independently. Incident creation never waits for search index update.

Trade-off: **distributed complexity** — ordering, idempotency, monitoring across services. Justified when scale or team boundaries demand it (Week 19 extraction point).`,
    },
    {
      title: 'Outbox Pattern — Reliable Publishing',
      content: `The dual-write problem: API commits incident to PostgreSQL, then crashes before publishing to Kafka. Event is **lost forever**.

**Outbox pattern** solves this atomically:

1. BEGIN transaction
2. INSERT incident
3. INSERT outbox row with serialized event
4. COMMIT
5. Separate **publisher process** polls outbox, publishes to Kafka, marks row published

If crash happens after COMMIT but before publish, publisher retries. If publish succeeds but mark fails, publisher retries (idempotent consumer handles duplicate).

Same database transaction guarantees **no lost events** and **no inconsistent state**.`,
    },
    {
      title: 'Kafka Consumer Groups',
      content: `Kafka topics partition data for parallelism. **Consumer group** ensures each message processed exactly once per group:

- Topic \`alerts.raw\` with 8 partitions
- Consumer group \`incident-processors\` with 8 workers
- Each worker owns 1 partition — no duplicate processing within group

Scale workers → Kafka rebalances partitions. Add partitions before adding consumers beyond partition count.

**At-least-once delivery** is Kafka default. Consumers must be **idempotent** — processing same \`incident.created\` twice must not create duplicate side effects. Use \`incident_id\` as idempotency key in consumers.`,
    },
    {
      title: 'In-Memory Event Bus for Local Dev',
      content: `Running Kafka locally adds complexity (Zookeeper, Redpanda config). PulseGrid abstracts the event bus:

\`\`\`python
if settings.use_kafka:
    bus = KafkaEventBus(bootstrap=settings.kafka_bootstrap)
else:
    bus = InMemoryEventBus()  # same interface, sync dispatch
\`\`\`

Developers run \`docker compose up\` without Kafka for unit work. Integration tests use InMemoryEventBus. Staging/prod set \`PULSEGRID_USE_KAFKA=true\`.

**Interface segregation** — processor code never imports Kafka directly. Swap implementations without changing business logic.`,
    },
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
    {
      title: 'Measure Before Optimizing',
      content: `"Premature optimization is the root of all evil." Dashboard p99 of 4 seconds during outages wastes critical minutes — but guessing which query is slow wastes engineering time.

**Profiling tools:**
- \`py-spy record -o profile.svg\` — CPU flame graph of worker process
- \`EXPLAIN ANALYZE\` on PostgreSQL — query plan with actual timings
- \`X-Response-Time-Ms\` header on every API response — aggregate in logs

**Load test baseline** before any optimization:
\`\`\`bash
python scripts/load_test.py --rate 167 --duration 600
\`\`\`

Document p50, p95, p99. Optimize the slowest 1% (tail latency) — that's what engineers feel during incidents.`,
    },
    {
      title: 'Query Optimization and N+1',
      content: `Common PulseGrid performance bugs:

**Missing index:** \`WHERE service_id = ? AND status = ?\` without composite index → Seq Scan on 500k rows.

**N+1 queries:** Loading 50 incidents, then one timeline query per incident = 51 queries. Fix with batch:
\`\`\`python
timelines = db.query(Timeline).filter(Timeline.incident_id.in_(ids)).all()
by_incident = defaultdict(list)
for t in timelines:
    by_incident[t.incident_id].append(t)
\`\`\`

**Eager loading:** SQLAlchemy \`selectinload(Incident.timeline)\` fetches related data in one round trip.

Run \`EXPLAIN ANALYZE\` after every schema change. Index Scan should appear on filter columns.`,
    },
    {
      title: 'Connection Pooling with PgBouncer',
      content: `Each API pod opens 10 database connections. 12 pods = 120 connections. PostgreSQL default \`max_connections=100\` — connection refused errors during scale-up.

**PgBouncer** multiplexes thousands of client connections to dozens of server connections:

\`\`\`
pool_size = (max_connections - overhead) / pod_count
Example: (100 - 20) / 8 pods = 10 per pod
\`\`\`

Settings:
- \`pool_pre_ping=True\` — detect stale connections after RDS failover
- \`pool_recycle=3600\` — refresh connections hourly

Rule: \`pool_size × pods < postgres max_connections\`. Monitor \`pg_stat_activity\` during load tests.`,
    },
    {
      title: 'SLO Dashboards and Load Testing',
      content: `Define **Service Level Objectives** before shipping:

| Metric | SLO Target |
|--------|------------|
| Webhook acceptance p99 | < 50ms |
| API list incidents p99 | < 500ms |
| Worker processing lag | < 5s at p99 |

Grafana panels track p50/p95/p99 over time. Green during load test = ship. Red = investigate before production traffic.

Re-run load test after every optimization — prove improvement with data, not intuition. Regression tests in CI catch performance cliffs.`,
    },
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
    {
      title: 'Structuring the Summarization Prompt',
      content: `LLMs hallucinate when given vague prompts. PulseGrid builds **structured, factual** prompts from verifiable data only:

\`\`\`
Incident: {title} ({severity})
Service: {service_id}
Status: {status}
Correlated services: {correlated_services}
Timeline:
  - {timestamp}: {event_message}
  ...

Summarize: what happened, customer impact, suggested next steps.
Only use facts from the data above. Do not speculate on root cause.
\`\`\`

Exclude: unrelated runbooks, engineer names, speculative causes not in timeline.

**Faithfulness** — summary must not claim "database failure" unless timeline or correlated services support it. Measure in evals with human review or LLM-as-judge.`,
    },
    {
      title: 'Caching and Cost Control',
      content: `GPT-4 summarization costs ~$0.01–0.05 per incident. Dashboard with 50 engineers refreshing = cost explosion.

**Cache summary per incident_id** in Redis with TTL until incident resolves. Regenerate only on:
- First view
- Status change (new timeline events)
- Manual "regenerate" button

Track metrics: tokens per incident, cache hit rate, p99 summarization latency.

Budget alert: >$100/day on OpenAI → investigate cache miss storm or abuse.`,
    },
    {
      title: 'SSE Streaming for Progressive UX',
      content: `Waiting 10 seconds for blank screen feels broken. **Server-Sent Events** stream tokens as they generate:

\`\`\`python
async def summarize_stream(incident_id: str):
    async for chunk in llm.stream(prompt):
        yield f"data: {json.dumps({'chunk': chunk})}\\n\\n"
\`\`\`

Dashboard renders chunks incrementally — engineer reads summary as it types out. Perceived latency drops even if total time is identical.

Fallback: if streaming fails mid-response, show partial summary + "regenerate" button. Never block incident actions on stream completion.`,
    },
    {
      title: 'Production Fallback Without LLM',
      content: `OpenAI outages happen. \`OPENAI_API_KEY\` unset in dev. Production AI must **degrade gracefully**:

\`\`\`python
def summarize(incident_id: str) -> str:
    try:
        return await llm_summarize(incident_id, timeout=10)
    except (TimeoutError, APIError):
        return mock_summary(incident)  # template from incident fields
\`\`\`

Mock summary uses incident title, severity, service, alert count — no hallucination, no API call. Engineer still gets actionable text.

**Rule:** LLM timeout must NEVER block incident creation, paging, or acknowledge flows.`,
    },
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
    {
      title: 'Runbook Chunking and Ingestion',
      content: `Runbooks live scattered: Confluence, GitHub markdown, engineers' heads. **RAG** retrieves relevant procedures at incident time.

PulseGrid ingests \`docs/runbooks/*.md\`:
- One file per topic: \`redis-failover.md\`, \`postgres-connection-pool.md\`
- Chunk by file (or split large files at heading boundaries)
- Metadata: title, source path, last modified

\`\`\`python
for md_file in path.glob("**/*.md"):
    chunk = RunbookChunk(
        id=md_file.stem,
        title=md_file.stem.replace("-", " ").title(),
        content=md_file.read_text(),
        source_file=str(md_file),
    )
\`\`\`

Chunk size trade-off: too large → irrelevant text dilutes retrieval. Too small → loses context. One markdown file per procedure is a good starting point.`,
    },
    {
      title: 'TF-IDF Retrieval (Dev) and Embeddings (Prod)',
      content: `**Development without API keys:** TF-IDF cosine similarity

Query = \`incident.title + service_id + correlated_services\`
Score each chunk by term frequency × inverse document frequency
Return top 3 by score

**Production:** OpenAI embeddings + pgvector
- Embed all chunks at ingest time (cache embeddings)
- Embed query at search time
- Cosine similarity in vector space — catches paraphrases TF-IDF misses

**Hybrid search** combines BM25 (exact error codes like \`ECONNREFUSED\`) with vector semantic search. Best of both worlds.`,
    },
    {
      title: 'Suggest Runbooks on Incident Create',
      content: `After worker creates incident, call:

\`\`\`python
suggestions = runbook_index.suggest_for_incident(incident, top_k=3)
incident.suggested_runbooks = [c.title for c in suggestions]
\`\`\`

Dashboard shows "Suggested Runbooks" panel — engineer clicks to open full markdown. Saves 5–10 minutes searching Confluence during P1.

Suggestions are **read-only retrieval** — not generated text. Reduces hallucination risk compared to pure LLM answers.`,
    },
    {
      title: 'Eval Pipeline — recall@3 in CI',
      content: `RAG quality drifts silently without measurement. **Eval gate** in CI:

\`\`\`python
QUERIES = [
    ("redis connection refused", "redis-failover"),
    ("postgres pool exhausted", "postgres-connection-pool"),
    ("payment errors after deploy", "payment-api-rollback"),
]

def recall_at_k(index, queries, k=3) -> float:
    hits = sum(1 for q, expected in queries
               if expected in [r.id for r in index.search(q, k)])
    return hits / len(queries)

assert recall_at_k(index, QUERIES) >= 0.85  # block merge on regression
\`\`\`

Run \`python scripts/eval_rag.py\` in GitHub Actions. PulseGrid achieves recall@3 = 1.00 with 3 test queries.`,
    },
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
    {
      title: 'Tool Design for Incident Investigation',
      content: `AI agents need **well-defined tools** with typed inputs and clear outputs. PulseGrid agent tools:

| Tool | Input | Output | Safety |
|------|-------|--------|--------|
| search_incidents | query string | list of matching incidents | read-only |
| get_service_health | service_id | status, blast radius | read-only |
| search_runbooks | query | top 3 runbook snippets | read-only |
| get_on_call | team_id | current on-call engineer | read-only |

**Not in autonomous loop:** \`resolve_incident\`, \`send_page\`, \`delete_incident\` — require human approval.

Each tool returns structured text the LLM can reason about. Vague tools ("do_something") produce unreliable agent behavior.`,
    },
    {
      title: 'ReAct Loop — Reason and Act',
      content: `**ReAct** alternates reasoning and tool execution:

1. **Thought:** "User asks about payment-api P1. I should search active incidents."
2. **Action:** \`search_incidents("payment-api")\`
3. **Observation:** "2 active P1 incidents found"
4. **Thought:** "Check upstream health for root cause"
5. **Action:** \`get_service_health("postgres-primary")\`
6. **Observation:** "postgres degraded, blast radius includes payment-api"
7. **Final answer:** "Recommend checking postgres connections, runbook: postgres-connection-pool"

Max **10 steps** and cost cap prevent runaway loops. Each step logged in \`AgentTrace\` for debugging and compliance.`,
    },
    {
      title: 'Human-in-the-Loop Safety',
      content: `Agents that can page on-call or resolve incidents without approval cause real harm:

- False positive page at 3 AM → engineer fatigue
- Premature resolve → missed ongoing outage
- Wrong runbook execution → extended downtime

PulseGrid agent **recommends** actions in final answer. Engineer executes acknowledge, resolve, and paging manually.

Future: "Approve suggested action" button that requires explicit click before mutation. Log approval in timeline audit.

This mirrors how senior engineers work — investigate autonomously, act deliberately.`,
    },
    {
      title: 'Audit Trace for Compliance',
      content: `\`AgentTrace\` stores every step:

\`\`\`json
{
  "query": "What should I do about payment-api P1?",
  "steps": [
    {"thought": "...", "action": "search_incidents", "observation": "..."},
    {"thought": "...", "action": "get_service_health", "observation": "..."}
  ],
  "final_answer": "..."
}
\`\`\`

Use cases:
- Debug hallucinations ("why did agent suggest wrong runbook?")
- Postmortem appendix ("AI suggested X, engineer chose Y")
- Compliance audit ("what did automated system recommend?")

Retain traces 90 days minimum. Never log PII or credentials in trace payloads.`,
    },
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
    {
      title: 'Production AI Safety Checklist',
      content: `Before launching AI features to production, verify:

- [ ] Mock summary fallback when \`OPENAI_API_KEY\` unset or API down
- [ ] LLM calls timeout after 10s — never block incident path
- [ ] Cache summaries and embeddings — monitor token cost daily
- [ ] RAG eval gate in CI: recall@3 >= 0.85
- [ ] Agent cannot resolve, page, or delete without human approval
- [ ] Full audit trace retained for agent queries
- [ ] Dashboard shows "AI-generated" disclaimer on summaries

AI failures must degrade to **non-AI experience** — incidents still create, page, and resolve normally.`,
    },
    {
      title: '5-Minute Demo Script',
      content: `Interview and stakeholder demos follow a tight narrative:

1. **Health check** — system is up
2. **Login** — JWT auth works
3. **Ingest P1 alert** — webhook → incident in <2s
4. **Dashboard** — incident appears with severity badge
5. **AI summary** — streamed or cached
6. **Runbook suggestions** — top 3 from RAG
7. **Agent query** — "What should I do?" with trace
8. **Acknowledge + resolve** — state machine transitions
9. **Postmortem** — auto-generated markdown

Practice timing: 5 minutes total, 30 seconds per step. Have fallback if OpenAI is down — mock summary still impresses.`,
    },
    {
      title: 'Interview Stories — STAR Format',
      content: `"Tell me about a production incident" — answer with PulseGrid:

**Situation:** Load test revealed dedup index memory leak — 100k keys after 1 hour.
**Task:** Fix before launch without breaking multi-pod dedup consistency.
**Action:** Migrated dedup to Redis sorted sets with TTL eviction; added load test to CI; documented in ADR.
**Result:** 100k alerts processed, zero duplicates, recall@3=1.00, MTTR dashboard green.

Also prepare **trade-off narratives:**
- Why monolith-first? (speed, shared models, extract at Week 10/19)
- Why shed P4 only? (protect P1-P3 under overload)
- Why outbox pattern? (no lost events on crash after DB commit)

Interviewers reward **judgment**, not just implementation.`,
    },
    {
      title: 'Scale Whiteboard — 1M Events/Day',
      content: `Capstone interview question: "Scale PulseGrid to 1 million events per day."

\`\`\`
1M/day ≈ 12 events/sec average, ~120/sec peak (10x burst)

Architecture changes from 10k/min design:
- Kafka: 12+ partitions, 3 consumer groups (ingest, notify, search)
- PostgreSQL: read replica for dashboard; writer for ingestion only
- Redis Cluster: dedup and cache at 8+ worker pods
- CDN: ISR status pages at edge (CloudFront)
- Regional failover: active-passive in second AZ
- Object storage: raw alert payloads in S3 (not PostgreSQL)
\`\`\`

Connect to Week 17 capacity math. Draw diagram: webhook → Kafka → workers → PostgreSQL + Redis → dashboards. Label bottlenecks and scaling levers.`,
    },
  ],
  example: { title: 'Demo Command', language: 'bash', code: 'curl -X POST .../webhooks/alerts/sync -d \'{"severity":"p1",...}\'', explanation: 'Start demo with live ingestion.' },
  pitfalls: ['Demo without fallback if OpenAI down', 'Only showing code — explain trade-offs'],
  summary: ['AI production safety', 'Demo script', 'Interview narratives', 'Scale design'],
  reviewQuestions: [{ q: 'Why eval gate in CI?', hint: 'prevent RAG regression' }],
});

export function getCapstoneTextbookLesson(stepId: string): string | undefined {
  return pulsegridTextbookLessons[stepId];
}
