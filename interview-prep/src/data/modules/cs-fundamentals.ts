import type { Module } from '../../types/curriculum';

export const csFundamentals: Module = {
  id: 'cs-fundamentals',
  title: 'Computer Science Fundamentals',
  stage: 1,
  level: 'beginner',
  icon: '💻',
  description:
    'Understand what the computer is actually doing — processes, memory, CPU, I/O, and the foundations every senior engineer must reason about.',
  learningObjectives: [
    'Explain what happens when a program executes',
    'Distinguish process vs thread and when each matters',
    'Understand stack vs heap, virtual memory, and cache locality',
    'Reason about system calls, context switching, and I/O costs',
    'Debug performance issues rooted in OS-level behavior',
  ],
  estimatedHours: 20,
  sections: [
    {
      id: 'program-execution',
      title: 'What Happens When You Execute a Program',
      content: `When you run a program (e.g., \`python app.py\`), the OS performs several steps:

1. **Shell invocation** — The shell finds the executable via PATH and calls \`execve()\` system call
2. **Process creation** — The kernel creates a new process with its own virtual address space
3. **Memory mapping** — Code segment, data segment, heap, and stack are set up in virtual memory
4. **Loader** — Dynamic linker loads shared libraries (libc, etc.)
5. **Entry point** — CPU jumps to \`_start\`, then to \`main()\` (or Python interpreter)
6. **Execution** — Instructions fetched from memory, decoded, executed by CPU
7. **Termination** — Process exits, kernel reclaims resources (file descriptors, memory pages)

**Key insight for interviews:** Every API request eventually becomes CPU instructions, memory allocations, and possibly I/O waits. Senior engineers trace problems back to these primitives.`,
      codeExamples: [
        {
          title: 'Observing process creation',
          language: 'bash',
          code: `# See process tree when running Python
pstree -p $(pgrep -f "python app.py")

# Watch system calls
strace -f python app.py 2>&1 | head -50`,
          explanation: 'Use strace to see the actual system calls your program makes.',
        },
      ],
      practicalExercise:
        'Run a simple Python script with `strace -c python script.py` and identify the top 5 system calls. Research what each one does.',
    },
    {
      id: 'process-thread',
      title: 'Process vs Thread',
      content: `### Process
- Independent execution unit with its own **virtual address space**
- Own file descriptor table, signal handlers, environment
- Creation is **expensive** (fork + copy-on-write or exec)
- Crash isolation: one process crash doesn't kill others

### Thread
- Lightweight execution unit **within** a process
- **Shares** address space, file descriptors, heap
- Own stack and register state
- Creation is **cheaper** than process
- **Race conditions** possible on shared memory

### When to use what
| Scenario | Choice | Why |
|----------|--------|-----|
| CPU-bound parallel work | Multiple processes | Bypass GIL (Python), true parallelism |
| I/O-bound concurrent work | Threads or async | Share memory, low overhead |
| Isolation / crash safety | Processes | Memory isolation |
| High concurrency (10k+ connections) | Async (event loop) | No thread stack overhead |

**Context switching cost:** When OS switches threads, it saves/restores registers, may flush CPU cache (cache pollution), and updates kernel scheduling structures. This is why "more threads" can make things slower.`,
      practicalExercise:
        'Write a Python script that spawns 100 threads vs 100 processes doing CPU work. Measure time. Explain the difference.',
    },
    {
      id: 'memory',
      title: 'Memory: Stack, Heap, Virtual Memory',
      content: `### Stack
- LIFO structure for function calls
- Stores local variables, return addresses, parameters
- **Fast** allocation/deallocation (just move stack pointer)
- **Limited size** (~8MB default on Linux per thread)
- **Stack overflow** if recursion too deep

### Heap
- Dynamic memory allocation (\`malloc\`, \`new\`, Python objects)
- **Slower** — requires allocator bookkeeping
- **Larger** — limited by virtual memory
- Must be **freed** (or GC'd) to avoid leaks

### Virtual Memory
- Each process sees a **contiguous** address space (e.g., 0 to 2^64)
- **Physical RAM** mapped via page tables (MMU hardware)
- Enables: isolation, overcommit, memory-mapped files, shared libraries
- **Page fault** when accessing unmapped or swapped-out pages

### CPU Cache
- L1 (~1ns) → L2 (~4ns) → L3 (~10ns) → RAM (~100ns)
- **Cache locality** matters: sequential access is 10-100x faster than random
- **False sharing**: two threads modifying adjacent cache lines cause contention

**Interview gold:** "Why is my O(n) algorithm slow?" → Check cache misses, memory allocation patterns, not just big-O.`,
      codeExamples: [
        {
          title: 'Stack vs heap in Python',
          language: 'python',
          code: `import sys

def stack_example():
    x = 42          # local int - stack frame
    arr = [1, 2, 3] # list object on heap, reference on stack
    return arr

# Large allocation goes to heap
big = bytearray(10_000_000)  # ~10MB on heap
print(sys.getsizeof(big))`,
        },
      ],
    },
    {
      id: 'system-calls',
      title: 'System Calls & I/O',
      content: `### User Mode vs Kernel Mode
- **User mode**: Your application code runs here, restricted access
- **Kernel mode**: OS kernel, full hardware access
- **System call**: Controlled transition from user → kernel (e.g., read, write, socket)

### Why system calls are expensive
1. **Mode switch** — CPU saves state, changes privilege level (~100ns-1μs)
2. **Kernel work** — Scheduling, buffer copying, device interaction
3. **Context** — May block waiting for I/O (disk, network)

### I/O Types
- **Blocking I/O**: Thread waits until data ready
- **Non-blocking I/O**: Returns immediately, poll later
- **Async I/O** (io_uring, epoll): Kernel notifies when ready

**Production insight:** A "simple" API that reads 1000 files synchronously = 1000 system calls + disk seeks. Batch, cache, or use async I/O.`,
      practicalExercise:
        'Compare `time curl localhost:8000` vs `time curl -w "%{time_connect} %{time_starttransfer}" localhost:8000`. Understand each timing metric.',
    },
  ],
  questions: [
    {
      id: 'cs-q1',
      level: 'recall',
      question: 'What is a process?',
      answer:
        'A process is an independent program in execution with its own virtual address space, file descriptors, and resources allocated by the OS. It is the unit of resource allocation.',
      keyPoints: ['Virtual address space', 'Own PID', 'Isolation from other processes'],
    },
    {
      id: 'cs-q2',
      level: 'understanding',
      question: 'What is the difference between a process and a thread?',
      answer:
        'A process is an independent execution unit with its own memory space. Threads are execution units within a process that share the same memory space but have their own stack. Threads are lighter to create but require synchronization for shared data.',
      keyPoints: ['Memory sharing', 'Creation cost', 'Crash isolation'],
    },
    {
      id: 'cs-q3',
      level: 'understanding',
      question: 'What is virtual memory and why does it exist?',
      answer:
        'Virtual memory gives each process the illusion of a large, contiguous address space. The MMU maps virtual addresses to physical RAM (or disk via swap). Benefits: process isolation, overcommit, simplified linking, memory-mapped files.',
    },
    {
      id: 'cs-q4',
      level: 'application',
      question: 'Why can adding more threads make an application slower?',
      answer:
        'Beyond a certain point: (1) context switching overhead increases, (2) CPU cache pollution from switching between threads, (3) lock contention on shared resources, (4) memory overhead (each thread needs ~8MB stack), (5) scheduler overhead. The optimal thread count is often near CPU core count for CPU-bound work.',
      keyPoints: ['Context switching', 'Cache pollution', 'Lock contention', 'Diminishing returns'],
    },
    {
      id: 'cs-q5',
      level: 'debugging',
      question: 'Production API CPU is at 100%. What commands and metrics do you check?',
      answer:
        '1) `top`/`htop` — which process/thread. 2) `perf top` or `py-spy` — hot functions. 3) Check if CPU-bound or spinning on locks. 4) `strace -c` — excessive syscalls? 5) Application metrics — request rate spike? 6) GC logs if applicable. 7) Compare p50 vs p99 latency. Start with profiling, not guessing.',
      keyPoints: ['top/htop', 'profiler', 'strace', 'metrics', 'GC'],
    },
    {
      id: 'cs-q6',
      level: 'senior',
      question: 'A seemingly simple API consumes large amounts of memory. How do you investigate?',
      answer:
        'Systematic approach: (1) Memory profiling — `tracemalloc`, `memory_profiler`, heap dumps. (2) Check for unbounded caches, growing lists/dicts. (3) Connection pool sizes × buffer sizes. (4) Request/response body buffering. (5) ORM loading entire tables. (6) Memory leaks — objects not released. (7) Compare memory per request at不同 QPS. (8) Check for duplicate object creation in hot paths.',
      keyPoints: ['Profile first', 'Unbounded growth', 'Per-request memory', 'Connection pools'],
    },
  ],
  seniorScenarios: [
    {
      title: 'Production CPU at 100%',
      scenario: 'Your FastAPI service CPU suddenly hits 100% across all pods. Latency doubles. No deploy in the last 24 hours.',
      approach:
        '1) Confirm scope — all pods or one AZ? 2) Check traffic — DDoS or legitimate spike? 3) Profile immediately — py-spy on running process. 4) Check recent data changes — larger payloads? 5) Database slow → retry storms? 6) Roll back if recent config change. 7) Scale horizontally as mitigation while investigating.',
      keyConsiderations: [
        'Profile before restarting pods (lose state)',
        'Check downstream dependency health',
        'Correlate with deployment, traffic, data changes',
        'p99 vs p50 — tail latency tells a different story',
      ],
    },
  ],
  resources: [
    { title: 'Operating Systems: Three Easy Pieces', url: 'https://pages.cs.wisc.edu/~remzi/OSTEP/', type: 'book' },
    { title: 'What Every Programmer Should Know About Memory', url: 'https://lwn.net/Articles/250967/', type: 'article' },
  ],
};
