import { buildLesson } from '../content-format';

export const csLessons: Record<string, string> = {
  'cs-fundamentals:program-execution': buildLesson({
    intro:
      'Every API request eventually becomes CPU instructions, memory access, and maybe I/O waits. Senior engineers trace performance problems back to what the OS and hardware actually do when your code runs.',
    dialogues: [
      {
        q: 'What happens when I run `python app.py`?',
        a: `Step by step:

1. **Shell** parses command, finds \`python\` in PATH
2. **\`execve\` syscall** — kernel loads the Python interpreter executable
3. **New process** created with own **virtual address space**, PID, file descriptor table
4. **Loader** maps executable segments, dynamic linker loads shared libs (libc)
5. **Interpreter starts** — initializes runtime, imports modules, runs your code
6. **Execution** — CPU fetches instructions (via cache hierarchy), allocates heap objects, makes syscalls for I/O
7. **Exit** — process terminates, kernel reclaims memory, closes FDs

Your FastAPI handler is thousands of layers above this — but when latency spikes, you eventually ask: syscall storm? memory fault? CPU bound in interpreter?`,
      },
      {
        q: 'Why should backend engineers care about this chain?',
        a: `**Performance debugging** starts at primitives:
- High CPU → hot instructions (profile), not "Python is slow"
- High I/O wait → blocking syscalls, disk, network — async/threading helps
- Memory growth → heap allocations, leaks, page faults from swap

**Capacity planning** — each connection = FD, memory for buffers, kernel structures.

**Security** — syscalls are the boundary to kernel; sandboxing, containers limit which syscalls run.

Interview gold: "I'd strace the process under load and check if we're doing synchronous file reads per request."`,
      },
      {
        q: 'How can I observe process creation and syscalls?',
        a: `\`\`\`bash
# Process tree
pstree -p $(pgrep -f "uvicorn")

# Syscall summary — which syscalls dominate time
strace -c python app.py

# First 50 syscalls with timestamps
strace -f python app.py 2>&1 | head -50

# Per-syscall timing on running server
strace -c -p <pid>
\`\`\`

Common findings:
- **\`read\`/\`write\`** — network I/O
- **\`futex\`** — threading synchronization
- **\`epoll_wait\`** — async event loop waiting efficiently
- Excessive **\`openat\`** — opening files per request (config, certs) without caching`,
      },
      {
        q: 'Connect program execution to a slow API endpoint.',
        a: `Trace the request path:

1. **NIC** receives packet → kernel network stack
2. **Syscall** \`accept\`/\`read\` — uvicorn receives HTTP bytes
3. **Python** parses HTTP, routes to FastAPI handler
4. Handler may **await** DB — syscall \`send\`/\`recv\` to PostgreSQL, thread may block
5. **JSON serialize** — CPU + heap allocations
6. **Syscall** \`write\` response to socket

If p99 is bad but CPU low → **I/O wait** (DB, downstream). If CPU 100% → **compute** or **serialization**. If syscalls explode → **chatty** design (1000 file opens).

Always correlate: \`top\` (CPU/wait) + APM trace + optional strace/perf on representative load.`,
      },
    ],
    takeaways: [
      'Run = execve → new process → loader → execute → exit and reclaim',
      'Debug by tracing syscalls, CPU, and I/O wait — not guessing framework',
      'strace -c and perf reveal syscall storms and hot functions',
      'Every HTTP request is syscalls + CPU + allocations at the bottom',
    ],
    tip: 'Mention epoll_wait when discussing asyncio — shows you know why event loops scale for I/O.',
  }),

  'cs-fundamentals:process-thread': buildLesson({
    intro:
      'Process vs thread is foundational for Python GIL questions, Go goroutines, and every concurrency interview. Get the isolation and sharing model crisp.',
    dialogues: [
      {
        q: 'What is a process vs a thread?',
        a: `**Process** — independent execution unit with own **virtual address space**, file descriptors, environment. Unit of **resource allocation**. Crash in one process doesn't kill others (isolation). Creating processes is **expensive** (fork/exec, memory).

**Thread** — execution unit **inside** a process. **Shares** heap and file descriptors with sibling threads. Own **stack** and register state. Cheaper to create than processes. **No isolation** — one thread corrupting memory kills whole process.

**OS schedules** threads (and processes) on CPU cores. Many threads, fewer cores → context switching.`,
      },
      {
        q: 'When do I choose processes vs threads vs async?',
        a: `| Scenario | Choice | Why |
|----------|--------|-----|
| CPU-bound parallel | Processes | True parallelism, isolation (bypass GIL) |
| I/O-bound, blocking libs | Threads | GIL released during I/O, shared state |
| I/O-bound, 10k+ connections | Async | Low memory, no thread stacks |
| Crash isolation | Processes | Memory boundaries |
| Shared cache in memory | Threads or async | Processes need IPC |

**Async** is not parallelism — it's concurrent I/O on one thread (cooperative). **Threads** give parallel I/O with blocking code. **Processes** give parallel CPU.`,
      },
      {
        q: 'Why can more threads make things slower?',
        a: `Beyond optimal point:

1. **Context switching** — OS saves/restores registers, switches kernel structures (~μs each, adds up)
2. **Cache pollution** — thread switch evicts CPU cache lines; cold cache on resume
3. **Lock contention** — threads spin or block on same mutex
4. **Memory** — ~8MB stack per thread default on Linux
5. **Scheduler overhead** — OS choosing among many runnable threads

**CPU-bound optimal** threads often ≈ CPU cores. **I/O-bound** can have more threads than cores because many block waiting.

Measure — don't default to "thread per request."`,
      },
      {
        q: 'What is context switching and why does it cost?',
        a: `When OS switches from thread A to thread B on a core:
- Save A's registers and program counter
- Load B's state
- May switch address space if different process (TLB flush — expensive)
- Run B until timer interrupt or syscall block

**Cooperative async** avoids OS thread switches for I/O — coroutine yield is cheaper — but blocking call still blocks the thread.

For interviews: "100 threads on 4 cores means constant switching; profile shows time in scheduler and lock wait, not useful work."`,
      },
    ],
    takeaways: [
      'Process: isolated memory; thread: shared heap, own stack',
      'CPU-bound → processes; I/O blocking → threads; massive I/O → async',
      'Too many threads: context switch, cache miss, lock contention',
      'Async is concurrency without parallel CPU on one thread',
    ],
    tip: 'Link to Python GIL: threads don\'t parallelize CPU-bound Python bytecode.',
  }),

  'cs-fundamentals:memory': buildLesson({
    intro:
      'Stack vs heap, virtual memory, and cache locality explain why O(n) algorithms sometimes lose to "worse" big-O and why your API eats RAM at scale.',
    dialogues: [
      {
        q: 'Stack vs heap — what lives where?',
        a: `**Stack** (per thread):
- Function call frames, local variable slots, return addresses
- **Fast** allocate/deallocate (move stack pointer)
- **Limited** size (~8MB default per thread on Linux)
- **Stack overflow** from deep recursion

**Heap**:
- Dynamic allocation — \`malloc\`, Python objects (\`list\`, \`dict\`, everything)
- **Slower** — allocator bookkeeping, possible fragmentation
- **Large** — limited by virtual memory
- Must be **freed** (or GC'd) — leaks live here

In Python, **names** are references; **objects** are on heap. Local \`x = [1,2,3]\` — reference on stack frame, list object on heap.`,
      },
      {
        q: 'What is virtual memory and why does it exist?',
        a: `Each process sees a **contiguous virtual address space** (e.g. 0 to 2⁶⁴). **MMU** maps virtual addresses to **physical RAM** via page tables.

Benefits:
- **Isolation** — process A can't read process B's memory
- **Overcommit** — allocate more virtual than physical (swap when needed)
- **Simplified linking** — same virtual addresses every run
- **Memory-mapped files** — treat file as memory

**Page fault** — access unmapped page or swapped-out page → kernel loads page (slow). Random memory access patterns → more faults + cache misses.`,
      },
      {
        q: 'Why does cache locality matter for performance?',
        a: `CPU memory hierarchy (approximate):
- L1 ~1ns
- L2 ~4ns
- L3 ~10ns
- RAM ~100ns

**Sequential access** (array iteration) uses cache lines — 10–100× faster than **random pointer chasing** (linked list, hash table with scattered nodes).

**False sharing** — two threads modify different variables on same cache line → cores fight over line → slowdown.

Interview: "My O(n) linked list is slower than O(n log n) sort on array" → cache and constant factors. Profile with perf \`cache-misses\`.`,
      },
      {
        q: 'How do you investigate high memory in an API service?',
        a: `1. **RSS trend** — leak vs legitimate growth with traffic
2. **Per-request memory** — load test, measure delta per request
3. **Python:** tracemalloc, objgraph — which types grow?
4. **Connection pools** — pool size × buffer size × workers
5. **Caching** — unbounded dict caches
6. **ORM** — loading full tables into lists
7. **Request buffering** — reading entire upload into memory

Compare pods at different QPS. Fix: streaming responses, generators, bounded caches, pagination, \`__slots__\` for millions of small objects.`,
      },
    ],
    takeaways: [
      'Stack: fast, small, per-thread frames; heap: objects, leaks, GC',
      'Virtual memory: isolation, MMU mapping, page faults on miss',
      'Cache locality beats big-O ignorance — arrays beat linked lists often',
      'Memory investigations: RSS trend, per-request delta, pool sizes',
    ],
    tip: 'Say "false sharing" when discussing multi-threaded counters — senior signal.',
  }),

  'cs-fundamentals:system-calls': buildLesson({
    intro:
      'System calls are the gateway between your app and the kernel. I/O models (blocking, non-blocking, async) and syscall cost explain API latency at the OS level.',
    dialogues: [
      {
        q: 'User mode vs kernel mode — why do syscalls matter?',
        a: `**User mode** — application code, restricted: can't touch hardware directly.

**Kernel mode** — OS kernel, full privileges.

**System call** — intentional trap: user code requests kernel service (\`read\`, \`write\`, \`socket\`, \`mmap\`).

**Cost:**
1. Mode switch (~100ns–1μs)
2. Kernel work — copy buffers, schedule, device drivers
3. May **block** waiting for disk/network

A loop doing 1000 synchronous file reads = 1000 syscalls + disk latency. Batch, cache, async I/O, or memory-map files instead.`,
      },
      {
        q: 'Blocking vs non-blocking vs async I/O?',
        a: `**Blocking I/O** — thread calls \`read()\`, waits until data ready. Simple but thread idle.

**Non-blocking** — \`read()\` returns immediately if no data; poll/epoll later. Thread must loop or event loop integrates.

**Async I/O (epoll, io_uring)** — register interest, kernel notifies when ready. One thread manages many connections.

Python asyncio uses epoll/kqueue under the hood. **Sync Flask** thread per blocking request. **Async FastAPI** one thread, many awaits.

Choose based on concurrency model and library support — not buzzwords.`,
      },
      {
        q: 'How do I break down HTTP request latency with curl?',
        a: `\`\`\`bash
curl -w "
dns: %{time_namelookup}
connect: %{time_connect}
tls: %{time_appconnect}
ttfb: %{time_starttransfer}
total: %{time_total}
" -o /dev/null -s https://api.example.com/health
\`\`\`

- **DNS** slow → resolver, TTL, prefetch
- **connect** high → TCP distance, SYN retransmits
- **tls** high → certificate chain, TLS 1.3 vs 1.2, session resumption
- **ttfb - tls** → server processing + network
- **total - ttfb** → download body size

Compare regions. Server-side trace fills gap between ttfb and app logic.`,
      },
      {
        q: 'Production API CPU 100% — what OS-level checks?',
        a: `1. **\`top\`/\`htop\`** — which PID/thread, %CPU vs %wait
2. **\`perf top -p PID\`** — hot kernel/user functions
3. **\`py-spy\`** — Python stack samples without restart
4. **\`strace -c\`** — syscall breakdown if syscall-bound
5. **Thread count** — runaway spawning?
6. **GC** — correlate CPU spikes with GC logs (Python/Java)

If %wait high → I/O bound, not CPU — different fix path. If one thread at 100% on 8-core → GIL or single hot loop.`,
      },
    ],
    takeaways: [
      'Syscalls transition to kernel — expensive; minimize chatty I/O',
      'Blocking vs epoll/async — thread per wait vs one thread many connections',
      'curl -w timings split DNS, TCP, TLS, server, download',
      'CPU 100%: perf/py-spy first; distinguish CPU vs I/O wait',
    ],
    tip: 'Mention io_uring for cutting-edge Linux async I/O — optional senior flourish.',
  }),
};
