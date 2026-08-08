import { buildTextbookLesson } from '../textbook-format';

export const textbookPythonSystemsLessons: Record<string, string> = {
  'python:python-fundamentals': buildTextbookLesson({
    chapter: 'Python Fundamentals: Objects, Equality, and Core Data Structures',
    overview:
      'Python treats everything as an object on the heap, and understanding mutability, identity, and the built-in collection types is the foundation for writing correct, efficient code. This chapter explains how Python compares and stores values, how lists, tuples, and dictionaries behave internally, and how generators and context managers help you manage resources and memory. These concepts appear constantly in production debugging and senior-level interviews.',
    objectives: [
      'Distinguish identity (`is`) from equality (`==`) and explain when each is appropriate',
      'Compare mutable and immutable types and predict side effects when passing objects to functions',
      'Explain how dictionaries and lists are implemented and what that implies for time complexity',
      'Use `*args`/`**kwargs`, generators, and context managers idiomatically in real code',
    ],
    definitions: [
      {
        term: 'Mutable object',
        definition:
          'An object whose internal state can be changed after creation. Lists, dicts, and sets are mutable; modifying them in place affects every reference to that object.',
      },
      {
        term: 'Immutable object',
        definition:
          'An object that cannot be changed after creation. Integers, strings, tuples, and frozensets are immutable; operations that appear to modify them create new objects.',
      },
      {
        term: 'Identity',
        definition:
          'Whether two names refer to the exact same object in memory, tested with `is`. Equality (`==`) tests whether values compare equal, which may involve calling `__eq__`.',
      },
      {
        term: 'Generator',
        definition:
          'An iterator produced by a function containing `yield`, or by a generator expression. It lazily produces values one at a time without building the full sequence in memory.',
      },
    ],
    sections: [
      {
        title: 'Mutability and Immutability',
        content: `Every Python object is either **mutable** or **immutable**. Mutable objects can be changed in place: appending to a list modifies the same list object that every variable referencing it sees. Immutable objects cannot be altered — when you write \`s = "hello"; s += " world"\`, Python creates a new string object and rebinds the name \`s\`; the original \`"hello"\` object is unchanged.

This distinction matters most when passing objects to functions. If you pass a list and the function appends to it, the caller sees the change. If you pass a string and the function "modifies" it, the caller's string is untouched because the function only rebinds its local name. A classic interview trap is the **mutable default argument**:

\`\`\`python
def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket
\`\`\`

The list \`[]\` is created once at function definition time, not on each call. Every invocation shares the same list object. The fix is \`def add_item(item, bucket=None): bucket = bucket or []\`.

Tuples are immutable, but a tuple containing a mutable object (like a list) is still "shallowly" immutable — you cannot reassign the tuple's elements, but you can mutate the list inside it. Understanding shallow vs deep immutability prevents subtle bugs in caching and configuration objects.`,
      },
      {
        title: 'Identity vs Equality: `is` vs `==`',
        content: `Python provides two ways to compare objects. **Equality** (\`==\`) delegates to \`__eq__\` and answers "do these values mean the same thing?" **Identity** (\`is\`) answers "are these the exact same object in memory?"

Use \`==\` for almost all value comparisons. Use \`is\` only for singleton checks: \`x is None\`, \`x is not None\`. Never write \`if x is True\` — use \`if x:\` or \`if x is True\` only when you explicitly need to distinguish \`True\` from truthy values like \`1\`.

CPython **interns** small integers (-5 to 256) and some strings, so \`a = 256; b = 256; a is b\` may be \`True\` by implementation detail. Relying on this is undefined behavior across Python versions and implementations. \`a == b\` is always correct for value comparison.

Custom classes can override \`__eq__\` without overriding \`__hash__\`, which makes instances unhashable and breaks their use as dict keys or set members. If two objects compare equal, they must have the same hash (when hashable). Violating this invariant causes dict lookups to fail silently.`,
      },
      {
        title: 'Lists vs Tuples: When to Use Each',
        content: `Lists and tuples are both ordered sequences, but lists are **mutable** and tuples are **immutable**. Lists use a dynamic array internally: amortized O(1) append, O(1) index access, O(n) insert at the front. Tuples are fixed-size structs stored more compactly — they use less memory per element and are slightly faster to create and iterate.

Use **lists** when you need to grow, shrink, or modify the collection: accumulating results, building buffers, maintaining mutable state. Use **tuples** when the collection represents a fixed record: coordinates \`(x, y)\`, database rows, function return values with named structure. Tuples are hashable (if all elements are hashable), so they work as dict keys; lists do not.

Unpacking works identically for both: \`first, *rest = my_list\`. The starred expression collects remaining elements into a list. Tuple unpacking is the idiomatic way to swap variables: \`a, b = b, a\` creates a temporary tuple on the right side.

In APIs, returning a tuple signals "this is a fixed bundle of values"; returning a list signals "here is a collection you may modify." Choosing the right type communicates intent to future readers and static analysis tools.`,
      },
      {
        title: 'Dictionary Internals and Performance',
        content: `Since Python 3.7, dicts preserve **insertion order** as a language guarantee. Internally, CPython uses a **hash table** combining an open-addressed probe sequence with a compact index array. Keys must be hashable (implement \`__hash__\` and \`__eq__\` consistently). Average-case lookup, insert, and delete are O(1); worst-case degrades to O(n) if hash collisions cluster.

Dicts over-allocate to keep load factor below ~2/3, trading memory for speed. Iterating \`for k in d\` is O(n) and does not allocate a list of keys (unlike Python 2's \`.keys()\` in some contexts). **Dict comprehensions** \`{k: v for ...}\` build a new dict in one pass.

Common patterns: \`d.get(key, default)\` avoids KeyError; \`collections.defaultdict\` provides factory defaults; \`collections.Counter\` counts hashable elements. For ordered merging, \`d1 | d2\` (Python 3.9+) or \`{**d1, **d2}\` creates a new dict without mutating operands.

Watch for **hash collisions** with poorly distributed custom \`__hash__\` implementations. If all instances hash to the same value, every lookup becomes a linear scan. Use \`dataclasses.dataclass(frozen=True)\` or \`attrs\` for correct, efficient hashing of record types.`,
      },
      {
        title: '*args, **kwargs, Generators, and Context Managers',
        content: `**\`*args\`** collects extra positional arguments into a tuple; \`**kwargs\` collects extra keyword arguments into a dict. They are essential for writing wrappers and decorators:

\`\`\`python
def log_call(func):
  def wrapper(*args, **kwargs):
    print(f"Calling {func.__name__}")
    return func(*args, **kwargs)
  return wrapper
\`\`\`

Use \`functools.wraps(func)\` on the wrapper to preserve metadata. When forwarding arguments, \`func(*args, **kwargs)\` unpacks them back into positional and keyword form.

**Generators** produce values lazily. A function with \`yield\` suspends execution and resumes on the next \`next()\` call. Generator expressions \`(x*x for x in range(10**6))\` use far less memory than list comprehensions. \`yield from\` delegates to a sub-generator, flattening nested iteration.

**Context managers** guarantee setup and teardown via \`with\` statements. The protocol requires \`__enter__\` and \`__exit__\`. \`contextlib.contextmanager\` lets you write them with a generator decorated by \`@contextmanager\`, yielding once between setup and cleanup. Always use \`with open(...)\`, \`with lock:\`, and database transactions inside context managers — they run cleanup even when exceptions occur.`,
      },
    ],
    example: {
      title: 'Building a Pipeline with Generators and Context Managers',
      language: 'python',
      code: `from contextlib import contextmanager
from typing import Iterator

@contextmanager
def timed_block(label: str) -> Iterator[None]:
    import time
    start = time.perf_counter()
    try:
        yield
    finally:
        elapsed = time.perf_counter() - start
        print(f"{label}: {elapsed:.4f}s")

def read_lines(path: str) -> Iterator[str]:
    with open(path) as f:
        for line in f:
            yield line.rstrip()

def filter_nonempty(lines: Iterator[str]) -> Iterator[str]:
    for line in lines:
        if line:
            yield line

def parse_records(*fields: str, **options) -> dict:
    return {"fields": fields, "options": options}

with timed_block("pipeline"):
    lines = read_lines("data.log")
    active = filter_nonempty(lines)
    for i, line in enumerate(active):
        if i >= 1000:
            break
        record = parse_records(line, delimiter=",")`,
      explanation:
        'This example chains generators to process a large file without loading it into memory. The context manager guarantees timing output even if an exception occurs mid-pipeline. `*fields` and `**options` demonstrate flexible function signatures. In production, replace print-based timing with structured logging and metrics.',
    },
    pitfalls: [
      'Using `is` for value comparison — always use `==` except for `None` checks',
      'Mutable default arguments that share state across function calls',
      'Assuming tuple immutability extends to nested mutable objects inside the tuple',
    ],
    summary: [
      'Mutable objects can be changed in place; immutability means operations create new objects',
      'Use `==` for values and `is` only for `None` / identity checks',
      'Lists are for mutable sequences; tuples are for fixed, hashable records',
      'Dicts are hash tables with O(1) average lookup; keys must be hashable with consistent equality',
      'Generators and context managers manage memory and resources idiomatically',
    ],
    reviewQuestions: [
      {
        q: 'Why does `def f(x, items=[])` cause bugs, and how do you fix it?',
        hint: 'Think about when the default list object is created and how many references exist.',
      },
      {
        q: 'When would you choose a tuple over a list for a function return value?',
        hint: 'Consider immutability, hashing, memory, and signaling fixed structure to callers.',
      },
      {
        q: 'Explain what happens when a generator is exhausted and you call `next()` again.',
        hint: 'What exception is raised, and how does `for` loops handle this?',
      },
    ],
  }),

  'python:packaging': buildTextbookLesson({
    chapter: 'Python Packaging, Imports, and Project Structure',
    overview:
      'How Python finds and loads modules determines whether your project is maintainable or a tangle of import errors. This chapter covers the import system from first principles through circular-import workarounds, standard project layouts, and virtual environments. Senior engineers need to reason about packaging not just for libraries but for deployable services and monorepos.',
    objectives: [
      'Trace how Python resolves `import` statements from `sys.path` through loaders and finders',
      'Diagnose and fix circular import problems without resorting to fragile hacks',
      'Structure a Python project with clear package boundaries and entry points',
      'Configure and use virtual environments correctly in development and CI',
    ],
    definitions: [
      {
        term: 'Module',
        definition:
          'A single `.py` file (or extension module) that Python loads as a unit. The module object is cached in `sys.modules` after first import.',
      },
      {
        term: 'Package',
        definition:
          'A directory containing `__init__.py` (or a namespace package without it in PEP 420). Packages organize modules into hierarchies importable with dot notation.',
      },
      {
        term: 'Circular import',
        definition:
          'A situation where module A imports module B while B (directly or transitively) imports A before A finishes initializing, leaving partially initialized modules in `sys.modules`.',
      },
      {
        term: 'Virtual environment (venv)',
        definition:
          'An isolated Python installation with its own `site-packages` and scripts, allowing per-project dependency versions without polluting the system interpreter.',
      },
    ],
    sections: [
      {
        title: 'The Import Machinery',
        content: `When Python executes \`import foo\`, it consults **sys.meta_path** finders in order. The default **PathFinder** searches directories on **sys.path** — the script's directory, \`PYTHONPATH\`, and site-packages. For \`import foo.bar\`, Python loads package \`foo\` first (executing \`foo/__init__.py\`), then loads submodule \`bar\`.

Once a module is loaded, it lives in **sys.modules** under its full name. Subsequent imports return the cached module without re-executing top-level code. This is why side effects at import time are dangerous: they run once but affect global state permanently.

**Absolute imports** (\`from mypkg.utils import helper\`) are preferred. **Relative imports** (\`from .utils import helper\`) work only inside packages. Running a file directly as \`python mypkg/foo.py\` sets \`__name__\` to \`__main__\` and breaks relative imports — use \`python -m mypkg.foo\` instead.

**Import hooks** and **namespace packages** (directories without \`__init__.py\` on the path) allow splitting a logical package across multiple directories — common in large monorepos. Tools like **importlib** let you load modules from strings, zip files, or custom loaders for plugins.`,
      },
      {
        title: 'Circular Imports: Causes and Cures',
        content: `Circular imports occur when two modules need each other's symbols at import time. Module A starts loading, imports B, B imports A — but A is only half-initialized, so B sees missing attributes or raises ImportError.

**Symptoms:** \`ImportError: cannot import name 'X' from partially initialized module\`, or \`AttributeError\` on names that definitely exist in the source file.

**Fixes (in order of preference):**

1. **Restructure dependencies** — extract shared types or constants into a third module both sides import.
2. **Import inside functions** — defer the import until runtime when both modules are fully loaded. Use sparingly; it hides dependency structure.
3. **TYPE_CHECKING guard** — for type hints only:

\`\`\`python
from typing import TYPE_CHECKING
if TYPE_CHECKING:
    from mypkg.models import User
\`\`\`

4. **Lazy module attributes** — define expensive imports in \`__getattr__\` (PEP 562) at package level.

Avoid "import at bottom of file" as a permanent solution — it signals architectural debt. In interviews, explain that circular imports are a design smell and describe how you would refactor boundaries.`,
      },
      {
        title: 'Project Structure and Packaging Standards',
        content: `Modern Python projects typically use a **src layout**:

\`\`\`
myproject/
  pyproject.toml
  src/
    myproject/
      __init__.py
      api/
      core/
  tests/
\`\`\`

Installing with \`pip install -e .\` puts \`src/myproject\` on the path without polluting the repo root. This prevents accidentally importing from the working tree instead of the installed package — a common test-vs-production discrepancy.

**pyproject.toml** (PEP 621) declares metadata, dependencies, and build backend (\`hatchling\`, \`poetry-core\`, \`setuptools\`). **Entry points** define CLI commands:

\`\`\`toml
[project.scripts]
mycli = "myproject.cli:main"
\`\`\`

Separate **application code** from **library code**. Services add \`Dockerfile\`, config modules, and \`__main__.py\` or console scripts. Keep \`tests/\` outside \`src/\` so test utilities are not shipped. Use \`__all__\` or explicit re-exports in \`__init__.py\` to define public API surface.

For monorepos, tools like **uv**, **poetry**, or **pants** manage multiple packages with workspace dependencies. The key principle: one direction of dependency flow — core domain never imports from HTTP handlers.`,
      },
      {
        title: 'Virtual Environments in Practice',
        content: `A **venv** creates \`bin/python\` (symlink to base interpreter), \`lib/pythonX.Y/site-packages/\`, and activation scripts. \`python -m venv .venv\` is the standard creation command. Activate with \`source .venv/bin/activate\` (Unix) so \`which python\` points inside the project.

**Never commit .venv** to git — add it to \`.gitignore\`. Commit **lock files** (\`uv.lock\`, \`poetry.lock\`, or pinned \`requirements.txt\`) for reproducible CI and production builds.

In **Docker**, create venv inside the image or install directly to system site-packages in slim images — consistency matters more than local dev ergonomics. Multi-stage builds: compile dependencies in a builder stage, copy only site-packages and app code to the runtime image.

**pyenv** manages Python versions; **venv** manages packages per project. Use both: \`pyenv local 3.12.4\` then \`python -m venv .venv\`. CI should pin the same Python minor version and install from lock file with \`pip install -r requirements.txt\` or \`uv sync\`.

Common mistake: running \`pip install\` globally, then wondering why the IDE or cron job sees different packages. Always verify \`python -c "import sys; print(sys.executable)"\` matches your intent.`,
      },
    ],
    example: {
      title: 'Refactoring a Circular Import',
      language: 'python',
      code: `# Before (broken):
# models.py imports from services.py
# services.py imports from models.py

# After — shared/contracts.py
from dataclasses import dataclass
from typing import Protocol

@dataclass
class UserDTO:
    id: int
    email: str

class UserRepository(Protocol):
    def get(self, user_id: int) -> UserDTO: ...

# models.py — concrete ORM, no service imports
# services.py — imports UserDTO and UserRepository from contracts
# main.py wires concrete repository into services`,
      explanation:
        'Extracting protocols and DTOs into a dependency-free module breaks the cycle. Services depend on abstractions; models implement them. This mirrors dependency inversion and is the answer interviewers want when they ask about circular imports at scale.',
    },
    pitfalls: [
      'Running package modules as scripts (`python pkg/mod.py`) instead of `python -m pkg.mod`',
      'Import-time side effects (DB connections, config loading) that make testing and circular imports worse',
      'Mixing system Python and venv pip, installing packages to the wrong interpreter',
    ],
    summary: [
      'Imports consult sys.path finders; loaded modules are cached in sys.modules',
      'Circular imports indicate coupling — refactor shared code into a neutral module',
      'Use src layout, pyproject.toml, and entry points for maintainable packages',
      'Virtual environments isolate dependencies; lock files ensure reproducibility',
      'Verify sys.executable matches the environment you think you are using',
    ],
    reviewQuestions: [
      {
        q: 'What is the difference between `import foo` and `from foo import bar` in terms of what gets bound in the current namespace?',
        hint: 'Consider whether the name `foo` exists locally and what happens on subsequent attribute access.',
      },
      {
        q: 'Why is the src layout recommended over flat project roots?',
        hint: 'Think about accidental imports during development vs installed package behavior.',
      },
      {
        q: 'How would you debug "partially initialized module" in a large codebase?',
        hint: 'Trace the import chain and identify which top-level statements run before the cycle completes.',
      },
    ],
  }),

  'concurrency:worker-pools': buildTextbookLesson({
    chapter: 'Worker Pools, Backpressure, and Production Architecture',
    overview:
      'Worker pools bound parallelism, queue work, and isolate failures — they are the backbone of concurrent services from web servers to data pipelines. This chapter explains how to size pools, apply backpressure when producers outrun consumers, and design architectures that degrade gracefully under load rather than collapsing.',
    objectives: [
      'Explain the anatomy of a worker pool and how it differs from unbounded thread spawning',
      'Implement backpressure strategies when queues grow faster than workers can drain them',
      'Size worker pools based on workload type (CPU-bound vs I/O-bound) and resource limits',
      'Design graceful shutdown and observability for pool-based systems in production',
    ],
    definitions: [
      {
        term: 'Worker pool',
        definition:
          'A fixed set of worker threads or processes that pull tasks from a shared queue, execute them, and return results — amortizing creation cost and capping concurrency.',
      },
      {
        term: 'Backpressure',
        definition:
          'A mechanism that slows or blocks producers when downstream consumers cannot keep pace, preventing unbounded memory growth and latency explosion.',
      },
      {
        term: 'Little\'s Law',
        definition:
          'In steady state, average queue depth L = arrival rate λ × average wait time W. Growing queues without increasing throughput mean rising latency.',
      },
    ],
    sections: [
      {
        title: 'Anatomy of a Worker Pool',
        content: `A worker pool consists of **N workers**, a **task queue**, and optionally a **result channel**. Producers submit work; workers block on the queue (or poll with timeout), execute tasks, and acknowledge completion. Creating threads on every request would thrash the OS scheduler and exhaust memory; pools reuse workers.

**Thread pools** share address space — ideal for I/O-bound work with shared caches and connection pools. **Process pools** isolate memory and bypass Python's GIL for CPU-bound tasks, at the cost of IPC and higher memory footprint.

Frameworks embed pools: Gunicorn/uWSGI worker processes, database connection pools, \`ThreadPoolExecutor\` and \`ProcessPoolExecutor\` in Python's \`concurrent.futures\`. The pattern is identical: bounded parallelism, centralized queue, standardized lifecycle.

Key metrics: **queue depth**, **active workers**, **task latency** (queue wait + execution), and **rejection rate** when the pool is saturated. Without metrics, you cannot tell whether slowness is insufficient workers or slow tasks.`,
      },
      {
        title: 'Backpressure Strategies',
        content: `When arrivals exceed service rate, the queue grows without bound unless you apply **backpressure**. Strategies fall on a spectrum:

**Bounded queue with blocking submit** — producers block when the queue is full. Simple and memory-safe, but blocked producers may hold connections or threads upstream, causing cascading stalls.

**Bounded queue with rejection** — \`submit()\` raises or returns an error when full. Callers must retry with jitter or return HTTP 503. Requires client cooperation.

**Adaptive shedding** — drop low-priority work (sampled logs, optional prefetch) while preserving critical path. Used in overload protection at API gateways.

**Rate limiting at ingress** — token bucket or leaky bucket limits arrivals before they hit the pool. Combined with queue bounds, this caps end-to-end latency.

In distributed systems, backpressure propagates via **HTTP 429**, **gRPC RESOURCE_EXHAUSTED**, or **Kafka consumer lag** triggering partition rebalancing. The principle is universal: **fail fast or slow down early** rather than accumulate debt in hidden buffers.`,
      },
      {
        title: 'Sizing and Workload Matching',
        content: `Pool size is not "number of CPU cores" universally. For **CPU-bound** work, start with **N = CPU cores** (or cores - 1 to leave headroom for OS). More threads than cores add context-switch overhead without throughput gain.

For **I/O-bound** work (HTTP calls, DB queries), workers spend most time waiting. Size based on **target concurrency** and **downstream limits**: if your DB allows 50 connections and each task holds one for its duration, a 200-thread pool will exhaust the pool and queue at the database instead of your app.

Use **Little's Law** for capacity planning: if tasks arrive at 1000/sec and each takes 50ms, you need ~50 in-flight tasks on average to keep up (\`L = λW\`). Add buffer for bursts.

**Separate pools** for different workload classes — never let batch jobs starve interactive requests. Netflix and similar architectures use bulkhead thread pools per dependency. Mixed pools create head-of-line blocking where one slow task type stalls everything.`,
      },
      {
        title: 'Production Architecture Patterns',
        content: `Production pool architectures layer concerns:

**Ingress** — load balancer with health checks, rate limits, request timeouts.

**Worker tier** — stateless workers pulling from a durable queue (SQS, RabbitMQ, Redis Streams) or in-memory queue for same-process work.

**Observability** — structured logs with task IDs, distributed tracing across submit → execute → callback, Prometheus gauges for queue depth and pool utilization.

**Graceful shutdown** — on SIGTERM, stop accepting new tasks, drain the queue with a deadline, then terminate workers. Kubernetes sends SIGTERM before SIGKILL; ignoring this causes dropped work mid-flight.

**Idempotency** — tasks may retry after worker crash. Design handlers to tolerate duplicate execution with idempotency keys or deduplication stores.

Anti-pattern: **unbounded \`asyncio.create_task\`** without semaphores — it is an invisible unbounded pool. Use \`asyncio.Semaphore\` or bounded executors to mirror thread-pool discipline in async code.`,
      },
    ],
    example: {
      title: 'Bounded Thread Pool with Backpressure in Python',
      language: 'python',
      code: `from concurrent.futures import ThreadPoolExecutor
import queue
import time

class BoundedExecutor:
    def __init__(self, max_workers: int, max_queue: int):
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._semaphore = queue.Semaphore(max_workers + max_queue)

    def submit(self, fn, *args, **kwargs):
        if not self._semaphore.acquire(blocking=False):
            raise RuntimeError("pool saturated — apply backpressure")
        fut = self._executor.submit(self._wrap, fn, *args, **kwargs)
        return fut

    def _wrap(self, fn, *args, **kwargs):
        try:
            return fn(*args, **kwargs)
        finally:
            self._semaphore.release()

    def shutdown(self, wait=True):
        self._executor.shutdown(wait=wait)

pool = BoundedExecutor(max_workers=4, max_queue=16)
try:
    pool.submit(lambda: time.sleep(0.1))
except RuntimeError:
  pass  # return 503 to client`,
      explanation:
        'The semaphore counts in-flight plus queued work. Non-blocking acquire implements rejection backpressure. In production, replace RuntimeError with metrics increment and structured error responses; wire shutdown to drain in-flight tasks on deploy.',
    },
    pitfalls: [
      'Oversized pools that overwhelm downstream databases or APIs without their own limits',
      'Unbounded queues that mask overload until the process OOMs',
      'Ignoring graceful shutdown — dropped tasks on deploy cause duplicate side effects without idempotency',
    ],
    summary: [
      'Worker pools cap concurrency and reuse expensive worker creation',
      'Backpressure prevents unbounded queues — block, reject, or shed load explicitly',
      'Size pools by workload: CPU cores for compute, I/O limits for network/DB-bound work',
      'Use separate pools per workload class to avoid head-of-line blocking',
      'Instrument queue depth, latency, and rejection; drain on shutdown',
    ],
    reviewQuestions: [
      {
        q: 'Why might doubling thread pool size not improve throughput?',
        hint: 'Consider GIL, downstream bottlenecks, and context-switch overhead.',
      },
      {
        q: 'Compare blocking submit vs rejection when the queue is full.',
        hint: 'Who bears the cost — producer threads, clients, or memory?',
      },
      {
        q: 'How does Little\'s Law help you estimate required pool size?',
        hint: 'Relate arrival rate, service time, and average in-flight work.',
      },
    ],
  }),

  'concurrency:debugging': buildTextbookLesson({
    chapter: 'Debugging Concurrent Systems: Races, Tools, and Investigation',
    overview:
      'Concurrent bugs are non-deterministic — they may not reproduce on demand, yet they corrupt data and cause outages in production. This chapter teaches how race conditions arise, which tools expose them, and a systematic investigation workflow you can apply from thread dumps to distributed traces.',
    objectives: [
      'Classify concurrency defects: data races, deadlocks, livelock, and starvation',
      'Use thread dumps, sanitizers, and race detectors appropriate to your language runtime',
      'Follow a structured investigation from symptom to root cause without guessing',
      'Design tests and code patterns that make concurrent bugs more reproducible',
    ],
    definitions: [
      {
        term: 'Race condition',
        definition:
          'A defect where correctness depends on the interleaving of concurrent operations; different schedules produce different outcomes, often including corruption or lost updates.',
      },
      {
        term: 'Deadlock',
        definition:
          'A state where two or more threads each hold a lock the other needs, and all block forever waiting for resources that will never be released.',
      },
      {
        term: 'Happens-before',
        definition:
          'A formal ordering relation: if action A happens-before B, then B observes all effects of A. Locks, volatile writes, and channel sends establish happens-before edges.',
      },
    ],
    sections: [
      {
        title: 'Race Conditions and Memory Models',
        content: `A **race condition** occurs when multiple threads access shared mutable state without synchronization, and at least one access is a write. The classic **lost update**: two threads read \`counter = 5\`, both increment, both write \`6\` — the correct result \`7\` never appears.

Languages define **memory models** specifying which reorderings compilers and CPUs may perform. Java and C++ have formal models; Python's GIL serializes bytecode but **does not** make compound operations atomic — \`counter += 1\` is read-modify-write and can interleave across threads between bytecodes in theory, and definitely across processes.

**Check-then-act** races are subtler: \`if key not in cache: cache[key] = load()\` — two threads may both miss and double-load. Fix with locks, \`dict.setdefault\`, or concurrent data structures (\`concurrent.futures\` does not fix this; \`threading.Lock\` or \`asyncio.Lock\` does).

**Publication safety** — one thread constructs an object while another reads a reference without synchronization may see partially initialized state. Immutable objects or proper synchronization (locks, volatile, final fields) establish safe publication.`,
      },
      {
        title: 'Deadlocks, Livelocks, and Starvation',
        content: `**Deadlock** requires four conditions (Coffman): mutual exclusion, hold-and-wait, no preemption, circular wait. Break any one — most commonly **lock ordering**: always acquire \`lock_A\` before \`lock_B\` globally.

**Deadlock detection** in production: thread dumps show cycles ("Thread-1 waiting for lock held by Thread-2..."). JVM \`jstack\`, Python \`faulthandler.dump_traceback\`, Go \`pprof\` goroutine profiles.

**Livelock** — threads actively respond to each other but make no progress (two people squeezing past each other in a hallway). **Starvation** — a thread never acquires a resource because others monopolize it. Fair locks and separate queues mitigate starvation.

**Lock granularity** trade-off: coarse locks simplify reasoning but reduce parallelism; fine locks increase throughput but deadlock risk grows. **Lock-free** structures (atomic CAS loops) avoid blocking but are harder to verify — use only when profiling proves mutex contention is the bottleneck.`,
      },
      {
        title: 'Tools for Finding Concurrency Bugs',
        content: `**Thread dumps / stack traces** — first tool in production. Capture multiple dumps seconds apart; threads stuck in the same lock frame indicate deadlock or severe contention.

**Sanitizers and detectors:**
- C/C++: **ThreadSanitizer (TSan)** — dynamic race detection at runtime
- Go: **race detector** (\`-race\` flag) — instruments memory accesses
- Java: **FindBugs/SpotBugs**, **jcstress** for concurrency tests
- Python: limited native race detection; use **heuristic stress tests** and logging

**Stress testing** — run tests thousands of times with varied thread counts (\`pytest-repeat\`, \`go test -count=1000\`). Inject random sleeps to widen interleavings.

**Record-and-replay** debuggers (rr for C++, some JVM tools) capture one failing schedule and replay deterministically — invaluable when bugs reproduce once per million runs.

**Distributed tracing** (Jaeger, Zipkin) exposes cross-service races: duplicate writes, out-of-order message processing, missing idempotency. Not all concurrency is in-process.`,
      },
      {
        title: 'Systematic Investigation Steps',
        content: `When a concurrent bug is suspected, follow this workflow:

1. **Characterize the symptom** — corrupted data, intermittent 500s, stuck requests, duplicate charges? Note frequency and correlation with load.

2. **Identify shared mutable state** — list globals, caches, singletons, connection pools, files. Who reads? Who writes?

3. **Map synchronization** — which locks, atomics, channels, or DB transactions protect each path? Draw a diagram if more than two actors.

4. **Reproduce under control** — reduce parallelism, add logging with thread/goroutine IDs, inject barriers. Binary search which concurrent feature triggers the bug (disable thread pool, run sequential).

5. **Confirm with tools** — enable race detector in CI for Go/C++; TSan in debug builds; compare thread dumps before and after fix.

6. **Fix and verify** — prefer immutable data, message passing, or single-writer patterns over ad-hoc locking. Add regression test that failed before fix.

Document **invariants** ("balance never negative") and assert them in debug builds. Concurrent code without documented invariants is unmaintainable.`,
      },
    ],
    example: {
      title: 'Reproducing a Lost Update',
      language: 'python',
      code: `import threading

counter = 0
lock = threading.Lock()

def unsafe_increment():
    global counter
    for _ in range(100_000):
        counter += 1  # not atomic

def safe_increment():
    global counter
    for _ in range(100_000):
        with lock:
            counter += 1

# unsafe: final counter often << 200_000
# safe: final counter == 200_000

threads = [threading.Thread(target=safe_increment) for _ in range(2)]
for t in threads:
    t.start()
for t in threads:
    t.join()
print(counter)`,
      explanation:
        'The unsafe version demonstrates lost updates under contention. The fix serializes read-modify-write with a lock. For high-throughput counters, use `threading.atomic` patterns via `itertools` or delegate to a single writer goroutine/thread receiving increment messages.',
    },
    pitfalls: [
      'Assuming "it works on my machine" proves thread safety — low load hides races',
      'Holding locks while calling external services — causes deadlocks and pool exhaustion',
      'Fixing symptoms (retry loops) without identifying the shared state race',
    ],
    summary: [
      'Races require shared mutable state and unsynchronized concurrent access',
      'Deadlocks need circular lock waits — enforce global lock ordering',
      'Use language-specific race detectors in CI and stress tests with injected delays',
      'Investigate systematically: symptom → shared state → synchronization → reproduce → verify',
      'Prefer immutability and message passing over shared-memory locking when practical',
    ],
    reviewQuestions: [
      {
        q: 'Why is `counter += 1` unsafe in Python with multiple threads despite the GIL?',
        hint: 'Think about read-modify-write as multiple bytecodes and when the GIL switches.',
      },
      {
        q: 'What four conditions must hold for a deadlock to occur?',
        hint: 'Coffman conditions — which one do lock ordering strategies break?',
      },
      {
        q: 'How would you use two thread dumps taken 30 seconds apart to diagnose a stuck service?',
        hint: 'Look for threads blocked on the same lock or waiting on the same I/O.',
      },
    ],
  }),

  'go:concurrency': buildTextbookLesson({
    chapter: 'Go Concurrency: Goroutines, Channels, and Select',
    overview:
      'Go was designed around concurrency as a first-class concern — goroutines and channels are not bolt-on libraries but language primitives with clear philosophy. This chapter explains how lightweight goroutines differ from OS threads, how channels communicate and synchronize, and how `select` multiplexes channel operations.',
    objectives: [
      'Explain goroutine scheduling and when goroutines are appropriate vs threads or processes',
      'Use buffered and unbuffered channels correctly for synchronization and data transfer',
      'Apply `select` for timeouts, cancellation, and non-blocking operations',
      'Articulate Go\'s concurrency motto: "Do not communicate by sharing memory; share memory by communicating"',
    ],
    definitions: [
      {
        term: 'Goroutine',
        definition:
          'A lightweight concurrent function started with `go`. Scheduled by the Go runtime on OS threads (M:N model), goroutines start with a small stack that grows as needed.',
      },
      {
        term: 'Channel',
        definition:
          'A typed conduit for sending and receiving values between goroutines. Unbuffered channels synchronize sender and receiver; buffered channels decouple them up to capacity.',
      },
      {
        term: 'Select',
        definition:
          'A control structure like `switch` for channel operations — blocks until one of several send/receive cases can proceed, or default runs non-blocking.',
      },
    ],
    sections: [
      {
        title: 'Goroutines and the Go Scheduler',
        content: `A **goroutine** is a function executing concurrently with others. Prefix any function call with \`go\`: \`go fetch(url)\`. Thousands of goroutines are practical — each starts with ~2–8 KB stack vs ~1 MB for OS threads.

The **Go scheduler** multiplexes goroutines onto **GOMAXPROCS** OS threads (default: number of CPU cores). When a goroutine blocks on channel I/O or syscall, the runtime parks it and runs another on the same thread. This makes goroutines cheap for I/O-bound and structured concurrency.

**Leak prevention:** every goroutine must eventually terminate or be cancellable via **context**. A common leak: goroutine blocked sending on an unbuffered channel with no receiver. Always pair producers with consumers and use \`context.Context\` for lifecycle.

**WaitGroups** (\`sync.WaitGroup\`) coordinate completion: \`wg.Add(1)\` before \`go\`, \`defer wg.Done()\` in goroutine, \`wg.Wait()\` in main. Do not copy WaitGroup after first use.`,
      },
      {
        title: 'Channels: Synchronization and Data Flow',
        content: `**Unbuffered channels** (\`make(chan int)\`) synchronize: the sender blocks until the receiver is ready, and vice versa. They implement a **handoff** — the sender cannot proceed until the value is received. Use for signaling completion or passing ownership.

**Buffered channels** (\`make(chan int, 10)\`) accept sends up to capacity without a waiting receiver. They implement a **queue** — useful for worker pools and decoupling bursty producers. Buffer size is a design choice: zero enforces sync; large buffers hide backpressure.

**Closing channels** signals "no more values." Receivers get zero value plus \`ok := false\` on closed channel. Only the sender should close. Ranging \`for v := range ch\` drains until close.

**Directional channel types** (\`chan<- int\` send-only, \`<-chan int\` receive-only) document intent in function signatures and prevent misuse at compile time.`,
      },
      {
        title: 'Select: Multiplexing and Timeouts',
        content: `\`select\` waits on multiple channel operations:

\`\`\`go
select {
case msg := <-msgs:
    handle(msg)
case <-time.After(5 * time.Second):
    return errors.New("timeout")
case <-ctx.Done():
    return ctx.Err()
}
\`\`\`

If multiple cases are ready, one is chosen **pseudo-randomly** — do not rely on priority without a loop or separate goroutine.

**\`default\`** makes select non-blocking — useful for polling or dropping work when busy. Overuse of default can spin CPU; prefer blocking with context cancellation.

**Nil channels** block forever in select — a technique to disable cases dynamically during shutdown sequences.

Combine select with **context** for cancellation propagation across goroutine trees — the idiomatic Go pattern for request-scoped work.`,
      },
      {
        title: 'Go Concurrency Philosophy',
        content: `Rob Pike's guidance: **"Do not communicate by sharing memory; share memory by communicating."** Prefer passing data through channels over mutex-protected globals. Channels encode ownership transfer — when you send a pointer, the sender should not use it afterward unless using a sync pattern.

This is guidance, not dogma. **sync.Mutex** protects shared caches and in-memory indexes efficiently. Use channels for orchestration and ownership; use mutexes for protecting small shared state. Profile before converting all mutexes to channels.

**Fan-out / fan-in:** distribute work to N workers via channels, merge results through another channel. **Pipeline stages** connect via channels, each stage a group of goroutines.

**errgroup** (\`golang.org/x/sync/errgroup\`) runs goroutines with shared error propagation and context cancellation — preferred over manual WaitGroup + error channel boilerplate for parallel tasks with failure semantics.`,
      },
    ],
    example: {
      title: 'Worker Pool with Channels',
      language: 'go',
      code: `func workerPool(jobs <-chan int, results chan<- int, n int) {
    var wg sync.WaitGroup
    for i := 0; i < n; i++ {
        wg.Add(1)
        go func() {
            defer wg.Done()
            for j := range jobs {
                results <- j * j
            }
        }()
    }
    go func() {
        wg.Wait()
        close(results)
    }()
}

jobs := make(chan int, 100)
results := make(chan int, 100)
go workerPool(jobs, results, 4)
for i := 0; i < 10; i++ {
    jobs <- i
}
close(jobs)
for r := range results {
    _ = r
}`,
      explanation:
        'Jobs flow through a buffered channel; workers compete fairly. A separate goroutine closes results after WaitGroup completes — only the closer should close, and only after all sends finish. This pattern scales to HTTP handlers feeding work queues.',
    },
    pitfalls: [
      'Goroutine leaks from blocked sends on unbuffered channels with no receiver',
      'Closing a channel from the receiver side or closing twice — panics',
      'Using unbuffered channels everywhere, serializing work that could pipeline',
    ],
    summary: [
      'Goroutines are cheap; the runtime schedules them on OS threads (M:N)',
      'Unbuffered channels synchronize; buffered channels queue with explicit capacity',
      'Select multiplexes channel ops; combine with context for timeouts and cancellation',
      'Prefer channel communication for ownership transfer; use mutexes for shared state when simpler',
      'Always ensure goroutines can exit — use context, WaitGroup, and careful channel close discipline',
    ],
    reviewQuestions: [
      {
        q: 'What happens when you send on an unbuffered channel?',
        hint: 'Consider both sender and receiver blocking behavior.',
      },
      {
        q: 'When should you use a mutex instead of a channel in Go?',
        hint: 'Think about protecting a small shared cache vs transferring ownership.',
      },
      {
        q: 'Why must only the sender close a channel?',
        hint: 'What panic occurs if you send on a closed channel?',
      },
    ],
  }),

  'go:context': buildTextbookLesson({
    chapter: 'Go Context: Cancellation, Deadlines, and Request Scoping',
    overview:
      'The `context` package is Go\'s standard way to propagate cancellation, deadlines, and request-scoped values across API boundaries and goroutine trees. Misusing context causes goroutine leaks and ignored timeouts; mastering it is essential for production Go services.',
    objectives: [
      'Create and chain contexts with `WithCancel`, `WithTimeout`, and `WithDeadline`',
      'Propagate context as the first parameter through call chains and respect `Done()`',
      'Understand when request-scoped values belong in context vs explicit parameters',
      'Wire context into HTTP servers, database calls, and gRPC for graceful cancellation',
    ],
    definitions: [
      {
        term: 'Context',
        definition:
          'An interface carrying deadlines, cancellation signals, and optional key-value pairs, designed to be passed explicitly and immutably extended via `With*` functions.',
      },
      {
        term: 'Cancellation',
        definition:
          'Signaling that work should stop early because the caller no longer needs the result or a deadline expired. Descendants of a cancelled context should abort promptly.',
      },
      {
        term: 'context.Background()',
        definition:
          'The root context — never cancelled, no deadline. Used in main, initialization, and tests. Request handlers derive child contexts from incoming requests.',
      },
    ],
    sections: [
      {
        title: 'Context Interface and Derivation',
        content: `The **Context** interface provides \`Deadline()\`, \`Done() <-chan struct{}\`, \`Err()\`, and \`Value(key)\`. Contexts form a **tree**: cancelling a parent cancels all children.

\`context.WithCancel(parent)\` returns a child and cancel function — call \`cancel()\` to signal shutdown. Always \`defer cancel()\` even when the child times out naturally, to release timer resources.

\`context.WithTimeout(parent, d)\` and \`WithDeadline(parent, t)\` auto-cancel after duration or wall-clock time. Prefer timeouts on all external calls — unbounded waits are outage multipliers.

**Never store contexts in structs** — pass as the first parameter, conventionally named \`ctx\`. Storing context breaks lifetime clarity and makes APIs hide cancellation dependencies.`,
      },
      {
        title: 'Cancellation Propagation in Practice',
        content: `Long-running goroutines should select on \`ctx.Done()\`:

\`\`\`go
for {
    select {
    case <-ctx.Done():
        return ctx.Err()
    case work := <-jobs:
        process(work)
    }
}
\`\`\`

When a client disconnects, the HTTP server cancels the request context — handlers and downstream DB queries should abort, freeing connections.

**errgroup with context** cancels siblings on first error:

\`\`\`go
g, ctx := errgroup.WithContext(parent)
g.Go(func() error { return fetch(ctx, url1) })
g.Go(func() error { return fetch(ctx, url2) })
err := g.Wait()
\`\`\`

**Pitfall:** ignoring context in library code forces callers to wait full timeout even after they cancelled. Libraries must accept \`ctx context.Context\` and pass it to I/O.`,
      },
      {
        title: 'Deadlines and Timeout Budgets',
        content: `Distributed requests need **end-to-end timeout budgets**. If the API gateway allows 500ms total, subtract time spent in auth and serialization before setting the DB query timeout. Nested \`WithTimeout\` calls should use **child deadlines** derived from parent remaining time, not fresh fixed durations.

\`context.DeadlineExceeded\` vs \`context.Canceled\` — distinguish timeout (slow dependency) from explicit cancel (client left). Log and metric them differently.

**http.Client** uses \`req.WithContext(ctx)\`. **database/sql** uses \`db.QueryContext(ctx, ...)\`. **gRPC** passes context as first arg on both client and server. Missing \`*Context\` variants are a code smell in modern Go.

For background jobs without natural parent, start from \`context.Background()\` and attach organizational timeouts — cron jobs should not run unbounded.`,
      },
      {
        title: 'Context Values: Use Sparingly',
        content: `**context.WithValue** stores request-scoped data: trace IDs, auth principals, locale. Keys should be unexported types to avoid collisions across packages.

**Do not** pass optional function parameters or dependencies through context values — use explicit struct fields or constructor injection. Context values have no type safety at compile time and obscure APIs.

The Go blog warns: use context values **only** for data that crosses API boundaries and is request-scoped. Configuration belongs in structs; loggers can be in context in some frameworks but explicit parameters are clearer.

When reading values, check \`ok\` and handle missing keys. Never panic on missing trace ID — degrade gracefully.`,
      },
    ],
    example: {
      title: 'HTTP Handler with Timeout and Cleanup',
      language: 'go',
      code: `func handler(w http.ResponseWriter, r *http.Request) {
    ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
    defer cancel()

    result, err := fetchData(ctx, r.URL.Query().Get("id"))
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            http.Error(w, "upstream slow", http.StatusGatewayTimeout)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    json.NewEncoder(w).Encode(result)
}`,
      explanation:
        'The handler derives a 2-second budget from the request context. If the client disconnects, r.Context() cancels immediately. defer cancel() releases the timer. errors.Is distinguishes timeout from other failures for correct HTTP status codes.',
    },
    pitfalls: [
      'Forgetting defer cancel() — timer and goroutine leaks until GC',
      'Storing context in structs or using context values for optional parameters',
      'Ignoring ctx.Done() in loops, causing work to continue after client left',
    ],
    summary: [
      'Context propagates cancellation and deadlines through call trees',
      'Always defer cancel(); pass ctx as first parameter, never store in structs',
      'Use WithTimeout on external I/O; distinguish DeadlineExceeded from Canceled',
      'errgroup ties goroutine failures to context cancellation',
      'Context values only for cross-cutting request metadata, not dependencies',
    ],
    reviewQuestions: [
      {
        q: 'What is the difference between context.Canceled and context.DeadlineExceeded?',
        hint: 'Who initiated the stop — explicit cancel vs timer?',
      },
      {
        q: 'Why should library functions accept context even if they do not cancel today?',
        hint: 'Think about callers who need to abort slow operations.',
      },
      {
        q: 'When is context.WithValue appropriate vs inappropriate?',
        hint: 'Request-scoped trace ID vs database connection handle.',
      },
    ],
  }),

  'go:interfaces': buildTextbookLesson({
    chapter: 'Go Interfaces, Errors, and defer/panic/recover',
    overview:
      'Go\'s implicit interfaces, explicit error handling, and defer/panic/recover form the language\'s approach to abstraction and failure. This chapter covers interface design, error wrapping with `%w`, and when panic is acceptable versus when errors should flow through return values.',
    objectives: [
      'Explain structural typing and design small, focused interfaces at consumption sites',
      'Handle errors idiomatically with wrapping, `errors.Is`, and `errors.As`',
      'Use defer for resource cleanup and understand its LIFO execution order',
      'Apply panic/recover only at package boundaries, not for normal control flow',
    ],
    definitions: [
      {
        term: 'Interface (Go)',
        definition:
          'A set of method signatures. Types satisfy interfaces implicitly by implementing methods — no `implements` keyword. Empty interface `interface{}` (or `any`) holds any type.',
      },
      {
        term: 'Error value',
        definition:
          'Any type implementing `Error() string`. Errors are values returned alongside results, not exceptions. Wrapping adds context while preserving unwrap chains.',
      },
      {
        term: 'Defer',
        definition:
          'Schedules a function call to run when the surrounding function returns, regardless of how it returns (normal or panic). Calls execute LIFO.',
      },
    ],
    sections: [
      {
        title: 'Interfaces and Structural Typing',
        content: `Go interfaces are **implicitly satisfied** — if \`type Dog struct{}\` has \`func (d Dog) Speak() string\`, \`Dog\` implements \`Speaker\` without declaration. This enables **decoupling**: packages define interfaces they need locally ("accept interfaces, return structs").

**Small interfaces** win: \`io.Reader\`, \`io.Writer\`, \`fmt.Stringer\` each do one thing. Large interfaces are hard to mock and implement. The **interface pollution** anti-pattern is exporting huge interfaces from provider packages — consumers should define narrow interfaces.

**Nil interface gotcha:** a typed nil pointer stored in an interface is **not equal to nil**:

\`\`\`go
var p *Dog = nil
var s Speaker = p
fmt.Println(s == nil) // false — interface holds (type, value) pair
\`\`\`

**Type assertions** \`v := i.(Concrete)\` and **type switches** extract concrete types. The comma-ok form \`v, ok := i.(Concrete)\` avoids panic.

**Composition:** embed interfaces in structs to forward methods; embed smaller interfaces in larger ones (\`io.ReadWriteCloser\`).`,
      },
      {
        title: 'Error Handling and Wrapping',
        content: `Go has no exceptions for expected failures. Functions return \`(result, error)\` — **always check errors**.

Go 1.13+ error wrapping:

\`\`\`go
if err != nil {
    return fmt.Errorf("load config %s: %w", path, err)
}
\`\`\`

**\`errors.Is(err, target)\`** checks the chain for sentinel errors (\`io.EOF\`, \`sql.ErrNoRows\`). **\`errors.As(err, &target)\`** finds a typed error in the chain for branching logic.

Define package-level sentinels for stable comparisons; use custom error types when callers need fields (\`type ValidationError struct { Field string }\`).

**Do not** log and return the same error — callers log too, duplicating noise. Log at the top of the call stack or wrap with context and return.

In APIs, map internal errors to stable external codes; leak stack traces only in debug mode.`,
      },
      {
        title: 'defer: Guaranteed Cleanup',
        content: `\`defer f()\` postpones execution until the surrounding function exits. Use for **mutex unlock**, **file close**, **transaction rollback**, **response body close**.

Deferred calls run **LIFO** — last defer first out. Combined with named return values, defer can modify return values:

\`\`\`go
func f() (err error) {
    defer func() { if err != nil { metrics.Inc("f_fail") } }()
    ...
}
\`\`\`

**Performance:** defer has small overhead — negligible except tight inner loops (where inline cleanup may matter). Do not micro-optimize defer away in HTTP handlers.

**Panic in defer** during another panic causes **crash** — recover only in defer at goroutine top level, not nested defers without care.`,
      },
      {
        title: 'panic, recover, and When Not to Panic',
        content: `**panic** unwinds the stack, running defers until **recover** stops it. Use panic for **programmer errors** (invariant violations) or **must-not-fail init** — not for file-not-found.

\`recover()\` only works inside deferred functions during active panic. HTTP servers recover per-request to return 500 instead of crashing the process:

\`\`\`go
defer func() {
    if r := recover(); r != nil {
        log.Printf("panic: %v", r)
        http.Error(w, "internal error", 500)
    }
}()
\`\`\`

Libraries should **return errors**, not panic, except for truly impossible states. JSON unmarshaling into wrong types panics in some APIs — prefer safe variants.

**errors vs panic decision tree:** expected failure (network, validation) → error; bug that indicates corrupted state and continuing is unsafe → panic in dev, error in library boundaries.`,
      },
    ],
    example: {
      title: 'Interface-Based Repository with Error Wrapping',
      language: 'go',
      code: `type UserStore interface {
    GetUser(ctx context.Context, id int) (*User, error)
}

func GetDisplayName(ctx context.Context, store UserStore, id int) (string, error) {
    u, err := store.GetUser(ctx, id)
    if err != nil {
        if errors.Is(err, ErrNotFound) {
            return "", fmt.Errorf("user %d: %w", id, err)
        }
        return "", fmt.Errorf("store get: %w", err)
    }
    return u.Name, nil
}`,
      explanation:
        'The consumer defines a one-method interface — any store implementation works. errors.Is handles not-found distinctly; wrapping preserves the chain for logging at the HTTP layer. This is idiomatic Go service architecture.',
    },
    pitfalls: [
      'Returning typed nil pointer as error interface — always check with `err != nil` carefully',
      'Using panic for I/O errors that callers should handle',
      'Giant interfaces in provider packages instead of small consumer-defined interfaces',
    ],
    summary: [
      'Interfaces are satisfied implicitly; define small interfaces where they are used',
      'Check every error; wrap with %w and use errors.Is/As for inspection',
      'defer ensures cleanup in LIFO order on any return path',
      'panic for unrecoverable bugs; recover at process boundaries, not normal flow',
      'Nil interface gotcha: typed nil inside interface is not == nil',
    ],
    reviewQuestions: [
      {
        q: 'Why is `var err *MyError = nil; return err` dangerous when return type is `error`?',
        hint: 'What does the interface value contain when the dynamic type is set but value is nil?',
      },
      {
        q: 'When should you use errors.As instead of errors.Is?',
        hint: 'Think about needing fields from a custom error type.',
      },
      {
        q: 'Where is recover appropriate in an HTTP server?',
        hint: 'Per-request middleware defer vs main function.',
      },
    ],
  }),

  'go:memory-gc': buildTextbookLesson({
    chapter: 'Go Memory Management: Escape Analysis, GC, and pprof',
    overview:
      'Go combines automatic garbage collection with compile-time escape analysis to stack-allocate when safe. Understanding what escapes to the heap, how the concurrent GC behaves, and how to profile allocations separates performant Go services from memory-heavy ones.',
    objectives: [
      'Explain escape analysis and predict when values allocate on the heap vs stack',
      'Describe the tri-color concurrent GC and STW phases at a high level',
      'Use pprof to find allocation hot spots and heap growth in production',
      'Apply optimization techniques: sync.Pool, preallocation, and reducing pointer density',
    ],
    definitions: [
      {
        term: 'Escape analysis',
        definition:
          'Compiler analysis determining whether a variable\'s lifetime exceeds its function. Escaped variables allocate on the heap; non-escaped may live on the stack.',
      },
      {
        term: 'Tri-color GC',
        definition:
          'Go\'s mark-and-sweep collector classifies objects white (unmarked), gray (marked, children pending), black (marked, children done). Runs concurrently with mutator goroutines.',
      },
      {
        term: 'pprof',
        definition:
          'Go profiling toolkit — CPU, heap, goroutine, mutex profiles. Accessible via net/http/pprof or runtime/pprof for production diagnosis.',
      },
    ],
    sections: [
      {
        title: 'Stack vs Heap and Escape Analysis',
        content: `Go does not expose manual malloc/free. The compiler decides **stack vs heap** via **escape analysis**. Values returned by pointer, stored in interfaces, captured by closures that outlive the function, or too large for the stack **escape** to the heap.

Check escapes with \`go build -gcflags="-m"\`:

\`\`\`
./main.go:10:6: moved to heap: x
\`\`\`

**Common escape causes:** returning \`&localVar\` from function; assigning local to \`interface{}\`; sending pointer on channel read by another goroutine; \`fmt.Sprintf\` with interface args.

**Stack allocation** is cheap (pointer bump). **Heap allocation** triggers GC work. Hot loops creating many short-lived heap objects show up as GC pressure and higher latency percentiles.

**Value vs pointer receivers:** small structs passed by value may avoid heap allocation; large structs or consistency with mutation favor pointers — profile both.`,
      },
      {
        title: 'Go Garbage Collector Overview',
        content: `The Go GC is **non-generational, concurrent, tri-color mark-and-sweep**. Target: keep heap at \`GOGC\` percent over live heap (default 100 — heap doubles before collection). Lower GOGC for lower memory, more CPU; raise for throughput at memory cost.

**Phases (simplified):**
1. **Sweep termination** (brief STW) — enable write barrier
2. **Concurrent mark** — traverse from roots, goroutines assist
3. **Mark termination** (STW) — finish marking
4. **Concurrent sweep** — reclaim unmarked spans

**Write barrier** tracks pointer changes during concurrent mark so nothing is missed. **STW pauses** are typically sub-millisecond on modern Go versions — but allocation rate drives mark work.

**Finalizers** (\`runtime.SetFinalizer\`) run asynchronously and are unreliable for resource cleanup — use defer and Close methods instead.`,
      },
      {
        title: 'Profiling with pprof',
        content: `Enable profiling in services:

\`\`\`go
import _ "net/http/pprof"
go func() { log.Println(http.ListenAndServe(":6060", nil)) }()
\`\`\`

**Heap profile** — \`go tool pprof http://localhost:6060/debug/pprof/heap\` shows in-use and allocated objects. Look for unexpected \`[]byte\`, \`string\`, JSON decode buffers.

**CPU profile** — \`?seconds=30\` captures hot functions. **alloc_space** vs **inuse_space** — former finds allocation rate; latter finds leaks.

**Goroutine profile** — detect leaks from stuck channel receives.

**Production safety:** protect pprof endpoint (firewall, auth). Sampling reduces overhead. **continuous profiling** (Parca, Google Cloud Profiler) aggregates across instances.

Workflow: metric shows RSS growth → heap inuse profile → compare snapshots → trace to constructor site → reduce escapes or pool objects.`,
      },
      {
        title: 'Optimization Techniques',
        content: `**Preallocate slices:** \`s := make([]T, 0, expectedLen)\` avoids repeated growth copies.

**sync.Pool** — reuse temporary objects (byte buffers, decoded structs) between GC cycles. Objects may be freed anytime — reset state on Get, never pool objects with lingering references.

**Reduce pointers** — GC scans pointers; fewer pointers in structs = faster mark phase. Use value slices of small structs where possible.

**String vs []byte** — converting creates copies; reuse buffers with careful lifetime management.

**Arena** (experimental) — bulk-free allocation groups for request-scoped lifetimes.

Measure before optimizing: \`benchmem\` in tests, pprof in staging. A common mistake is pooling everything — Pool adds complexity and can hide bugs if objects retain stale data.`,
      },
    ],
    example: {
      title: 'Reducing Allocations in a Hot Path',
      language: 'go',
      code: `var bufPool = sync.Pool{
    New: func() any { return new(bytes.Buffer) },
}

func FormatRow(fields []string) string {
    b := bufPool.Get().(*bytes.Buffer)
    b.Reset()
    defer bufPool.Put(b)
    for i, f := range fields {
        if i > 0 {
            b.WriteByte(',')
        }
        b.WriteString(f)
    }
    return b.String() // copy escapes — unavoidable for return
}`,
      explanation:
        'The buffer is pooled and reset; only the final String() allocates. For zero-copy APIs, return []byte with ownership transfer documented, or write into caller-provided buffer. Always Reset pooled objects to clear previous contents.',
    },
    pitfalls: [
      'Assuming stack allocation without checking -gcflags="-m" on hot paths',
      'Using sync.Pool for long-lived objects or forgetting Reset — data leaks between uses',
      'Tuning GOGC without measuring — may trade memory for CPU unpredictably',
    ],
    summary: [
      'Escape analysis decides stack vs heap; pointers, interfaces, and goroutine capture cause escape',
      'Concurrent tri-color GC; allocation rate drives mark cost and latency tails',
      'pprof heap and CPU profiles identify hot allocations and goroutine leaks',
      'Preallocate, sync.Pool for temp objects, reduce pointers in data structures',
      'Profile first — optimize allocation paths proven hot by data',
    ],
    reviewQuestions: [
      {
        q: 'What causes a local variable to escape to the heap?',
        hint: 'Return pointer, interface assignment, closure lifetime, goroutine capture.',
      },
      {
        q: 'What does GOGC=100 mean in practice?',
        hint: 'Relate live heap size to collection trigger threshold.',
      },
      {
        q: 'When is sync.Pool inappropriate?',
        hint: 'Think about object lifetime and stale state between Get calls.',
      },
    ],
  }),

  'go:worker-pools': buildTextbookLesson({
    chapter: 'Go Worker Pools: Rate Limiting and Graceful Shutdown',
    overview:
      'Worker pools in Go combine goroutines, channels, and context for bounded parallelism with clean lifecycle management. This chapter builds production-ready pool patterns with rate limiting at the edge and graceful shutdown that drains in-flight work without dropping tasks on deploy.',
    objectives: [
      'Implement idiomatic worker pools using goroutines, WaitGroups, and channels',
      'Apply rate limiting with token buckets or buffered channel semaphores',
      'Shut down pools gracefully on SIGTERM, respecting context cancellation',
      'Expose metrics for queue depth, active workers, and task outcomes',
    ],
    definitions: [
      {
        term: 'Semaphore (Go)',
        definition:
          'Often implemented as a buffered channel of empty structs: sending acquires capacity, receiving releases. Limits concurrent in-flight work.',
      },
      {
        term: 'Graceful shutdown',
        definition:
          'Stop accepting new work, wait for in-flight tasks to complete within a deadline, then release resources — critical for zero-downtime deploys.',
      },
      {
        term: 'Rate limiter',
        definition:
          'Controls request arrival rate (e.g., golang.org/x/time/rate.Limiter) independent of worker count — protects dependencies from burst traffic.',
      },
    ],
    sections: [
      {
        title: 'Channel-Based Worker Pool Pattern',
        content: `The canonical pattern: **jobs channel**, **fixed worker goroutines**, **results channel** (optional), **WaitGroup** for worker completion.

Workers \`for job := range jobs\` until the channel closes. Producers must not close jobs until all sends complete — often a coordinator closes after feeding.

**Worker count** matches downstream capacity, not CPU count, for I/O pools. For CPU work, \`runtime.GOMAXPROCS\` and worker count align with cores.

**Fan-in** merges multiple result streams with a goroutine per source or a single collector loop. Avoid unbounded result channels — apply same backpressure as jobs.

**errgroup** variant: each job is \`g.Go(func() error { ... })\` with shared context — first failure cancels siblings.`,
      },
      {
        title: 'Rate Limiting at Ingress',
        content: `\`golang.org/x/time/rate.Limiter\` implements token bucket:

\`\`\`go
limiter := rate.NewLimiter(rate.Limit(100), 10) // 100/sec, burst 10
if err := limiter.Wait(ctx); err != nil {
    return err // context cancelled
}
submit(job)
\`\`\`

**Limiter** shapes arrivals; **worker pool** bounds concurrency — use both. Limiter without pool still allows unbounded queued goroutines if each spawns work; pool without limiter admits burst traffic that queues internally.

**HTTP middleware** can rate limit per IP or API key before handler runs. Return 429 with \`Retry-After\` header.

**Reservations** (\`Reserve\`) schedule future allowance for precise pacing. **Allow()** non-blocking check for shedding load.`,
      },
      {
        title: 'Graceful Shutdown',
        content: `Listen for **SIGINT/SIGTERM**:

\`\`\`go
ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
defer stop()
\`\`\`

Shutdown sequence:
1. Cancel accept loop / stop HTTP server with \`srv.Shutdown(ctx)\`
2. Close jobs channel or set atomic "draining" flag — reject new submits
3. Wait for workers with timeout context
4. Flush metrics and logs

\`http.Server.Shutdown\` waits for active requests — pass context with deadline (Kubernetes terminationGracePeriodSeconds).

For custom pools, use **context cancellation** broadcast to workers and **sync.WaitGroup** with a goroutine that waits and closes results. Tasks should select on \`ctx.Done()\` between work units.

**Poison pill** pattern: send sentinel job to each worker to exit — less idiomatic than context cancel + channel close in modern Go.`,
      },
      {
        title: 'Observability and Production Hardening',
        content: `Export **Prometheus metrics**: \`worker_pool_queue_depth\`, \`worker_pool_tasks_total{status}\`, \`worker_pool_task_duration_seconds\`.

Structured logs per task: trace ID, duration, error. **OpenTelemetry** spans link HTTP request → pool submit → execution.

**Panic recovery** in worker goroutine — log stack, increment error metric, do not crash process.

**Health checks** should reflect pool saturation — if queue depth exceeds threshold, return degraded status so load balancer shifts traffic.

**Idempotent tasks** — on shutdown mid-task, retry may duplicate; use idempotency keys at storage layer.`,
      },
    ],
    example: {
      title: 'Pool with Semaphore and Graceful Stop',
      language: 'go',
      code: `type Pool struct {
    sem chan struct{}
    wg  sync.WaitGroup
}

func NewPool(n int) *Pool {
    return &Pool{sem: make(chan struct{}, n)}
}

func (p *Pool) Submit(ctx context.Context, fn func(context.Context) error) error {
    select {
    case <-ctx.Done():
        return ctx.Err()
    case p.sem <- struct{}{}:
    }
    p.wg.Add(1)
    go func() {
        defer func() { <-p.sem; p.wg.Done() }()
        if err := fn(ctx); err != nil {
            log.Printf("task error: %v", err)
        }
    }()
    return nil
}

func (p *Pool) Shutdown(ctx context.Context) error {
    done := make(chan struct{})
    go func() { p.wg.Wait(); close(done) }()
    select {
    case <-done:
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}`,
      explanation:
        'The buffered channel sem limits concurrent executions. Submit respects context when acquiring a slot. Shutdown waits for in-flight tasks with an outer deadline — return error if tasks exceed grace period so orchestrator can force kill knowingly.',
    },
    pitfalls: [
      'Closing jobs channel while producers still sending — panic',
      'No shutdown timeout — deploy hangs until Kubernetes SIGKILL',
      'Rate limiter without bounded pool — unbounded goroutines under sustained load',
    ],
    summary: [
      'Worker pools use goroutines + channels + WaitGroup for bounded parallelism',
      'Rate limit ingress; semaphore limits concurrency — complementary controls',
      'Graceful shutdown: stop accept, drain in-flight, respect context deadline',
      'Recover panics in workers; export queue depth and task metrics',
      'Design tasks idempotent for retry after interrupted shutdown',
    ],
    reviewQuestions: [
      {
        q: 'How does a buffered channel implement a semaphore in Go?',
        hint: 'What is sent and received — tokens or empty structs?',
      },
      {
        q: 'What is the difference between http.Server.Shutdown and Close?',
        hint: 'Active connections and in-flight requests.',
      },
      {
        q: 'Why use both rate.Limiter and a worker pool?',
        hint: 'Arrival rate vs concurrent execution limit.',
      },
    ],
  }),

  'cpp:memory': buildTextbookLesson({
    chapter: 'C++ Memory: Stack, Heap, RAII, and Smart Pointers',
    overview:
      'C++ grants direct control over memory layout and lifetime — power that enables zero-cost abstractions but also use-after-free and leak bugs. This chapter explains stack versus heap allocation, RAII as the core discipline, and modern smart pointers that make ownership explicit.',
    objectives: [
      'Distinguish stack and heap allocation, scope lifetime, and storage duration categories',
      'Apply RAII so resources acquire in constructors and release in destructors',
      'Choose between unique_ptr, shared_ptr, and weak_ptr based on ownership semantics',
      'Avoid raw new/delete in application code in favor of containers and smart pointers',
    ],
    definitions: [
      {
        term: 'RAII (Resource Acquisition Is Initialization)',
        definition:
          'Bind resource lifetime to object lifetime — acquire in constructor, release in destructor. Destructors run on scope exit and during stack unwinding on exception.',
      },
      {
        term: 'Stack allocation',
        definition:
          'Automatic storage duration — variables in function scope live on the call stack, destroyed when scope ends. Fast, cache-friendly, deterministic.',
      },
      {
        term: 'unique_ptr',
        definition:
          'Exclusive-ownership smart pointer; movable but not copyable. Zero overhead over raw pointer; deletes owned object on destruction.',
      },
    ],
    sections: [
      {
        title: 'Stack vs Heap and Storage Duration',
        content: `**Automatic (stack)** variables are created when execution enters scope and destroyed on exit:

\`\`\`cpp
void f() {
    int x = 42;        // stack
    std::vector<int> v; // heap data, stack object (RAII)
}
\`\`\`

**Dynamic (heap)** allocation via \`new\`/\`delete\` or \`malloc\`/\`free\` — lifetime until explicitly freed or managed by smart pointer. Heap is flexible (unknown size at compile time, outliving function) but slower and fragmentation-prone.

**Storage duration categories:** automatic, static (program lifetime), thread-local, dynamic. **Static** globals initialize before main; order across translation units is a classic footgun — prefer function-local statics (Meyers singleton).

**Stack overflow** from deep recursion or huge stack arrays; **heap exhaustion** from leaks or unbounded growth. Tools: AddressSanitizer, Valgrind, heap profilers.

Returning pointer to local stack variable is **undefined behavior** — the stack frame is gone. Return by value (move) or heap with smart pointer.`,
      },
      {
        title: 'RAII: The Central C++ Idiom',
        content: `**RAII** ties resources (memory, file descriptors, mutex locks) to object lifetime:

\`\`\`cpp
{
    std::lock_guard<std::mutex> lock(m);
    // critical section
} // mutex released automatically
\`\`\`

\`std::fstream\`, \`std::vector\`, \`std::unique_lock\` all follow RAII. Exceptions unwinding the stack call destructors — unlike C manual cleanup that skips on \`goto\` or \`longjmp\`.

**Rule:** never call \`delete\` manually in application code if a smart pointer or container can own the memory. **Never** mix \`new\` with \`free\` or \`malloc\` with \`delete\`.

**Custom deleters** on smart pointers wrap \`fclose\`, \`close(fd)\`, COM release — unified ownership model for non-memory resources.`,
      },
      {
        title: 'Smart Pointers and Ownership',
        content: `**\`std::unique_ptr<T>\`** — exclusive ownership. Move-only. Use for factory functions returning heap objects, PIMPL idioms, optional heap members. \`std::make_unique<T>(args)\` (C++14) exception-safe allocation.

**\`std::shared_ptr<T>\`** — shared ownership via reference counting. \`std::make_shared\` single allocation for control block + object (efficient). **Circular references** with \`shared_ptr\` leak — break cycles with \`weak_ptr\`.

**\`std::weak_ptr<T>\`** — non-owning observer of \`shared_ptr\`. \`lock()\` promotes to \`shared_ptr\` if object alive. Use for caches, parent-child graphs, callback registries.

**Avoid** \`shared_ptr\` by default — unique ownership is simpler and faster. Share only when lifetime genuinely shared.

**Raw pointers** remain for non-owning observers — APIs that borrow for call duration. Document lifetime contract in comments or types (\`gsl::not_null\`).`,
      },
      {
        title: 'Containers and Modern Memory Practice',
        content: `\`std::vector\`, \`std::string\`, \`std::map\` manage their own heap storage — prefer them over \`new T[]\`. **Reserve** capacity to avoid reallocations: \`v.reserve(n)\`.

**Small Object Optimization (SSO)** — \`std::string\` may store short strings inline without heap allocation — know your standard library implementation for hot paths.

**Placement new** constructs object in pre-allocated buffer — arenas, embedded systems, game engines.

**Alignas / alignof** — cache line alignment, SIMD requirements. \`std::aligned_storage\` for type-erased buffers.

Enable **AddressSanitizer** and **UBSan** in CI. Modern C++ style: no naked \`new\`/\`delete\`; vectors and smart pointers; RAII everywhere.`,
      },
    ],
    example: {
      title: 'RAII File Handle with unique_ptr',
      language: 'cpp',
      code: `#include <memory>
#include <cstdio>

struct FileDeleter {
    void operator()(FILE* f) const { if (f) std::fclose(f); }
};
using FilePtr = std::unique_ptr<FILE, FileDeleter>;

FilePtr open_file(const char* path) {
    return FilePtr(std::fopen(path, "r"));
}

void process(const char* path) {
    auto f = open_file(path);
    if (!f) throw std::runtime_error("open failed");
    // use f.get() — fclose on scope exit even if exception
}`,
      explanation:
        'Custom deleter on unique_ptr applies RAII to C FILE handles. No manual fclose on every exit path. Same pattern wraps sockets, SQLite handles, and GPU resources.',
    },
    pitfalls: [
      'Dangling references to vector elements after push_back reallocation invalidates pointers',
      'shared_ptr cycles — use weak_ptr for back-references',
      'Mixing allocation functions (new/delete vs malloc/free) — undefined behavior',
    ],
    summary: [
      'Stack: automatic, fast, scope-bound; heap: flexible, requires ownership discipline',
      'RAII binds resources to object lifetime — destructors run on scope exit and exceptions',
      'unique_ptr for exclusive ownership; shared_ptr when sharing; weak_ptr to break cycles',
      'Prefer STL containers over manual arrays; make_unique/make_shared for exception safety',
      'Sanitizers in CI catch use-after-free, leaks, and undefined behavior early',
    ],
    reviewQuestions: [
      {
        q: 'Why is returning a reference to a local variable undefined behavior?',
        hint: 'What happens to the stack frame when the function returns?',
      },
      {
        q: 'When would you choose shared_ptr over unique_ptr?',
        hint: 'Think about multiple owners with uncertain destruction order.',
      },
      {
        q: 'How does lock_guard demonstrate RAII?',
        hint: 'Constructor acquires, destructor releases — even on exception.',
      },
    ],
  }),

  'cpp:move': buildTextbookLesson({
    chapter: 'C++ Move Semantics and the Rule of Five',
    overview:
      'Move semantics eliminate redundant copies by transferring resources from expiring objects — fundamental to modern C++ performance. This chapter covers rvalue references, std::move, and the Rule of Five for classes that manage resources.',
    objectives: [
      'Distinguish lvalues from rvalues and understand when move is invoked',
      'Implement move constructor and move assignment for resource-managing classes',
      'Apply the Rule of Five consistently: destructor, copy/move ctor, copy/move assign',
      'Use std::move correctly — it casts to rvalue; does not move by itself',
    ],
    definitions: [
      {
        term: 'Rvalue reference',
        definition:
          'Type `T&&` binding to temporaries and objects explicitly cast for moving. Enables move constructors and move assignment overloads.',
      },
      {
        term: 'Move semantics',
        definition:
          'Transfer ownership of resources from source to destination, leaving source in valid but unspecified (often empty) state — cheaper than deep copy.',
      },
      {
        term: 'Rule of Five',
        definition:
          'If you define any of destructor, copy constructor, copy assignment, move constructor, or move assignment, consider defining all five for resource-managing classes.',
      },
    ],
    sections: [
      {
        title: 'Value Categories: Lvalues and Rvalues',
        content: `An **lvalue** has identity and address — variables, named references. An **rvalue** is a temporary or literal about to expire — \`42\`, \`std::string("hi")\`, return value of function by value.

**Lvalue reference** \`T&\` binds to lvalues. **Rvalue reference** \`T&&\` binds to rvalues and enables **move**:

\`\`\`cpp
std::vector<int> a = {1,2,3};
std::vector<int> b = std::move(a); // move ctor — a emptied
\`\`\`

**\`std::move\`** is a cast to rvalue reference — it does not move by itself; it enables overload resolution to pick move constructor. After move, **only destroy or assign** to moved-from object — do not assume empty unless documented (most STL types are empty after move).

**Forwarding references** \`T&&\` in templates with type deduction (\`auto&&\`, \`template<typename T> void f(T&&)\`) preserve value category via **perfect forwarding** and \`std::forward\`.`,
      },
      {
        title: 'Move Constructor and Move Assignment',
        content: `**Move constructor** steals resources from dying object:

\`\`\`cpp
Buffer(Buffer&& other) noexcept
    : data_(other.data_), size_(other.size_) {
    other.data_ = nullptr;
    other.size_ = 0;
}
\`\`\`

**Move assignment** releases current resources, steals from other, leaves other valid:

\`\`\`cpp
Buffer& operator=(Buffer&& other) noexcept {
    if (this != &other) {
        delete[] data_;
        data_ = other.data_;
        size_ = other.size_;
        other.data_ = nullptr;
        other.size_ = 0;
    }
    return *this;
}
\`\`\`

Mark move operations **noexcept** where possible — \`std::vector\` reallocation uses move only if move ctor is noexcept; otherwise copies for strong exception guarantee.

**Compiler-generated** move ops perform member-wise move — sufficient for classes using only STL members; insufficient when wrapping raw pointers.`,
      },
      {
        title: 'The Rule of Five (and Rule of Zero)',
        content: `If your class owns a resource (raw pointer, file handle), define **all five**:

1. Destructor
2. Copy constructor
3. Copy assignment
4. Move constructor
5. Move assignment

Or follow **Rule of Zero** — use \`std::vector\`, \`std::string\`, \`std::unique_ptr\` members and let compiler generate correct special members.

**Deleted** copy operations (\`= delete\`) enforce unique ownership like \`unique_ptr\`.

**Copy-and-swap** idiom for copy assignment:

\`\`\`cpp
Buffer& operator=(Buffer other) { // pass by value — move or copy
    swap(*this, other);
    return *this;
}
\`\`\`

Provides strong exception guarantee when copy ctor can throw.

**Three-way comparison** (C++20 <=> operator) can simplify equality if ordering defined.`,
      },
      {
        title: 'Move in APIs and Performance',
        content: `**Return by value** — compilers apply **RVO/NRVO** (named return value optimization) eliding copy entirely. Do not return \`std::move(local)\` from function — it **blocks RVO**.

Pass **cheap-to-copy** types (int, pointer) by value; pass **large** types by \`const&\` for read-only; accept **sink** parameters by value and move inside:

\`\`\`cpp
void Widget::set_name(std::string name) {
    name_ = std::move(name);
}
\`\`\`

Caller passing temporary moves for free; lvalue copies once.

**\`emplace\`** methods construct in place (\`vector.emplace_back(args)\`) avoiding extra move/copy.

Profile with move disabled (copy only) to quantify benefit. Move shines for \`vector\`, \`string\`, \`unique_ptr\` — not for \`int\`.`,
      },
    ],
    example: {
      title: 'Rule of Five for a Simple Buffer',
      language: 'cpp',
      code: `class Buffer {
    char* data_ = nullptr;
    size_t size_ = 0;
public:
    ~Buffer() { delete[] data_; }
    Buffer(const Buffer& o) : size_(o.size_) {
        data_ = new char[size_];
        std::copy(o.data_, o.data_ + size_, data_);
    }
    Buffer(Buffer&& o) noexcept : data_(o.data_), size_(o.size_) {
        o.data_ = nullptr; o.size_ = 0;
    }
    Buffer& operator=(Buffer o) {
        swap(data_, o.data_);
        swap(size_, o.size_);
        return *this;
    }
};`,
      explanation:
        'Destructor frees resource. Copy deep-copies. Move steals. Assignment uses copy-and-swap via pass-by-value parameter (one function for copy and move assign). In production, replace with std::vector<char> and Rule of Zero.',
    },
    pitfalls: [
      'Using std::move on return value — prevents RVO',
      'Accessing moved-from object except to destroy or reassign — undefined or empty depending on type',
      'Move operations that throw — vector reallocation falls back to copy, hurting performance',
    ],
    summary: [
      'Rvalue references and std::move enable transferring resources from expiring objects',
      'Move ctor/assign steal resources; mark noexcept for STL container efficiency',
      'Rule of Five for resource-owning classes; Rule of Zero with STL members preferred',
      'Return by value lets RVO elide copies; do not std::move local returns',
      'Sink parameters (by value + move) accept both lvalues and rvalues efficiently',
    ],
    reviewQuestions: [
      {
        q: 'What does std::move actually do at runtime?',
        hint: 'It is a cast — which function gets called depends on overload resolution.',
      },
      {
        q: 'Why should move constructors be noexcept?',
        hint: 'Think about vector reallocation when elements can throw during move.',
      },
      {
        q: 'When can you rely on the Rule of Zero?',
        hint: 'What kind of members must the class have?',
      },
    ],
  }),
};
