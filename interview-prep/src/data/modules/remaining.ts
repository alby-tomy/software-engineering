import { createModule } from './helpers';

export const databases = createModule({
  id: 'databases',
  title: 'Databases — PostgreSQL, Redis & NoSQL',
  stage: 4,
  level: 'advanced',
  icon: '🗃️',
  description: 'PostgreSQL internals (MVCC, WAL, vacuum), Redis patterns, and when to use SQL vs NoSQL.',
  prerequisites: ['sql'],
  estimatedHours: 25,
  learningObjectives: [
    'Explain PostgreSQL MVCC, WAL, and vacuum',
    'Implement caching patterns with Redis',
    'Choose between SQL and NoSQL with trade-off reasoning',
    'Design replication and sharding strategies',
  ],
  sections: [
    {
      id: 'postgresql',
      title: 'PostgreSQL Deep Dive',
      content: `### MVCC (Multi-Version Concurrency Control)
Readers don't block writers, writers don't block readers. Each row has xmin/xmax transaction IDs. Old versions cleaned by VACUUM.

### WAL (Write-Ahead Log)
Changes written to WAL before data files. Enables crash recovery and replication.

### Connection Pooling
Use PgBouncer between app and PostgreSQL. Without it: each connection = ~10MB RAM on DB server.

### Read Replicas
Async replication for read scaling. Watch replication lag. Route analytics to replicas.`,
    },
    {
      id: 'redis',
      title: 'Redis Patterns',
      content: `### Cache-aside
\`\`\`python
data = redis.get(key)
if not data:
    data = db.query(...)
    redis.setex(key, ttl, data)
\`\`\`

### Cache stampede prevention
Lock key during rebuild. Or probabilistic early expiration.

### Distributed locking
\`SET key value NX EX 30\` — only set if not exists, with expiry.

### Eviction policies
allkeys-lru, volatile-lru, noeviction (returns error when full).`,
    },
  ],
  questions: [
    { id: 'db-q1', level: 'understanding', question: 'What is MVCC?', answer: 'Multi-Version Concurrency Control allows multiple transactions to access data concurrently without locking. Each transaction sees a snapshot of data as of its start time.' },
    { id: 'db-q2', level: 'application', question: 'When should you use Redis?', answer: 'Caching, session storage, rate limiting, pub/sub, leaderboards, distributed locks. NOT as primary data store for critical data without persistence strategy.' },
    { id: 'db-q3', level: 'senior', question: 'Your Redis cluster is unavailable. What happens to your application?', answer: 'Depends on design. Cache-aside: degraded performance (DB load increases), not data loss. Session store: users logged out. Rate limiter: either fail open (allow all) or fail closed (reject all). Circuit breaker should detect and fallback gracefully.' },
  ],
  seniorScenarios: [{ title: 'Cache stampede', scenario: 'Popular item cache expires. 10,000 requests hit DB simultaneously.', approach: 'Mutex lock during rebuild. Probabilistic early refresh. Request coalescing — only one request rebuilds, others wait.', keyConsiderations: ['Lock timeout', 'Stale data tolerance', 'DB protection'] }],
  resources: [{ title: 'PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/', type: 'documentation' }],
});

export const go = createModule({
  id: 'go',
  title: 'Go — Systems Backend Language',
  stage: 3,
  level: 'intermediate',
  icon: '🔵',
  description: 'Learn Go for concurrency, systems programming, and high-throughput backend services.',
  prerequisites: ['cs-fundamentals'],
  estimatedHours: 35,
  learningObjectives: ['Master goroutines, channels, and select', 'Implement worker pools and rate limiting', 'Use context for cancellation', 'Profile with pprof and race detector'],
  sections: [
    { id: 'concurrency', title: 'Goroutines & Channels', content: `Goroutines are lightweight (~2KB stack). Channels communicate between goroutines. Buffered channels decouple sender/receiver. Use \`select\` for multiplexing. Prefer "share memory by communicating" over "communicate by sharing memory".` },
    { id: 'context', title: 'Context & Cancellation', content: `\`context.Context\` carries deadlines, cancellation signals, and request-scoped values. Always accept context as first parameter. Propagate cancellation through call chain.` },
  ],
  questions: [
    { id: 'go-q1', level: 'understanding', question: 'Goroutine vs OS thread?', answer: 'Goroutines are user-space threads managed by Go runtime (~2KB stack, cheap to create). OS threads are kernel-managed (~8MB stack, expensive). Go multiplexes goroutines onto OS threads (M:N scheduling).' },
    { id: 'go-q2', level: 'tradeoffs', question: 'Mutex vs channel?', answer: 'Channels for communication/ownership transfer. Mutexes for protecting shared state. Rule: use channels to orchestrate goroutines, mutexes to protect shared data structures.' },
    { id: 'go-q3', level: 'senior', question: 'How do you prevent goroutine leaks?', answer: 'Always ensure goroutines can exit: use context cancellation, buffered channels to prevent blocking sends, WaitGroup for tracking, monitor goroutine count in production.' },
  ],
  seniorScenarios: [{ title: 'High-throughput Go service', scenario: 'Design a Go service handling 50k RPS.', approach: 'HTTP server with connection pooling. Worker pool with bounded channels. context.WithTimeout per request. pprof endpoints. Graceful shutdown with signal handling.', keyConsiderations: ['Goroutine count', 'Channel buffer sizes', 'GC tuning'] }],
  resources: [{ title: 'Go Tour', url: 'https://go.dev/tour/', type: 'documentation' }],
});

export const cpp = createModule({
  id: 'cpp',
  title: 'C++ — Memory & Systems',
  stage: 3,
  level: 'advanced',
  icon: '⚙️',
  description: 'Understand memory management, RAII, move semantics, and systems-level programming through C++.',
  prerequisites: ['cs-fundamentals'],
  estimatedHours: 30,
  learningObjectives: ['Apply RAII and smart pointers', 'Understand move semantics and Rule of 5', 'Reason about cache locality and undefined behavior'],
  sections: [
    { id: 'memory', title: 'Memory Management', content: `Stack: automatic, fast, limited. Heap: manual (or smart pointers), flexible. RAII: resource acquisition is initialization — destructor cleans up. Smart pointers: unique_ptr (exclusive), shared_ptr (reference counted), weak_ptr (break cycles).` },
    { id: 'move', title: 'Move Semantics', content: `Rvalue references (&&) enable moving instead of copying. Move constructor transfers ownership. Rule of 5: if you define one of destructor/copy/move constructor/copy/move assignment, consider all five.` },
  ],
  questions: [
    { id: 'cpp-q1', level: 'understanding', question: 'What is RAII?', answer: 'Resource Acquisition Is Initialization — bind resource lifetime to object lifetime. Constructor acquires, destructor releases. Eliminates manual memory management errors.' },
    { id: 'cpp-q2', level: 'application', question: 'unique_ptr vs shared_ptr?', answer: 'unique_ptr: single owner, zero overhead, move-only. shared_ptr: multiple owners, reference counting overhead, use when shared ownership needed. Prefer unique_ptr by default.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'cppreference.com', url: 'https://en.cppreference.com/', type: 'documentation' }],
});

export const react = createModule({
  id: 'react',
  title: 'React — Modern Frontend',
  stage: 6,
  level: 'intermediate',
  icon: '⚛️',
  description: 'Components, hooks, state management, performance optimization, and large application architecture.',
  prerequisites: ['cs-fundamentals'],
  estimatedHours: 35,
  learningObjectives: ['Master hooks and component lifecycle', 'Choose between Context, Redux, and server state libraries', 'Optimize rendering for large applications', 'Structure scalable React codebases'],
  sections: [
    { id: 'hooks', title: 'Hooks Deep Dive', content: `useState: local state. useEffect: side effects (fetch, subscriptions). useMemo/useCallback: memoization (don't overuse). useRef: mutable values without re-render. Custom hooks: extract reusable logic.` },
    { id: 'state', title: 'State Management', content: `Local state → lifted state → Context (low-frequency updates) → Global store (Redux/Zustand) → Server state (React Query/TanStack Query). Signal for refactor: prop drilling > 3 levels, unrelated components sharing state, frequent updates causing wide re-renders.` },
    { id: 'performance', title: 'Performance', content: `React re-renders when state/props change or parent re-renders. React.memo for expensive pure components. Virtualization for long lists (react-window). Code splitting with React.lazy. Avoid inline objects/functions in JSX props.` },
  ],
  questions: [
    { id: 'react-q1', level: 'understanding', question: 'Why does a component re-render?', answer: 'State changes, props changes, parent re-renders (cascading), or context value changes. React.memo prevents re-render if props are shallow-equal.' },
    { id: 'react-q2', level: 'application', question: 'When should state move from component to Context to global store?', answer: 'Component: local UI state. Context: theme, auth, low-frequency shared state. Global store: complex state logic, frequent updates across many components, middleware needs (logging, persistence). Server state (React Query): API data with caching, refetching, optimistic updates.' },
    { id: 'react-q3', level: 'senior', question: 'How would you optimize a table with 10,000 rows?', answer: 'Virtualization (react-window/react-virtualized) — only render visible rows. Pagination or infinite scroll. Memoize row components. Avoid inline functions in render. Web Worker for sorting/filtering if expensive. Server-side pagination for data fetching.' },
  ],
  seniorScenarios: [{ title: 'Dashboard architecture', scenario: 'Dashboard needs auth, DB data, real-time updates, and interactive filters.', approach: 'Server Components for initial data fetch. Client Components for interactive filters. WebSocket/SSE for real-time. React Query for server state with stale-while-revalidate. Auth in middleware.', keyConsiderations: ['Server vs client boundary', 'Caching strategy', 'Real-time connection management'] }],
  resources: [{ title: 'React Documentation', url: 'https://react.dev/', type: 'documentation' }],
});

export const nextjs = createModule({
  id: 'nextjs',
  title: 'Next.js — Full-Stack React',
  stage: 6,
  level: 'advanced',
  icon: '▲',
  description: 'Server Components, App Router, SSR/SSG/ISR, caching, and modern full-stack patterns.',
  prerequisites: ['react'],
  estimatedHours: 20,
  learningObjectives: ['Distinguish Server vs Client Components', 'Implement SSR, SSG, and ISR strategies', 'Design caching and revalidation policies'],
  sections: [
    { id: 'app-router', title: 'App Router & Server Components', content: `Server Components: render on server, zero JS to client, direct DB access. Client Components ("use client"): interactivity, hooks, browser APIs. Default is Server Component. Push "use client" boundary as low as possible.` },
    { id: 'rendering', title: 'Rendering Strategies', content: `SSR: render per request (dynamic data). SSG: build time (static). ISR: static + periodic revalidation. Streaming: send HTML in chunks with Suspense. Choose based on data freshness requirements.` },
  ],
  questions: [
    { id: 'next-q1', level: 'understanding', question: 'Server Component vs Client Component?', answer: 'Server Components run on server only — no JS bundle, direct data access, cannot use hooks/state. Client Components run in browser — interactivity, hooks, event handlers. Use Server by default, Client only when needed.' },
    { id: 'next-q2', level: 'senior', question: 'Dashboard with auth, DB data, real-time updates, and filters — what goes server vs client?', answer: 'Server: initial data fetch, auth check, static layout. Client: interactive filters, real-time subscription, form inputs. API route or Server Action for mutations. React Query for client-side data with optimistic updates.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'Next.js Documentation', url: 'https://nextjs.org/docs', type: 'documentation' }],
});

export const restApi = createModule({
  id: 'rest-api',
  title: 'REST API Design',
  stage: 5,
  level: 'intermediate',
  icon: '🌐',
  description: 'HTTP deep dive, REST principles, authentication, caching, and API design for scale.',
  prerequisites: ['networking'],
  estimatedHours: 15,
  learningObjectives: ['Design RESTful APIs with proper status codes and versioning', 'Implement authentication and caching strategies', 'Handle pagination, rate limiting, and idempotency'],
  sections: [
    { id: 'http', title: 'HTTP Deep Dive', content: `Safe methods: GET, HEAD, OPTIONS (no side effects). Idempotent: GET, PUT, DELETE (same result if repeated). POST is neither. Status codes: 2xx success, 3xx redirect, 4xx client error, 5xx server error. ETags for conditional requests and caching.` },
    { id: 'design', title: 'API Design Principles', content: `Resources as nouns (/users, /orders). HTTP verbs for actions. Versioning: URL path (/v1/) or header. HATEOAS for discoverability. Consistent error format. Pagination, filtering, sorting as query params.` },
  ],
  questions: [
    { id: 'rest-q1', level: 'understanding', question: 'PUT vs PATCH?', answer: 'PUT replaces entire resource (idempotent). PATCH applies partial update (idempotent if designed correctly). Use PATCH for partial updates, PUT for full replacement.' },
    { id: 'rest-q2', level: 'senior', question: 'Design an API for 100 million users.', answer: 'JWT auth with refresh tokens. API gateway for rate limiting. Cursor pagination. Idempotency keys for POST. Versioning strategy. Rate limiting per user/IP. Caching with ETags. Correlation IDs. Circuit breakers. Observability (metrics, tracing, logs).' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'HTTP RFC 9110', url: 'https://www.rfc-editor.org/rfc/rfc9110', type: 'documentation' }],
});

export const graphql = createModule({
  id: 'graphql',
  title: 'GraphQL',
  stage: 5,
  level: 'intermediate',
  icon: '◈',
  description: 'GraphQL schema design, resolvers, N+1 problem, and protecting against expensive queries.',
  prerequisites: ['rest-api'],
  estimatedHours: 12,
  learningObjectives: ['Design GraphQL schemas and resolvers', 'Solve N+1 with DataLoader', 'Protect against query complexity attacks'],
  sections: [
    { id: 'fundamentals', title: 'GraphQL Fundamentals', content: `Query: read data. Mutation: write data. Subscription: real-time. Schema defines types. Resolvers fetch data for each field. Client requests exactly what it needs — no over/under-fetching.` },
    { id: 'n-plus-1', title: 'N+1 Problem & DataLoader', content: `N+1: fetching list of N items, then N individual queries for related data. DataLoader batches and caches requests within a single request lifecycle.` },
  ],
  questions: [
    { id: 'gql-q1', level: 'understanding', question: 'REST vs GraphQL?', answer: 'REST: multiple endpoints, server defines response shape, HTTP caching built-in. GraphQL: single endpoint, client defines response shape, better for complex UIs with varying data needs. GraphQL adds complexity (N+1, query cost, caching).' },
    { id: 'gql-q2', level: 'senior', question: 'GraphQL API abused with expensive nested queries. How do you protect?', answer: 'Query depth limiting. Query complexity analysis (cost per field). Rate limiting by query cost. Persisted queries (whitelist). Timeout per query. DataLoader for batching. Monitor slow queries.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'GraphQL Documentation', url: 'https://graphql.org/learn/', type: 'documentation' }],
});

export const networking = createModule({
  id: 'networking',
  title: 'Networking',
  stage: 7,
  level: 'intermediate',
  icon: '🔗',
  description: 'OSI model, TCP/IP, DNS, HTTP/TLS, load balancing — essential for senior backend engineers.',
  prerequisites: ['cs-fundamentals'],
  estimatedHours: 20,
  learningObjectives: ['Trace a URL request through DNS, TCP, TLS, HTTP', 'Compare HTTP/1.1, HTTP/2, HTTP/3', 'Systematically debug latency sources'],
  sections: [
    { id: 'request-lifecycle', title: 'What Happens When You Enter a URL', content: `1) DNS resolution (cache → recursive resolver → authoritative). 2) TCP handshake (SYN, SYN-ACK, ACK). 3) TLS handshake (certificate, key exchange). 4) HTTP request/response. 5) Connection pooling reuses TCP connections.` },
    { id: 'protocols', title: 'Protocol Comparison', content: `HTTP/1.1: text, one request per connection (or pipelining). HTTP/2: binary, multiplexing, header compression. HTTP/3: QUIC (UDP), faster connection setup, no head-of-line blocking. WebSocket: full-duplex persistent connection. gRPC: binary, HTTP/2, protobuf.` },
  ],
  questions: [
    { id: 'net-q1', level: 'understanding', question: 'TCP vs UDP?', answer: 'TCP: reliable, ordered, connection-oriented (HTTP, databases). UDP: unreliable, unordered, connectionless, lower latency (DNS, video streaming, gaming). Choose TCP when correctness matters, UDP when speed matters and you handle reliability.' },
    { id: 'net-q2', level: 'debugging', question: 'API is slow. How do you determine if latency is DNS, TCP, TLS, app, or DB?', answer: 'curl -w timing breakdown. DNS: dig +time. TCP: tcpdump or curl time_connect. TLS: curl time_appconnect. App: application metrics minus DB time. DB: query logs. Distributed tracing for full breakdown. Compare from different locations.' },
  ],
  seniorScenarios: [{ title: 'Latency investigation', scenario: 'Users report 3s page load. Your API p50 is 100ms.', approach: 'Check DNS (slow resolver?). TLS (certificate chain?). CDN miss? Large payload? Client-side rendering? Third-party scripts? Geographic distance? Use RUM (Real User Monitoring) vs synthetic monitoring.', keyConsiderations: ['End-to-end vs server-side', 'Geographic factors', 'Client device/network'] }],
  resources: [{ title: 'High Performance Browser Networking', url: 'https://hpbn.co/', type: 'book' }],
});

export const linux = createModule({
  id: 'linux',
  title: 'Linux & Shell',
  stage: 7,
  level: 'intermediate',
  icon: '🐧',
  description: 'Process management, file systems, networking tools, and production debugging commands.',
  prerequisites: ['cs-fundamentals'],
  estimatedHours: 15,
  learningObjectives: ['Debug production issues with command-line tools', 'Understand processes, signals, and permissions', 'Analyze CPU, memory, disk, and network usage'],
  sections: [
    { id: 'commands', title: 'Essential Commands', content: `Process: ps, top, htop, kill, lsof. Memory: free, vmstat. Disk: df, du, iostat. Network: ss, netstat, curl, tcpdump. Text: grep, awk, sed, pipes. System: systemd, journalctl, dmesg.` },
    { id: 'debugging', title: 'Production Debugging', content: `CPU 100%: top → identify process → strace/perf. Memory leak: pmap, /proc/PID/status. Disk full: du -sh /* | sort -rh. Network: ss -tlnp, tcpdump. Logs: journalctl -u service -f.` },
  ],
  questions: [
    { id: 'linux-q1', level: 'application', question: 'Production API CPU is 100%. What commands do you run?', answer: 'top/htop → find PID. perf top -p PID → hot functions. strace -c -p PID → syscall breakdown. Check /proc/PID/status for threads. lsof -p PID → open files. If containerized: kubectl top pod, kubectl exec for tools.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'Linux Command Line', url: 'https://linuxcommand.org/', type: 'article' }],
});

export const git = createModule({
  id: 'git',
  title: 'Git — Version Control',
  stage: 7,
  level: 'beginner',
  icon: '📦',
  description: 'Beyond add/commit/push — branching strategies, rebase, recovery, and production workflows.',
  estimatedHours: 10,
  learningObjectives: ['Use rebase, cherry-pick, bisect, and reflog confidently', 'Handle merge conflicts and production hotfixes', 'Maintain clean git history'],
  sections: [
    { id: 'workflows', title: 'Branching & Workflows', content: `Feature branches → PR → review → merge. Hotfix: branch from main, fix, merge to main AND develop. Gitflow vs trunk-based development. Rebase for clean history on feature branches. Merge for preserving history on main.` },
    { id: 'recovery', title: 'Recovery & Debugging', content: `Reflog: recover "lost" commits. git bisect: find bug-introducing commit. git revert: safe undo (creates new commit). git reset: move branch pointer (dangerous on shared branches).` },
  ],
  questions: [
    { id: 'git-q1', level: 'understanding', question: 'Merge vs rebase?', answer: 'Merge: preserves history, creates merge commit. Rebase: replays commits on top of target, linear history. Rebase feature branches before merging. Never rebase shared/public branches.' },
    { id: 'git-q2', level: 'application', question: 'How do you handle a production hotfix?', answer: 'Branch from main (or tag). Fix and test. Merge to main, deploy. Cherry-pick or merge to develop. Tag release. Post-mortem if needed.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'Pro Git Book', url: 'https://git-scm.com/book', type: 'book' }],
});

export const docker = createModule({
  id: 'docker',
  title: 'Docker & Containers',
  stage: 7,
  level: 'intermediate',
  icon: '🐳',
  description: 'Images, containers, Dockerfile optimization, Docker Compose, and container debugging.',
  estimatedHours: 12,
  learningObjectives: ['Write optimized Dockerfiles with multi-stage builds', 'Debug container issues in production', 'Design container networking and volumes'],
  sections: [
    { id: 'fundamentals', title: 'Docker Fundamentals', content: `Image: read-only template with layers. Container: running instance of image. Dockerfile: build instructions. Layer caching: order matters (dependencies before code). Multi-stage builds: build in one stage, copy artifact to minimal runtime image.` },
    { id: 'optimization', title: 'Image Optimization', content: `Use alpine or distroless base images. Multi-stage builds. .dockerignore. Combine RUN commands. Don't install dev dependencies in production stage. Non-root user. Health checks.` },
  ],
  questions: [
    { id: 'docker-q1', level: 'optimization', question: 'Docker image is 1.8GB. How do you reduce it?', answer: 'Multi-stage build. Alpine/distroless base. Remove build tools from final image. .dockerignore. Combine layers. pip install --no-cache-dir. Analyze with docker history.' },
    { id: 'docker-q2', level: 'debugging', question: 'Container works locally but crashes in Kubernetes.', answer: 'Check resource limits (OOMKilled?). Environment variables missing? Different base image/architecture? Network policies blocking? Readiness/liveness probe failing? Check kubectl describe pod and kubectl logs.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'Docker Documentation', url: 'https://docs.docker.com/', type: 'documentation' }],
});

export const kubernetes = createModule({
  id: 'kubernetes',
  title: 'Kubernetes',
  stage: 7,
  level: 'advanced',
  icon: '☸️',
  description: 'Pods, deployments, services, ingress, scaling, and production Kubernetes operations.',
  prerequisites: ['docker'],
  estimatedHours: 20,
  learningObjectives: ['Deploy and manage applications on Kubernetes', 'Configure health probes and resource limits', 'Debug pod failures and scale under load'],
  sections: [
    { id: 'core', title: 'Core Concepts', content: `Pod: smallest deployable unit. Deployment: manages replica sets, rolling updates. Service: stable network endpoint. ConfigMap/Secret: configuration. Ingress: HTTP routing. HPA: auto-scaling based on metrics.` },
    { id: 'operations', title: 'Production Operations', content: `Probes: liveness (restart if failing), readiness (traffic routing), startup (slow-starting apps). Resource requests/limits prevent noisy neighbors. Rolling updates with maxUnavailable/maxSurge. PreStop hook for graceful shutdown.` },
  ],
  questions: [
    { id: 'k8s-q1', level: 'debugging', question: 'Pods keep restarting. How do you investigate?', answer: 'kubectl describe pod → events, OOMKilled?, probe failures. kubectl logs → application errors. kubectl get events. Check resource limits. Check image pull errors. exec into pod for debugging.' },
    { id: 'k8s-q2', level: 'senior', question: 'Traffic increases 20x. How do you scale?', answer: 'HPA scales pods based on CPU/custom metrics. Increase max replicas. Check node capacity — cluster autoscaler adds nodes. Verify DB can handle connections (PgBouncer). CDN for static. Rate limiting at ingress. Load test beforehand.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'Kubernetes Documentation', url: 'https://kubernetes.io/docs/', type: 'documentation' }],
});

export const distributedSystems = createModule({
  id: 'distributed-systems',
  title: 'Distributed Systems',
  stage: 8,
  level: 'senior',
  icon: '🌍',
  description: 'Consistency models, message queues, failure modes, and building reliable distributed systems.',
  prerequisites: ['system-design', 'networking'],
  estimatedHours: 30,
  learningObjectives: ['Explain consistency models and CAP theorem', 'Design for failure with retries, circuit breakers, and idempotency', 'Handle message ordering, duplicates, and poison messages'],
  sections: [
    { id: 'consistency', title: 'Consistency Models', content: `Strong: all nodes see same data simultaneously. Eventual: will converge given no new updates. Causal: preserves cause-effect ordering. Read-your-writes: user sees their own writes. Monotonic reads: no going backward in time.` },
    { id: 'failures', title: 'Failure Modes', content: `Network partition, split brain, retry storm, cascading failure, thundering herd, cache stampede, poison message, duplicate message, out-of-order message. Design for: at-least-once delivery + idempotent consumers = effective exactly-once.` },
  ],
  questions: [
    { id: 'ds-q1', level: 'understanding', question: 'What is a retry storm?', answer: 'Downstream service fails → all clients retry simultaneously → overwhelms recovering service → longer failure → more retries. Fix: exponential backoff with jitter, circuit breakers, retry budgets.' },
    { id: 'ds-q2', level: 'senior', question: 'Downstream API has 30% failure rate. Your service retries. Entire system starts failing. Why?', answer: 'Retry amplification: 30% failure × 3 retries = 90%+ load increase on failing service. Connection pool exhaustion. Thread/goroutine accumulation waiting for timeouts. Fix: circuit breaker, reduce retry count, increase timeout budget, bulkhead isolation.' },
  ],
  seniorScenarios: [{ title: 'Zero-downtime migration', scenario: 'Migrate database with zero downtime.', approach: 'Dual-write → backfill → verify → switch reads → stop old writes → cleanup. Use feature flags for gradual rollout.', keyConsiderations: ['Data consistency during dual-write', 'Rollback plan', 'Verification'] }],
  resources: [{ title: 'Designing Data-Intensive Applications', url: 'https://dataintensive.net/', type: 'book' }],
});

export const security = createModule({
  id: 'security',
  title: 'Security & API Security',
  stage: 9,
  level: 'advanced',
  icon: '🔒',
  description: 'Authentication, authorization, OWASP top 10, API security, and secure engineering practices.',
  estimatedHours: 20,
  learningObjectives: ['Implement secure authentication and authorization', 'Prevent OWASP top vulnerabilities', 'Design defense-in-depth for APIs'],
  sections: [
    { id: 'auth', title: 'Authentication & Authorization', content: `AuthN: who are you? (JWT, OAuth2, sessions). AuthZ: what can you do? (RBAC, ABAC). JWT: stateless but hard to revoke. Sessions: server-side state, easy revocation. Refresh tokens: httpOnly cookie, short-lived access tokens.` },
    { id: 'owasp', title: 'Common Vulnerabilities', content: `SQL Injection: parameterized queries. XSS: escape output, CSP headers. CSRF: SameSite cookies, CSRF tokens. IDOR: authorize every resource access. SSRF: validate URLs, block internal IPs. Rate limiting on all endpoints.` },
  ],
  questions: [
    { id: 'sec-q1', level: 'application', question: 'Users can modify another user\'s resource by changing the ID in the URL. How do you fix?', answer: 'IDOR vulnerability. Fix: authorize resource access in every endpoint (check resource.user_id == current_user.id). Test: automated tests with different user contexts. Prevent: use UUIDs instead of sequential IDs, implement RBAC middleware.' },
    { id: 'sec-q2', level: 'senior', question: 'How do you secure an API?', answer: 'HTTPS everywhere. Authentication (JWT/OAuth2). Authorization on every endpoint. Input validation. Rate limiting. CORS properly configured. Security headers (CSP, HSTS). Secrets in vault, not code. Audit logging. Dependency scanning. WAF at edge.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', type: 'documentation' }],
});

export const testing = createModule({
  id: 'testing',
  title: 'Testing & Quality',
  stage: 9,
  level: 'intermediate',
  icon: '🧪',
  description: 'Unit, integration, E2E, contract testing, and building confidence in production deployments.',
  estimatedHours: 15,
  learningObjectives: ['Write effective unit and integration tests', 'Understand testing pyramid and when to use each level', 'Recognize that coverage ≠ correctness'],
  sections: [
    { id: 'pyramid', title: 'Testing Pyramid', content: `Unit tests (many, fast, isolated): test functions/classes. Integration tests (some, medium): test component interactions. E2E tests (few, slow): test full user flows. Contract tests: verify API compatibility between services.` },
    { id: 'patterns', title: 'Testing Patterns', content: `Arrange-Act-Assert. Mock external dependencies, not your own code. Test containers for real DB/Redis in integration tests. Fixtures for test data. Parametrize for edge cases. Property-based testing for invariants.` },
  ],
  questions: [
    { id: 'test-q1', level: 'understanding', question: 'Mock vs stub?', answer: 'Stub: returns predefined responses (state verification). Mock: verifies interactions (behavior verification). Prefer stubs for most cases. Mock only when interaction pattern matters.' },
    { id: 'test-q2', level: 'senior', question: '95% test coverage but frequent production bugs. What does this tell you?', answer: 'Coverage measures executed code, not correctness. Likely issues: testing implementation not behavior, missing integration/E2E tests, not testing error paths, not testing concurrency, tests not matching real usage patterns. Focus on critical path tests and production-like integration tests.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'pytest Documentation', url: 'https://docs.pytest.org/', type: 'documentation' }],
});

export const performance = createModule({
  id: 'performance',
  title: 'Performance Engineering',
  stage: 9,
  level: 'senior',
  icon: '🚀',
  description: 'Profiling, benchmarking, latency analysis, and systematic performance optimization.',
  estimatedHours: 15,
  learningObjectives: ['Profile applications systematically', 'Understand p50/p95/p99 and tail latency', 'Optimize without premature optimization'],
  sections: [
    { id: 'metrics', title: 'Performance Metrics', content: `Latency: p50 (median), p95, p99 (tail). Throughput: requests/second. Average latency is misleading — always report percentiles. Tail latency causes: GC pauses, lock contention, slow dependencies, resource exhaustion.` },
    { id: 'methodology', title: 'Optimization Methodology', content: `1) Measure (don't guess). 2) Profile to find bottleneck. 3) Fix the biggest bottleneck. 4) Measure again. 5) Repeat. Common bottlenecks: DB queries, network I/O, serialization, lock contention, memory allocation.` },
  ],
  questions: [
    { id: 'perf-q1', level: 'understanding', question: 'Why is average latency misleading?', answer: 'Average hides tail latency. If p50=100ms and p99=5000ms, average might be 300ms but 1% of users wait 5 seconds. Always report percentiles. SLOs should be on p95/p99.' },
    { id: 'perf-q2', level: 'senior', question: 'p99 latency is 4 seconds while p50 is 100ms. What could cause this?', answer: 'GC pauses, lock contention (occasional long waits), slow downstream dependency (10% of requests), connection pool exhaustion (wait for connection), disk I/O spikes, large payload outliers, cold cache misses, retry storms.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'Systems Performance', url: 'https://www.brendangregg.com/systems-performance-2nd-edition-book.html', type: 'book' }],
});

export const observability = createModule({
  id: 'observability',
  title: 'Observability',
  stage: 9,
  level: 'intermediate',
  icon: '📊',
  description: 'Logs, metrics, traces — the three pillars of understanding production systems.',
  estimatedHours: 10,
  learningObjectives: ['Implement structured logging with correlation IDs', 'Define and monitor SLIs/SLOs', 'Use distributed tracing for debugging'],
  sections: [
    { id: 'pillars', title: 'Three Pillars', content: `Metrics: aggregated numbers (request rate, error rate, latency). Logs: discrete events with context. Traces: request flow across services. Metrics tell you something is wrong. Logs tell you what happened. Traces tell you where.` },
    { id: 'implementation', title: 'Implementation', content: `Structured logging (JSON). Correlation/request IDs propagated across services. RED metrics: Rate, Errors, Duration. USE metrics: Utilization, Saturation, Errors. Distributed tracing with OpenTelemetry. Alerting on SLO burn rate.` },
  ],
  questions: [
    { id: 'obs-q1', level: 'understanding', question: 'Metrics vs logs vs traces?', answer: 'Metrics: "error rate is 5%" (aggregated, cheap, alerting). Logs: "user 123 got 500 on /api/orders" (detailed, expensive, debugging). Traces: "request spent 2s in DB, 100ms in auth service" (cross-service, latency analysis).' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'OpenTelemetry', url: 'https://opentelemetry.io/docs/', type: 'documentation' }],
});

export const cloud = createModule({
  id: 'cloud',
  title: 'Cloud & AWS',
  stage: 7,
  level: 'intermediate',
  icon: '☁️',
  description: 'AWS services, cloud architecture patterns, and deploying production applications.',
  estimatedHours: 20,
  learningObjectives: ['Design cloud-native architectures on AWS', 'Use EC2, S3, RDS, Lambda, SQS, and CloudWatch', 'Implement high availability and auto-scaling'],
  sections: [
    { id: 'aws-core', title: 'Core AWS Services', content: `EC2: virtual servers. S3: object storage. RDS: managed databases. ElastiCache: managed Redis/Memcached. Lambda: serverless functions. SQS/SNS: messaging. API Gateway: API management. CloudWatch: monitoring. IAM: access control. VPC: networking.` },
    { id: 'patterns', title: 'Cloud Patterns', content: `Multi-AZ for availability. Auto Scaling Groups for elasticity. ALB for load balancing. CloudFront CDN for static assets. Secrets Manager for credentials. Infrastructure as Code (Terraform/CDK).` },
  ],
  questions: [
    { id: 'cloud-q1', level: 'senior', question: 'Design a highly available FastAPI app on AWS for millions of users.', answer: 'Route 53 → CloudFront → ALB → ECS/EKS (multi-AZ, auto-scaling). RDS PostgreSQL (Multi-AZ, read replicas). ElastiCache Redis. SQS for async. S3 for files. CloudWatch + X-Ray. WAF. Secrets Manager. CI/CD pipeline. Blue-green deployment.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'AWS Well-Architected Framework', url: 'https://aws.amazon.com/architecture/well-architected/', type: 'documentation' }],
});

export const aiEngineering = createModule({
  id: 'ai-engineering',
  title: 'AI-Assisted Engineering',
  stage: 10,
  level: 'intermediate',
  icon: '🤖',
  description: 'LLMs, RAG, vector databases, agents, and responsible AI-assisted development.',
  estimatedHours: 15,
  learningObjectives: ['Understand LLM APIs, embeddings, and RAG architecture', 'Evaluate AI-generated code for security and quality', 'Build processes for responsible AI-assisted development'],
  sections: [
    { id: 'fundamentals', title: 'LLM Fundamentals', content: `LLM APIs: prompt → completion. Embeddings: text → vector for similarity search. RAG: retrieve relevant docs + generate answer. Vector databases: Pinecone, Weaviate, pgvector. Agents: LLM + tools + planning loop.` },
    { id: 'responsible', title: 'Responsible AI Development', content: `Review all AI-generated code. Security scan (SAST). Test coverage requirements. No secrets in prompts. Evaluate output quality. Human review for critical paths. Document AI-assisted vs human-written.` },
  ],
  questions: [
    { id: 'ai-q1', level: 'senior', question: 'Team uses AI coding assistant. How do you ensure generated code is secure and maintainable?', answer: 'Mandatory code review (human). Automated security scanning (SAST/DAST). Test coverage requirements. Linting and type checking in CI. No direct commit of AI code without review. Training on prompting for secure code. Track AI-generated code ratio. Regular audits.' },
  ],
  seniorScenarios: [],
  resources: [{ title: 'OpenAI API Documentation', url: 'https://platform.openai.com/docs/', type: 'documentation' }],
});

export const seniorEngineering = createModule({
  id: 'senior-engineering',
  title: 'Senior Software Engineering',
  stage: 10,
  level: 'senior',
  icon: '🎯',
  description: 'Staff-level thinking, production scenarios, trade-off analysis, and mock interview preparation.',
  prerequisites: ['python', 'fastapi', 'system-design', 'distributed-systems'],
  estimatedHours: 30,
  learningObjectives: [
    'Answer senior-level scenario questions with structured reasoning',
    'Defend technology choices with trade-offs and alternatives',
    'Think in terms of failure modes, observability, and scaling',
    'Communicate architecture decisions clearly',
  ],
  sections: [
    {
      id: 'mindset',
      title: 'Senior Engineering Mindset',
      content: `Senior interviews test **engineering reasoning**, not memorization.

For every decision, explain:
1. **What** you would do
2. **Why** (not just what)
3. **Alternatives** you considered
4. **Trade-offs** of your choice
5. **Failure modes** and how you'd handle them
6. **How you'd measure** success

Template: "I would choose X because Y. The alternative Z has advantage A but disadvantage B. If X fails, we would detect it via metric M and respond by action N."`,
    },
    {
      id: 'scenarios',
      title: 'Core Senior Scenarios',
      content: `### Scenario 1: Redis unavailable
Cache-aside: degraded performance, not data loss. Session store: users logged out. Rate limiter: fail open or closed? Circuit breaker detects, falls back gracefully.

### Scenario 2: DB overloaded, can't add hardware
Query optimization, caching, read replicas, connection pooling, async processing for non-critical writes, rate limiting, shed load.

### Scenario 3: p99=4s, p50=100ms
Tail latency: GC, lock contention, slow dependency, pool exhaustion. Profile p99 specifically.

### Scenario 4: 30% downstream failure + retries = system failure
Retry amplification. Circuit breakers, bulkheads, retry budgets.

### Scenario 5: 10M users, change API without breaking clients
Versioning, feature flags, backward-compatible changes, deprecation timeline, client SDK management.

### Scenario 6: 100k concurrent requests, 3 downstream services
Full architecture design with timeouts, circuit breakers, caching, queuing, load shedding, observability.`,
    },
  ],
  questions: [
    {
      id: 'sen-q1',
      level: 'senior',
      question: '100,000 concurrent HTTP requests. Each calls 3 downstream services. One has 2s latency and 10% failure rate. Design the architecture.',
      answer: 'LB → N API pods (uvicorn workers). Per-downstream circuit breakers. Timeouts: 500ms fast, 2s slow with budget. Retry idempotent ops only, max 2 with jitter. Bulkhead connection pools. Redis cache. Queue non-critical. Rate limit per client. Load shed when queue depth high. Metrics: p50/p95/p99 per downstream, circuit state, queue depth. Fallback responses.',
      keyPoints: ['Circuit breakers', 'Timeouts', 'Bulkheads', 'Caching', 'Load shedding'],
    },
    {
      id: 'sen-q2',
      level: 'senior',
      question: 'Your database is overloaded. You cannot increase hardware. What do you do?',
      answer: '1) Identify top queries (pg_stat_statements). 2) Add indexes. 3) Cache hot data in Redis. 4) Read replicas for analytics. 5) Connection pooling (PgBouncer). 6) Async queue for non-critical writes. 7) Denormalize for read-heavy patterns. 8) Rate limit expensive queries. 9) Archive old data. 10) Materialized views.',
    },
    {
      id: 'sen-q3',
      level: 'senior',
      question: '10 million users. Change API contract without breaking clients.',
      answer: 'API versioning (/v1/, /v2/). Backward-compatible changes only in v1. Feature flags for gradual migration. Deprecation timeline with warnings in response headers. Client SDK versioning. Monitor v1 usage, sunset when <1%. Contract tests between versions.',
    },
  ],
  seniorScenarios: [
    {
      title: 'The Ultimate Scenario',
      scenario: 'Design complete architecture for 100k concurrent requests with 3 downstream services, one failing at 10%.',
      approach: 'See sen-q1 answer. Additionally: discuss monitoring dashboards, runbooks, on-call procedures, capacity planning, cost analysis, and how you would load test before launch.',
      keyConsiderations: ['Every layer has failure mode', 'Observability at every boundary', 'Graceful degradation', 'Cost vs reliability trade-offs'],
      followUpQuestions: ['What if you had 1M concurrent?', 'How would you test this?', 'What is your rollback plan?'],
    },
  ],
  resources: [
    { title: 'Staff Engineer Book', url: 'https://staffeng.com/book', type: 'book' },
    { title: 'The Senior Software Engineer', url: 'https://www.scaledagileframework.com/', type: 'article' },
  ],
});
