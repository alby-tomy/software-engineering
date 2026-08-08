import type { DetailedConcept } from '../types/curriculum';

export const detailedConcepts: DetailedConcept[] = [
  {
    id: 'process-vs-thread',
    moduleId: 'cs-fundamentals',
    title: 'Processes vs Threads',
    summary: 'How the OS schedules work and why isolation vs shared memory matters for backend systems.',
    analogy: 'A process is like an entire restaurant kitchen with its own ingredients and staff. Threads are cooks in that kitchen sharing the same pantry — faster coordination, but one mistake can spoil everything.',
    realWorldExample: 'Nginx uses multiple worker processes (one per CPU core) for crash isolation. Each worker handles thousands of connections using an event loop (async) — combining process isolation with lightweight concurrency.',
    commonMistakes: [
      'Assuming more threads always means better performance',
      'Sharing mutable state between threads without locks',
      'Using threads for CPU-bound Python work (GIL limits parallelism)',
    ],
    interviewTips: [
      'Start with definitions, then move to trade-offs',
      'Mention context switching cost and memory overhead per thread (~1-8MB stack)',
      'Connect to async/event loops as an alternative concurrency model',
    ],
    relatedVideoIds: ['cs-process-thread'],
    content: `## What is a Process?

A **process** is an instance of a running program. The operating system gives each process:
- Its own **virtual address space** (isolated memory)
- A unique **Process ID (PID)**
- File descriptors, environment variables, and security context

If one process crashes, others keep running. This is why production servers often use multiple worker processes.

## What is a Thread?

A **thread** is the smallest unit of execution the OS can schedule. Multiple threads within the same process share:
- Heap memory and global variables
- File descriptors and open connections

Each thread has its own **stack** (local variables, call frames) and **program counter**.

## When to Use What

| Situation | Best Choice | Why |
|-----------|-------------|-----|
| CPU-bound Python computation | Multiprocessing | Bypass GIL with separate processes |
| I/O-bound web server | Async or threads | Wait on network without blocking |
| Crash isolation needed | Multiple processes | One bad request can't kill the server |
| Shared in-memory cache | Threads + locks | Fast access to shared data structure |

## Context Switching Cost

When the OS switches between threads/processes, it must:
1. Save current register state
2. Update page tables (for process switch)
3. Load new thread/process state
4. Invalidate CPU cache (more costly for process switch)

This is why **async I/O** (one thread, many coroutines) scales better for I/O-bound workloads than thousands of threads.`,
  },
  {
    id: 'python-gil',
    moduleId: 'python',
    title: 'The Python Global Interpreter Lock (GIL)',
    summary: 'Why Python threads don\'t parallelize CPU work and the practical workarounds.',
    analogy: 'Imagine one microphone in a meeting room — only one person can speak at a time (execute Python bytecode), even if many people are present (threads).',
    realWorldExample: 'A data pipeline using pandas for heavy computation should use multiprocessing or run native code (NumPy releases GIL during C operations). A FastAPI server handling 10K concurrent API calls should use async/await, not threads.',
    commonMistakes: [
      'Using threading for CPU-bound Python loops expecting speedup',
      'Not knowing that I/O operations release the GIL',
      'Over-engineering with multiprocessing for simple scripts',
    ],
    interviewTips: [
      'Explain what the GIL protects (reference counting in CPython)',
      'Distinguish CPU-bound vs I/O-bound clearly',
      'Mention alternatives: multiprocessing, asyncio, C extensions, PyPy, or other languages for hot paths',
    ],
    relatedVideoIds: ['py-gil'],
    content: `## What is the GIL?

The **Global Interpreter Lock** is a mutex in CPython that allows only one thread to execute Python bytecode at a time. It exists because CPython's memory management (reference counting) is not thread-safe.

## When the GIL Matters

**CPU-bound work** (tight loops, data processing in pure Python):
- Multiple threads will NOT run in parallel on multiple cores
- You'll get worse performance due to GIL contention and context switching
- Use \`multiprocessing\` or offload to C/Rust extensions

**I/O-bound work** (network requests, database queries, file reads):
- Threads release the GIL while waiting for I/O
- \`asyncio\` is often better — one thread, thousands of coroutines
- FastAPI + async is the standard for modern Python APIs

## Practical Patterns

\`\`\`python
# CPU-bound: use processes
from concurrent.futures import ProcessPoolExecutor

# I/O-bound: use async
import asyncio
import httpx

async def fetch_all(urls):
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        return await asyncio.gather(*tasks)
\`\`\`

## Interview Follow-ups

- "Will removing the GIL happen?" → PEP 703 (nogil) is experimental in 3.13+
- "How does NumPy parallelize?" → Releases GIL during C-level array operations
- "When would you not use Python?" → Latency-critical hot paths, heavy parallelism`,
  },
  {
    id: 'fastapi-async',
    moduleId: 'fastapi',
    title: 'Async FastAPI Request Lifecycle',
    summary: 'How async endpoints, dependency injection, and ASGI work together in production APIs.',
    realWorldExample: 'A payment API endpoint validates JWT (sync), calls Stripe (async HTTP), writes to PostgreSQL (async driver), and publishes to Kafka (async producer) — all without blocking the event loop.',
    commonMistakes: [
      'Calling blocking code (time.sleep, requests.get) inside async endpoints',
      'Using async def for CPU-heavy work without run_in_executor',
      'Creating new DB connections per request instead of connection pooling',
    ],
    interviewTips: [
      'Draw the request flow: middleware → routing → dependencies → endpoint → response',
      'Explain ASGI vs WSGI and why async matters at scale',
      'Mention Pydantic validation happens before your handler runs',
    ],
    relatedVideoIds: ['fa-intro', 'fa-async'],
    content: `## Request Lifecycle

1. **ASGI server** (Uvicorn) receives HTTP request
2. **Middleware** runs (CORS, auth, logging, rate limiting)
3. **Router** matches URL to endpoint
4. **Dependencies** resolve (DB session, current user, config)
5. **Pydantic** validates request body/query params
6. **Endpoint handler** executes (sync or async)
7. **Response** serialized and returned

## Sync vs Async Endpoints

\`\`\`python
# Async — for I/O operations
@app.get("/users/{id}")
async def get_user(id: int, db: AsyncSession = Depends(get_db)):
    user = await db.get(User, id)
    return user

# Sync — only for fast CPU work or when using sync drivers
@app.get("/health")
def health():
    return {"status": "ok"}
\`\`\`

**Rule:** If your endpoint does I/O (DB, HTTP, file, queue), make it \`async\` and use async libraries. Blocking the event loop stalls ALL concurrent requests.

## Dependency Injection

FastAPI's \`Depends()\` is not just convenience — it enables:
- Testability (swap real DB for mock)
- Scoped resources (DB session per request, closed after)
- Composable auth (JWT → user → permissions)

## Production Checklist

- Connection pooling for DB and HTTP clients
- Structured logging with request IDs
- Health and readiness endpoints for K8s
- Graceful shutdown (finish in-flight requests)
- Timeouts on all external calls`,
  },
  {
    id: 'sql-indexes',
    moduleId: 'sql',
    title: 'SQL Indexes & Query Performance',
    summary: 'How B-tree indexes work, when they help, and when they hurt.',
    analogy: 'An index is like a book\'s index at the back — you jump directly to the page instead of reading every page to find a topic.',
    realWorldExample: "A users table with 10M rows: `SELECT * FROM users WHERE email = 'x'` without an index scans all rows (~seconds). With a unique index on email, it's a B-tree lookup (~milliseconds).",
    commonMistakes: [
      'Indexing every column (slows writes, wastes storage)',
      'Using \`SELECT *\` when only 2 columns needed',
      'Not analyzing EXPLAIN output before optimizing',
    ],
    interviewTips: [
      'Always mention EXPLAIN ANALYZE as your first debugging step',
      'Discuss composite indexes and leftmost prefix rule',
      'Cover write amplification: indexes speed reads but slow inserts/updates',
    ],
    relatedVideoIds: ['sql-indexes', 'sql-full'],
    content: `## How B-Tree Indexes Work

Most databases use **B-tree** indexes. Data is stored in sorted tree structure allowing:
- **Point lookups**: O(log n) — find row by exact value
- **Range scans**: Efficient for \`WHERE created_at > '2024-01-01'\`
- **Ordered retrieval**: \`ORDER BY indexed_column\` avoids sort step

## Composite Indexes

\`\`\`sql
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
\`\`\`

This index helps:
- \`WHERE user_id = 1\` ✓ (leftmost prefix)
- \`WHERE user_id = 1 AND created_at > '2024-01-01'\` ✓
- \`WHERE created_at > '2024-01-01'\` ✗ (can't skip leftmost column)

## Reading EXPLAIN

\`\`\`sql
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 42;
\`\`\`

Watch for:
- **Seq Scan** on large tables → likely needs index
- **Index Scan** → good for selective queries
- **Bitmap Index Scan** → multiple indexes combined
- **Rows estimate vs actual** → may need ANALYZE or better statistics

## Index Trade-offs

| Benefit | Cost |
|---------|------|
| Faster SELECT/WHERE/JOIN | Slower INSERT/UPDATE/DELETE |
| Faster ORDER BY | Extra disk storage |
| Enforces UNIQUE constraints | Planner may choose wrong index |`,
  },
  {
    id: 'dsa-big-o',
    moduleId: 'dsa',
    title: 'Big O & Algorithm Complexity',
    summary: 'How to analyze time and space complexity and communicate it in interviews.',
    realWorldExample: 'Sorting 1M log entries: O(n²) bubble sort takes hours; O(n log n) merge sort takes seconds. Choosing the right algorithm matters at scale.',
    commonMistakes: [
      'Memorizing complexities without understanding why',
      'Ignoring space complexity',
      'Not considering average vs worst case',
    ],
    interviewTips: [
      'State brute force first, then optimize',
      'Explain your approach before coding',
      'Mention when O(n) extra space is acceptable for O(n) time improvement',
    ],
    relatedVideoIds: ['dsa-big-o', 'dsa-patterns'],
    content: `## Common Complexities

| Complexity | Name | Example |
|------------|------|---------|
| O(1) | Constant | Hash map lookup |
| O(log n) | Logarithmic | Binary search |
| O(n) | Linear | Single array scan |
| O(n log n) | Linearithmic | Merge sort, heap sort |
| O(n²) | Quadratic | Nested loops |
| O(2ⁿ) | Exponential | Recursive subsets |

## How to Analyze Code

1. Count **nested loops** over input size → often O(n²)
2. **Divide and conquer** that halves problem → often O(n log n)
3. **Recursion with memoization** → often reduces exponential to polynomial
4. **BFS/DFS** on graph → O(V + E)

## Space Complexity

Don't forget auxiliary space:
- Recursion uses call stack → O(depth)
- Hash map for frequency count → O(unique elements)
- In-place algorithms → O(1) extra space

## Interview Framework

1. Clarify input size and constraints
2. Propose brute force + complexity
3. Identify bottleneck (nested loop? repeated work?)
4. Apply pattern (two pointers, sliding window, hash map, heap)
5. State final time/space complexity`,
  },
  {
    id: 'system-design-caching',
    moduleId: 'system-design',
    title: 'Caching Strategies in System Design',
    summary: 'Cache-aside, write-through, TTL, eviction policies, and cache invalidation patterns.',
    analogy: 'Caching is keeping frequently used books on your desk instead of walking to the library each time — but you need a system for when books get updated.',
    realWorldExample: 'Twitter timeline: cache each user\'s home timeline in Redis (precomputed fan-out). On new tweet, invalidate or update affected timelines. CDN caches static assets at edge locations globally.',
    commonMistakes: [
      'Caching without TTL (stale data forever)',
      'Not planning for cache stampede / thundering herd',
      'Ignoring cache consistency in write-heavy systems',
    ],
    interviewTips: [
      'Always discuss cache invalidation — "hardest problem in CS"',
      'Mention CDN for static content, Redis for dynamic hot data',
      'Quantify: "80% of reads hit 20% of data" justifies caching',
    ],
    relatedVideoIds: ['sd-caching', 'sd-intro'],
    content: `## Cache Patterns

**Cache-Aside (Lazy Loading)**
1. App checks cache
2. On miss: read DB, write to cache, return
3. On write: update DB, invalidate cache

**Write-Through**
- Every write goes to cache AND database synchronously
- Consistent but slower writes

**Write-Behind (Write-Back)**
- Write to cache immediately, async flush to DB
- Fast writes, risk of data loss on crash

## Eviction Policies

- **LRU** (Least Recently Used) — most common default
- **LFU** (Least Frequently Used) — keeps hot items longer
- **TTL** (Time To Live) — automatic expiration

## Cache Stampede

When hot key expires, thousands of requests hit DB simultaneously.

**Solutions:**
- Probabilistic early expiration
- Request coalescing (only one request rebuilds cache)
- Never expire — background refresh

## Where to Cache

| Layer | Use Case | Latency |
|-------|----------|---------|
| Browser | Static assets | ~0ms |
| CDN | Images, JS, CSS | ~10-50ms |
| Application (Redis) | API responses, sessions | ~1-5ms |
| Database query cache | Repeated identical queries | ~5-20ms |`,
  },
  {
    id: 'docker-containers',
    moduleId: 'docker',
    title: 'Containers vs Virtual Machines',
    summary: 'How Docker packages applications with dependencies and why containers dominate modern deployment.',
    realWorldExample: 'A FastAPI app runs identically on your laptop, CI server, and Kubernetes cluster because the Docker image includes Python 3.12, dependencies, and startup command.',
    commonMistakes: [
      'Running containers as root in production',
      'Storing data inside containers without volumes',
      'Creating huge images by not using multi-stage builds',
    ],
    interviewTips: [
      'Explain images vs containers vs registries',
      'Mention layers and caching for faster builds',
      'Connect Docker to K8s: containers are the unit K8s orchestrates',
    ],
    relatedVideoIds: ['docker-full', 'k8s-full'],
    content: `## Containers vs VMs

| | Virtual Machine | Container |
|--|-----------------|-----------|
| Isolation | Full OS per VM | Shared kernel, isolated namespaces |
| Startup | Minutes | Seconds |
| Size | GBs | MBs |
| Use case | Legacy apps, strong isolation | Microservices, CI/CD |

## Docker Core Concepts

- **Dockerfile** — recipe to build an image
- **Image** — immutable template (layers)
- **Container** — running instance of an image
- **Registry** — storage for images (Docker Hub, ECR, GCR)
- **Volume** — persistent storage outside container lifecycle

## Multi-Stage Build Example

\`\`\`dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

Final image contains only runtime — no build tools, smaller attack surface.`,
  },
  {
    id: 'distributed-cap',
    moduleId: 'distributed-systems',
    title: 'The CAP Theorem',
    summary: 'Consistency, Availability, Partition tolerance — and why you can only pick two during a network split.',
    analogy: 'During a phone network outage between two bank branches, you either stop transactions (sacrifice availability) or risk inconsistent balances (sacrifice consistency).',
    realWorldExample: 'Cassandra chooses AP (available + partition tolerant) — accepts eventually consistent writes during partition. Traditional RDBMS with synchronous replication leans CP — may reject writes to maintain consistency.',
    commonMistakes: [
      'Thinking CAP means pick 2 of 3 always (partition tolerance is not optional in distributed systems)',
      'Confusing consistency with ACID transactions',
      'Not knowing your database\'s default CAP leaning',
    ],
    interviewTips: [
      'Clarify: partitions WILL happen, so real choice is C vs A during partition',
      'Give concrete examples: Dynamo/AP, Spanner/CP, etcd/CP',
      'Mention PACELC extension for normal operation trade-offs',
    ],
    relatedVideoIds: ['ds-cap', 'ds-kafka'],
    content: `## The Three Properties

- **Consistency (C)**: Every read returns the most recent write (linearizability)
- **Availability (A)**: Every request gets a non-error response
- **Partition Tolerance (P)**: System works despite network failures between nodes

## The Trade-off

In a distributed system, **network partitions are inevitable** (P is required). During a partition, you must choose:

- **CP**: Reject requests to keep data consistent (e.g., etcd, ZooKeeper)
- **AP**: Accept requests, reconcile later (e.g., Cassandra, DynamoDB)

## PACELC Extension

When there's **no** partition (normal operation):
- **PA/EL**: If partition, choose A; else choose Latency vs Consistency
- Most systems optimize for low latency in normal case, consistency during partition

## Practical Implications

- Payment systems → favor consistency (CP)
- Social media feeds → favor availability (AP)
- Design idempotent operations for eventual consistency
- Use version vectors / CRDTs for conflict resolution`,
  },
  {
    id: 'react-hooks',
    moduleId: 'react',
    title: 'React Hooks Deep Dive',
    summary: 'useState, useEffect, useMemo, useCallback — when to use each and common pitfalls.',
    realWorldExample: 'A dashboard fetches user data on mount (useEffect), caches expensive chart calculations (useMemo), and passes stable callbacks to child components (useCallback) to prevent unnecessary re-renders.',
    commonMistakes: [
      'Missing dependency array items in useEffect',
      'Overusing useMemo/useCallback everywhere',
      'Calling hooks conditionally or in loops',
    ],
    interviewTips: [
      'Explain hooks as a way to use state/lifecycle in functional components',
      'Discuss when React re-renders and how to optimize',
      'Mention custom hooks for reusable logic',
    ],
    relatedVideoIds: ['react-hooks'],
    content: `## Core Hooks

**useState** — local component state
\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`

**useEffect** — side effects (fetch, subscriptions, DOM)
\`\`\`jsx
useEffect(() => {
  const sub = api.subscribe(id);
  return () => sub.unsubscribe(); // cleanup
}, [id]); // re-run when id changes
\`\`\`

**useMemo** — cache expensive computations
\`\`\`jsx
const sorted = useMemo(() => heavySort(data), [data]);
\`\`\`

**useCallback** — cache function references
\`\`\`jsx
const handleClick = useCallback(() => onClick(id), [id, onClick]);
\`\`\`

## Rules of Hooks

1. Only call at top level (not in conditions/loops)
2. Only call from React functions (components or custom hooks)

## Performance Tips

- Don't optimize prematurely — profile first
- useMemo/useCallback help when passing props to memoized children
- React 19+ improvements reduce need for manual memoization
- Consider React Query/SWR for server state instead of useEffect + useState`,
  },
  {
    id: 'networking-tcp',
    moduleId: 'networking',
    title: 'TCP vs UDP & the HTTP Stack',
    summary: 'Transport protocols, connection establishment, and how HTTP builds on TCP.',
    realWorldExample: 'Video streaming may use UDP (tolerates packet loss). API calls use TCP+HTTP (reliability matters). WebSockets upgrade HTTP connection for bidirectional real-time chat.',
    commonMistakes: [
      'Not understanding three-way handshake overhead',
      'Confusing HTTP/1.1 keep-alive with WebSockets',
      'Ignoring TLS handshake latency in performance analysis',
    ],
    interviewTips: [
      'Walk through what happens when you type a URL and press Enter',
      'Explain TCP guarantees: ordering, retransmission, flow control',
      'Compare HTTP/1.1, HTTP/2 (multiplexing), HTTP/3 (QUIC over UDP)',
    ],
    relatedVideoIds: ['net-tcp', 'net-http'],
    content: `## TCP vs UDP

| | TCP | UDP |
|--|-----|-----|
| Connection | Connection-oriented | Connectionless |
| Reliability | Guaranteed delivery, ordering | Best effort |
| Speed | Slower (handshake, ACKs) | Faster |
| Use cases | HTTP, databases, file transfer | DNS, video, gaming |

## TCP Three-Way Handshake

1. Client → SYN
2. Server → SYN-ACK
3. Client → ACK

Connection established. Tear-down uses FIN/ACK (four-way).

## HTTP on TCP

\`\`\`
Application Layer:  HTTP (GET /api/users)
Transport Layer:    TCP (port 443)
Network Layer:      IP (routing)
Link Layer:         Ethernet/WiFi
\`\`\`

## HTTPS = HTTP + TLS

TLS adds:
1. Certificate verification
2. Key exchange
3. Encrypted communication

First request to new domain pays TLS handshake cost (~1 RTT with TLS 1.3).`,
  },
];

export function getConceptsByModule(moduleId: string): DetailedConcept[] {
  return detailedConcepts.filter((c) => c.moduleId === moduleId);
}

export function getConceptById(id: string): DetailedConcept | undefined {
  return detailedConcepts.find((c) => c.id === id);
}

export function getConceptsForVideo(videoId: string): DetailedConcept[] {
  return detailedConcepts.filter((c) => c.relatedVideoIds.includes(videoId));
}
