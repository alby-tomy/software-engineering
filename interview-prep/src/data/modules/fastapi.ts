import type { Module } from '../../types/curriculum';

export const fastapi: Module = {
  id: 'fastapi',
  title: 'FastAPI — Production Backend',
  stage: 5,
  level: 'advanced',
  icon: '⚡',
  description:
    'Master FastAPI for production: async patterns, dependency injection, auth, API design, and scaling to millions of users.',
  prerequisites: ['python', 'sql'],
  learningObjectives: [
    'Explain ASGI vs WSGI and when to use async endpoints',
    'Implement production auth with JWT and RBAC',
    'Design REST APIs with proper pagination, versioning, and error handling',
    'Debug latency issues and implement circuit breakers',
    'Architect horizontally scalable FastAPI services',
  ],
  estimatedHours: 40,
  sections: [
    {
      id: 'asgi-fundamentals',
      title: 'ASGI, Uvicorn & async vs sync endpoints',
      content: `### WSGI vs ASGI
- **WSGI** (Flask, Django): Synchronous, one request per worker at a time
- **ASGI** (FastAPI, Starlette): Async-native, handles many concurrent connections per worker

### What happens with sync endpoints in FastAPI
FastAPI runs sync \`def\` endpoints in a **thread pool** (default 40 threads). This works but:
- Thread pool can be exhausted under load
- Each thread uses ~8MB stack memory
- Not truly async — blocks a thread

### What happens with async endpoints
\`async def\` endpoints run on the event loop. While awaiting I/O, other requests are served. But:
- **Any blocking call blocks the entire event loop**
- CPU work blocks the event loop
- Must use async libraries (asyncpg, aiohttp, httpx)

### Rule of thumb
- Async endpoint + async DB driver + async HTTP client = maximum throughput
- Sync endpoint = OK for low-traffic or when using sync libraries
- Never: async endpoint with blocking DB call`,
      codeExamples: [
        {
          title: 'Correct async endpoint pattern',
          language: 'python',
          code: `from fastapi import FastAPI, Depends
from sqlalchemy.ext.asyncio import AsyncSession

app = FastAPI()

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    # async DB call — does NOT block event loop
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404)
    return user

# WRONG — blocks event loop
@app.get("/bad")
async def bad_endpoint():
    time.sleep(5)  # NEVER do this
    return {"status": "blocked everyone"}`,
        },
      ],
    },
    {
      id: 'dependency-injection',
      title: 'Dependency Injection & Middleware',
      content: `### Depends()
FastAPI's DI system resolves dependencies per-request. Use for:
- Database sessions
- Current user / auth
- Configuration
- Shared services

### Lifespan events
Replace deprecated \`@app.on_event\` with lifespan context manager for startup/shutdown (DB pools, Redis connections).

### Middleware order
Middleware executes in **reverse order** of registration. First registered = outermost.

### Production middleware stack
1. CORS
2. Request ID / correlation ID
3. Rate limiting
4. Authentication
5. Logging / metrics`,
      codeExamples: [
        {
          title: 'Production lifespan and dependencies',
          language: 'python',
          code: `from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.security import HTTPBearer

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.db_pool = await create_pool()
    app.state.redis = await aioredis.create_redis_pool()
    yield
    # Shutdown
    await app.state.db_pool.close()
    await app.state.redis.close()

app = FastAPI(lifespan=lifespan)

async def get_db(request: Request):
    async with request.app.state.db_pool.acquire() as conn:
        yield conn

security = HTTPBearer()

async def get_current_user(token: str = Depends(security)):
    payload = verify_jwt(token.credentials)
    user = await get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(401)
    return user`,
        },
      ],
    },
    {
      id: 'api-design',
      title: 'API Design — Pagination, Versioning, Errors',
      content: `### Pagination strategies

**Offset pagination**: \`?page=2&size=20\`
- Simple but inconsistent under concurrent writes (duplicates/skips)
- Slow on large offsets (OFFSET 100000)

**Cursor pagination**: \`?cursor=eyJpZCI6MTIzfQ&limit=20\`
- Consistent under concurrent writes
- Efficient with index on cursor field
- Cannot jump to arbitrary page

### Consistency with changing data
Use cursor based on \`(created_at, id)\` composite. Encode cursor as opaque base64. Document that total count may be approximate.

### Error response design
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

### Idempotency
For POST that creates resources, accept \`Idempotency-Key\` header. Store key → response mapping in Redis with TTL.`,
      codeExamples: [
        {
          title: 'Cursor pagination implementation',
          language: 'python',
          code: `import base64
import json
from typing import Optional

def encode_cursor(created_at: str, id: int) -> str:
    data = json.dumps({"created_at": created_at, "id": id})
    return base64.urlsafe_b64encode(data.encode()).decode()

def decode_cursor(cursor: str) -> dict:
    data = base64.urlsafe_b64decode(cursor.encode())
    return json.loads(data)

@app.get("/items")
async def list_items(
    limit: int = 20,
    cursor: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Item).order_by(Item.created_at, Item.id).limit(limit + 1)
    if cursor:
        c = decode_cursor(cursor)
        query = query.where(
            (Item.created_at, Item.id) > (c["created_at"], c["id"])
        )
    items = await db.execute(query)
    items = items.scalars().all()
    has_more = len(items) > limit
    items = items[:limit]
    next_cursor = encode_cursor(items[-1].created_at, items[-1].id) if has_more else None
    return {"items": items, "next_cursor": next_cursor}`,
        },
      ],
    },
    {
      id: 'production-patterns',
      title: 'Production Patterns — Circuit Breakers, Graceful Shutdown',
      content: `### Circuit Breaker states
- **Closed**: Normal operation, track failures
- **Open**: Fail fast, don't call downstream
- **Half-open**: Allow test request, decide next state

### Graceful shutdown
1. Stop accepting new connections (SIGTERM)
2. Wait for in-flight requests to complete (timeout)
3. Close DB pools, Redis connections
4. Exit

### Zero-downtime deployment
- Rolling update with readiness probes
- Health check endpoint that verifies DB connectivity
- PreStop hook with sleep for connection draining`,
      codeExamples: [
        {
          title: 'Simple circuit breaker',
          language: 'python',
          code: `import time
from enum import Enum

class CircuitState(Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreaker:
    def __init__(self, failure_threshold=5, recovery_timeout=30):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        self.last_failure_time = 0

    async def call(self, func, *args, **kwargs):
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = CircuitState.HALF_OPEN
            else:
                raise CircuitOpenError("Circuit breaker is open")
        try:
            result = await func(*args, **kwargs)
            self.failure_count = 0
            self.state = CircuitState.CLOSED
            return result
        except Exception as e:
            self.failure_count += 1
            self.last_failure_time = time.time()
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
            raise`,
        },
      ],
    },
  ],
  questions: [
    {
      id: 'fa-q1',
      level: 'understanding',
      question: 'What is the difference between `def` and `async def` endpoints in FastAPI?',
      answer:
        'async def runs on the event loop and can await I/O without blocking other requests. def runs in a thread pool (default 40 threads). async def is preferred for I/O-bound work with async libraries, but blocking calls in async def block the entire event loop.',
    },
    {
      id: 'fa-q2',
      level: 'application',
      question: 'How do you call a synchronous database from async FastAPI code?',
      answer:
        'Best: use async driver (asyncpg, databases library). Acceptable: run_in_executor with bounded ThreadPoolExecutor. Avoid: calling sync DB directly in async endpoint.',
    },
    {
      id: 'fa-q3',
      level: 'debugging',
      question: 'Database latency is 20ms but API latency is 2 seconds. Why?',
      answer:
        'Possible causes: (1) N+1 queries — 100 queries × 20ms = 2s. (2) Connection pool exhausted — waiting for connection. (3) Sync DB in async endpoint blocking event loop. (4) Serialization of large objects. (5) Middleware overhead. (6) Thread pool exhaustion. Profile and add query logging.',
      keyPoints: ['N+1 queries', 'Pool exhaustion', 'Event loop blocking'],
    },
    {
      id: 'fa-q4',
      level: 'architecture',
      question: 'How would you horizontally scale FastAPI for 10,000 concurrent users?',
      answer:
        'Load balancer → N pods with uvicorn (workers = CPU cores). Stateless design. Redis for sessions/cache. PostgreSQL with read replicas. Connection pooling (PgBouncer). Auto-scaling on CPU/requests. CDN for static assets. Rate limiting at gateway.',
    },
    {
      id: 'fa-q5',
      level: 'senior',
      question: 'Design a production FastAPI architecture for millions of users.',
      answer:
        'ALB → API Gateway (rate limiting, auth) → EKS pods (FastAPI + uvicorn, HPA). PostgreSQL RDS (Multi-AZ, read replicas). ElastiCache Redis (sessions, cache). SQS for async tasks. S3 for files. CloudWatch + X-Ray for observability. WAF for security. CI/CD with blue-green deployment. Secrets in AWS Secrets Manager.',
      keyPoints: ['Stateless pods', 'Read replicas', 'Queue for async', 'Observability', 'Auto-scaling'],
    },
  ],
  seniorScenarios: [
    {
      title: 'API latency 5× spike',
      scenario: 'Your FastAPI API latency went from 100ms to 500ms average. No deployment. Traffic is normal.',
      approach:
        '1) Check downstream services — one slow dependency? 2) Database — slow queries? Lock contention? Connection pool? 3) Check pod resources — CPU throttling? 4) GC pauses? 5) Recent data growth — table scans? 6) Network issues between AZs? 7) Compare p50 vs p99 — tail latency source.',
      keyConsiderations: ['Check dependencies first', 'DB query log', 'Resource limits', 'Tail latency analysis'],
    },
  ],
  resources: [
    { title: 'FastAPI Documentation', url: 'https://fastapi.tiangolo.com/', type: 'documentation' },
    { title: 'Starlette Documentation', url: 'https://www.starlette.io/', type: 'documentation' },
  ],
};
