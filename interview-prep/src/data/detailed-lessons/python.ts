import { buildLesson } from '../content-format';

export const pythonLessons: Record<string, string> = {
  'python:memory-management': buildLesson({
    intro:
      'Python memory is not magic — reference counting, the cyclic GC, and object interning explain most "weird" bugs senior interviews love. This lesson walks through how objects live and die on the heap, and what that means for production code.',
    dialogues: [
      {
        q: 'How does Python actually free memory? I keep hearing reference counting but also garbage collection.',
        a: `Python uses **two complementary mechanisms**. Primary cleanup is **reference counting**: every object tracks how many references point to it. When \`a = [1,2,3]\` then \`del a\`, the count drops to zero and memory is freed immediately — no GC pause needed for that case.

**Cyclic garbage collection** handles the case reference counting cannot: circular references. If \`a = []; b = []; a.append(b); b.append(a)\` then \`del a; del b\`, neither list's count reaches zero because they reference each other. Python's \`gc\` module periodically scans container objects (lists, dicts, custom classes) and collects unreachable cycles.

For interviews, emphasize: **most objects die via refcount**. Cycles are the exception but common in graphs, linked structures, and parent-child models without weakrefs. Use \`gc.collect()\` rarely in production; fix the cycle or use \`weakref\` instead.`,
      },
      {
        q: 'What is object interning and why do people care about `is` vs `==`?',
        a: `**Interning** means Python keeps a single shared object for certain values. Small integers from **-5 to 256** are interned — \`x = 256; y = 256; x is y\` is often \`True\` because both names bind to the same object in memory. For \`257\`, CPython typically creates two objects, so \`is\` may be \`False\` while \`==\` is still \`True\`.

Some strings are interned too (identifiers, compile-time literals). **Never use \`is\` for value comparison** — use \`==\`. Use \`is\` only for singleton checks: \`x is None\`, \`x is not None\`.

In production, interning matters for memory when you have millions of duplicate small ints or strings — but the bigger interview topic is **mutable default arguments**:

\`\`\`python
def bad(item, lst=[]):
    lst.append(item)
    return lst
\`\`\`

The list is created **once** at function definition, not per call. Every caller shares the same list object. Fix with \`lst=None\` and create a new list inside the function.`,
      },
      {
        q: 'Everything is on the heap? What about local variables?',
        a: `In CPython, **variables are references** (names bound to objects). The **objects themselves** live on the heap — lists, dicts, integers, everything. What lives on the **stack** is the function's frame: local variable *names*, return addresses, and pointers to heap objects.

When you write \`x = 42\`, the integer object 42 may be interned on the heap; \`x\` in the stack frame points to it. When the function returns, the frame is popped; if nothing else references those objects, refcount drops and they may be freed.

**Interview insight:** High allocation rate in hot loops (creating millions of small objects) drives GC pressure and latency spikes. Reuse objects, use generators, or use \`__slots__\` on classes with millions of instances to cut per-object overhead.`,
      },
      {
        q: 'How would you debug a memory leak in a long-running Python service?',
        a: `Start with **metrics**: process RSS over time, correlation with traffic. A leak shows steady growth after GC should have stabilized.

**Tools:**
- \`tracemalloc\` — snapshot allocations, compare snapshots over time
- \`objgraph\` — find what types are growing, show reference chains
- \`memory_profiler\` — line-by-line for specific code paths

**Common leak sources:**
1. Global caches without TTL or max size
2. Event listener / callback lists that never remove handlers
3. Closure capturing large objects in long-lived callbacks
4. ORM session not closed, connection pool growth
5. \`lru_cache\` on functions with unbounded argument space

Fix the root cause (bounded cache, weakrefs, context managers), then verify RSS stabilizes under sustained load — not just after one request.`,
      },
    ],
    takeaways: [
      'Reference counting frees most objects immediately; cyclic GC handles container cycles',
      'Use `==` for values, `is` only for None checks — interning makes `is` misleading',
      'Mutable default arguments share one object across all calls — classic bug',
      'Profile with tracemalloc/objgraph before guessing at leaks',
    ],
    tip: 'When asked about Python memory, draw: names (stack frames) → references → objects (heap). Senior answers mention refcount + cyclic GC and give the mutable-default example.',
  }),

  'python:gil': buildLesson({
    intro:
      'The GIL is the most misunderstood topic in Python interviews. It is not "Python can\'t do concurrency" — it is "only one thread runs Python bytecode per process at a time." This lesson clarifies when that matters and what to use instead.',
    dialogues: [
      {
        q: 'What is the GIL in plain terms?',
        a: `The **Global Interpreter Lock (GIL)** is a mutex in CPython that ensures only **one thread executes Python bytecode** at a time within a single process. Even with 8 CPU cores and 8 threads, only one thread runs your Python code at any instant — others wait on the GIL.

The GIL exists because CPython's memory management (reference counting) is not thread-safe without it. Alternative Python implementations (Jython, PyPy with different configs) may not have a GIL, but **CPython is what production uses**.

Important nuance: the GIL is **released during many I/O operations** (socket read, file read, some C extension work). So threads waiting on network I/O do not block other threads from running Python code — that's why threading still helps for I/O-bound workloads.`,
      },
      {
        q: 'When does the GIL actually hurt me in production?',
        a: `**CPU-bound multi-threading** — the classic failure case. If each request does heavy JSON parsing, image resizing, or numeric loops in pure Python across 4 threads, you get **no speedup** on CPU — often worse due to GIL contention and context switching.

**Symptoms:** CPU at 100% on one core while others idle; threading added "for performance" but latency unchanged.

**When GIL does NOT hurt:**
- **asyncio** for thousands of I/O-bound connections (single thread, cooperative)
- **threading** for I/O-bound work with blocking libraries (GIL released during I/O)
- **multiprocessing** for CPU-bound parallelism (separate interpreters, separate GILs)

**Interview template:** "For 10k concurrent HTTP connections with async libraries, asyncio. For CPU-bound image processing, ProcessPoolExecutor. For legacy sync DB driver I can't change yet, threading with bounded pool."`,
      },
      {
        q: 'Why not always use multiprocessing instead of threading?',
        a: `Processes give **true parallelism** but cost more:
- **Memory**: each process has its own Python interpreter and heap — often 50–200MB+ per worker vs ~8MB stack per thread
- **Startup**: fork/spawn is slower than creating a thread
- **Communication**: shared state requires queues, pipes, or shared memory — not simple shared dicts
- **Serialization**: passing data between processes pickles objects

**Threading** shares memory — great when workers need the same connection pool config or cache, but requires locks for mutable shared state.

**Asyncio** shares one thread — lowest memory for high concurrency, but everything must be async-compatible or wrapped in executors.

Choose based on **workload + libraries + memory budget**, not ideology.`,
      },
      {
        q: 'How would you benchmark GIL impact for an interview scenario?',
        a: `Use a **CPU-bound** vs **I/O-bound** comparison:

\`\`\`python
import time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def fib(n):
    return n if n < 2 else fib(n-1) + fib(n-2)

def bench(executor_cls, workers=4):
    start = time.perf_counter()
    with executor_cls(max_workers=workers) as ex:
        list(ex.map(lambda _: fib(32), range(workers)))
    return time.perf_counter() - start
\`\`\`

For \`fib(32)\` CPU work: **ProcessPool** ~4× faster on 4 cores; **ThreadPool** ~same as sequential.

For fetching 100 URLs: **threads or asyncio** win; processes add overhead without benefit.

Report: workload type, hardware, library versions. Senior answer: "I'd profile production with py-spy — if hot functions are Python bytecode in tight loops, GIL is the bottleneck; if in \`socket.read\`, threading/async is fine."`,
      },
    ],
    takeaways: [
      'GIL: one thread runs Python bytecode per process — not a ban on all concurrency',
      'CPU-bound + threads in CPython → use multiprocessing or ProcessPoolExecutor',
      'I/O-bound → asyncio or threading; GIL released during I/O',
      'Processes cost memory and IPC; threads share memory but need synchronization',
    ],
    tip: 'Never say "Python is slow because of the GIL" without qualifying workload type. Interviewers want the decision matrix, not a sound bite.',
  }),

  'python:asyncio-deep': buildLesson({
    intro:
      'Asyncio is not "faster Python" — it is **cooperative concurrency on one thread**. Senior interviews probe whether you understand the event loop, what `await` actually does, and how to avoid blocking it.',
    dialogues: [
      {
        q: 'What happens when I `await` something? Walk through the event loop.',
        a: `When a coroutine hits \`await\`, it **suspends** and returns control to the **event loop**. The loop schedules other ready coroutines. Meanwhile, the awaited I/O is registered with the OS (epoll on Linux, kqueue on macOS) — the thread is not blocked spinning.

When the OS signals I/O complete, the loop resumes the coroutine from where it left off.

**Coroutine** = async function you can await. **Task** = coroutine scheduled on the loop (\`asyncio.create_task\`). **Future** = placeholder for a result, often wrapping I/O.

Critical rule: **anything that blocks the thread blocks the entire event loop** — \`time.sleep(5)\` in async code freezes all concurrent requests. Use \`await asyncio.sleep(5)\` instead.`,
      },
      {
        q: 'What are the most common asyncio bugs in production APIs?',
        a: `**1. Blocking the event loop** — sync DB calls, \`requests.get()\`, CPU work in \`async def\` without executor. Symptom: latency spikes for ALL endpoints when one is slow.

**2. Unbounded concurrency** — \`asyncio.gather(*[fetch(url) for url in million_urls])\` creates a million tasks. Memory explodes. Use **Semaphore** to cap concurrent in-flight work.

**3. No timeouts** — \`await client.get(url)\` with no timeout → hung connections accumulate forever. Always \`async with asyncio.timeout(5):\`.

**4. Fire-and-forget tasks** — \`asyncio.create_task(background_job())\` without tracking → exceptions silently lost. Store tasks, add done callbacks, or use structured concurrency.

**5. No backpressure** — producer faster than consumer → queue grows without bound.

Production pattern: semaphore + timeout + connection pool limits + gather with \`return_exceptions=True\`.`,
      },
      {
        q: 'How do I use sync libraries inside async code safely?',
        a: `Three options, ranked:

**1. Async-native driver (best)** — asyncpg, httpx async, aiomysql. No thread overhead, fits the event loop model.

**2. \`run_in_executor\` (acceptable short-term)** — offload blocking call to thread or process pool:

\`\`\`python
loop = asyncio.get_running_loop()
result = await loop.run_in_executor(
    thread_pool, sync_db_query, user_id
)
\`\`\`

Bound the pool size (e.g. 10–20 threads). Monitor queue depth — if all threads busy, you still block.

**3. Separate sync worker service** — API enqueues job, worker with sync stack processes. Best when migration to async is large.

**Never** call blocking code directly in \`async def\` — it blocks every other coroutine on that worker.`,
      },
      {
        q: 'Design fetching 100 URLs with max 10 concurrent, 5s timeout, retries.',
        a: `Senior implementation sketch:

\`\`\`python
async def fetch_with_retry(session, url, sem, max_attempts=3):
    async with sem:
        for attempt in range(max_attempts):
            try:
                async with asyncio.timeout(5):
                    async with session.get(url) as resp:
                        return await resp.text()
            except (asyncio.TimeoutError, aiohttp.ClientError):
                if attempt == max_attempts - 1:
                    return None
                await asyncio.sleep(2 ** attempt * 0.5)  # backoff
        return None

async def fetch_all(urls, max_concurrent=10):
    sem = asyncio.Semaphore(max_concurrent)
    connector = aiohttp.TCPConnector(limit=max_concurrent)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch_with_retry(session, u, sem) for u in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)
\`\`\`

Discuss: jitter on backoff, circuit breaker if host is down, logging failures with URL correlation ID, don't retry non-idempotent side effects.`,
      },
    ],
    takeaways: [
      '`await` yields to the event loop — blocking calls freeze all coroutines on that worker',
      'Cap concurrency with Semaphore; always set timeouts on I/O',
      'Prefer async drivers; use run_in_executor with bounded pools as bridge',
      'Track background tasks; unbounded gather is a memory bomb',
    ],
    tip: 'If they ask "async vs threads," say asyncio wins at 1000+ I/O connections with async stack; threads win with blocking libraries and moderate concurrency.',
  }),

  'python:decorators-descriptors': buildLesson({
    intro:
      'Decorators and descriptors are how Python implements `@property`, FastAPI dependencies, and half of framework magic. Understanding closures and the attribute lookup protocol separates senior Python from script writers.',
    dialogues: [
      {
        q: 'What is a decorator really? I use @app.get but struggle to write my own.',
        a: `A decorator is **syntactic sugar** for passing a function through another function:

\`\`\`python
@retry(max_attempts=3)
def fetch():
    ...

# Equivalent to:
def fetch():
    ...
fetch = retry(max_attempts=3)(fetch)
\`\`\`

The decorator function returns a **wrapper** that usually calls the original. Use \`functools.wraps(func)\` on the wrapper to preserve \`__name__\`, docstring, and signature for debugging and introspection.

**Parameterized decorators** need three levels: outer takes config, middle is the decorator, inner is the wrapper. Production decorators (retry, timing, auth) almost always use \`wraps\` and handle both sync and async functions — check \`asyncio.iscoroutinefunction\`.`,
      },
      {
        q: 'How do descriptors work? What is `__get__` and `__set__`?',
        a: `A **descriptor** is any object defining \`__get__\`, \`__set__\`, or \`__delete__\`. When you access \`obj.attr\`, Python follows the **descriptor protocol**:

1. Check \`type(obj).__dict__['attr']\` — if descriptor, call \`attr.__get__(obj, type(obj))\`
2. Else check \`obj.__dict__\`
3. Else check class hierarchy (MRO)
4. Else \`__getattr__\` if defined

\`@property\` creates a descriptor. **Data descriptors** (with \`__set__\`) take priority over instance \`__dict__\` — that's why you can't bypass a property by assigning to \`__dict__\` directly in normal use.

**Interview use case:** lazy-loaded attributes, validated fields, cached computed properties — all descriptors or descriptor-based (dataclasses, Pydantic fields).`,
      },
      {
        q: 'Write a production-quality retry decorator for async functions.',
        a: `Key requirements: configurable attempts, exponential backoff, jitter, preserve metadata, only retry specified exceptions:

\`\`\`python
import functools, asyncio, random

def async_retry(max_attempts=3, base_delay=1.0, exceptions=(Exception,)):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exc = e
                    if attempt < max_attempts - 1:
                        delay = base_delay * (2 ** attempt)
                        delay *= (0.5 + random.random())  # jitter
                        await asyncio.sleep(delay)
            raise last_exc
        return wrapper
    return decorator
\`\`\`

Discuss: don't retry on 4xx client errors, cap max delay, log each retry with attempt count, integrate with circuit breakers for downstream failures.`,
      },
      {
        q: 'When would you use a closure vs a class for a decorator?',
        a: `**Closure decorator** — simple, stateless wrappers (logging, timing, single-purpose auth check). Minimal boilerplate.

**Class decorator** — when the decorator needs **state** across calls: rate limiter tracking call counts, cache with TTL map, circuit breaker with failure counts. The class instance holds state; \`__call__\` is the wrapper.

**Class as decorated object** — \`@dataclass\`, ORM models: class itself is transformed.

For interviews: mention **descriptor-based validation** (Pydantic) vs **wrapper decorators** (FastAPI \`Depends\`) — different mechanisms solving different problems. Don't wrap everything in decorators — readability matters.`,
      },
    ],
    takeaways: [
      'Decorators are functions that return wrappers; always use functools.wraps',
      'Descriptors control attribute access — property, methods, framework field validation',
      'Parameterized decorators need three nested functions',
      'Use class-based decorators when you need persistent state (cache, rate limit)',
    ],
    tip: 'If asked to implement @memoize or @retry, start with wraps, mention async variant, and discuss which exceptions to retry.',
  }),

  'python:type-hints': buildLesson({
    intro:
      'Type hints are not runtime validation by default — they are contracts for humans, mypy, and IDEs. Senior engineers use typing to catch bugs at CI and to make APIs self-documenting.',
    dialogues: [
      {
        q: 'Why bother with type hints if Python is dynamically typed?',
        a: `Type hints catch bugs **before runtime** via static analysis (mypy, pyright, PyCharm). They document intent: \`def get_user(id: int) -> User | None\` tells readers exactly what goes in and out without reading the body.

They enable **better tooling** — autocomplete, refactoring, finding all callers of a changed signature.

They do **not** enforce types at runtime unless you use Pydantic, typeguard, or \`@beartype\`. CPython ignores hints for execution (except postponed evaluation with \`from __future__ import annotations\`).

In production teams, type hints in \`pyproject.toml\` strict mode + CI gate = fewer production \`AttributeError\` and \`None\` surprises.`,
      },
      {
        q: 'Explain Optional, Union, and the modern | syntax.',
        a: `**Optional[T]** means \`T | None\` — the value can be that type or None. Common for database lookups: \`Optional[User]\` = user or missing.

**Union[A, B]** (legacy) or **A | B** (Python 3.10+) — value can be either type. Prefer \`|\` for readability.

**Callable[[int, str], bool]** — function taking int and str, returning bool. Useful for callback parameters.

**Sequence[str]** vs **List[str]** — prefer \`Sequence\` for read-only parameters (accepts list and tuple). Use \`List\` when you need mutability.

**TypedDict** for dicts with known keys. **Protocol** for structural typing — "anything with a \`.read()\` method" without inheritance:

\`\`\`python
from typing import Protocol

class Readable(Protocol):
    def read(self) -> bytes: ...

def load(source: Readable) -> bytes:
    return source.read()
\`\`\``,
      },
      {
        q: 'dataclasses vs Pydantic — when to use each?',
        a: `**dataclasses** — lightweight data containers, \`@dataclass\` generates \`__init__\`, \`__repr__\`, optional \`frozen=True\` for immutability. No validation — if you pass \`age="twenty"\` it accepts it. Good for internal structures, simple DTOs.

**Pydantic (v2)** — validation, coercion, serialization to JSON, settings from env vars (\`BaseSettings\`). FastAPI request bodies use Pydantic. \`model_validate\` parses and validates in one step.

**Rule of thumb:**
- API boundaries, config, external data → **Pydantic**
- Internal domain objects, test fixtures → **dataclasses** (maybe with slots for memory)

**__slots__** on dataclasses reduces memory ~40% for millions of instances — trade-off: no dynamic attributes.`,
      },
      {
        q: 'How do type hints help in a FastAPI production codebase?',
        a: `FastAPI uses hints for **automatic validation**, **OpenAPI schema**, and **dependency injection**:

\`\`\`python
@app.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserResponse:
    ...
\`\`\`

\`user_id\` is validated as int. \`response_model\` filters output fields. \`Depends\` resolves types from hints.

CI runs mypy strict on \`services/\` and \`repositories/\` while FastAPI handles HTTP boundary validation. **Gradual typing** — start with public APIs, expand inward.

Interview point: types don't replace tests but catch entire classes of errors (wrong argument order, None not handled) cheaply.`,
      },
    ],
    takeaways: [
      'Type hints are for static analysis and documentation — not runtime unless Pydantic',
      'Use Protocol for duck typing, Sequence for read-only collections',
      'Pydantic at API/config boundaries; dataclasses for simple internal structs',
      'Enable mypy/pyright in CI on critical packages',
    ],
    tip: 'Mention `from __future__ import annotations` and that Python 3.12+ improves generic syntax — shows you follow modern Python.',
  }),

  'python:profiling': buildLesson({
    intro:
      'Senior engineers profile before optimizing. This lesson covers CPU and memory profiling tools, the optimization hierarchy, and how to answer "API is 500ms, need 50ms" systematically.',
    dialogues: [
      {
        q: 'What is the right order to optimize a slow Python endpoint?',
        a: `**Optimization hierarchy** (always mention this in interviews):

1. **Algorithm** — O(n²) → O(n log n) beats any micro-optimization
2. **I/O** — reduce round trips: batch queries, cache, connection pooling
3. **Data structures** — right tool: set vs list for membership, deque vs list for queues
4. **Serialization** — orjson vs json, msgpack vs JSON for internal services
5. **Micro-optimizations** — last resort: C extensions, NumPy, PyPy

**Never** skip to step 5. **Always** measure first: APM traces, \`EXPLAIN ANALYZE\`, py-spy on production.

Template: "I'd profile with py-spy on a live pod. If 80% time is in one DB query, fix the query. If in json.dumps, switch serializer. If in Python loop, fix algorithm."`,
      },
      {
        q: 'How do you use cProfile and py-spy in practice?',
        a: `**cProfile** — deterministic, function-level stats. Good in dev/staging:

\`\`\`python
import cProfile, pstats
from pstats import SortKey

profiler = cProfile.Profile()
profiler.enable()
handle_request()
profiler.disable()
stats = pstats.Stats(profiler).sort_stats(SortKey.CUMULATIVE)
stats.print_stats(20)
\`\`\`

Look at **cumulative** time (includes callees) and **per-call** time. Hot functions at top = candidates.

**py-spy** — sampling profiler, attaches to **running process** without restart. Critical for production: \`py-spy top --pid 1234\` or generate flame graphs.

**scalene** — CPU + memory + GPU in one tool, line-level.

Rule: profile under **realistic load** — single-request profiling misses lock contention and pool exhaustion.`,
      },
      {
        q: 'Walk through optimizing FastAPI from 500ms to 50ms.',
        a: `Typical findings from a read-heavy endpoint (PostgreSQL + external API):

1. **N+1 queries** — 50 queries × 10ms = 500ms. Fix: \`selectinload\`, single JOIN, or batch load.
2. **Missing index** — sequential scan on 10M rows. Fix: composite index on \`(user_id, created_at)\`.
3. **External API** — 200ms per call. Fix: Redis cache TTL 60s, cache-aside pattern.
4. **Serialization** — large ORM objects → dict → json. Fix: \`response_model\` with lean schema, orjson.
5. **Connection pool** — waiting 300ms for connection. Fix: increase pool, PgBouncer, check leak.
6. **Cold connections** — TLS + TCP each request. Fix: keep-alive, HTTP connection pooling.

Measure **p99** after each change — average latency hides tail problems. Document cache invalidation when adding Redis.`,
      },
      {
        q: 'How do you profile memory in Python?',
        a: `**tracemalloc** — track allocations by line:

\`\`\`python
import tracemalloc
tracemalloc.start()
# ... run workload ...
snapshot = tracemalloc.take_snapshot()
for stat in snapshot.statistics('lineno')[:10]:
    print(stat)
\`\`\`

Compare snapshots before/after to find growing lines.

**memory_profiler** — \`@profile\` decorator, line mem usage (dev only).

**objgraph** — \`objgraph.show_most_common_types()\` and reference chains to find what's holding objects.

Watch **per-request memory** at QPS — leaks show as RSS climb. Common: unbounded \`lru_cache\`, global list append, ORM loading full tables into lists.`,
      },
    ],
    takeaways: [
      'Profile first: algorithm → I/O → data structures → serialization → micro-opts',
      'py-spy for production CPU; tracemalloc/objgraph for memory',
      '500ms→50ms usually means N+1, missing index, or uncached external call',
      'Optimize p99, not just average latency',
    ],
    tip: 'When given a latency SLA, ask what the endpoint does before proposing fixes — shows you don\'t jump to "add Redis" for every problem.',
  }),

  'python:worker-architecture': buildLesson({
    intro:
      'High-throughput Python services combine async APIs, worker pools, queues, and horizontal scaling. This lesson covers architectures for 10k+ connections and how uvicorn workers, Celery, and message queues fit together.',
    dialogues: [
      {
        q: 'How do you architect a Python service for 10,000 concurrent connections?',
        a: `**Edge:** Load balancer (ALB/nginx) → multiple **stateless** API instances.

**Per instance:** Uvicorn with **multiple workers** (often 1 worker per CPU core — each worker is a separate process with its own event loop). Each worker handles thousands of async connections if code is truly non-blocking.

**Data layer:** asyncpg/SQLAlchemy async with **bounded connection pool** per worker. Redis for cache and rate limits. Never one DB connection per request.

**Resilience:** circuit breakers on downstream HTTP, timeouts on every external call, semaphore limiting in-flight work per worker.

**Observability:** structured logs with request ID, metrics for active connections, pool wait time, p99 latency.

Scale horizontally with K8s HPA on CPU or custom metric (connection count).`,
      },
      {
        q: 'When do you add background workers vs keeping everything in the API process?',
        a: `**Keep in API (async tasks)** — fast, idempotent side effects: send analytics event, update cache. Use \`asyncio.create_task\` with error handling or short queue in memory (risky at scale).

**Separate workers** — slow or heavy work: PDF generation, ML inference, bulk email, anything **seconds+** or **CPU-heavy**. Pattern: API writes job to **SQS/Redis/RabbitMQ** → worker pool consumes.

Benefits: API stays fast, workers scale independently, failures retried via queue semantics, blast radius isolation.

**Celery** is common in Python — define tasks, broker (Redis/RabbitMQ), workers with concurrency model (prefork for CPU, gevent/eventlet for I/O — know trade-offs).

Interview: "User uploads video → API validates, stores to S3, enqueues transcode job, returns 202 with job ID."`,
      },
      {
        q: 'How many uvicorn workers should I run?',
        a: `Common formulas:
- **CPU-bound sync endpoints:** workers ≈ CPU cores (GIL limits benefit of more)
- **Async I/O-bound:** often **1 worker per core** still — each worker's event loop handles many connections; more workers = more processes for isolation and CPU for C extensions

**Too many workers** → memory multiplication, DB connection explosion (workers × pool size).

Example: 4 cores, 4 uvicorn workers, pool size 5 each = 20 DB connections max. Coordinate with PgBouncer.

Use **graceful shutdown:** SIGTERM → stop accepting, drain in-flight, close pools. K8s \`preStop\` sleep helps LB drain connections.`,
      },
      {
        q: 'Design handling 100k concurrent requests with 3 downstream services.',
        a: `Layered defense:

1. **API gateway** — rate limit, auth, WAF
2. **N API pods** — async FastAPI, per-downstream circuit breakers
3. **Timeouts** — 500ms fast services, 2s budget for slow; total request budget enforced
4. **Bulkheads** — separate connection pools per downstream
5. **Cache** — Redis for read-heavy downstream data
6. **Queue** — non-critical path (analytics) async via Kafka/SQS
7. **Load shedding** — return 503 when internal queue depth exceeds threshold
8. **Retries** — only idempotent ops, max 2, exponential backoff + jitter
9. **Metrics** — p50/p95/p99 per downstream, circuit state, queue depth, pool wait

Mention fallback responses for degraded mode when one downstream is down.`,
      },
    ],
    takeaways: [
      'Stateless API + LB + async workers + bounded pools + horizontal scale',
      'Heavy/slow work → message queue + dedicated workers, not API thread',
      'Workers × pool size must fit DB connection budget — use PgBouncer',
      'Circuit breakers, timeouts, bulkheads, and load shedding at scale',
    ],
    tip: 'Draw the request path: Client → LB → API → cache → DB → queue → worker. Label each box with failure mode.',
  }),

  'python:production-patterns': buildLesson({
    intro:
      'Production Python is about graceful degradation, configuration, logging, and deploy safety — not just clean code. These patterns appear in every senior backend interview.',
    dialogues: [
      {
        q: 'What belongs in a production FastAPI/Python service besides routes?',
        a: `**Lifespan management** — startup: create DB pool, Redis client; shutdown: close cleanly.

**Structured logging** — JSON logs with \`request_id\`, \`user_id\`, latency. Not print statements.

**Health checks** — \`/health/live\` (process up) vs \`/health/ready\` (can serve traffic — DB ping OK).

**Configuration** — pydantic-settings from env, secrets from vault, never hardcoded.

**Middleware stack** — CORS, request ID injection, metrics, optional auth.

**Error handling** — consistent JSON errors, don't leak stack traces to clients, log full trace server-side.

**Dependency injection** — DB session per request, current user, config — testable boundaries.`,
      },
      {
        q: 'How do you implement graceful shutdown?',
        a: `On **SIGTERM** (K8s pod delete):

1. Stop accepting new connections (uvicorn handles this)
2. Wait for in-flight requests (with max deadline, e.g. 30s)
3. Close DB pool, Redis, HTTP client pools
4. Exit

K8s: set \`terminationGracePeriodSeconds\`, **readiness** probe fails when shutting down so LB stops sending traffic, **preStop hook** \`sleep 5\` for connection drain.

Async code: cancel background tasks, \`await asyncio.gather\` with return_exceptions, don't leave half-open transactions — rollback on shutdown.`,
      },
      {
        q: 'Explain circuit breaker pattern for Python HTTP clients.',
        a: `States: **Closed** (normal), **Open** (fail fast), **Half-open** (test one request).

After \`failure_threshold\` errors in window → **Open** — don't call failing service, return fallback or error immediately. After \`recovery_timeout\` → **Half-open** — one trial request; success → Closed, failure → Open again.

Implementation: library (tenacity + custom), or aiobreaker. **Per-downstream** breakers — don't let one bad service open breaker for everything.

Pair with **timeouts** shorter than client patience. Log state transitions for dashboards.

Python async: don't block the event loop while breaker is open — fail fast synchronously.`,
      },
      {
        q: 'What security and ops patterns should every Python API have?',
        a: `**Security:** HTTPS only, validate all input (Pydantic), auth on every route, rate limiting (slowapi or gateway), no secrets in code, dependency scanning in CI.

**Ops:** correlation IDs propagated to downstream calls, RED metrics (rate, errors, duration), alerting on SLO burn, distributed tracing (OpenTelemetry).

**Deploy:** blue-green or canary, backward-compatible DB migrations, feature flags for risky changes.

**Resilience:** idempotency keys for POST, retry only when safe, bulkhead pools, cache stampede protection.

Senior phrase: "Defense in depth — gateway rate limit + app auth + DB least privilege."`,
      },
    ],
    takeaways: [
      'Lifespan, structured logging, health checks, and config from env/secrets',
      'Graceful shutdown: drain requests, close pools, K8s preStop + readiness',
      'Circuit breakers per downstream — fail fast when dependency is unhealthy',
      'Correlation IDs, metrics, tracing, and secure defaults everywhere',
    ],
    tip: 'Pair production patterns with a concrete failure story: "When Redis died, cache-aside meant we degraded to DB, not outage."',
  }),

  'python:interview-scenarios': buildLesson({
    intro:
      'Capstone Python interview scenarios — latency optimization, concurrency choices, and architecture at scale. Practice thinking aloud with trade-offs and numbers.',
    dialogues: [
      {
        q: 'Python vs Go for a new backend — how do you decide?',
        a: `**Choose Python** when: team expertise, rapid iteration, ML/data integration, FastAPI for APIs, rich ecosystem (Celery, pandas), startup speed matters.

**Choose Go** when: ultra-low latency, high CPU throughput, simple deployment (single binary), strong concurrency without GIL, memory-efficient services at huge scale.

**Hybrid** — Python API layer + Go/Rust workers for hot paths (video processing, real-time aggregation).

Interview structure: state requirements → constraints → team → measure don't assume. "For 50k RPS read API with 20 engineers and ML features, Python + async is fine. For 200k RPS proxy with 3 engineers and strict p99, I'd prototype Go."

Never trash either language — show trade-off thinking.`,
      },
      {
        q: 'How do you safely use a sync database library in async FastAPI?',
        a: `Ranked options:

1. **Migrate to async driver** (asyncpg, databases) — best long-term
2. **\`run_in_executor\` + ThreadPoolExecutor** — bound pool (10–20), monitor queue wait
3. **Sync endpoints (\`def\`)** — FastAPI runs in thread pool (default 40 threads) — OK for low traffic
4. **Separate sync service** — queue between async API and sync workers

**Never** call sync DB inside \`async def\` without executor — blocks event loop.

Monitor: thread pool exhaustion shows as rising latency across ALL endpoints. Alert on active threads and pool checkout time.`,
      },
      {
        q: 'Your async API latency suddenly spikes 10×. Debug checklist?',
        a: `1. **Event loop blocked?** — asyncio debug mode, log slow callbacks
2. **Recent deploy** — sync code introduced in async path?
3. **py-spy** — what's running on CPU?
4. **Connection pools** — DB, Redis, HTTP client exhausted?
5. **Downstream slow** — one dependency timing out?
6. **Missing timeouts** — connections pile up
7. **Task explosion** — unbounded create_task / gather
8. **GC pause** — correlate latency spikes with gc logs
9. **Traffic pattern** — new client hammering endpoint?

Fix mitigation first (scale, circuit breaker), root cause second. Preserve profiling data before pod restart.`,
      },
      {
        q: 'Walk through the "500ms to 50ms" optimization scenario.',
        a: `**Profile first** — assume endpoint: PostgreSQL read + one external API.

Likely stack ranked fixes:
1. N+1 → eager load (biggest win often)
2. Missing composite index
3. Cache external API (Redis, TTL, stampede lock)
4. orjson + lean response schema
5. Pool sizing + PgBouncer
6. HTTP keep-alive to external API

**If external API can't be cached:** parallelize if independent, circuit breaker + fallback, negotiate SLA, or move data closer (replicate, batch API).

**Cache stampede:** mutex on rebuild, probabilistic early expiration, request coalescing.

Close with monitoring: "I'd alert on p99 > 100ms and cache hit ratio < 80%."`,
      },
      {
        q: 'What Python topics do senior interviews probe most?',
        a: `**Concurrency** — GIL, asyncio vs threads vs processes, blocking the event loop.

**Memory** — refcount, cycles, leaks, generators vs lists.

**Web** — async FastAPI, connection pools, worker model.

**Debugging** — production profiling without stopping the world.

**Architecture** — queues, workers, caching, circuit breakers at scale.

**Communication** — explain trade-offs with numbers, alternatives considered, failure modes.

Prepare 2-minute answers for each with a **real or realistic example** from your experience. Practice saying "I'd measure first" before any optimization claim.`,
      },
    ],
    takeaways: [
      'Python vs Go: team, ecosystem, latency SLA — hybrid architectures are valid',
      'Sync in async: async driver > executor > def endpoints > separate service',
      'Latency spikes: event loop blocking, pools, downstream, timeouts — profile live',
      'Optimization: profile → N+1/index/cache/serialization → monitor p99',
    ],
    tip: 'End architecture answers with observability: what metrics prove the design works and what alerts fire when it fails.',
  }),
};
