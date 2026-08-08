import { buildLesson } from '../content-format';

export const fastapiLessons: Record<string, string> = {
  'fastapi:asgi-fundamentals': buildLesson({
    intro:
      'FastAPI sits on ASGI, not WSGI. Understanding what happens inside uvicorn when you write `def` vs `async def` is essential for every production debugging session and senior backend interview.',
    dialogues: [
      {
        q: 'What is ASGI and why does FastAPI need it?',
        a: `**WSGI** (Flask, Django traditionally) is synchronous: one request occupies a worker until the response is complete. For I/O-bound work, the worker sits idle waiting on DB or network — you need many processes to handle concurrent users.

**ASGI** is the async successor: an application can handle many connections on one worker by awaiting I/O. FastAPI (via Starlette) is ASGI-native — \`async def\` endpoints run on an event loop, and while one request awaits a DB query, others proceed.

**Uvicorn** is an ASGI server. It can run multiple worker processes; each worker runs an event loop for async code. ASGI also supports WebSockets and long-lived connections — WSGI cannot.

Interview line: "ASGI lets one Python process serve thousands of idle connections efficiently if the stack is async and non-blocking."`,
      },
      {
        q: 'What happens with sync `def` endpoints vs `async def`?',
        a: `**\`async def\` endpoints** run on the event loop. When you \`await db.execute(...)\`, the loop serves other requests. But if you call blocking code (\`time.sleep\`, sync \`requests.get\`, sync SQLAlchemy session), you **block the entire loop** — all requests on that worker stall.

**\`def\` endpoints** are run in a **thread pool** (Starlette default \`threadpool\` size ~40). Each sync request blocks one thread, not the event loop. Other async requests can still run — but if all 40 threads are busy in sync DB calls, new sync requests queue.

**Rules:**
- I/O + async libraries → \`async def\` + await
- Legacy sync stack, low traffic → \`def\` may be OK
- **Never** \`async def\` with blocking I/O inside

FastAPI doesn't magically make sync code async — it only schedules it differently.`,
      },
      {
        q: 'How many concurrent requests can one uvicorn worker handle?',
        a: `There's no fixed number — it depends on **whether work is blocking**.

**Async, non-blocking:** thousands of connections if mostly awaiting I/O (typical API reading DB/HTTP). Limited by memory per connection, file descriptors, and downstream pool sizes — not Python thread count.

**Sync \`def\` endpoints:** roughly **thread pool size** (40) concurrent requests doing blocking work per worker. Additional requests wait in queue → latency grows.

**CPU-bound in async:** effectively **one** at a time per worker (GIL + event loop blocked).

Sizing: \`workers = CPU cores\` often; total capacity = workers × (async: high with pools | sync: ~40 × workers). Always load test with realistic mix.`,
      },
      {
        q: 'Show the correct pattern for an async FastAPI endpoint with database access.',
        a: `\`\`\`python
from fastapi import FastAPI, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
  user = await db.get(User, user_id)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")
  return user

# WRONG — blocks event loop for all clients on this worker
@app.get("/bad")
async def bad_endpoint():
  time.sleep(5)
  return {"status": "blocked"}
\`\`\`

Use **async session per request** via dependency with yield — commit/rollback on exit. HTTP client: \`httpx.AsyncClient\` with connection limits. External sync SDK: \`run_in_executor\` with bounded pool or isolate in \`def\` endpoint + accept thread cap.`,
      },
    ],
    takeaways: [
      'ASGI enables concurrent I/O on one worker; WSGI is one sync request per worker',
      'async def + blocking call = freezes entire worker event loop',
      'def endpoints use thread pool (~40 threads) — know the ceiling',
      'Match endpoint style to your DB and HTTP client libraries',
    ],
    tip: 'If interviewer says "DB is 20ms but API is 2s," immediately ask: async or sync path? N+1 queries? Pool wait?',
  }),

  'fastapi:dependency-injection': buildLesson({
    intro:
      'FastAPI\'s `Depends()` is more than convenience — it structures auth, DB sessions, and testability. Lifespan and middleware order matter for production startup and shutdown.',
    dialogues: [
      {
        q: 'How does Depends() work and what should I inject?',
        a: `FastAPI resolves dependencies **per request** before your route runs. Dependencies can depend on other dependencies — a tree resolved automatically.

**Common injections:**
- **DB session** — \`async with session\` yield pattern, one transaction per request
- **Current user** — decode JWT, load user, raise 401 if invalid
- **Config/settings** — cached settings object
- **Services** — business logic classes constructed with session/user

\`\`\`python
async def get_db():
  async with async_session() as session:
    yield session

async def get_current_user(
  token: str = Depends(oauth2_scheme),
  db: AsyncSession = Depends(get_db),
) -> User:
  payload = decode_token(token)
  user = await db.get(User, payload["sub"])
  if not user:
    raise HTTPException(401)
  return user
\`\`\`

Tests override dependencies: \`app.dependency_overrides[get_db] = fake_db\`.`,
      },
      {
        q: 'Lifespan vs deprecated on_event — what goes in startup/shutdown?',
        a: `Use **lifespan context manager** (FastAPI 0.93+):

\`\`\`python
@asynccontextmanager
async def lifespan(app: FastAPI):
  app.state.db_pool = await create_pool()
  app.state.http_client = httpx.AsyncClient(...)
  yield
  await app.state.http_client.aclose()
  await app.state.db_pool.close()

app = FastAPI(lifespan=lifespan)
\`\`\`

**Startup:** connection pools, Redis, HTTP clients, warm caches, tracer provider.

**Shutdown:** close pools gracefully — in-flight requests should finish or timeout first.

Don't create new DB connection per request in startup — pools live in \`app.state\`. Deprecated \`@app.on_event("startup")\` still works but lifespan is cleaner for testing and multiple apps.`,
      },
      {
        q: 'Middleware order confuses me — which runs first?',
        a: `Middleware is **onion-shaped**: first **registered** is **outermost** — sees request first and response last.

Typical **registration order** (first = outer):
1. CORS — must handle OPTIONS early
2. Request ID / correlation ID — propagate to all inner layers
3. Rate limiting — reject before heavy work
4. Authentication (if middleware-based)
5. Metrics/logging

**Response path** reverses — inner middleware wraps response first.

Custom middleware example:

\`\`\`python
@app.middleware("http")
async def add_request_id(request: Request, call_next):
  request_id = request.headers.get("X-Request-ID", str(uuid4()))
  response = await call_next(request)
  response.headers["X-Request-ID"] = request_id
  return response
\`\`\`

Log \`request_id\` in every log line and pass to downstream HTTP headers.`,
      },
      {
        q: 'How do I structure auth with Depends for RBAC?',
        a: `Layer dependencies:

1. **\`get_current_user\`** — valid JWT → User or 401
2. **\`require_role("admin")\`** — factory returning dependency that checks \`user.role\`

\`\`\`python
def require_role(role: str):
  async def checker(user: User = Depends(get_current_user)):
    if user.role != role:
      raise HTTPException(403, "Insufficient permissions")
    return user
  return checker

@app.delete("/users/{id}", dependencies=[Depends(require_role("admin"))])
async def delete_user(id: int, db: AsyncSession = Depends(get_db)):
  ...
\`\`\`

**Resource-level auth** (IDOR prevention): always check \`resource.owner_id == user.id\` in the route or service — role alone isn't enough.

Refresh tokens in httpOnly cookies; short-lived access tokens in memory. Never store JWT in localStorage (XSS).`,
      },
    ],
    takeaways: [
      'Depends builds per-request trees — DB, user, services; override in tests',
      'Lifespan for pool/client lifecycle; close resources on shutdown',
      'Middleware: first registered = outermost; CORS and request ID early',
      'RBAC via dependency factories; always authorize resource ownership',
    ],
    tip: 'Mention dependency_overrides for testing — shows you\'ve built testable FastAPI apps, not just routes.',
  }),

  'fastapi:api-design': buildLesson({
    intro:
      'API design in FastAPI goes beyond routes — pagination consistency, error contracts, versioning, and idempotency separate toy APIs from production services.',
    dialogues: [
      {
        q: 'Offset pagination vs cursor pagination — when to use each?',
        a: `**Offset** (\`?page=2&size=20\` → \`OFFSET 20 LIMIT 20\`):
- Simple for UI with page numbers
- **Bad at scale:** \`OFFSET 100000\` scans and discards 100k rows — slow
- **Inconsistent** under concurrent writes — inserts between pages cause duplicates/skips

**Cursor** (\`?cursor=eyJ...&limit=20\`):
- Encodes position (e.g. last \`created_at\` + \`id\`)
- **Stable** under concurrent inserts if sorting by unique tuple
- **Efficient** — index seek, no large offset
- Cannot jump to arbitrary page 47

\`\`\`python
query = select(Item).order_by(Item.created_at, Item.id).limit(limit + 1)
if cursor:
  c = decode_cursor(cursor)
  query = query.where(
    tuple_(Item.created_at, Item.id) > tuple_(c["created_at"], c["id"])
  )
\`\`\`

Document that **total count** may be approximate or omitted for large tables.`,
      },
      {
        q: 'How should API errors look in production?',
        a: `Consistent JSON envelope — clients and support teams parse one shape:

\`\`\`json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [{"field": "email", "message": "Invalid format"}],
    "request_id": "abc-123"
  }
}
\`\`\`

Register exception handlers:

\`\`\`python
@app.exception_handler(RequestValidationError)
async def validation_handler(request, exc):
  return JSONResponse(422, content={
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid input",
      "details": exc.errors(),
      "request_id": request.state.request_id,
    }
  })
\`\`\`

Never leak stack traces to clients. Map domain errors to 4xx with clear codes. 500 = unexpected — log full trace server-side.`,
      },
      {
        q: 'How do idempotency keys work for POST?',
        a: `Clients send **\`Idempotency-Key\`** header on create operations. Server stores \`key → response\` in Redis with TTL (24h).

Flow:
1. If key seen → return cached response (same status + body)
2. If new → process, store result before returning

Prevents duplicate charges, duplicate orders on client retry.

\`\`\`python
async def check_idempotency(key: str, redis) -> Optional[dict]:
  cached = await redis.get(f"idempotency:{key}")
  return json.loads(cached) if cached else None
\`\`\`

Keys must be unique per logical operation (client generates UUID). Only cache **successful** responses or include error responses consistently. Stripe and many payment APIs use this pattern.`,
      },
      {
        q: 'API versioning strategies for FastAPI?',
        a: `**URL path** (\`/v1/users\`, \`/v2/users\`) — most visible, easy routing, cache-friendly. FastAPI: separate routers or \`APIRouter(prefix="/v1")\`.

**Header** (\`Accept: application/vnd.api+json; version=2\`) — cleaner URLs, harder for clients.

**Query param** — generally avoid.

Production approach:
- Maintain **backward compatibility** in v1 as long as usage exists
- Deprecation headers: \`Sunset\`, \`Deprecation\`
- Monitor v1 traffic; sunset when < 1%
- Contract tests between versions

For internal microservices, version less often — coordinate deploys. For public APIs, version aggressively with migration guides.`,
      },
    ],
    takeaways: [
      'Cursor pagination for large/live datasets; offset only for small admin UIs',
      'Structured errors with code, details, and request_id',
      'Idempotency-Key + Redis prevents duplicate side effects on retry',
      'URL versioning is common; deprecate with metrics on old version usage',
    ],
    tip: 'When designing list endpoints, always mention cursor + composite index on (sort_field, id).',
  }),

  'fastapi:production-patterns': buildLesson({
    intro:
      'Circuit breakers, graceful shutdown, and zero-downtime deploys turn a working FastAPI app into something you can run at 3am without panic.',
    dialogues: [
      {
        q: 'Explain circuit breaker states and when to use them.',
        a: `**Closed** — normal. Track failures in window.

**Open** — too many failures → **fail fast**, don't call downstream. Return fallback or 503 immediately. Prevents retry storms hammering a recovering service.

**Half-open** — after cooldown, allow **one probe** request. Success → Closed; failure → Open again.

Use **per-downstream** breakers — payment API separate from email API.

Pair with:
- **Timeouts** < client deadline
- **Retries** only when Closed, max 2, jitter
- **Metrics** on state transitions

Python: implement simple class or use \`aiobreaker\`. Log when breaker opens — that's an incident signal.`,
      },
      {
        q: 'How do you implement graceful shutdown in Kubernetes?',
        a: `**SIGTERM** sent before pod kill:

1. Uvicorn stops accepting (configurable grace period)
2. In-flight requests complete (up to timeout)
3. Lifespan shutdown closes DB pool, Redis, HTTP clients
4. Process exits

K8s config:
- \`terminationGracePeriodSeconds: 30\`
- **readinessProbe** fails during shutdown → Service removes pod from endpoints
- **preStop: sleep 5** — LB drains connections before kill

FastAPI lifespan \`yield\` after block runs shutdown. Don't leave DB transactions open — rollback pending on exit.

Test: \`kubectl delete pod\` during load test — error rate should stay near zero.`,
      },
      {
        q: 'Zero-downtime deployment checklist for FastAPI?',
        a: `**Rolling update** with \`maxUnavailable: 0\`, \`maxSurge: 1\` — always enough pods serving.

**Readiness** checks DB connectivity — not just "Python imported fastapi".

**Health endpoints:**
- \`/health/live\` — process alive
- \`/health/ready\` — can query DB

**Backward-compatible migrations** — expand-contract pattern, never drop column in same deploy as code.

**Connection draining** — preStop hook.

**Canary** for risky changes — 5% traffic, watch p99 and error rate.

**Feature flags** — deploy code dark, enable gradually.

Blue-green for instant rollback; canary for safer gradual rollout.`,
      },
      {
        q: 'Simple circuit breaker implementation — walk through it.',
        a: `\`\`\`python
class CircuitBreaker:
  def __init__(self, failure_threshold=5, recovery_timeout=30):
    self.failure_threshold = failure_threshold
    self.recovery_timeout = recovery_timeout
    self.failure_count = 0
    self.state = "closed"
    self.last_failure_time = 0

  async def call(self, func, *args, **kwargs):
    if self.state == "open":
      if time.time() - self.last_failure_time > self.recovery_timeout:
        self.state = "half_open"
      else:
        raise CircuitOpenError("Circuit open")
    try:
      result = await func(*args, **kwargs)
      self.failure_count = 0
      self.state = "closed"
      return result
    except Exception:
      self.failure_count += 1
      self.last_failure_time = time.time()
      if self.failure_count >= self.failure_threshold:
        self.state = "open"
      raise
\`\`\`

Discuss: half-open success should reset count; distinguish timeout vs 500 vs 400 — don't open breaker on client errors.`,
      },
    ],
    takeaways: [
      'Circuit breaker: Closed → Open → Half-open; per downstream service',
      'Graceful shutdown: readiness fails, preStop drain, lifespan closes pools',
      'Zero-downtime: rolling/canary + backward-compatible migrations',
      'Don\'t open breaker on 4xx — only dependency failures/timeouts',
    ],
    tip: 'Tie circuit breakers to the "30% downstream failure + retries = total outage" story — interviewers love that narrative.',
  }),
};
