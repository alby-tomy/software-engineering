import { buildLesson } from '../content-format';

export const coreLessons: Record<string, string> = {
  'databases:postgresql': buildLesson({
    intro:
      'PostgreSQL powers most serious Python backends. MVCC, WAL, vacuum, and connection pooling explain concurrency behavior and the questions DBAs ask in senior interviews.',
    dialogues: [
      {
        q: 'What is MVCC and why do readers not block writers?',
        a: `**Multi-Version Concurrency Control** — each row version has xmin/xmax transaction IDs. Readers see a **snapshot** as of transaction start; writers create new row versions instead of overwriting in place.

**Readers don't block writers, writers don't block readers** (except row-level locks on UPDATE/DELETE).

Old versions become **dead tuples** — still on disk until **VACUUM** reclaims space.

Implications:
- Long transactions block vacuum → table bloat
- \`SELECT COUNT(*)\` on huge table — MVCC sees all versions
- Isolation levels control which snapshot you see

Interview: contrast with MySQL InnoDB (similar MVCC) vs lock-heavy models.`,
      },
      {
        q: 'What is WAL and why does it matter?',
        a: `**Write-Ahead Log** — changes written to WAL **before** data files. On crash, replay WAL to recover committed transactions.

Enables:
- **Crash recovery** — durability without syncing data pages every commit
- **Replication** — replicas stream WAL (async or sync)
- **Point-in-time recovery** — archive WAL segments

**Checkpoint** — periodically flush dirty pages, truncate old WAL.

If WAL disk is slow, commits slow — monitor WAL write latency. Don't put WAL on same saturated disk as data without reason.`,
      },
      {
        q: 'Why use PgBouncer between app and PostgreSQL?',
        a: `Each PostgreSQL connection costs **~10MB RAM** on server + backend process. FastAPI with 8 workers × pool 20 = 160 connections — painful without pooling.

**PgBouncer** multiplexes many client connections onto fewer server connections.

Modes:
- **Transaction pooling** — connection returned after each transaction (best for most APIs)
- **Session pooling** — hold for client session

App still uses connection pool per worker — PgBouncer is second layer at infrastructure.

Monitor: \`pg_stat_activity\`, connection wait time, pool saturation.`,
      },
      {
        q: 'Read replicas — what can go wrong?',
        a: `**Async replication** — replica lags primary by seconds (or minutes under load). Reads from replica may be **stale**.

**Read-after-write consistency:** user creates post, reads feed from replica — post missing. Fix: read from primary for own writes, or sticky session to primary briefly.

Use replicas for: analytics, search indexing, reporting — tolerate lag.

**Sync replication** — stronger consistency, higher write latency, primary waits for replica ack.

Monitor **replication lag** — alert > 10s. Route writes only to primary always.`,
      },
    ],
    takeaways: [
      'MVCC: snapshots + row versions; vacuum reclaims dead tuples',
      'WAL: durability, replication, PITR',
      'PgBouncer: multiplex connections — each PG connection is expensive',
      'Read replicas: async lag → stale reads; plan read-after-write',
    ],
    tip: 'Mention bloat and autovacuum when discussing slow queries on busy tables.',
  }),

  'databases:redis': buildLesson({
    intro:
      'Redis is cache, session store, rate limiter, and pub/sub — rarely your sole source of truth. Senior interviews focus on patterns and failure behavior.',
    dialogues: [
      {
        q: 'Explain cache-aside pattern.',
        a: `\`\`\`python
data = redis.get(key)
if data is None:
    data = db.query(...)
    redis.setex(key, ttl, serialize(data))
return deserialize(data)
\`\`\`

App owns cache logic. On write: **update DB, invalidate cache** (not always update cache — avoids stale complex objects).

**Pros:** only caches hot data. **Cons:** miss stampede, stale if invalidation fails.

TTL as safety net even with invalidation. Use consistent key naming: \`user:{id}:profile\`.`,
      },
      {
        q: 'Cache stampede — how do you prevent it?',
        a: `Popular key expires → **10,000 requests** miss simultaneously → all hit DB.

**Fixes:**
1. **Mutex lock** — \`SET lock:key NX EX 10\`; only one rebuilds, others wait or get stale
2. **Probabilistic early expiration** — refresh before TTL if random threshold
3. **Request coalescing** — singleflight pattern in app
4. **Never expire** hot keys without background refresh

Set lock timeout to prevent deadlock if builder crashes. Consider serving **stale** data briefly while rebuilding (stale-while-revalidate).`,
      },
      {
        q: 'Distributed locking with Redis — pitfalls?',
        a: `\`\`\`redis
SET resource_lock:order:123 unique_value NX EX 30
\`\`\`

**NX** — only if not exists. **EX** — auto-expire prevents dead lock if holder dies.

**Must verify** unlock with unique token — don't delete another holder's lock:

\`\`\`lua
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
\`\`\`

Redis lock is **not consensus** for critical finance — use Redlock cautiously or dedicated systems (etcd, DynamoDB conditional writes). Fine for cache rebuild mutex.`,
      },
      {
        q: 'Redis unavailable — what happens to your app?',
        a: `Depends on usage:

**Cache-aside:** degraded performance, DB load spikes — **not data loss** if DB healthy. Circuit breaker + fallback to DB with rate limit.

**Session store:** users **logged out** — bad UX. Sticky sessions or graceful re-auth.

**Rate limiter:** fail **open** (allow traffic, risk abuse) vs **closed** (reject all) — product decision.

Design: detect Redis failure fast, don't retry Redis forever blocking requests. Health check excludes Redis from readiness if sessions required.`,
      },
    ],
    takeaways: [
      'Cache-aside: app manages read-through and invalidation on write',
      'Stampede: lock, early refresh, or singleflight on hot keys',
      'Distributed lock: SET NX EX + compare-and-del on unlock',
      'Redis down: cache degrades; sessions/rate limits need explicit fallback policy',
    ],
    tip: 'Always state fail-open vs fail-closed for rate limiting when Redis dies.',
  }),

  'databases:sharding': buildLesson({
    intro:
      'Sharding splits data across databases when one node cannot handle writes or storage. Partitioning within one DB is often the step before true sharding.',
    dialogues: [
      {
        q: 'Partitioning vs sharding — difference?',
        a: `**Partitioning** — split large table into partitions **within one PostgreSQL** instance (range, list, hash). Query planner prunes partitions. Cheaper ops than multi-DB.

**Sharding** — horizontal split across **multiple database servers**. Each shard holds subset of data. Application or proxy routes by **shard key**.

Shard when: single DB maxes write IOPS, storage, or connection limits — and replicas/cache aren't enough.`,
      },
      {
        q: 'Shard key strategies — hash vs range vs directory?',
        a: `**Hash(user_id)** — even distribution, hard to range query "all users in EU"

**Range(user_id or time)** — easy range queries, **hot spots** if recent range is hot (all writes to latest shard)

**Directory lookup** — table maps key → shard; flexible, but directory is SPOF and bottleneck

Most APIs: **hash of tenant_id or user_id** for even spread. Time-based sharding for logs/events with TTL per shard.`,
      },
      {
        q: 'What makes sharding hard?',
        a: `**Cross-shard queries** — no global JOIN. Application aggregates, or denormalize, or analytics pipeline.

**Cross-shard transactions** — avoid 2PC. Saga, eventual consistency, or design boundaries so transaction fits one shard.

**Rebalancing** — moving data when adding shards. Consistent hashing reduces moved keys.

**Global uniqueness** — UUIDs vs per-shard sequences.

**Operational complexity** — N databases to backup, monitor, migrate.

Interview: "I'd partition by date first, shard when single partition exceeds capacity."`,
      },
      {
        q: 'When would you shard vs use Cassandra/DynamoDB?',
        a: `**Shard PostgreSQL** when: strong ACID on shard, team knows SQL, most queries single-shard by key.

**Cassandra/DynamoDB** when: massive write throughput, multi-region, tunable consistency, access patterns known upfront.

**Hybrid:** PostgreSQL for transactional core, Cassandra for events/time-series.

Don't shard prematurely — replicas + cache + partition often buy 10× headroom.`,
      },
    ],
    takeaways: [
      'Partitioning: one DB; sharding: multiple DB servers',
      'Shard key: hash for even load; range for time-series with hot-spot risk',
      'No cross-shard JOINs — design access patterns per shard',
      'Shard after exhausting optimize, replicate, cache, partition',
    ],
    tip: 'Mention Vitess/Citus when asked about managed sharding on PostgreSQL.',
  }),

  'databases:nosql': buildLesson({
    intro:
      'NoSQL is not "no SQL ever" — it is choosing storage for access patterns SQL handles poorly at scale. Decision matrix beats hype.',
    dialogues: [
      {
        q: 'SQL vs NoSQL — how do you decide?',
        a: `| Need | Choose |
|------|--------|
| ACID transactions across entities | PostgreSQL |
| Flexible schema, document model | MongoDB |
| Key-value cache | Redis |
| Full-text search | Elasticsearch |
| Time-series metrics | TimescaleDB, InfluxDB |
| Massive write scale, multi-region | Cassandra, DynamoDB |

Start with **PostgreSQL** until proven insufficient. Most "NoSQL" needs are search, cache, or events — add specialized store alongside SQL.`,
      },
      {
        q: 'CAP theorem in practice — not a checkbox.',
        a: `During **partition**, choose **Consistency** or **Availability**:

**CP** — reject requests rather than return stale (bank balance, inventory decrement with strong rules)

**AP** — always respond, accept eventual consistency (social like counts, DNS)

**Partitions happen** — design for them. **PACELC:** without partition, still trade latency vs consistency (most systems pick low latency + eventual consistency normally).`,
      },
      {
        q: 'When is MongoDB a good fit?',
        a: `**Document model** matches nested JSON (CMS, product catalogs with variants). **Schema flexibility** for evolving documents.

**Horizontal scaling** via sharding built-in. **Geographically distributed** deployments easier than self-sharded PG for some teams.

**Poor fit:** complex multi-document transactions (improved but still not PG), heavy relational reporting without ETL, ad-hoc joins across collections.

Often: **PostgreSQL JSONB** covers flexible schema needs without second database.`,
      },
      {
        q: 'Polyglot persistence architecture example.',
        a: `E-commerce typical stack:
- **PostgreSQL** — orders, payments, inventory (ACID)
- **Redis** — session, cache, rate limits
- **Elasticsearch** — product search (sync via CDC/events)
- **S3** — images
- **Kafka** — order events for analytics

Each store optimized for access pattern. **Single source of truth** per entity — don't dual-write without reconciliation strategy.

Interview draw: boxes with arrows labeled sync mechanism (CDC, outbox, cache-aside).`,
      },
    ],
    takeaways: [
      'Pick store by access pattern — PG for ACID, Redis cache, ES search',
      'CAP: CP for money, AP for counts and DNS-like availability',
      'MongoDB: nested documents; PG JSONB often suffices',
      'Polyglot persistence: one source of truth per domain + event sync',
    ],
    tip: 'Say "bounded context" when explaining why orders DB ≠ analytics DB.',
  }),

  'networking:request-lifecycle': buildLesson({
    intro:
      'Tracing a URL from browser to response is classic senior networking — DNS, TCP, TLS, HTTP, and connection reuse. Latency hides in each step.',
    dialogues: [
      {
        q: 'What happens when you enter https://api.example.com/users?',
        a: `1. **DNS** — resolve api.example.com → IP (browser cache → OS cache → resolver → authoritative)
2. **TCP handshake** — SYN, SYN-ACK, ACK (1 RTT)
3. **TLS handshake** — certificate, key exchange (1-2 RTT for TLS 1.3)
4. **HTTP request** — GET /users over encrypted connection
5. **Server** — LB → app → DB → response
6. **HTTP response** — status, headers, body
7. **Connection** — keep-alive reuses TCP+TLS for next request

**First request** pays DNS + TCP + TLS. **Subsequent** on same connection skip much setup.`,
      },
      {
        q: 'Why does connection pooling matter?',
        a: `Opening new TCP+TLS per request adds **2-3 RTTs** + CPU for crypto. At 1000 RPS that's catastrophic.

**HTTP keep-alive** — reuse connection for multiple requests.

**Client pool** — httpx/requests session with max connections per host.

**Server pool to DB** — PgBouncer, asyncpg pool.

Pool size tuned to concurrency — too small → wait; too large → resource exhaustion downstream.`,
      },
      {
        q: 'How do you debug which layer is slow?',
        a: `\`\`\`bash
curl -w "dns:%{time_namelookup} connect:%{time_connect} tls:%{time_appconnect} ttfb:%{time_starttransfer} total:%{time_total}\n" -o /dev/null -s https://api.example.com
\`\`\`

Compare from multiple regions. **RUM** (real user monitoring) vs synthetic — users on mobile differ from datacenter curl.

Distributed tracing on server fills gap between TTFB and internal spans.`,
      },
      {
        q: 'What is head-of-line blocking?',
        a: `**HTTP/1.1** — one request at a time per connection (pipelining rare/broken). Browsers open 6 parallel connections — wasteful.

**HTTP/2** — multiplexing many streams on one connection — but **TCP** head-of-line blocking: one lost packet delays all streams.

**HTTP/3 (QUIC)** — UDP-based, per-stream loss recovery — no TCP HOL blocking.

For APIs: HTTP/2 common behind modern LB. HTTP/3 growing for browser traffic.`,
      },
    ],
    takeaways: [
      'Full path: DNS → TCP → TLS → HTTP → app; first request most expensive',
      'Keep-alive and pools avoid repeated handshake cost',
      'curl -w splits DNS, connect, TLS, TTFB',
      'HOL blocking: HTTP/2 fixes request-level; QUIC fixes TCP-level',
    ],
    tip: 'Mention preconnect and DNS prefetch for frontend latency stories.',
  }),

  'networking:protocols': buildLesson({
    intro:
      'HTTP versions, WebSocket, and gRPC each optimize different trade-offs. Senior backend interviews compare them with concrete use cases.',
    dialogues: [
      {
        q: 'HTTP/1.1 vs HTTP/2 vs HTTP/3?',
        a: `**HTTP/1.1** — text protocol, one request per connection (typically), head-of-line blocking per connection.

**HTTP/2** — binary framing, **multiplexing** many requests on one connection, header compression (HPACK). Still TCP — lost packet blocks all streams.

**HTTP/3** — **QUIC over UDP**, independent streams, faster handshake (0-RTT resumption), no TCP HOL blocking.

API clients: benefit from HTTP/2 multiplexing to same host. Internal gRPC already uses HTTP/2.`,
      },
      {
        q: 'TCP vs UDP — when which?',
        a: `**TCP** — reliable, ordered, connection-oriented. HTTP, databases, most APIs. Retransmits lost packets.

**UDP** — unreliable, unordered, lower latency. DNS queries, video streaming (tolerate loss), gaming, **QUIC/HTTP3**.

Choose TCP when correctness matters. UDP when speed matters and app handles reliability (or loss acceptable).`,
      },
      {
        q: 'WebSocket vs HTTP polling?',
        a: `**Polling** — client repeatedly requests — simple, wasteful, high latency.

**Long polling** — server holds request until event — better, still connection per wait.

**WebSocket** — full-duplex persistent connection after HTTP upgrade. Low latency push both directions. Chat, live dashboards, gaming.

**SSE (Server-Sent Events)** — server push over HTTP one-way — simpler than WebSocket for feeds.

Scale WebSockets: sticky sessions or shared pub/sub backplane (Redis) so any server can push to connected clients.`,
      },
      {
        q: 'gRPC vs REST for internal services?',
        a: `**gRPC** — HTTP/2, **protobuf** binary, strong typing, streaming built-in. Fast, low overhead. Great **service-to-service**.

**REST/JSON** — human-readable, browser-native, easy debugging, HTTP caching with ETags. Great **public APIs**.

Use gRPC internally for performance and contracts. REST (or GraphQL) at edge for clients. **grpc-gateway** translates REST to gRPC if needed.`,
      },
    ],
    takeaways: [
      'HTTP/2 multiplexes; HTTP/3 QUIC removes TCP HOL blocking',
      'TCP reliable; UDP for DNS, QUIC, loss-tolerant media',
      'WebSocket for bidirectional real-time; SSE for server push',
      'gRPC internal; REST/JSON public',
    ],
    tip: 'Know three-way TCP handshake for networking fundamentals questions.',
  }),

  'networking:dns': buildLesson({
    intro:
      'DNS is easy to forget until the first request to a new domain is slow. Resolution chain, record types, and TTL drive failover and performance.',
    dialogues: [
      {
        q: 'Walk through DNS resolution.',
        a: `1. **Browser cache** — recent lookups
2. **OS cache** — system resolver cache
3. **Recursive resolver** (ISP, 8.8.8.8, corporate DNS)
4. **Root** → **TLD** (.com) → **Authoritative** nameserver for domain

Recursive resolver caches answers per **TTL**. Low TTL (60s) for fast failover; high TTL (3600s) for performance.

**First visit** to domain pays full chain latency — often 20-100ms+.`,
      },
      {
        q: 'Common DNS record types?',
        a: `**A** — IPv4 address
**AAAA** — IPv6
**CNAME** — alias to another hostname (can't at apex with some providers — use ALIAS/ANAME)
**MX** — mail servers
**TXT** — verification, SPF, DKIM
**NS** — nameserver delegation

For API: **A/AAAA** or **CNAME** to load balancer. **CNAME flattening** at CDN providers for apex domains.`,
      },
      {
        q: 'DNS as performance bottleneck?',
        a: `Mitigations:
- **Prefetch** \`<link rel="dns-prefetch">\`
- **Preconnect** \`<link rel="preconnect">\` — DNS + TCP + TLS early
- **Connection reuse** — same host, no repeat DNS
- **Low TTL only when needed** — balance failover vs cache hit rate

Monitor DNS latency from multiple regions. Use anycast DNS (Route 53, Cloudflare).`,
      },
      {
        q: 'DNS failover and health checks?',
        a: `Route 53 health checks → remove unhealthy endpoint from DNS response. TTL determines how fast clients pick up change — low TTL required for fast failover.

**Clients cache** — failover not instant even with TTL 0 in theory.

**Don't rely on DNS alone** for HA — LB health checks + multiple origins. DNS failover is coarse (minutes possible with cached clients).`,
      },
    ],
    takeaways: [
      'Resolution: browser → OS → recursive → root → TLD → authoritative',
      'A/AAAA for IPs; CNAME for aliases; TTL balances cache vs failover',
      'First request pays DNS — prefetch/preconnect help',
      'DNS failover is slow-ish; pair with LB health checks',
    ],
    tip: 'Mention CNAME at apex limitation — shows real deployment experience.',
  }),

  'networking:tls': buildLesson({
    intro:
      'TLS adds encryption and trust — and latency. Understanding handshakes, certificate chains, and session resumption is essential for API performance tuning.',
    dialogues: [
      {
        q: 'TLS handshake steps simplified?',
        a: `1. **Client Hello** — supported TLS versions, cipher suites, random
2. **Server Hello** — chosen cipher, certificate chain, random
3. **Key exchange** — establish shared secret (ECDHE common)
4. **Finished** — encrypted application data begins

**TLS 1.3** — fewer round trips, deprecated weak ciphers. **1-RTT** handshake typical; **0-RTT** resumption for repeat connections (careful with replay).

Each new TCP connection to new host pays this unless session resumption or QUIC.`,
      },
      {
        q: 'Certificate chain validation?',
        a: `**Leaf certificate** for your domain → signed by **Intermediate CA** → chains to **Root CA** in browser trust store.

Server must send full chain (leaf + intermediates). Missing intermediate → some clients fail.

**mTLS** — client also presents certificate for service-to-service auth.

Renew before expiry — automate with Let's Encrypt, cert-manager in K8s. Monitor cert expiry alerts.`,
      },
      {
        q: 'TLS performance optimizations?',
        a: `**Session resumption** — session tickets or IDs skip full handshake
**TLS 1.3** everywhere
**HTTP/2 or QUIC** — one connection many requests
**Edge termination** — CDN/ALB handles TLS, internal HTTP (or re-encrypt with mTLS)
**Hardware AES** — modern CPUs fast enough for most

Avoid **TLS renegotiation per request**. Connection pooling is critical.`,
      },
      {
        q: 'What is mTLS and when use it?',
        a: `**Mutual TLS** — both client and server present certificates. Service mesh (Istio) automates cert rotation between pods.

Use for: zero-trust internal networks, B2B APIs, high-security microservices.

Public internet APIs typically use TLS one-way + API keys/JWT instead of client certs (UX complexity).`,
      },
    ],
    takeaways: [
      'TLS 1.3 reduces handshake RTTs; session resumption helps repeat connections',
      'Send full cert chain; automate renewal',
      'Terminate TLS at edge; pool connections to avoid repeated handshakes',
      'mTLS for service-to-service zero trust',
    ],
    tip: 'Tie TLS to curl time_appconnect metric when debugging latency.',
  }),

  'docker:fundamentals': buildLesson({
    intro:
      'Containers package apps with dependencies — not VMs. Images, layers, Dockerfile order, and multi-stage builds are daily senior backend skills.',
    dialogues: [
      {
        q: 'Image vs container?',
        a: `**Image** — read-only template of layers (filesystem snapshots). Built from Dockerfile. Stored in registry (ECR, GCR).

**Container** — running instance of image with writable layer on top. Isolated namespaces (PID, network, mount) — shares host kernel.

**Layer caching** — Dockerfile order matters: put rarely-changing layers (dependencies) before frequently-changing (source code).

\`\`\`dockerfile
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
\`\`\``,
      },
      {
        q: 'Multi-stage builds — why?',
        a: `Build in **builder** stage with compilers, dev deps. Copy only artifact to **runtime** stage:

\`\`\`dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --user -r requirements.txt

FROM python:3.12-slim
COPY --from=builder /root/.local /root/.local
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
\`\`\`

Final image without gcc, build tools — smaller, fewer attack surfaces. Use **distroless** or **alpine** for minimal runtime.`,
      },
      {
        q: 'Docker Compose for local dev — what it solves?',
        a: `**docker-compose.yml** defines multi-container stack:

\`\`\`yaml
services:
  api:
    build: .
    ports: ["8000:8000"]
    depends_on: [db, redis]
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: dev
  redis:
    image: redis:7
\`\`\`

One command \`docker compose up\` — reproducible dev environment matching prod topology. Not a substitute for K8s in prod but invaluable for integration tests with testcontainers too.`,
      },
      {
        q: 'Container security basics?',
        a: `Run as **non-root** user in Dockerfile (\`USER 1000\`). Read-only root filesystem where possible.

**.dockerignore** — don't copy secrets or .git into image.

**Scan images** in CI (Trivy, Snyk). Pin base image versions.

**Don't put secrets in image** — inject at runtime via env/secrets manager.

**Resource limits** in K8s prevent noisy neighbor — not Docker alone in prod.`,
      },
    ],
    takeaways: [
      'Image = layered template; container = running instance',
      'Multi-stage builds shrink images; order Dockerfile for cache',
      'Compose orchestrates local multi-service stacks',
      'Non-root, .dockerignore, scan images, no secrets in layers',
    ],
    tip: 'Mention testcontainers for integration tests with real Postgres in CI.',
  }),

  'distributed-systems:consistency': buildLesson({
    intro:
      'Consistency models and CAP explain why your distributed cache, replicas, and partitions behave the way they do — core senior system design vocabulary.',
    dialogues: [
      {
        q: 'Explain CAP theorem practically.',
        a: `When **network partition** happens, distributed system chooses:

**Consistency** — all nodes return same data (may **fail or block** requests)

**Availability** — every request gets response (may be **stale**)

**Partition tolerance** — required in real networks — not optional.

**Bank balance** → CP. **Twitter likes** → AP. Most systems are **AP normally**, stronger consistency on critical paths only.`,
      },
      {
        q: 'Consistency models beyond strong vs eventual?',
        a: `**Strong** — linearizable, all see same order immediately (expensive)

**Eventual** — converges if no new writes

**Causal** — preserves cause-effect (if A caused B, everyone sees A before B)

**Read-your-writes** — user sees own writes immediately

**Monotonic reads** — never go backward in time on reads

Session stickiness or routing reads to primary after write achieves read-your-writes without global strong consistency.`,
      },
      {
        q: 'Consensus — why do we need Raft/Paxos?',
        a: `**Consensus** — multiple nodes agree on single value/order despite failures.

Used for: leader election, distributed config, coordination (etcd, ZooKeeper).

**Raft** — understandable leader-based protocol. Followers replicate leader's log.

You don't implement Raft in app code — use etcd, Consul, or cloud coordination service. Understand **why** leader election matters for single-writer systems.`,
      },
      {
        q: 'Replication strategies?',
        a: `**Leader-follower (primary-replica)** — all writes to leader, replicas async/sync replicate. Simple, common in PostgreSQL.

**Multi-leader** — writes to any replica — conflict resolution needed (last-write-wins, vector clocks). Hard.

**Leaderless (Dynamo-style)** — write to N nodes, read from N, quorum (R + W > N) for consistency tuning.

**Sync replication** — durability, higher write latency. **Async** — faster, lag risk.

Choose based on RPO/RTO and consistency requirements per data type.`,
      },
    ],
    takeaways: [
      'CAP: under partition, consistency OR availability',
      'Read-your-writes often enough without global linearizability',
      'Consensus (Raft) for coordination — use managed/etcd',
      'Replication: sync vs async trade latency vs durability',
    ],
    tip: 'PACELC: even without partition, latency vs consistency trade exists.',
  }),

  'distributed-systems:failures': buildLesson({
    intro:
      'Distributed systems fail in predictable patterns — retry storms, split brain, poison messages. Design for failure, not hope.',
    dialogues: [
      {
        q: 'What is a retry storm?',
        a: `Service fails → all clients retry simultaneously → **amplified load** on recovering service → longer failure → more retries.

**Fix:**
- Exponential backoff + **jitter**
- **Circuit breakers** — fail fast when downstream unhealthy
- **Retry budgets** — max retries per minute globally
- **Idempotent** handlers so retries safe

30% failure × 3 retries ≈ 90%+ extra load — can kill healthy dependencies too.`,
      },
      {
        q: 'Thundering herd and cache stampede?',
        a: `**Thundering herd** — many clients request same resource when it becomes available (cache expired, lock released).

**Cache stampede** — variant on cache miss flood to DB.

**Fixes:** mutex on rebuild, staggered TTL, request coalescing, pre-warm caches, jittered expiration.

At scale, **rate limit** cache miss path to DB as emergency protection.`,
      },
      {
        q: 'Poison messages and dead letter queues?',
        a: `**Poison message** — always fails processing (bad schema, bug). Blocks queue if no DLQ.

After **N retries**, move to **Dead Letter Queue** for manual inspection. Alert on DLQ depth.

**Never silently drop** failed messages without audit trail.

Fix code, replay DLQ after deploy, or discard with business approval.`,
      },
      {
        q: 'At-least-once + idempotent = effective exactly-once?',
        a: `True **exactly-once** end-to-end is hard across DB + queue.

Pragmatic pattern:
- **At-least-once delivery** from queue
- **Idempotent consumer** — dedupe by message ID in Redis/DB
- **Transactional outbox** — DB write + event in same transaction

Payment: idempotency keys on API. Effectively once from user perspective.`,
      },
    ],
    takeaways: [
      'Retry storms: backoff, jitter, circuit breakers, retry budgets',
      'Stampede/herd: lock, coalesce, stagger TTL',
      'Poison messages → DLQ + alert',
      'At-least-once + idempotency is production exactly-once',
    ],
    tip: 'Cite the 30% failure + retries scenario — classic senior interview story.',
  }),

  'security:owasp': buildLesson({
    intro:
      'OWASP Top 10 vulnerabilities appear in real APIs daily. Senior engineers prevent them by default — parameterized queries, validation, and authorization on every resource.',
    dialogues: [
      {
        q: 'SQL injection — prevention beyond "use ORM"?',
        a: `**Never** concatenate SQL strings with user input.

**Parameterized queries / prepared statements:**
\`\`\`python
cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
\`\`\`

ORMs use parameterization — but raw SQL in migrations or \`text()\` still risky.

**Least privilege DB user** — app user can't DROP tables.

**Input validation** — reject unexpected types early (Pydantic).

WAF as defense in depth, not primary fix.`,
      },
      {
        q: 'XSS and CSRF — API perspective?',
        a: `**XSS** — attacker injects script executing in victim browser. Steals cookies/tokens.

Prevention: escape output, **Content-Security-Policy** header, don't store JWT in localStorage (XSS steals it). httpOnly cookies for session tokens.

**CSRF** — attacker site triggers authenticated request to your API.

Prevention: **SameSite=Strict/Lax** cookies, CSRF tokens for cookie-auth forms, verify **Origin/Referer** headers.

JWT in Authorization header less CSRF-vulnerable (no automatic send) but XSS still critical.`,
      },
      {
        q: 'IDOR — the vulnerability everyone forgets to test?',
        a: `**Insecure Direct Object Reference** — change \`user_id=123\` to \`124\` in URL, access another user's data.

Fix: **authorize every resource access:**
\`\`\`python
order = await db.get(Order, order_id)
if order.user_id != current_user.id:
    raise HTTPException(403)
\`\`\`

Automated tests with two user contexts. Use UUIDs instead of sequential IDs (obscurity + safety). RBAC middleware not enough without object-level checks.`,
      },
      {
        q: 'SSRF and other API risks?',
        a: `**SSRF** — API fetches user-supplied URL, attacker hits internal metadata (169.254.169.254) or internal services.

Block internal IP ranges, validate URL scheme/host allowlist, no redirect following to internal.

Also: **mass assignment** (binding all JSON fields to model — whitelist fields), **rate limiting** everywhere, **security headers** (HSTS, X-Content-Type-Options), dependency scanning.`,
      },
    ],
    takeaways: [
      'SQLi: parameterized queries always; least privilege DB user',
      'XSS: CSP, httpOnly cookies; CSRF: SameSite, Origin check',
      'IDOR: authorize resource ownership on every endpoint',
      'SSRF: block internal URLs from server-side fetchers',
    ],
    tip: 'OWASP answer: name vulnerability + concrete fix + how you test it.',
  }),

  'security:auth': buildLesson({
    intro:
      'Authentication (who are you) and authorization (what can you do) are separate concerns. JWT vs sessions, OAuth2 flows, and RBAC appear in every senior security question.',
    dialogues: [
      {
        q: 'JWT vs session-based auth?',
        a: `**JWT (stateless)** — server signs token, client sends each request. Scales without shared session store. **Hard to revoke** before expiry (need blocklist or short TTL).

**Sessions** — server stores session ID in Redis/DB. Easy **revocation**, logout works instantly. Requires **shared store** for multi-server.

**Hybrid (common):** short-lived access JWT (15min) + refresh token in **httpOnly cookie** with rotation.

Microservices often use JWT for service-to-service; SPAs use hybrid pattern.`,
      },
      {
        q: 'OAuth2 flows — which for what?',
        a: `**Authorization Code + PKCE** — web and mobile apps. User authenticates at provider, app gets code, exchanges for tokens. PKCE prevents interception.

**Client Credentials** — service-to-service, no user. Machine identity.

**Refresh tokens** — long-lived, rotate on use, store securely httpOnly.

Never expose client secret in mobile/SPA — use PKCE instead.`,
      },
      {
        q: 'RBAC vs ABAC?',
        a: `**RBAC** — roles (admin, editor) map to permissions. Simple, common.

\`\`\`python
@require_role("admin")
def delete_user(...):
\`\`\`

**ABAC** — attributes (department, resource owner, time of day). More flexible, complex.

Most apps: RBAC + **resource-level checks** (owner_id == current_user.id).`,
      },
      {
        q: 'Token security best practices?',
        a: `**Short access token TTL** (5-15 min)
**Refresh rotation** — new refresh on each use, invalidate old
**httpOnly, Secure, SameSite** cookies for refresh
**Never localStorage** for tokens if XSS risk
**Bind to audience/issuer** in JWT validation
**Revocation list** in Redis for compromised tokens (JTI blacklist)
**mTLS** for high-security internal services`,
      },
    ],
    takeaways: [
      'JWT scales; sessions revoke easily — hybrid is common',
      'OAuth2: Authorization Code + PKCE for users; Client Credentials for services',
      'RBAC + per-resource authorization prevents IDOR',
      'Short TTL, httpOnly refresh, no localStorage for tokens',
    ],
    tip: 'Explain refresh token rotation — shows you know stolen refresh token handling.',
  }),

  'security:api-security': buildLesson({
    intro:
      'API security checklist covers HTTPS, secrets management, rate limiting, and defense in depth — what senior engineers implement before security review.',
    dialogues: [
      {
        q: 'Secrets management — never in repo?',
        a: `**Never** commit API keys, DB passwords, JWT secrets to git.

Use:
- **AWS Secrets Manager / Vault** — rotation, audit
- **K8s Secrets** — base64 encoded, restrict RBAC, consider external secrets operator
- **CI injected** env vars from secret store

**Scan repos** with git-secrets, trufflehog in CI. Rotate on any leak.

**12-factor:** config in environment, secrets in vault — not in environment files in repo.`,
      },
      {
        q: 'API security checklist top items?',
        a: `1. HTTPS everywhere + HSTS
2. Auth on all endpoints (including health if sensitive)
3. Authorization per resource
4. Input validation (Pydantic)
5. Rate limiting per IP/user/endpoint
6. CORS whitelist — never \`*\` with credentials
7. Security headers (CSP, X-Frame-Options)
8. Audit log sensitive operations
9. Dependency scanning (Dependabot, Snyk)
10. WAF at edge for public APIs`,
      },
      {
        q: 'Rate limiting strategies?',
        a: `**Token bucket** — allows bursts, smooth average rate. Good for APIs.

**Sliding window** — precise per-minute limits. More memory.

Implement at **API gateway** (first line) and app (defense in depth).

Return **429** with \`Retry-After\`. Distributed: Redis with Lua for atomicity.

Different limits per tier (free vs paid). Protect expensive endpoints separately.`,
      },
      {
        q: 'How do you prevent token replay?',
        a: `Short expiry, refresh rotation, **JTI** (JWT ID) in Redis blacklist on logout/compromise.

**One-time tokens** for password reset, email verify.

Optional: bind token to **client fingerprint** or IP (fragile for mobile).

Monitor anomalous token use — geo velocity, device change.`,
      },
    ],
    takeaways: [
      'Secrets in vault; scan repos; rotate on leak',
      'Defense in depth: gateway + app rate limits, validation, authZ',
      'Token bucket rate limiting with Redis for distributed APIs',
      'Replay prevention: short TTL, rotation, JTI blacklist',
    ],
    tip: 'Mention principle of least privilege for IAM and DB users.',
  }),

  'concurrency:models': buildLesson({
    intro:
      'Threads, processes, async, and actors — four concurrency models with different isolation, overhead, and parallelism. Choosing wrong model wastes months.',
    dialogues: [
      {
        q: 'Compare the four concurrency models.',
        a: `| Model | Best for | Isolation | Parallelism |
|-------|----------|-----------|-------------|
| Threads | I/O + blocking libs | Shared memory | Limited (GIL in Python) |
| Processes | CPU-bound, isolation | Full | True multi-core |
| Async | 1000+ I/O connections | Single thread | Cooperative |
| Actors | Distributed messaging | Message passing | Per-actor sequential |

**Decision tree:** CPU-bound → processes. I/O 1000+ with async stack → asyncio. I/O with blocking libs → threads.`,
      },
      {
        q: 'Common concurrency mistakes?',
        a: `1. Threads for CPU-bound Python (GIL)
2. Blocking event loop in async code
3. Unbounded thread/process spawn under load
4. No timeouts on concurrent operations
5. Shared mutable state without locks
6. Goroutine/task leaks without cancellation`,
      },
      {
        q: 'Fetch 100 URLs — threads vs asyncio vs multiprocessing?',
        a: `**Asyncio** — best if aiohttp/httpx async, caps memory, thousands possible.

**Threads** — good with \`requests\` library, moderate concurrency (~100).

**Multiprocessing** — wrong tool for network I/O — overhead without benefit.

Benchmark and explain: network-bound → concurrency helps; CPU-bound parsing → maybe process pool for parsing step only.`,
      },
      {
        q: 'Actor model when?',
        a: `**Actors** — independent units with mailboxes, no shared state. Erlang, Akka, some distributed systems.

Use when: natural message passing, fault isolation per actor, distributed by design.

Python: less common natively — asyncio tasks + queues approximate locally. Microservices are "actors at datacenter scale."`,
      },
    ],
    takeaways: [
      'Match model to workload: CPU→processes, I/O scale→async, blocking I/O→threads',
      'Never block asyncio event loop',
      'Bound concurrency — semaphores, pool sizes, queue maxsize',
      'Actors/message passing for isolation at scale',
    ],
    tip: 'Link to FastAPI: def vs async def is this decision in web layer.',
  }),

  'concurrency:synchronization': buildLesson({
    intro:
      'Locks, semaphores, and deadlocks appear in threaded code, connection pools, and async semaphores. Senior engineers know prevention beats debugging.',
    dialogues: [
      {
        q: 'Mutex vs semaphore?',
        a: `**Mutex (lock)** — one owner at a time. Protect shared mutable data structure.

**Semaphore** — allow **N** concurrent accessors. Connection pool of 10 DB connections = semaphore with 10 permits.

**Read-write lock** — many readers OR one writer. Read-heavy caches.

**Asyncio.Semaphore** — same idea in async: limit 10 concurrent DB queries across coroutines.`,
      },
      {
        q: 'Deadlock — four conditions and prevention?',
        a: `All four required for deadlock:
1. Mutual exclusion
2. Hold and wait
3. No preemption
4. Circular wait

**Prevention:** consistent global lock ordering, lock timeouts, try-lock with backoff, avoid nested locks, keep lock regions tiny.

**Database:** \`deadlock detected\` → retry transaction.`,
      },
      {
        q: 'Race conditions — how to debug?',
        a: `Symptoms: intermittent wrong counts, rare corruption, fails only under load.

1. Reproduce with concurrent load tests
2. Log with thread/async task ID
3. Python: \`threading\` debug, asyncio debug mode
4. Go: \`-race\` detector
5. Audit all read-modify-write on shared state
6. Use thread-safe structures or locks

Atomic counters: \`threading.Lock\` or \`atomic\` ops in other languages.`,
      },
      {
        q: 'RateLimiter with asyncio Semaphore example?',
        a: `\`\`\`python
class RateLimiter:
    def __init__(self, max_concurrent: int):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def __aenter__(self):
        await self.semaphore.acquire()
        return self

    async def __aexit__(self, *args):
        self.semaphore.release()

limiter = RateLimiter(10)
async with limiter:
    await db.query(...)
\`\`\`

Pair with timeout on acquire if you need fail-fast instead of indefinite wait.`,
      },
    ],
    takeaways: [
      'Mutex: one owner; semaphore: N slots; RW lock for read-heavy',
      'Deadlock: consistent lock order, short critical sections, retry',
      'Debug races under load with logging and race detectors',
      'asyncio.Semaphore limits concurrent async operations',
    ],
    tip: 'FOR UPDATE SKIP LOCKED is DB-level concurrency for job queues.',
  }),

  'microservices:when-why': buildLesson({
    intro:
      'Microservices solve organizational and scaling problems — not small team velocity. Monolith first is still correct advice for most startups.',
    dialogues: [
      {
        q: 'When should I use microservices?',
        a: `Valid reasons:
- **Different scaling** needs (video transcode vs API)
- **Team boundaries** — 50 engineers on one deploy painful
- **Technology diversity** — ML Python + payment Java
- **Independent deploy cadence** — ship payments without shipping search

**Invalid reasons:** resume-driven, "Netflix does it", fear of monolith without scale problems.

**Costs:** network latency, distributed debugging, data consistency, N services to deploy/monitor, integration test complexity.`,
      },
      {
        q: 'Monolith vs microservices for 5 engineers?',
        a: `**Modular monolith** — clear internal modules, single deploy. Extract services when pain exceeds overhead.

5 engineers can't operate 15 microservices with separate CI, on-call, data stores responsibly.

Interview: "I'd keep monolith until team or scale forces boundary — usually team size or divergent scaling."`,
      },
      {
        q: 'DDD bounded contexts as service boundaries?',
        a: `**Bounded context** — domain area with own language and rules. Orders ≠ Inventory ≠ Notifications.

Each context → potential service owning **its data**. No shared database between services — biggest monolith-to-micro mistake is shared DB with tight coupling.

**Anti-pattern:** distributed monolith — many services, synchronous chains, deploy together anyway.`,
      },
      {
        q: 'Costs people underestimate?',
        a: `**Latency** — 5 sequential HTTP calls add 50ms+ each.

**Observability** — must have tracing across services.

**Testing** — contract tests, staging environments mirroring prod topology.

**Data** — no JOIN across services, eventual consistency, saga complexity.

**On-call** — failure domains multiply.`,
      },
    ],
    takeaways: [
      'Microservices for team scale, divergent scaling, independent deploy',
      'Small team → modular monolith first',
      'Bounded context = service boundary; no shared DB',
      'Distributed monolith is worst of both worlds',
    ],
    tip: 'Quote "monolith first" then explain extraction triggers — balanced answer.',
  }),

  'microservices:communication': buildLesson({
    intro:
      'Sync REST/gRPC vs async events defines coupling and failure modes between services. API gateway and service mesh handle cross-cutting concerns.',
    dialogues: [
      {
        q: 'Sync vs async communication?',
        a: `**Sync (REST/gRPC)** — simple mental model, immediate response. Creates **temporal coupling** — caller waits, fails if callee down. Needs timeouts, circuit breakers.

**Async (events/queue)** — loose coupling, buffers spikes. **Eventual consistency**. Harder to debug "where is my order?"

**Rule:** sync for queries needing immediate answer; async for side effects and notifications. **Event-carried state transfer** reduces sync chatter.`,
      },
      {
        q: 'API gateway responsibilities?',
        a: `Single north-south entry:
- Routing to services
- **Authentication** termination
- **Rate limiting**
- Request aggregation (graph-like BFF)
- TLS termination
- Protocol translation (REST → gRPC)

Examples: Kong, AWS API Gateway, Envoy gateway. Don't put business logic in gateway — thin routing layer.`,
      },
      {
        q: 'What is a service mesh?',
        a: `**Istio/Linkerd** — sidecar proxy next to each pod handles mTLS, retries, load balancing, observability without app code changes.

Good for: large microservice fleets, mTLS everywhere, uniform retry/timeout policy.

**Cost:** complexity, resource overhead. Not for 3-service architecture.`,
      },
      {
        q: 'BFF pattern?',
        a: `**Backend for Frontend** — separate API per client type (mobile BFF, web BFF). Aggregates microservices into client-optimal shape.

Avoids fat generic API or chatty mobile clients calling 10 services.

Trade-off: more code to maintain per client type.`,
      },
    ],
    takeaways: [
      'Sync: simple but coupled — use circuit breakers',
      'Async: decoupled, eventual consistency — events for side effects',
      'API gateway: auth, rate limit, routing at edge',
      'Service mesh for large fleets; BFF per client type',
    ],
    tip: 'Saga pattern mention when discussing async cross-service workflows.',
  }),

  'microservices:data': buildLesson({
    intro:
      'Database per service is the rule — cross-service JOINs are a design smell. CQRS, sagas, and event sync replace shared tables.',
    dialogues: [
      {
        q: 'Database per service — why?',
        a: `Each service **owns its data**. Other services access via API or events only — never direct SQL to another service's tables.

Enables: independent schema migration, right DB per service (PG vs Redis vs ES).

**Violation:** Order service and Payment service share \`orders\` table — can't deploy independently, schema changes break both.`,
      },
      {
        q: 'Cross-service queries without JOIN?',
        a: `**API composition** — service A calls B and C, merges in memory. Simple but chatty and slow.

**CQRS read model** — subscribe to events, build denormalized view in local DB optimized for queries.

**GraphQL federation** — schema stitches services (still network calls underneath).

Choose based on read latency requirements and consistency tolerance.`,
      },
      {
        q: 'Saga pattern for distributed transactions?',
        a: `**Choreography** — services react to events (OrderCreated → Payment processes → PaymentCompleted → Shipping).

**Orchestration** — central coordinator tells each step.

On failure: **compensating transactions** — refund payment if shipping fails.

Avoid 2PC across services — fragile. Embrace eventual consistency with idempotent handlers.`,
      },
      {
        q: 'CQRS in microservices?',
        a: `**Command side** — write model, business rules, emits events.

**Query side** — read-optimized projections updated from events.

Reporting/analytics reads query DB without hammering write model.

Often paired with event sourcing but not required.`,
      },
    ],
    takeaways: [
      'One database per service — no cross-service SQL',
      'Cross-service reads: API compose, CQRS projections, or accept staleness',
      'Saga + compensating actions instead of 2PC',
      'CQRS separates write and read models synced by events',
    ],
    tip: 'Strangler fig pattern for gradual monolith extraction — mention in migration questions.',
  }),

  'behavioral:star': buildLesson({
    intro:
      'STAR structures behavioral answers so interviewers hear your impact, not a vague team effort. Senior answers include trade-offs and metrics.',
    dialogues: [
      {
        q: 'What is STAR and how long should answers be?',
        a: `**Situation** — 1-2 sentences context (company, scale, constraint)

**Task** — your specific responsibility (not "the team needed")

**Action** — what **you** did, technical details, decisions

**Result** — quantified outcome: latency -80%, saved $50k, zero incidents 6 months

Target **2-3 minutes** spoken. Leave hooks for follow-ups.

Senior bonus: trade-offs considered, what you'd do differently, lessons learned.`,
      },
      {
        q: 'Bad vs good Action section?',
        a: `**Bad:** "We decided to use Kubernetes and it worked."

**Good:** "I benchmarked ECS vs EKS for our traffic pattern, wrote ADR comparing cost and ops burden, prototyped Helm charts, led migration over 3 sprints with canary deploys, trained team on kubectl debugging."

Use **I** for your contributions even in team projects. Credit team in Situation, own Action.`,
      },
      {
        q: 'How do you quantify results without lying?',
        a: `Use metrics you actually tracked:
- Latency p99 before/after
- Error rate reduction
- Cost savings from right-sizing
- Time saved for team (deploy frequency)
- Users affected / revenue protected

If exact number unknown: "roughly 40% reduction based on CloudWatch" or "eliminated class of incidents that caused ~2 pages/month."

Directionally correct + honest beats fabricated precision.`,
      },
      {
        q: 'Senior behavioral quality markers?',
        a: `Interviewers score:
- **Leadership as IC** — drove initiative without authority
- **Trade-off reasoning** — why this path over alternatives
- **Failure learning** — mistake story with growth
- **Cross-functional** — worked with product, security, ops
- **Impact at scale** — not trivial bugfix unless clear user impact

Prepare **8-10 stories** covering themes before interview week.`,
      },
    ],
    takeaways: [
      'STAR: Situation brief, Task yours, Action specific, Result quantified',
      '2-3 minutes; use "I" for your actions',
      'Quantify with real metrics or honest estimates',
      'Include trade-offs and lessons for senior bar',
    ],
    tip: 'End with result number — interviewers remember the last thing you said.',
  }),

  'behavioral:common-questions': buildLesson({
    intro:
      'Senior behavioral themes repeat: incidents, conflict, technical debt, failure, mentoring. Map stories from your story bank to each theme.',
    dialogues: [
      {
        q: 'Tell me about a production incident you handled.',
        a: `Framework answer:

**S** — API p99 spiked to 5s, 10k users affected, Black Friday traffic.

**T** — On-call engineer, needed restore before revenue loss.

**A** — Checked dashboards, traced to DB pool exhaustion from deploy increasing default pool per worker; rolled back; added pool max alert; post-mortem with action items.

**R** — Service restored in 12 min; no recurrence after pool limits + canary deploy policy.

Follow-up ready: communication with stakeholders, blameless post-mortem.`,
      },
      {
        q: 'Technical decision you disagreed with?',
        a: `Show maturity: data-driven dissent, commit after decision, revisit with metrics.

"I presented benchmarks showing cache layer reduced DB load 70%. Team chose read replicas first for simpler ops. I committed, documented trade-offs, helped implement. Six months later we added cache anyway when replica lag caused UX issues — I shared data without 'I told you so.'"

Avoid sounding bitter or passive-aggressive.`,
      },
      {
        q: 'How do you handle technical debt?',
        a: `Balance **feature velocity** vs **stability**:
- Track debt in backlog with business impact (risk, velocity cost)
- **Boy scout rule** — improve code you touch
- Dedicated **20% capacity** or debt sprints quarterly
- Tie debt work to incidents/near-misses for prioritization

Story: refactored payment module after two incidents, reduced bug rate 50%.`,
      },
      {
        q: 'Failed project or mistake?',
        a: `Pick real failure with learning:

"I pushed big-bang migration without adequate rollback test. Partial outage 20 min. Learned: always test rollback, feature flags, incremental migration. Now I advocate strangler fig and measure rollback time in game days."

Failures show growth if you own mistake and changed behavior.`,
      },
      {
        q: 'How do you prioritize when everything is urgent?',
        a: `Framework:
1. **User/revenue impact** — production down beats nice-to-have
2. **Risk** — security/data loss first
3. **Dependencies** — unblock others
4. **Effort vs impact** matrix
5. **Explicit communication** — negotiate with PM, document trade-offs

"I ranked five 'P0s' with PM using impact matrix, shipped two critical, deferred three with written acceptance of risk."`,
      },
    ],
    takeaways: [
      'Incident story: detect → mitigate → fix → post-mortem → prevent',
      'Disagreement: data, respect, commit, revisit with metrics',
      'Tech debt: quantify impact, allocate capacity, tie to incidents',
      'Failure stories must show changed behavior, not just regret',
    ],
    tip: 'Prepare one story per theme in a spreadsheet — map to common question list.',
  }),

  'kubernetes:core': buildLesson({
    intro:
      'Kubernetes orchestrates containers at scale — pods, deployments, services, and probes are the vocabulary for deploying FastAPI and debugging prod.',
    dialogues: [
      {
        q: 'Core K8s objects for running an API?',
        a: `**Pod** — one or more containers, smallest deploy unit. Usually one container per pod for APIs.

**Deployment** — manages ReplicaSet, rolling updates, desired replica count.

**Service** — stable ClusterIP/LoadBalancer endpoint targeting pod labels.

**Ingress** — HTTP routing, TLS, host rules.

**ConfigMap / Secret** — configuration and sensitive data.

**HPA** — Horizontal Pod Autoscaler scales replicas on CPU/custom metrics.`,
      },
      {
        q: 'Liveness vs readiness vs startup probes?',
        a: `**Liveness** — pod broken? **Restart** container. Don't check dependencies — app deadlock only.

**Readiness** — ready for traffic? Fails → removed from Service endpoints. Check DB connectivity here.

**Startup** — slow-starting apps (Java). Disables liveness until startup succeeds.

Wrong liveness checking DB → restart loop when DB blips. Readiness should fail; liveness should pass.`,
      },
      {
        q: 'Pods keep restarting — debug checklist?',
        a: `\`\`\`bash
kubectl describe pod <name>  # Events, OOMKilled, probe failures
kubectl logs <pod> --previous  # Logs from crashed container
kubectl get events --sort-by=.lastTimestamp
\`\`\`

Common: OOM (raise limit or fix leak), liveness too aggressive, image pull error, crash on boot missing env var, probe hitting wrong port.`,
      },
      {
        q: 'Traffic increases 20× — scaling steps?',
        a: `1. **HPA** increases pod replicas (raise maxReplicas beforehand)
2. **Cluster autoscaler** adds nodes if pod scheduling fails
3. **DB** — PgBouncer, connection limits, read replicas
4. **CDN** for static assets
5. **Rate limit** at ingress
6. **Load test** before event — know breaking point

Verify new pods pass readiness before old drain.`,
      },
    ],
    takeaways: [
      'Deployment manages pods; Service stable network; Ingress HTTP routing',
      'Readiness = traffic; Liveness = restart; don\'t liveness-check DB',
      'describe pod + logs --previous for crash debug',
      'HPA + cluster autoscaler + DB pool planning for scale events',
    ],
    tip: 'Mention resource requests/limits — QoS and OOM prevention.',
  }),

  'rest-api:http': buildLesson({
    intro:
      'HTTP semantics — methods, status codes, idempotency, caching — underpin REST API design and every debugging session with curl.',
    dialogues: [
      {
        q: 'HTTP methods and idempotency?',
        a: `**Safe** (no side effects): GET, HEAD, OPTIONS

**Idempotent** (repeat same effect): GET, PUT, DELETE, HEAD, OPTIONS

**POST** — neither safe nor idempotent (creates new resource each time unless idempotency key)

**PUT** — replace entire resource at URL. **PATCH** — partial update.

Use correct status: **201** created, **204** no content delete, **409** conflict, **422** validation.`,
      },
      {
        q: 'Important status codes for APIs?',
        a: `**2xx** — 200 OK, 201 Created, 204 No Content
**3xx** — 301/308 permanent redirect, 304 Not Modified (cache)
**4xx** — 400 bad request, 401 unauthenticated, 403 forbidden (authenticated but not allowed), 404 not found, 409 conflict, 429 rate limited
**5xx** — 500 unexpected server error, 502 bad gateway, 503 unavailable (retryable), 504 gateway timeout

Don't use 200 with error in body — breaks HTTP semantics and caching.`,
      },
      {
        q: 'ETags and conditional requests?',
        a: `Server returns **ETag** header — hash of resource version.

Client sends **If-None-Match: etag** on GET → **304 Not Modified** if unchanged — saves bandwidth.

**If-Match** on PUT for optimistic concurrency — 412 if resource changed.

Enables efficient caching and safe concurrent updates.`,
      },
      {
        q: 'REST fundamentals for public API design?',
        a: `**Resources as nouns** — \`/users\`, \`/orders/{id}\` not \`/getUser\`

**HTTP verbs** for actions on resources

**Versioning** — \`/v1/\` path or Accept header

**Consistent error JSON** with codes

**Pagination** — cursor for scale

**Rate limiting** headers — \`Retry-After\`

**Correlation ID** — \`X-Request-ID\` propagated

**HTTPS only**, HSTS, security headers`,
      },
    ],
    takeaways: [
      'POST not idempotent; PUT/DELETE idempotent — design retries accordingly',
      '401 vs 403: not authenticated vs not authorized',
      'ETags enable 304 caching and optimistic concurrency',
      'Resources nouns + verbs via HTTP methods + consistent errors',
    ],
    tip: 'PUT vs PATCH is a common quick-fire question — know full replace vs partial.',
  }),
};
