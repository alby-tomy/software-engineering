import type { Module } from '../../types/curriculum';

export const python: Module = {
  id: 'python',
  title: 'Python — Zero to Expert',
  stage: 2,
  level: 'intermediate',
  icon: '🐍',
  description:
    'Master Python from fundamentals through async, concurrency, profiling, and production architecture. Critical for Micro1-style interviews.',
  prerequisites: ['cs-fundamentals'],
  learningObjectives: [
    'Explain Python memory management, GIL, and when threading helps',
    'Build production async applications with proper error handling',
    'Profile and optimize Python services from 500ms to 50ms',
    'Design worker architectures and handle 10k+ concurrent connections',
    'Defend technology choices with trade-off analysis',
  ],
  estimatedHours: 60,
  sections: [
    {
      id: 'memory-management',
      title: 'Python Memory Management',
      content: `### Reference Counting
Every Python object has a reference count. When it drops to 0, memory is freed immediately.

\`\`\`python
import sys
a = [1, 2, 3]
print(sys.getrefcount(a))  # Note: getrefcount itself adds a reference
\`\`\`

### Cyclic Garbage Collection
Reference counting fails on circular references. Python's \`gc\` module handles cycles in container objects.

### Object Interning
Small integers (-5 to 256) and some strings are interned (shared). This is why \`is\` vs \`==\` matters.

### Key objects live on the heap
Everything in Python is an object on the heap. Variables are references (names bound to objects).`,
      codeExamples: [
        {
          title: 'Mutable vs immutable traps',
          language: 'python',
          code: `# DANGER: mutable default argument
def append_to(item, lst=[]):  # lst created ONCE at definition
    lst.append(item)
    return lst

print(append_to(1))  # [1]
print(append_to(2))  # [1, 2] — surprise!

# SAFE pattern
def append_to_safe(item, lst=None):
    if lst is None:
        lst = []
    lst.append(item)
    return lst`,
          explanation: 'Default mutable arguments are evaluated once at function definition time.',
        },
      ],
    },
    {
      id: 'gil',
      title: 'The GIL — When It Matters',
      content: `### What is the GIL?
The Global Interpreter Lock allows only **one thread** to execute Python bytecode at a time per process.

### When GIL matters
- **CPU-bound** multi-threading: GIL prevents parallelism → use \`multiprocessing\`
- **I/O-bound** multi-threading: GIL released during I/O → threads help
- **Async**: Single-threaded event loop, no GIL contention for I/O

### When to use what
| Workload | Solution | Why |
|----------|----------|-----|
| I/O-bound, many connections | asyncio | Single thread, no GIL issue, low memory |
| I/O-bound, blocking libraries | threading | GIL released during I/O |
| CPU-bound | multiprocessing | Separate interpreters, true parallelism |
| CPU-bound, small tasks | concurrent.futures.ProcessPoolExecutor | Managed process pool |
| Mixed | asyncio + ProcessPoolExecutor | Async for I/O, processes for CPU |

**Interview answer template:** "For I/O-bound work with 10k connections, I'd use asyncio because... For CPU-bound image processing, I'd offload to a ProcessPoolExecutor because the GIL..."`,
      practicalExercise:
        'Benchmark: fibonacci(35) with threading (4 threads) vs multiprocessing (4 processes). Measure time and explain.',
    },
    {
      id: 'asyncio-deep',
      title: 'Asyncio Deep Dive',
      content: `### Event Loop
The event loop schedules coroutines. When a coroutine hits \`await\` on I/O, it yields control.

### Coroutine vs Task vs Future
- **Coroutine**: async function that can be paused/resumed
- **Task**: coroutine wrapped for scheduling on event loop
- **Future**: placeholder for a result that doesn't exist yet

### What \`await\` actually does
1. Suspends current coroutine
2. Registers I/O callback with OS (epoll/kqueue)
3. Event loop runs other ready coroutines
4. When I/O completes, resumes coroutine

### Common async pitfalls
1. **Blocking the event loop** — sync DB call, \`time.sleep()\`, CPU work
2. **Unbounded concurrency** — creating 100k tasks at once
3. **No timeouts** — hung connections accumulate
4. **No backpressure** — producer overwhelms consumer
5. **Fire-and-forget tasks** — exceptions silently lost`,
      codeExamples: [
        {
          title: 'Production async HTTP client with limits',
          language: 'python',
          code: `import asyncio
import aiohttp
from asyncio import Semaphore

async def fetch_with_limit(session, url, sem):
    async with sem:  # Limit concurrency
        try:
            async with asyncio.timeout(5):  # Timeout
                async with session.get(url) as resp:
                    return await resp.text()
        except asyncio.TimeoutError:
            return None
        except aiohttp.ClientError as e:
            # Log, don't crash
            return None

async def fetch_all(urls, max_concurrent=50):
    sem = Semaphore(max_concurrent)
    connector = aiohttp.TCPConnector(limit=max_concurrent)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch_with_limit(session, url, sem) for url in urls]
        return await asyncio.gather(*tasks, return_exceptions=True)`,
          explanation: 'Semaphore limits concurrency, timeout prevents hung requests, connector limits connections.',
        },
        {
          title: 'Running sync code in async context',
          language: 'python',
          code: `import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=4)

async def handle_request(data):
    loop = asyncio.get_event_loop()
    # Don't block the event loop
    result = await loop.run_in_executor(executor, cpu_intensive, data)
    return result

def cpu_intensive(data):
    # Heavy computation here
    return process(data)`,
          explanation: 'Use run_in_executor for blocking/CPU work. For heavy CPU, prefer ProcessPoolExecutor.',
        },
      ],
      practicalExercise:
        'Build an async script that fetches 100 URLs with max 10 concurrent, 5s timeout, and retry with exponential backoff (3 attempts).',
    },
    {
      id: 'decorators-descriptors',
      title: 'Decorators, Closures & Descriptors',
      content: `### Closures
A closure captures variables from its enclosing scope.

### Decorators
Syntactic sugar for \`func = decorator(func)\`. Used for logging, auth, caching, retry.

### Descriptors
Objects with \`__get__\` and/or \`__set__\`. Power properties, class methods, static methods.

### How attribute access works
1. Check instance \`__dict__\`
2. Check class \`__dict__\` (and MRO for inheritance)
3. Check descriptors on class
4. Call \`__get__\` if descriptor found
5. Return from class \`__dict__\` if not descriptor
6. Call \`__getattr__\` if defined`,
      codeExamples: [
        {
          title: 'Production retry decorator',
          language: 'python',
          code: `import functools
import asyncio
import random

def retry(max_attempts=3, base_delay=1.0, jitter=True):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(max_attempts):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    if attempt < max_attempts - 1:
                        delay = base_delay * (2 ** attempt)
                        if jitter:
                            delay *= (0.5 + random.random())
                        await asyncio.sleep(delay)
            raise last_exc
        return wrapper
    return decorator`,
        },
      ],
    },
    {
      id: 'profiling',
      title: 'Profiling & Optimization',
      content: `### CPU Profiling
- \`cProfile\` — function-level call counts and time
- \`py-spy\` — sampling profiler, works on running processes
- \`scalene\` — CPU + memory + GPU

### Memory Profiling
- \`tracemalloc\` — track allocations
- \`memory_profiler\` — line-by-line memory
- \`objgraph\` — object reference graphs

### Optimization hierarchy
1. **Algorithm** — O(n²) → O(n log n) beats micro-optimizations
2. **I/O** — reduce round trips, batch, cache
3. **Data structures** — right tool for the job
4. **Serialization** — orjson vs json, msgpack vs JSON
5. **Micro-optimizations** — last resort

**Senior answer:** "I'd profile first with py-spy on production. If 80% time is in DB queries, optimize queries. If in serialization, switch to orjson. If in algorithm, fix the algorithm."`,
      codeExamples: [
        {
          title: 'Quick profiling setup',
          language: 'python',
          code: `import cProfile
import pstats
from pstats import SortKey

def profile_function(func, *args, **kwargs):
    profiler = cProfile.Profile()
    profiler.enable()
    result = func(*args, **kwargs)
    profiler.disable()
    stats = pstats.Stats(profiler).sort_stats(SortKey.CUMULATIVE)
    stats.print_stats(20)  # Top 20 functions
    return result`,
        },
      ],
    },
    {
      id: 'python-fundamentals',
      title: 'Python Fundamentals — Must Know',
      content: `### Mutable vs Immutable
Mutable: list, dict, set. Immutable: int, float, str, tuple, frozenset.

### is vs ==
\`is\` checks identity (same object in memory). \`==\` checks equality (same value).

### List vs Tuple
List: mutable, slower, more memory. Tuple: immutable, hashable (can be dict key), faster iteration.

### Dictionary internals
Hash table with open addressing. O(1) average lookup. Keys must be hashable. Insertion order preserved (3.7+).

### *args and **kwargs
\*args: positional arguments as tuple. \*\*kwargs: keyword arguments as dict. Used for decorators, wrappers, flexible APIs.

### Generators vs Iterators
Generator: lazy, memory-efficient, uses \`yield\`. Iterator: object with \`__iter__\` and \`__next__\`. Generator is a type of iterator.

### Context managers
\`__enter__\` and \`__exit__\` methods. \`with\` statement guarantees cleanup. Use for files, locks, DB connections.`,
      codeExamples: [
        {
          title: 'Generator for memory-efficient processing',
          language: 'python',
          code: `def read_large_file(path):
    with open(path) as f:
        for line in f:  # Generator — one line in memory
            yield line.strip()

# Process 10GB file with constant memory
for line in read_large_file('huge.log'):
    process(line)`,
        },
      ],
      practicalExercise: 'Implement a context manager that times code execution and logs duration.',
    },
    {
      id: 'type-hints',
      title: 'Type Hints & Modern Python',
      content: `### Why type hints
- Catch bugs before runtime (mypy, pyright)
- Self-documenting code
- Better IDE support

### Common patterns
\`\`\`python
from typing import Optional, List, Dict, Union, Callable
from collections.abc import Sequence

def get_user(user_id: int) -> Optional[User]: ...
def process_items(items: Sequence[str]) -> list[str]: ...
\`\`\`

### dataclasses vs Pydantic
dataclasses: simple data containers. Pydantic: validation, serialization, settings management.

### Protocols (structural subtyping)
Define interface by behavior, not inheritance. "If it walks like a duck..."

### __slots__
Restrict attributes, reduce memory (~40% for many instances). Trade-off: no dynamic attributes.`,
    },
    {
      id: 'packaging',
      title: 'Packaging, Imports & Project Structure',
      content: `### Import machinery
1. Check sys.modules cache
2. Find module (sys.path, package __path__)
3. Load and execute module code
4. Cache in sys.modules

### Circular imports
Problem: module A imports B, B imports A. Fix: import inside function, restructure, or use TYPE_CHECKING.

### Project structure (production)
\`\`\`
app/
├── api/          # Route handlers
├── core/         # Config, security
├── models/       # DB models
├── schemas/      # Pydantic schemas
├── services/     # Business logic
├── repositories/ # Data access
└── main.py
\`\`\`

### Virtual environments
Always use venv/poetry. Never install globally. Pin dependencies in requirements.txt or pyproject.toml.`,
    },
  ],
  questions: [
    {
      id: 'py-q1',
      level: 'recall',
      question: 'What is the GIL?',
      answer:
        'The Global Interpreter Lock is a mutex that protects access to Python objects, preventing multiple threads from executing Python bytecode simultaneously in the same process.',
    },
    {
      id: 'py-q2',
      level: 'understanding',
      question: 'When does the GIL matter and when does it not?',
      answer:
        'GIL matters for CPU-bound multi-threading — threads cannot run Python code in parallel. GIL does NOT matter for I/O-bound threading (GIL released during I/O) or for asyncio (single-threaded event loop).',
      keyPoints: ['CPU-bound → multiprocessing', 'I/O-bound → threads/async OK'],
    },
    {
      id: 'py-q3',
      level: 'application',
      question: 'When would you choose async Python instead of threads?',
      answer:
        'Choose async when: (1) I/O-bound with thousands of concurrent connections, (2) you control the stack (async-compatible libraries), (3) memory efficiency matters (no per-thread stack). Choose threads when: (1) using blocking libraries you cannot change, (2) moderate concurrency (<100), (3) simpler mental model for team.',
    },
    {
      id: 'py-q4',
      level: 'debugging',
      question: 'Your async API suddenly has high latency. How would you investigate?',
      answer:
        '1) Check event loop blocking — log slow callbacks. 2) Use `asyncio debug mode`. 3) Profile with py-spy. 4) Check connection pool exhaustion. 5) Check downstream service latency. 6) Look for missing timeouts causing connection pile-up. 7) Check if sync code was introduced in async path. 8) Monitor active task count.',
      keyPoints: ['Event loop blocking', 'Connection pools', 'Downstream latency', 'Task accumulation'],
    },
    {
      id: 'py-q5',
      level: 'architecture',
      question: 'Design a high-throughput Python service handling 10,000 concurrent connections.',
      answer:
        'Architecture: Uvicorn with multiple workers (1 per CPU core) behind a load balancer. Each worker runs async event loop. Use connection pooling for DB (asyncpg). Redis for caching. Semaphore to limit per-worker concurrency. Circuit breakers for downstream services. Structured logging with correlation IDs. Health checks and graceful shutdown. Horizontal scaling with K8s HPA based on CPU/connection count.',
      keyPoints: ['Multi-worker uvicorn', 'Async DB driver', 'Connection pooling', 'Circuit breakers', 'Horizontal scaling'],
    },
    {
      id: 'py-q6',
      level: 'tradeoffs',
      question: 'When would you choose Python over Go, and when would you NOT?',
      answer:
        'Choose Python: rapid development, rich ML/data ecosystem, team expertise, FastAPI for APIs, scripting. Do NOT choose Python: ultra-low latency (<1ms), CPU-intensive without C extensions, memory-constrained environments, systems programming. Hybrid: Python for API layer, Go/Rust for performance-critical services.',
    },
    {
      id: 'py-q7',
      level: 'production',
      question: 'How would you safely use a synchronous database library inside async Python?',
      answer:
        'Options: (1) `run_in_executor` with ThreadPoolExecutor — simple but limited by thread count. (2) Dedicated thread pool per DB operation type. (3) Migrate to async driver (asyncpg, aiomysql). (4) Separate sync worker service communicating via queue. Best: async driver. Acceptable short-term: executor with bounded thread pool and monitoring.',
    },
    {
      id: 'py-q8',
      level: 'senior',
      question:
        'You receive 100,000 concurrent HTTP requests. Each calls 3 downstream services. One has 2s latency and 10% failure rate. Design the architecture.',
      answer:
        '1) Load balancer → N API pods (uvicorn workers). 2) Per-downstream circuit breakers (fail fast after threshold). 3) Aggressive timeouts (500ms fast services, 2s slow with budget). 4) Retry only idempotent ops, max 2 retries with jitter. 5) Bulkhead: separate connection pools per downstream. 6) Cache responses where possible (Redis, TTL). 7) Queue non-critical path to workers. 8) Rate limit per client. 9) Shed load when queue depth exceeds threshold. 10) Metrics: p50/p95/p99 per downstream, circuit state, queue depth. 11) Fallback responses for degraded mode.',
      keyPoints: ['Circuit breakers', 'Timeouts', 'Bulkheads', 'Caching', 'Load shedding', 'Observability'],
    },
    { id: 'py-q9', level: 'recall', question: 'What is the difference between a list and a tuple?', answer: 'List is mutable, uses more memory, cannot be dict key. Tuple is immutable, hashable (if all elements hashable), faster iteration, can be dict key.' },
    { id: 'py-q10', level: 'understanding', question: 'How does Python dictionary lookup work?', answer: 'Hash the key → index into hash table → handle collisions via open addressing. Average O(1). Worst case O(n) if all keys collide. Keys must be hashable (immutable).' },
    { id: 'py-q11', level: 'application', question: 'When would you use a generator over a list?', answer: 'Large/infinite datasets where you process one item at a time. Pipelines (read → transform → write). Memory-constrained environments. When you may not need all items.' },
    { id: 'py-q12', level: 'understanding', question: 'Explain reference counting and cyclic GC.', answer: 'Reference counting frees objects when count hits 0. Cycles (A→B→A) prevent count reaching 0. Generational cyclic GC detects and collects cycles in container objects periodically.' },
  ],
  seniorScenarios: [
    {
      title: 'Optimize API from 500ms to 50ms',
      scenario: 'Your FastAPI endpoint averages 500ms. Product needs 50ms. The endpoint reads from PostgreSQL and calls one external API.',
      approach:
        'Profile first. Typical findings: (1) N+1 queries → eager loading/joins. (2) Missing index → add composite index. (3) External API → cache with Redis (TTL 60s). (4) Serialization → orjson. (5) Connection pool too small → increase pool. (6) Cold start → keep-alive connections. (7) Over-fetching → select only needed columns.',
      keyConsiderations: [
        'Measure before optimizing',
        'Biggest bottleneck first (usually DB or network)',
        'Cache invalidation strategy',
        'Monitor p99 not just average',
      ],
      followUpQuestions: [
        'What if the external API cannot be cached?',
        'How do you handle cache stampede?',
      ],
    },
  ],
  resources: [
    { title: 'Python Documentation — asyncio', url: 'https://docs.python.org/3/library/asyncio.html', type: 'documentation' },
    { title: 'Real Python — Async IO', url: 'https://realpython.com/async-io-python/', type: 'article' },
    { title: 'Fluent Python (Book)', url: 'https://www.oreilly.com/library/view/fluent-python-2nd-edition/9781492056348/', type: 'book' },
  ],
};
