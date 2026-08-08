/**
 * Full implementation content embedded in the website — code, configs, and commands
 * displayed inline on the capstone page (not just file path references).
 */

export const capstoneEmbeddedWalkthrough: Record<string, string> = {
  'step-01-architecture': `
## Implementation Walkthrough

### Architecture Decision Record #001 — Monolith First

**Context:** PulseGrid spans ingestion, processing, storage, notifications, search, and AI. We need an architecture that supports learning all layers without premature microservice complexity.

**Decision:** Start with a **modular monolith** — single Python package with clear module boundaries (\`api/\`, \`worker/\`, \`core/\`, \`models/\`), one API process + one worker process.

**Consequences:**
- Faster iteration during weeks 1–9
- Shared domain models without distributed transactions
- Extraction points: notification gRPC (Week 10), Kafka (Week 19)

### Domain Model — Entity Relationships

| Entity | Description | Key fields |
|--------|-------------|------------|
| **Service** | Monitored system (payment-api) | name, team_id, tier |
| **Alert** | Raw monitoring signal | service_id, title, severity, source |
| **Incident** | Actionable grouped outage | status, dedup_key, alert_count |
| **User** | On-call engineer | role: viewer / responder / admin |
| **Runbook** | Resolution procedure | markdown content for RAG |

**Alert → Incident lifecycle:**
\`\`\`
Webhook → validate → enqueue (202) → worker deduplicates
  → create/update Incident → correlate services → notify on-call
  → timeline event → (later) AI summary + runbook suggestions
\`\`\`

### PulseGrid System Diagram

\`\`\`
[Prometheus/Datadog] ──POST /webhooks/alerts──▶ [FastAPI API]
         │                                         │
         │ 202 Accepted                            ▼
         │                              [Priority Queue heap]
         │                                         │
         │                                         ▼
         │                              [Worker Pool + Dedup]
         │                                    │    │    │
         ▼                                    ▼    ▼    ▼
   Retry with                          [Postgres][Redis][Service Graph]
   Idempotency-Key                          │              │
                                            ▼              ▼
                                      [Timeline]    [Root cause BFS]
                                            │
                                            ▼
                                    [React Dashboard + AI]
\`\`\`
`,

  'step-02-python-foundation': `
## Implementation Walkthrough

### Domain Models — Full Code

The heart of PulseGrid is strongly-typed domain objects. Every alert and incident passes through these models:

\`\`\`python
from enum import StrEnum
from datetime import UTC, datetime
from pydantic import BaseModel, Field

class Severity(StrEnum):
    P1 = "p1"  # critical — page immediately
    P2 = "p2"
    P3 = "p3"
    P4 = "p4"  # informational only

    @property
    def priority(self) -> int:
        return {"p1": 0, "p2": 1, "p3": 2, "p4": 3}[self.value]

class IncidentStatus(StrEnum):
    TRIGGERED = "triggered"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"

class Alert(BaseModel):
    service_id: str
    title: str = Field(min_length=1)
    severity: Severity
    source: str

    @property
    def dedup_key(self) -> str:
        return f"{self.service_id}:{self.title}"

class Incident(BaseModel):
    service_id: str
    title: str
    severity: Severity
    status: IncidentStatus = IncidentStatus.TRIGGERED
    dedup_key: str
    alert_count: int = 1

    def acknowledge(self) -> None:
        if not self.status.can_transition_to(IncidentStatus.ACKNOWLEDGED):
            raise ValueError("Invalid transition")
        self.status = IncidentStatus.ACKNOWLEDGED

    def resolve(self) -> None:
        if self.status == IncidentStatus.TRIGGERED:
            self.acknowledge()
        self.transition_to(IncidentStatus.RESOLVED)
\`\`\`

### Why This Matters

- **Pydantic** rejects invalid webhooks before they enter the pipeline (\`422 Unprocessable\`)
- **State machine** on \`Incident\` prevents illegal transitions (cannot resolve twice)
- **dedup_key** property centralizes deduplication logic — one place, not scattered in handlers

### Verify With Tests

\`\`\`bash
cd pulsegrid
pip install -e ".[dev]"
pytest tests/unit/test_models.py -v
\`\`\`

Expected: tests for valid alert, rejected blank title, acknowledge flow, resolve flow, invalid severity.
`,

  'step-03-async-ingestion': `
## Implementation Walkthrough

### Async Queue — Full Implementation

\`\`\`python
import asyncio
from dataclasses import dataclass, field
from pulsegrid.models import Alert

@dataclass
class AlertQueue:
    maxsize: int = 1000
    _queue: asyncio.Queue[Alert] = field(init=False)

    def __post_init__(self) -> None:
        self._queue = asyncio.Queue(maxsize=self.maxsize)

    @property
    def utilization(self) -> float:
        return self._queue.qsize() / self.maxsize

    @property
    def is_near_capacity(self) -> bool:
        return self.utilization >= 0.9

    async def enqueue(self, alert: Alert) -> bool:
        try:
            self._queue.put_nowait(alert)
            return True
        except asyncio.QueueFull:
            return False
\`\`\`

### Webhook Handler — Returns 202 Before Processing

\`\`\`python
@router.post("/webhooks/alerts", status_code=202)
async def ingest_alert(payload: dict, state: StateDep):
    if state.queue.is_near_capacity:
        raise HTTPException(
            status_code=503,
            detail="Alert queue near capacity",
            headers={"Retry-After": "5"},
        )
    alert = AlertParserFactory.parse(payload.get("source", "custom"), payload)
    if not await state.queue.enqueue(alert):
        raise HTTPException(503, headers={"Retry-After": "10"})
    return {"status": "accepted", "alert_id": alert.id}
\`\`\`

### Test It Live

\`\`\`bash
# Start API
uvicorn pulsegrid.api.main:app --reload

# Send alert — notice instant 202 response
curl -X POST http://localhost:8000/webhooks/alerts \\
  -H "Content-Type: application/json" \\
  -d '{"service_id":"payment-api","title":"High CPU","severity":"p1","source":"custom"}'
\`\`\`

**Expected response (in <50ms):**
\`\`\`json
{"status": "accepted", "alert_id": "uuid-here"}
\`\`\`
`,

  'step-04-worker-pools': `
## Implementation Walkthrough

### Worker Pool with Semaphore

\`\`\`python
class WorkerPool:
    def __init__(self, worker_count: int = 4):
        self._semaphore = asyncio.Semaphore(worker_count)

    async def start(self, dequeue, handler):
        async def worker():
            while True:
                item = await dequeue()
                async with self._semaphore:
                    await handler(item)

        self._tasks = [asyncio.create_task(worker()) for _ in range(self.worker_count)]
\`\`\`

The semaphore ensures **at most 4 alerts process concurrently** — protecting PostgreSQL connection pool from exhaustion.

### Deduplication Strategy

\`\`\`python
class WindowDeduplicationStrategy:
    window_seconds = 300.0  # 5 minutes

    def is_duplicate(self, alert, store: dict[str, float]) -> bool:
        key = alert.dedup_key
        if key not in store:
            return False
        return (time.time() - store[key]) < self.window_seconds

    def record(self, alert, store):
        store[alert.dedup_key] = time.time()
\`\`\`

### Prometheus Parser Factory

\`\`\`python
class AlertParserFactory:
    @classmethod
    def parse(cls, source: str, payload: dict) -> Alert:
        parser = cls._parsers.get(source, CustomAlertParser())
        return parser.parse(payload)

# Prometheus payload example:
{
  "alerts": [{
    "labels": {"service": "payment-api", "severity": "p1"},
    "annotations": {"summary": "High error rate on payments"}
  }]
}
\`\`\`

### Integration Test Scenario

Send 100 identical alerts → expect **1 incident** with \`alert_count=100\`, not 100 separate incidents.
`,

  'step-05-dsa-dedup': `
## Implementation Walkthrough

### Priority Queue with heapq

\`\`\`python
import heapq

@dataclass(order=True)
class _PrioritizedAlert:
    priority: int      # P1=0, P4=3 — lower pops first
    sequence: int      # FIFO tie-breaker
    alert: Alert = field(compare=False)

class PriorityAlertQueue:
    async def enqueue(self, alert: Alert) -> bool:
        heapq.heappush(self._heap, _PrioritizedAlert(
            priority=alert.severity.priority,
            sequence=self._sequence,
            alert=alert,
        ))
        self._sequence += 1
        return True
\`\`\`

**Why heap?** Push/pop O(log n). P1 alert always processes before P4 even if P4 arrived first.

### O(1) Dedup Index

\`\`\`python
class DedupIndex:
    _key_to_incident: dict[str, str] = {}

    def get_incident_id(self, alert: Alert) -> str | None:
        return self._key_to_incident.get(alert.dedup_key)

    def bind(self, alert: Alert, incident_id: str) -> None:
        self._key_to_incident[alert.dedup_key] = incident_id
\`\`\`

### Flapping Detector — Sliding Window

\`\`\`python
class FlappingDetector:
    threshold = 10
    window_seconds = 60.0

    def record(self, service_id: str) -> bool:
        # Keep timestamps in last 60s
        # Return True if count > threshold → suppress/escalate once
\`\`\`

### Complexity Summary

| Operation | Structure | Complexity |
|-----------|-----------|------------|
| Enqueue by priority | Min-heap | O(log n) |
| Dedup lookup | Hash map | O(1) avg |
| Flapping check | Sliding window list | O(k) k=alerts in window |
`,

  'step-06-service-graph': `
## Implementation Walkthrough

### Service Graph — Adjacency List

\`\`\`python
@dataclass
class ServiceGraph:
    _upstream: dict[str, set[str]] = field(default_factory=dict)
    _downstream: dict[str, set[str]] = field(default_factory=dict)

    def add_dependency(self, service_id: str, depends_on: str) -> None:
        """service_id depends on depends_on (upstream)"""
        self._upstream[service_id].add(depends_on)
        self._downstream[depends_on].add(service_id)
\`\`\`

### E-Commerce Seed Graph

\`\`\`
checkout-api → payment-api → postgres-primary
checkout-api → catalog-api → postgres-primary
checkout-api → catalog-api → redis-cache
payment-api → kafka-broker
cdn-edge → catalog-api
\`\`\`

### BFS Root Cause — Full Code

\`\`\`python
def find_upstream_root_causes(self, service_id: str) -> list[str]:
    queue = deque()
    for dep in self._upstream.get(service_id, set()):
        queue.append((dep, 1))
    roots = []
    while queue:
        current, depth = queue.popleft()
        upstream = self._upstream.get(current, set())
        if not upstream:
            roots.append(current)  # leaf = potential root cause
        else:
            for dep in upstream:
                queue.append((dep, depth + 1))
    return roots
\`\`\`

### API Endpoints

\`\`\`bash
# Root causes for checkout-api alert
curl -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/services/checkout-api/root-causes

# Blast radius if postgres-primary fails
curl -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/services/postgres-primary/impact
\`\`\`
`,

  'step-07-sql-schema': `
## Implementation Walkthrough

### Complete Incidents Schema

\`\`\`sql
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    severity VARCHAR(4) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'triggered',
    dedup_key TEXT UNIQUE,
    alert_count INTEGER DEFAULT 1,
    correlated_services TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_incidents_service_status ON incidents(service_id, status);
CREATE INDEX idx_incidents_severity_created ON incidents(severity, created_at DESC);
\`\`\`

### Timeline Audit Table (Migration 002)

\`\`\`sql
CREATE TABLE incident_timeline (
    id UUID PRIMARY KEY,
    incident_id UUID NOT NULL REFERENCES incidents(id),
    event_type VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_timeline_incident ON incident_timeline(incident_id);
\`\`\`

### MTTR Query — Window Functions

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

### Alembic Commands

\`\`\`bash
cd pulsegrid
alembic upgrade head          # apply all migrations
alembic revision -m "add_x"   # create new migration
alembic downgrade -1          # rollback one step
\`\`\`

### SQLAlchemy Model

\`\`\`python
class IncidentRow(Base):
    __tablename__ = "incidents"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    service_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(4), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="triggered")
    dedup_key: Mapped[str | None] = mapped_column(String(512), unique=True)
\`\`\`
`,

  'step-08-databases-redis': `
## Implementation Walkthrough

### Redis Cache-Aside — Full Implementation

\`\`\`python
class IncidentCache:
  async def get_or_load(self, team_id: str, loader) -> list[Incident]:
        # 1. Try cache
        cached = await self.get_active(team_id)
        if cached is not None:
            return cached  # cache HIT — <5ms

        # 2. Singleflight lock — prevent stampede
        async with self._lock_for(key):
            cached = await self.get_active(team_id)
            if cached is not None:
                return cached
            incidents = await loader()           # cache MISS — load DB
            await self.set_active(incidents, team_id, ttl=30)
            return incidents
\`\`\`

### Invalidation on Status Change

\`\`\`python
async def acknowledge_incident(self, incident_id: str) -> Incident:
    incident = self._incidents[incident_id]
    incident.acknowledge()
    await self.cache.invalidate(team_id="default")  # bust cache immediately
    return incident
\`\`\`

### Redis Dedup Sorted Set

\`\`\`python
class DedupRedisStore:
    async def is_duplicate(self, dedup_key: str) -> bool:
        await self.redis.zremrangebyscore(self._key, 0, now - 300)
        return await self.redis.zscore(self._key, dedup_key) is not None

    async def record(self, dedup_key: str) -> None:
        await self.redis.zadd(self._key, {dedup_key: time.time()})
\`\`\`

### docker-compose Redis Service

\`\`\`yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
\`\`\`

### Verify Cache

\`\`\`bash
redis-cli MONITOR   # watch cache keys being set/invalidated during API calls
\`\`\`
`,

  'step-09-fastapi-core': `
## Implementation Walkthrough

### FastAPI App Structure

\`\`\`python
def create_app() -> FastAPI:
    app = FastAPI(title="PulseGrid API", version="0.2.0")

    app.include_router(auth.router)       # POST /auth/login
    app.include_router(webhooks.router)   # public webhooks
    app.include_router(incidents.router)  # protected CRUD

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    @app.get("/ready")
    async def ready():
        # ping redis, return 503 if down
        return {"status": "ready", "checks": {"redis": "ok"}}
    return app
\`\`\`

### JWT Authentication

\`\`\`python
@router.post("/auth/login")
async def login(body: LoginRequest) -> TokenResponse:
    user = authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(401, "Invalid credentials")
    token = create_access_token(user)
    return TokenResponse(access_token=token)

# Protected endpoint
@router.get("/incidents")
async def list_incidents(user: User = Depends(get_current_user)):
    return processor.list_incidents()
\`\`\`

### RBAC — Role-Based Access

| Role | Permissions |
|------|-------------|
| viewer | Read incidents, services |
| responder | Acknowledge, resolve incidents |
| admin | All operations |

\`\`\`python
@router.post("/incidents/{id}/acknowledge")
async def ack(id: str, user: User = Depends(require_role(RESPONDER, ADMIN))):
    return await processor.acknowledge_incident(id)
\`\`\`

### Full Test Flow

\`\`\`bash
# Login
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin"}' | jq -r .access_token)

# Create incident via sync webhook
curl -X POST http://localhost:8000/webhooks/alerts/sync \\
  -H "Content-Type: application/json" \\
  -d '{"service_id":"api","title":"Test","severity":"p1","source":"custom"}'

# List incidents (requires auth)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/incidents

# OpenAPI docs
open http://localhost:8000/docs
\`\`\`
`,

  'step-10-api-protocols': `
## Implementation Walkthrough

### REST v1 — Cursor Pagination

Offset pagination breaks when rows are inserted during paging. Cursors use the last seen \`id\`:

\`\`\`python
@router.get("/v1/incidents", response_model=PaginatedIncidents)
async def list_incidents_v1(
    processor: ProcessorDep,
    cursor: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    severity: str | None = Query(None),
) -> PaginatedIncidents:
    items, next_cursor = processor.paginate(
        cursor=cursor, limit=limit, status=status, severity=severity
    )
    return PaginatedIncidents(items=items, next_cursor=next_cursor, count=len(items))
\`\`\`

\`\`\`bash
# Page through incidents
curl -H "Authorization: Bearer $TOKEN" \\
  "http://localhost:8000/v1/incidents?limit=20&severity=p1"

# Next page
curl -H "Authorization: Bearer $TOKEN" \\
  "http://localhost:8000/v1/incidents?cursor=<next_cursor>&limit=20"
\`\`\`

### Idempotency Keys — Webhook Retries

Monitoring systems retry failed webhooks. Same \`Idempotency-Key\` must return the same incident:

\`\`\`python
@dataclass
class IdempotencyStore:
    ttl_seconds: float = 86400.0  # 24 hours
    _keys: dict[str, tuple[str, float]] = field(default_factory=dict)

    def get(self, key: str) -> str | None:
        self._evict()
        entry = self._keys.get(key)
        return entry[0] if entry else None

    def set(self, key: str, incident_id: str) -> None:
        self._keys[key] = (incident_id, time.time())
\`\`\`

\`\`\`bash
curl -X POST http://localhost:8000/webhooks/alerts/sync \\
  -H "Idempotency-Key: prom-alert-abc123" \\
  -H "Content-Type: application/json" \\
  -d '{"service_id":"payment-api","title":"High error rate","severity":"p1","source":"custom"}'
# Replay same key → same incident_id, no duplicate
\`\`\`

### GraphQL — One Query for Incident + Timeline

\`\`\`python
@strawberry.type
class IncidentGQL:
    id: str
    title: str
    severity: str

    @strawberry.field
    def timeline(self, info: strawberry.Info) -> list[TimelineEventGQL]:
        state = info.context["state"]
        events = state.timeline.get_timeline(self.id)
        return [TimelineEventGQL(event_type=e.event_type.value, ...) for e in events]
\`\`\`

\`\`\`graphql
query ActiveIncidents {
  incidents(status: "triggered", severity: "p1") {
    id
    title
    serviceId
    alertCount
    timeline {
      eventType
      message
      createdAt
    }
  }
}
\`\`\`

Open the playground at \`http://localhost:8000/graphql\`.

### gRPC Notification Service

Internal paging uses binary protobuf over HTTP/2 — lower latency than REST JSON:

\`\`\`protobuf
service NotificationService {
  rpc SendPage(PageRequest) returns (PageResponse);
}

message PageRequest {
  string on_call_id = 1;
  string incident_id = 2;
  string title = 3;
  string severity = 4;
}
\`\`\`

\`\`\`python
class NotificationServicer:
    async def SendPage(self, request: PageRequest, context) -> PageResponse:
        await self.service.send_page(request.on_call_id, incident)
        return PageResponse(success=True, message="Page sent")
\`\`\`

Worker calls gRPC on port \`50051\` after incident creation — decoupled from API process.
`,

  'step-11-react-dashboard': `
## Implementation Walkthrough

### App Shell — React Query + WebSocket

\`\`\`tsx
export function App() {
  const queryClient = useQueryClient();
  const { data: incidents = [], isLoading } = useQuery({
    queryKey: ['incidents'],
    queryFn: fetchIncidents,
    refetchInterval: 30000,
  });

  useEffect(() => {
    const ws = connectWebSocket(() => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    });
    return () => ws.close();
  }, [queryClient]);

  return (
    <IncidentList
      incidents={incidents}
      onAcknowledge={(id) => acknowledgeIncident(id)}
      onResolve={(id) => resolveIncident(id)}
    />
  );
}
\`\`\`

**Why React Query?** Server state (incidents) is cached, deduplicated, and invalidated after mutations — not duplicated in \`useState\`.

### IncidentCard Component

\`\`\`tsx
function SeverityBadge({ severity }: { severity: string }) {
  const colors = { p1: '#dc2626', p2: '#ea580c', p3: '#ca8a04', p4: '#6b7280' };
  return (
    <span style={{ background: colors[severity], color: '#fff', padding: '2px 8px', borderRadius: 4 }}>
      {severity.toUpperCase()}
    </span>
  );
}

export function IncidentCard({ incident, onAcknowledge, onResolve }) {
  return (
    <article>
      <SeverityBadge severity={incident.severity} />
      <h3>{incident.title}</h3>
      <p>{incident.service_id} · {incident.alert_count} alerts</p>
      {incident.status === 'triggered' && (
        <button onClick={() => onAcknowledge(incident.id)}>Acknowledge</button>
      )}
      {incident.status !== 'resolved' && (
        <button onClick={() => onResolve(incident.id)}>Resolve</button>
      )}
    </article>
  );
}
\`\`\`

### Virtualized List — 500+ Incidents

\`\`\`tsx
import { FixedSizeList } from 'react-window';

export function IncidentList({ incidents, onAcknowledge, onResolve }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      <IncidentCard
        incident={incidents[index]}
        onAcknowledge={onAcknowledge}
        onResolve={onResolve}
      />
    </div>
  );

  return (
    <FixedSizeList height={600} itemCount={incidents.length} itemSize={120} width="100%">
      {Row}
    </FixedSizeList>
  );
}
\`\`\`

Only ~5 DOM nodes render at once regardless of list size.

### WebSocket Push Updates

\`\`\`python
# pulsegrid/api/routers/ws.py
@router.websocket("/ws/incidents")
async def incident_ws(websocket: WebSocket):
    await websocket.accept()
    while True:
        await websocket.receive_text()  # keepalive
        await websocket.send_json({"type": "incidents_updated"})
\`\`\`

\`\`\`bash
cd pulsegrid/dashboard && npm install && npm run dev
# Dashboard at http://localhost:5173 — create incident via API, UI updates <2s
\`\`\`
`,

  'step-12-nextjs-fullstack': `
## Implementation Walkthrough

### Server Component — SSR Incident List

\`\`\`tsx
// app/incidents/page.tsx
export default async function IncidentsPage() {
  const incidents = await getIncidents();  // fetch on server
  return (
    <main>
      <h1>Active Incidents</h1>
      <IncidentTable incidents={incidents} />
      <IncidentActions />  {/* Client Component for buttons */}
    </main>
  );
}
\`\`\`

First HTML paint includes incident data — no loading spinner on initial load.

### Public Status Page — ISR Every 60 Seconds

\`\`\`tsx
// app/status/[team]/page.tsx
export const revalidate = 60;

export default async function StatusPage({ params }: { params: { team: string } }) {
  const services = await getServiceHealth(params.team);
  return (
    <div>
      {services.map((s) => (
        <div key={s.id} className={s.status}>  {/* operational | degraded | outage */}
          <h2>{s.name}</h2>
          <p>{s.status}</p>
        </div>
      ))}
    </div>
  );
}
\`\`\`

Status aggregation logic on the API:

\`\`\`python
def service_status(service_id: str, incidents: list[Incident]) -> str:
    active = [i for i in incidents if i.service_id == service_id and i.status != "resolved"]
    if any(i.severity in ("p1", "p2") for i in active):
        return "outage"
    if any(i.severity == "p3" for i in active):
        return "degraded"
    return "operational"
\`\`\`

### Middleware — Protect Internal Routes

\`\`\`typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token');
  if (!token && request.nextUrl.pathname.startsWith('/incidents')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/incidents/:path*'] };
\`\`\`

### Server Action — Acknowledge with Auth

\`\`\`typescript
'use server';
export async function acknowledgeIncident(id: string) {
  const session = await getSession();
  if (!session) throw new Error('Unauthorized');
  await fetch(\`\${API_URL}/incidents/\${id}/acknowledge\`, {
    method: 'POST',
    headers: { Authorization: \`Bearer \${session.token}\` },
  });
}
\`\`\`

\`\`\`bash
cd pulsegrid/dashboard-next && npm run dev
# http://localhost:3000/incidents — SSR list
# http://localhost:3000/status/default — public status page
\`\`\`
`,

  'step-13-git-workflow': `
## Implementation Walkthrough

### Branch Protection Rules

Configure on GitHub → Settings → Branches → \`main\`:
- Require pull request before merging
- Require status checks: \`test\`, \`docker\`
- Require 1 approving review
- Block direct pushes

### Conventional Commits

\`\`\`text
feat(api): add cursor pagination to /v1/incidents
fix(worker): evict expired dedup keys to prevent memory leak
docs(runbook): add redis failover procedure
chore(ci): bump ruff to 0.4.0
\`\`\`

Format: \`type(scope): description\` — enables automated changelogs and semantic versioning.

### PR Template

\`\`\`markdown
## Summary
Brief description of what changed and why.

## Test Plan
- [ ] pytest passes locally
- [ ] Manual: curl webhook creates incident
- [ ] Dashboard acknowledge flow works

## Rollback Plan
Revert commit SHA or redeploy previous Docker tag \`pulsegrid-api:v0.1.0\`
\`\`\`

### CODEOWNERS

\`\`\`text
# .github/CODEOWNERS
/pulsegrid/pulsegrid/api/     @backend-team
/pulsegrid/dashboard/         @frontend-team
/pulsegrid/infra/             @platform-team
\`\`\`

### Hotfix Workflow

\`\`\`bash
git checkout -b hotfix/dedup-memory-leak v0.1.0
# fix bug, commit
git checkout main && git merge hotfix/dedup-memory-leak
git tag v0.1.1
git push origin main --tags
# Deploy v0.1.1 before merging feature branches
\`\`\`

### Feature Branch Flow

\`\`\`bash
git checkout -b feature/on-call-scheduling
git commit -m "feat(scheduler): add weekly on-call rotation"
git push -u origin feature/on-call-scheduling
# Open PR → CI green → 1 review → squash merge
\`\`\`
`,

  'step-14-docker-cicd': `
## Implementation Walkthrough

### Multi-Stage Dockerfile (API)

\`\`\`dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY pyproject.toml .
RUN pip install --no-cache-dir .

FROM python:3.12-slim AS runtime
RUN useradd -m -u 1000 pulsegrid
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12 /usr/local/lib/python3.12
COPY pulsegrid/ pulsegrid/
USER pulsegrid
EXPOSE 8000
HEALTHCHECK CMD curl -f http://localhost:8000/health || exit 1
CMD ["uvicorn", "pulsegrid.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

Builder stage installs deps; runtime copies only artifacts — image stays under 200MB.

### docker-compose — Full Local Stack

\`\`\`yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: pulsegrid
      POSTGRES_PASSWORD: pulsegrid
      POSTGRES_DB: pulsegrid
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pulsegrid"]

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]

  redpanda:
    image: redpandadata/redpanda:v24.2.4
    ports: ["19092:19092"]

  api:
    build:
      dockerfile: infra/docker/Dockerfile.api
    ports: ["8000:8000"]
    environment:
      PULSEGRID_DATABASE_URL: postgresql+asyncpg://pulsegrid:pulsegrid@postgres:5432/pulsegrid
      PULSEGRID_REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres: { condition: service_healthy }

  worker:
    build:
      dockerfile: infra/docker/Dockerfile.worker
    depends_on: [api]
\`\`\`

### GitHub Actions CI Pipeline

\`\`\`yaml
name: CI
on:
  pull_request:
    branches: [main]
    paths: ['pulsegrid/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.12' }
      - run: pip install -e ".[dev]"
      - run: ruff check pulsegrid tests
      - run: mypy pulsegrid --ignore-missing-imports
      - run: pytest -v --cov=pulsegrid
      - run: python scripts/eval_rag.py   # AI eval gate

  docker:
    needs: test
    steps:
      - run: docker build -f infra/docker/Dockerfile.api -t pulsegrid-api .
      - run: docker build -f infra/docker/Dockerfile.worker -t pulsegrid-worker .
\`\`\`

### Run Locally

\`\`\`bash
cd pulsegrid
docker compose up --build
curl http://localhost:8000/health
pytest -v
\`\`\`
`,

  'step-15-networking-cloud': `
## Implementation Walkthrough

### VPC Topology

\`\`\`
Internet
    │
    ▼
[Route53] api.pulsegrid.example.com
    │
    ▼
[ALB + ACM TLS]  ← public subnet
    │
    ├── [API pods]     ← private subnet
    ├── [Worker pods]  ← private subnet
    ├── [RDS Postgres] ← private subnet (no public IP)
    └── [ElastiCache Redis] ← private subnet
\`\`\`

### Terraform — VPC Module

\`\`\`hcl
module "vpc" {
  source = "./modules/vpc"

  cidr_block = "10.0.0.0/16"
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]
}

module "rds" {
  source = "./modules/rds"
  vpc_id             = module.vpc.vpc_id
  private_subnet_ids = module.vpc.private_subnet_ids
  allowed_security_groups = [module.api.security_group_id]
}
\`\`\`

### Security Groups — Least Privilege

\`\`\`text
sg-alb:     inbound 443 from 0.0.0.0/0
sg-api:     inbound 8000 from sg-alb only
sg-rds:     inbound 5432 from sg-api, sg-worker only
sg-redis:   inbound 6379 from sg-api, sg-worker only
\`\`\`

Never expose RDS on \`0.0.0.0/0\`.

### Network Debugging Runbook

\`\`\`bash
# TLS handshake
curl -v https://api.pulsegrid.example.com/health

# DNS resolution
dig api.pulsegrid.example.com

# Is the process listening?
ss -tlnp | grep 8000

# From API pod to RDS
nc -zv postgres.internal 5432

# Trace route to ALB
traceroute api.pulsegrid.example.com
\`\`\`

### Deploy with Terraform

\`\`\`bash
cd pulsegrid/infra/terraform
terraform init
terraform plan -var="environment=staging"
terraform apply
\`\`\`
`,

  'step-16-k8s-security': `
## Implementation Walkthrough

### Kubernetes API Deployment

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pulsegrid-api
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxUnavailable: 0, maxSurge: 1 }
  template:
    spec:
      containers:
        - name: api
          image: pulsegrid-api:latest
          ports: [{ containerPort: 8000 }]
          resources:
            requests: { cpu: "250m", memory: "256Mi" }
            limits:   { cpu: "500m", memory: "512Mi" }
          livenessProbe:
            httpGet: { path: /health, port: 8000 }
            initialDelaySeconds: 10
          readinessProbe:
            httpGet: { path: /ready, port: 8000 }
            initialDelaySeconds: 5
\`\`\`

### Horizontal Pod Autoscaler

\`\`\`yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: pulsegrid-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: pulsegrid-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
\`\`\`

### Rate Limiting Middleware

\`\`\`python
class RateLimitMiddleware:
    def __init__(self, app, max_requests: int = 120, window_seconds: int = 60):
        self.app = app
        self.max_requests = max_requests
        self._counts: dict[str, list[float]] = {}

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            client_ip = scope["client"][0]
            if not self._allow(client_ip):
                await send({"type": "http.response.start", "status": 429, ...})
                return
        await self.app(scope, receive, send)
\`\`\`

### Security Headers

\`\`\`python
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'self'",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
}
\`\`\`

### E2E Test Flow

\`\`\`python
def test_webhook_to_acknowledge(client, auth_token):
    # 1. Ingest alert
    r = client.post("/webhooks/alerts/sync", json={...})
    assert r.status_code == 200
    incident_id = r.json()["incident_id"]

    # 2. Acknowledge
    r = client.post(f"/incidents/{incident_id}/acknowledge",
                    headers={"Authorization": f"Bearer {auth_token}"})
    assert r.json()["status"] == "acknowledged"
\`\`\`

\`\`\`bash
kubectl apply -f pulsegrid/infra/k8s/
kubectl get pods -w
\`\`\`
`,

  'step-17-system-design-scale': `
## Implementation Walkthrough

### Capacity Math — 10K Alerts/Minute

\`\`\`
10,000 alerts/min ÷ 60 = ~167 alerts/sec

API pod capacity:  ~50 req/s  → need 4 pods (with headroom)
Worker pod capacity: ~25 alerts/s → need 8 pods
Redis memory: 10k keys × 100 bytes ≈ 1 MB dedup window (trivial)
Postgres writes: 167 INSERT/s — connection pool 20 per pod × 4 = 80 connections
\`\`\`

### Circuit Breaker — Notification Service

\`\`\`python
@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_timeout: float = 30.0
    state: CircuitState = CircuitState.CLOSED

    def allow_request(self) -> bool:
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_at >= self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
                return True
            return False
        return True

    def record_failure(self) -> None:
        self.failure_count += 1
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN  # stop calling PagerDuty
\`\`\`

When open: incidents still created, paging degrades gracefully with logged warning.

### Load Shedding — Drop P4 Only

\`\`\`python
def should_shed_alert(alert: Alert, queue_depth: int, threshold: int = 800) -> bool:
    if queue_depth < threshold:
        return False
    return alert.severity == Severity.P4  # never shed P1-P3
\`\`\`

Under overload, shed informational alerts to protect critical path.

### Horizontal Scaling Architecture

\`\`\`
                    [ALB]
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    [API pod 1]  [API pod 2]  [API pod 3]
        │             │             │
        └─────────────┼─────────────┘
                      ▼
              [Redis dedup + cache]
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
   [Worker 1]   [Worker 2]   [Worker 3]
                      │
                      ▼
                 [PostgreSQL]
\`\`\`

Stateless API + workers with shared Redis dedup — scale pods independently.
`,

  'step-18-incident-timeline': `
## Implementation Walkthrough

### Domain Events — Append-Only Timeline

\`\`\`python
class EventType(StrEnum):
    INCIDENT_CREATED = "incident.created"
    INCIDENT_ACKNOWLEDGED = "incident.acknowledged"
    INCIDENT_RESOLVED = "incident.resolved"
    COMMENT_ADDED = "comment.added"

@dataclass
class DomainEvent:
    event_type: EventType
    incident_id: str
    payload: dict
    created_at: datetime = field(default_factory=lambda: datetime.now(UTC))

class TimelineStore:
    def append(self, event: DomainEvent) -> None:
        self._events.append(event)  # never update in place

    def get_timeline(self, incident_id: str) -> list[DomainEvent]:
        return [e for e in self._events if e.incident_id == incident_id]
\`\`\`

### Timeline API

\`\`\`bash
curl -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/incidents/{id}/timeline
\`\`\`

\`\`\`json
[
  {"event_type": "incident.created", "message": "Incident triggered from alert", "created_at": "..."},
  {"event_type": "incident.acknowledged", "message": "Acknowledged by admin", "created_at": "..."}
]
\`\`\`

### Notification Fan-Out

\`\`\`python
async def fan_out(incident: Incident, channels: list[str]) -> None:
    tasks = []
    if "slack" in channels:
        tasks.append(slack_notifier.send(incident))
    if "pagerduty" in channels:
        tasks.append(pagerduty_notifier.page(incident))
  results = await asyncio.gather(*tasks, return_exceptions=True)
    for r in results:
        if isinstance(r, Exception):
            logger.warning("Notification failed: %s", r)  # non-blocking
\`\`\`

### Postmortem Generation

\`\`\`markdown
# Postmortem: {{ incident.title }}

**Service:** {{ incident.service_id }}
**Severity:** {{ incident.severity }}
**MTTR:** {{ mttr_minutes }} minutes

## Timeline
{% for event in timeline %}
- {{ event.created_at }}: {{ event.message }}
{% endfor %}

## Action Items
- [ ] Add monitoring for root cause service
- [ ] Update runbook with lessons learned
\`\`\`

\`\`\`bash
curl -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/incidents/{id}/postmortem.md
\`\`\`
`,

  'step-19-kafka-events': `
## Implementation Walkthrough

### Kafka Topics

\`\`\`text
alerts.raw          — raw webhook payloads (retention 7d)
incidents.events    — domain events for downstream consumers
notifications.pending — paging requests for notification service
search.index        — incident updates for Elasticsearch
\`\`\`

### Outbox Pattern — No Lost Events

\`\`\`python
class OutboxStore:
    def add(self, event: DomainEvent) -> OutboxEntry:
        entry = OutboxEntry(id=str(uuid4()), event=event)
        self._entries.append(entry)
        return entry

    def pending(self) -> list[OutboxEntry]:
        return [e for e in self._entries if not e.published]

    def mark_published(self, entry_id: str) -> None:
        ...
\`\`\`

**Critical:** INSERT incident + INSERT outbox in **same database transaction**. Publisher polls pending entries and publishes to Kafka. If API crashes after DB commit but before Kafka, publisher retries — no dual-write inconsistency.

### Publisher Loop

\`\`\`python
async def publish_outbox(outbox: OutboxStore, bus: EventBus) -> None:
    while True:
        for entry in outbox.pending():
            await bus.publish(entry.event.topic, entry.event.payload)
            outbox.mark_published(entry.id)
        await asyncio.sleep(1)
\`\`\`

### Consumer Groups — Scale Workers

\`\`\`python
# 8 workers in group "incident-processors" share partitions
# Each alert processed exactly once
consumer = KafkaConsumer(
    "alerts.raw",
    group_id="incident-processors",
    bootstrap_servers=["redpanda:9092"],
)
\`\`\`

### Dev vs Prod Event Bus

\`\`\`python
# config.py
if settings.use_kafka:
    bus = KafkaEventBus(bootstrap=settings.kafka_bootstrap)
else:
    bus = InMemoryEventBus()  # local dev without Zookeeper
\`\`\`

\`\`\`bash
# docker compose includes redpanda on port 19092
PULSEGRID_USE_KAFKA=true docker compose up
\`\`\`
`,

  'step-20-performance': `
## Implementation Walkthrough

### Profile Before Optimizing

\`\`\`bash
# CPU flame graph
py-spy record -o profile.svg -- python -m pulsegrid.worker.runner

# Slow query analysis
psql -c "EXPLAIN ANALYZE SELECT * FROM incidents WHERE service_id='payment-api' AND status='triggered';"
\`\`\`

Look for \`Seq Scan\` → add index. Look for \`N+1\` in logs → batch queries.

### Fix N+1 — Batch Timeline Fetch

\`\`\`python
# BAD: one query per incident
for inc in incidents:
    timeline = db.query(Timeline).filter_by(incident_id=inc.id).all()

# GOOD: single query with IN clause
incident_ids = [i.id for i in incidents]
timelines = db.query(Timeline).filter(Timeline.incident_id.in_(incident_ids)).all()
by_incident = defaultdict(list)
for t in timelines:
    by_incident[t.incident_id].append(t)
\`\`\`

### Connection Pooling

\`\`\`python
engine = create_async_engine(
    database_url,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # detect stale connections
)
\`\`\`

Rule: \`pool_size × pod_count < postgres max_connections - overhead\`

### Load Test Script

\`\`\`bash
python scripts/load_test.py --rate 167 --duration 600
# 10 minutes at 167 alerts/sec = 100k alerts total

# Report:
# p50: 45ms  p95: 120ms  p99: 380ms
# errors: 0  shed: 234 (P4 only)
\`\`\`

### Response Time Header

\`\`\`python
@app.middleware("http")
async def timing_middleware(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    response.headers["X-Response-Time-Ms"] = f"{ms:.1f}"
    return response
\`\`\`
`,

  'step-21-generative-ai': `
## Implementation Walkthrough

### AI Summarization Service

\`\`\`python
class AISummarizer:
    def build_prompt(self, incident: Incident, timeline: list[DomainEvent]) -> str:
        return f"""Summarize this incident for an on-call engineer.
Incident: {incident.title} ({incident.severity.value})
Service: {incident.service_id}
Status: {incident.status.value}
Correlated: {incident.correlated_services}
Timeline:
{self._format_timeline(timeline)}

Provide: what happened, impact, suggested next steps.
Only use facts from the data above."""

    async def summarize(self, incident_id: str) -> str:
        cached = self._cache.get(incident_id)
        if cached:
            return cached
        prompt = self.build_prompt(...)
        summary = await self._call_llm(prompt)  # or mock fallback
        self._cache[incident_id] = summary
        return summary
\`\`\`

### SSE Streaming Endpoint

\`\`\`python
@router.post("/ai/incidents/{id}/summarize/stream")
async def summarize_stream(id: str):
    async def generate():
        async for chunk in summarizer.summarize_stream(id):
            yield f"data: {json.dumps({'chunk': chunk})}\\n\\n"
    return StreamingResponse(generate(), media_type="text/event-stream")
\`\`\`

### Mock Fallback (No API Key)

\`\`\`python
def mock_summary(incident: Incident) -> str:
    return f"""## Incident Summary (mock)
**{incident.title}** on {incident.service_id}
Severity: {incident.severity.value.upper()}
Status: {incident.status.value}
Alert count: {incident.alert_count}
Suggested: Check service health, review correlated services, search runbooks."""
\`\`\`

Production rule: LLM timeout must **never** block incident creation or paging.

### Test Summarization

\`\`\`bash
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/ai/incidents/{id}/summarize

curl -N -X POST -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/ai/incidents/{id}/summarize/stream
\`\`\`
`,

  'step-22-rag-runbooks': `
## Implementation Walkthrough

### Runbook Ingestion

\`\`\`python
@dataclass
class RunbookIndex:
    chunks: list[RunbookChunk] = field(default_factory=list)

    def ingest_directory(self, path: Path) -> int:
        for md_file in sorted(path.glob("**/*.md")):
            content = md_file.read_text(encoding="utf-8")
            title = md_file.stem.replace("-", " ").title()
            self.chunks.append(RunbookChunk(
                id=md_file.stem, title=title, content=content, source_file=str(md_file)
            ))
        self._build_tfidf_index()
        return len(self.chunks)
\`\`\`

Example runbooks in \`docs/runbooks/\`:
- \`redis-failover.md\` — switch Redis replica to primary
- \`postgres-connection-pool.md\` — diagnose pool exhaustion
- \`payment-api-rollback.md\` — revert bad deploy

### TF-IDF Semantic Search

\`\`\`python
def search(self, query: str, top_k: int = 3) -> list[RunbookChunk]:
    query_vec = self._tfidf_vector(query)
    scores = []
    for chunk in self.chunks:
        score = cosine_similarity(query_vec, self._tfidf[chunk.id])
        scores.append((score, chunk))
    return [c for _, c in sorted(scores, reverse=True)[:top_k]]
\`\`\`

### Suggest on Incident Create

\`\`\`python
def suggest_for_incident(self, incident: Incident, top_k: int = 3) -> list[RunbookChunk]:
    query = f"{incident.title} {incident.service_id} {' '.join(incident.correlated_services)}"
    return self.search(query, top_k=top_k)
\`\`\`

### RAG Eval Gate (CI)

\`\`\`python
# scripts/eval_rag.py
QUERIES = [
    ("redis connection refused", "redis-failover"),
    ("postgres pool exhausted", "postgres-connection-pool"),
    ("payment errors after deploy", "payment-api-rollback"),
]

def recall_at_k(results, expected, k=3) -> float:
    hits = sum(1 for q, exp in QUERIES if exp in [r.id for r in results[q][:k]])
    return hits / len(QUERIES)

assert recall_at_k(index, QUERIES) >= 0.85, "RAG recall@3 regression"
\`\`\`

\`\`\`bash
python scripts/eval_rag.py
# recall@3 = 1.00 ✓
\`\`\`
`,

  'step-23-agentic-ai': `
## Implementation Walkthrough

### Agent Tools — Read-Only Investigation

\`\`\`python
class IncidentAgent:
    MAX_STEPS = 10

    def _tool_search_incidents(self, query: str) -> str:
        results = [i for i in self.processor.list_incidents()
                   if query.lower() in i.title.lower()]
        return str([{"id": i.id, "title": i.title} for i in results[:5]])

    def _tool_get_service_health(self, service_id: str) -> str:
        active = [i for i in self.processor.list_incidents(service_id=service_id)
                  if i.status.value != "resolved"]
        blast = self.service_graph.get_blast_radius(service_id)
        return f"status={'degraded' if active else 'healthy'} blast={blast}"

    def _tool_search_runbooks(self, query: str) -> str:
        chunks = self.runbooks.search(query, top_k=3)
        return str([{"title": c.title, "snippet": c.content[:200]} for c in chunks])
\`\`\`

### ReAct Loop

\`\`\`python
async def investigate(self, query: str) -> AgentTrace:
    trace = AgentTrace(query=query)
    for step in range(self.MAX_STEPS):
        thought = self._reason(trace)
        action, action_input = self._pick_tool(thought)
        observation = self._execute_tool(action, action_input)
        trace.steps.append(AgentStep(thought, action, action_input, observation))
        if action == "final_answer":
            trace.final_answer = observation
            break
    self.traces.append(trace)
    return trace
\`\`\`

### Safety — Human-in-the-Loop

\`\`\`text
ALLOWED (read-only):
  search_incidents, get_service_health, search_runbooks, get_on_call

NOT in autonomous loop:
  resolve_incident, send_page, delete_incident
\`\`\`

Agent **recommends** actions; engineer executes acknowledge/resolve manually.

### Agent API

\`\`\`bash
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What should I do about payment-api P1 high error rate?"}' \\
  http://localhost:8000/ai/agent
\`\`\`

\`\`\`json
{
  "final_answer": "payment-api has 2 active P1 incidents. Root cause may be postgres-primary (upstream). Suggested runbook: postgres-connection-pool. Recommend acknowledging and checking DB connections.",
  "steps": [
    {"thought": "Search active payment incidents", "action": "search_incidents", ...},
    {"thought": "Check upstream health", "action": "get_service_health", ...},
    {"thought": "Find relevant runbooks", "action": "search_runbooks", ...}
  ]
}
\`\`\`
`,

  'step-24-production-launch': `
## Implementation Walkthrough

### Production AI Checklist

\`\`\`markdown
- [ ] Mock summary fallback when OPENAI_API_KEY unset
- [ ] LLM calls timeout after 10s — never block incident path
- [ ] Cache summaries per incident_id (avoid token cost explosion)
- [ ] RAG eval gate in CI: recall@3 >= 0.85
- [ ] Monitor token usage and p99 summarization latency
- [ ] Agent cannot resolve or page without human approval
\`\`\`

### 5-Minute Demo Script

\`\`\`bash
# 1. Health check
curl http://localhost:8000/health

# 2. Login
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"admin","password":"admin"}' | jq -r .access_token)

# 3. Ingest P1 alert → incident
curl -X POST http://localhost:8000/webhooks/alerts/sync \\
  -H "Content-Type: application/json" \\
  -d '{"service_id":"payment-api","title":"High error rate","severity":"p1","source":"custom"}'

# 4. List incidents
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/incidents | jq

# 5. AI summary
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/ai/incidents/{id}/summarize | jq

# 6. Runbook suggestions
curl -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/ai/incidents/{id}/runbooks | jq

# 7. Agent investigation
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  -d '{"query":"What is wrong with payment-api?"}' \\
  http://localhost:8000/ai/agent | jq

# 8. Acknowledge + resolve
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/incidents/{id}/acknowledge
curl -X POST -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/incidents/{id}/resolve

# 9. Postmortem
curl -H "Authorization: Bearer $TOKEN" \\
  http://localhost:8000/incidents/{id}/postmortem.md
\`\`\`

Open dashboard at \`http://localhost:5173\` during steps 4–8 for visual impact.

### Interview Story — STAR Format

**Situation:** PulseGrid dedup index grew unbounded in memory during a load test.
**Task:** Fix before production launch without breaking multi-pod dedup.
**Action:** Moved dedup window to Redis sorted sets with TTL eviction; added load test to CI.
**Result:** 100k alerts processed, recall@3=1.00, zero duplicate incidents, MTTR dashboard green.

### Scale Whiteboard — 1M Events/Day

\`\`\`
1M/day ≈ 12 events/sec average, ~120/sec peak (10x)

Changes from 10k/min design:
- Kafka: 12 partitions, 3 consumer groups
- Postgres: read replica for dashboard queries
- Redis Cluster for dedup at 8+ worker pods
- CDN for status pages (ISR at edge)
- Regional failover: active-passive in second AZ
\`\`\`

### Verify Everything

\`\`\`bash
cd pulsegrid
pytest -v                    # 51 tests
python scripts/eval_rag.py   # recall@3 >= 0.85
docker compose up -d && curl localhost:8000/ready
\`\`\`
`,
};

export function getCapstoneEmbeddedWalkthrough(stepId: string): string | undefined {
  return capstoneEmbeddedWalkthrough[stepId];
}

/** Merges textbook chapter + embedded code walkthrough into one on-page lesson. */
export function getCapstoneFullLesson(
  stepId: string,
  textbookChapter?: string,
  extras?: { architectureNote?: string; starterCode?: string },
): string | undefined {
  const walkthrough = capstoneEmbeddedWalkthrough[stepId];
  const parts: string[] = [];

  if (textbookChapter) parts.push(textbookChapter);
  if (walkthrough) parts.push(walkthrough.trim());
  if (extras?.architectureNote) {
    parts.push(`## Architecture Note\n\n\`\`\`\n${extras.architectureNote.trim()}\n\`\`\``);
  }
  if (extras?.starterCode) {
    parts.push(`## Starter Code\n\n\`\`\`python\n${extras.starterCode.trim()}\n\`\`\``);
  }

  return parts.length > 0 ? parts.join('\n\n---\n\n') : undefined;
}
