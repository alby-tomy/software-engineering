import { buildLesson, dialogue, keyTakeaways, lessonIntro } from '../content-format';

export const systemDesignLessons: Record<string, string> = {
  'system-design:framework': buildLesson({
    intro:
      'System design interviews feel scary because there is no single right answer. What interviewers actually test is whether you can **think out loud**, **ask smart questions**, and **defend trade-offs**. This lesson walks through the full 45-minute flow as if you are pair-designing with a senior engineer.',
    dialogues: [
      {
        q: 'I always freeze in the first 5 minutes. What should I actually do when they say "design X"?',
        a: `Stop trying to draw boxes immediately. Your first job is to **turn a vague prompt into a concrete problem**.

Start with functional requirements — write them on the board:
- What are the core user actions? (create, read, update, delete)
- Who are the users? (mobile app, web, internal admin)
- What is in scope vs out of scope for this interview?

Then ask non-functional requirements:
- **Scale**: How many users? Reads vs writes per second?
- **Latency**: p99 response time target?
- **Availability**: Is 99.9% enough or do we need 99.99%?
- **Consistency**: Can we accept eventual consistency anywhere?

Finally, clarify constraints: budget, team size, existing tech stack, timeline.

**Example for URL shortener:**
- "Do we need custom aliases or auto-generated only?"
- "Do we track click analytics?"
- "What's the read/write ratio — mostly redirects or mostly creating links?"
- "Retention period — do short URLs expire?"

Interviewers *want* you to ask these. It shows senior thinking.`,
      },
      {
        q: 'When do I do back-of-the-envelope math? I always forget the numbers.',
        a: `Do estimates in **minutes 5–10**, right after requirements, before deep architecture.

Use round numbers and powers of 10:

**Users → QPS**
- 10M DAU, 10 actions/day → 100M requests/day
- 100M / 86,400 seconds ≈ **1,200 QPS average**
- Peak is often **3× average** → ~3,600 QPS

**Storage**
- 1M new URLs/day × 500 bytes each ≈ 500 MB/day
- Over 5 years ≈ 900 GB (manageable on one DB with sharding later)

**Bandwidth**
- 1 KB response × 3,600 QPS ≈ 3.6 MB/s

These numbers tell you:
- Do we need a cache? (yes if read-heavy)
- Do we need sharding now? (probably not at 1M/day)
- Do we need a CDN? (for static assets, yes)

Say assumptions out loud: "I'm assuming 100:1 read-to-write ratio based on typical URL shortener usage."`,
      },
      {
        q: 'How do I structure the high-level design without over-engineering?',
        a: `Draw a **simple request path** first — left to right:

\`\`\`
Client → DNS → Load Balancer → API Servers → Cache → Database
                                    ↓
                              Message Queue → Workers
\`\`\`

Label each box with **one sentence** about its job:
- **Load Balancer**: Distributes traffic, health checks
- **API Servers**: Stateless, horizontal scale
- **Cache (Redis)**: Hot URL lookups
- **Database**: Persistent URL mappings
- **Queue**: Async analytics, emails, etc.

Only add components when requirements demand them:
- CDN → large static/media delivery
- Search index → full-text search requirement
- Kafka → event streaming, audit logs
- Multiple regions → strict availability SLA

**Rule of thumb:** Start with the minimum architecture that meets requirements. Add complexity when the interviewer probes or when your math proves you need it.`,
      },
      {
        q: 'What goes in the deep dive (minutes 10–25)?',
        a: `Pick **2–3 components** the interviewer cares about most. Usually:

**1. API Design**
\`\`\`
POST /api/v1/urls     { "long_url": "...", "custom_alias": "optional" }
GET  /{short_code}  → 301/302 redirect
GET  /api/v1/urls/{id}/stats  → analytics (if in scope)
\`\`\`

**2. Data Model**
\`\`\`
urls: id, short_code, long_url, user_id, created_at, expires_at
clicks: id, url_id, timestamp, ip_hash, user_agent
\`\`\`

**3. Core Flow — Create URL**
1. Validate URL, check custom alias uniqueness
2. Generate short code (base62 of ID, or hash + collision retry)
3. Write to DB
4. Return short URL

**4. Core Flow — Redirect**
1. Lookup short_code in cache
2. On miss → DB → populate cache
3. Async publish click event to queue
4. Return redirect

Walk through **happy path** first, then mention edge cases: expired URL, malicious URL, rate limits.`,
      },
      {
        q: 'How do I talk about bottlenecks and trade-offs without sounding generic?',
        a: `Tie every trade-off to **your specific design**:

**Single point of failure**
- "The database is a SPOF. Mitigation: primary + read replicas, automated failover, regular backups."

**Consistency vs availability**
- "For URL creation, we need strong consistency — two users can't get the same short code. For click counts, eventual consistency is fine."

**Caching**
- "80% of reads hit 20% of URLs. Redis cache-aside with 24h TTL. On cache miss, read DB and warm cache. Invalidate on URL delete."

**Failure modes**
- "If Redis dies, we fall back to DB — slower but functional. If DB primary fails, promote replica (30–60s downtime)."

Use **specific numbers** from your estimates: "At 3,600 QPS peak, a single PostgreSQL can handle ~5K simple reads with proper indexing, but we'd add read replicas for headroom."`,
      },
      {
        q: 'What should I cover in the last 10 minutes?',
        a: `**Monitoring & observability**
- Metrics: QPS, p50/p95/p99 latency, error rate, cache hit ratio
- Alerts: error rate > 1%, p99 > 500ms, DB replication lag > 10s
- Distributed tracing for slow redirects

**Security**
- Rate limiting per IP/user (prevent abuse)
- URL validation (block malware/phishing)
- Auth for analytics API

**Future at 10× scale**
- "At 100M URLs/day we'd shard by short_code hash"
- "Multi-region active-active for global latency"
- "Separate read path entirely onto edge caches"

End with: "Given more time, I'd detail the analytics pipeline and disaster recovery runbooks."

This shows you think beyond the whiteboard.`,
      },
    ],
    takeaways: [
      'Minutes 0–5: clarify functional + non-functional requirements — never skip this',
      'Minutes 5–10: back-of-envelope math + simple box diagram',
      'Minutes 10–25: APIs, data model, and 1–2 core flows in detail',
      'Minutes 25–35: bottlenecks, caching, consistency, failure modes',
      'Minutes 35–45: monitoring, security, and how you scale 10×',
    ],
    tip: 'Practice saying your framework out loud until it feels natural. Record yourself designing a URL shortener in 25 minutes — awkward at first, essential for interview day.',
  }),

  'system-design:core-concepts': buildLesson({
    intro:
      'Before designing Netflix, you need shared vocabulary. These concepts appear in almost every senior interview — learn them deeply enough to explain with real examples.',
    dialogues: [
      {
        q: 'Everyone mentions CAP theorem but I still don\'t know when it matters. Explain it like I\'m building a real system.',
        a: `CAP says during a **network partition**, you choose **Consistency** or **Availability** — you can't have both.

**Consistency (C):** Every read returns the latest write. If nodes can't talk, some requests fail rather than return stale data.

**Availability (A):** Every request gets a response (not an error), even if data might be stale.

**Partition (P):** Network splits nodes — this will happen in distributed systems, so P is not optional.

**Real examples:**
- **Bank balance (CP):** Better to reject a withdrawal than show wrong balance. Use PostgreSQL with sync replication.
- **Twitter likes count (AP):** Better to show slightly wrong count than error page. Use Cassandra/DynamoDB.
- **DNS (AP):** Must always resolve, even if propagation is delayed.

**PACELC extension:** When there's NO partition, you still trade **Latency vs Consistency**. Most systems optimize for low latency normally.`,
      },
      {
        q: 'When do I scale vertically vs horizontally?',
        a: `**Vertical scaling** = bigger machine (more CPU/RAM). Simple but hits limits and creates a single point of failure. Good for: databases initially, Redis, early-stage apps.

**Horizontal scaling** = more machines. Preferred at scale but requires:
- **Stateless services** — any server can handle any request
- **Shared storage** — DB, cache, object store behind the services
- **Load balancer** — distributes traffic

**Interview answer:** "I'd start vertical for the database until metrics show we need sharding. Application servers are horizontal from day one — stateless FastAPI/Node instances behind an ALB."

**Auto-scaling:** CPU > 70% for 5 min → add instances. Scale down slowly to avoid flapping.`,
      },
      {
        q: 'Explain caching patterns — I always confuse cache-aside and write-through.',
        a: `**Cache-aside (lazy loading)** — most common
1. App reads cache
2. Miss → read DB → write to cache → return
3. On write → update DB, **invalidate** cache (don't update cache directly)

*Pros:* Only caches what's read. Simple.
*Cons:* Cache miss stampede. Stale data if invalidation fails.

**Write-through**
- Every write goes to cache AND DB synchronously
- *Pros:* Cache always fresh
- *Cons:* Slower writes, caches data nobody reads

**Write-behind (write-back)**
- Write to cache, async flush to DB
- *Pros:* Fast writes
- *Cons:* Data loss risk on crash

**For URL shortener redirects:** Cache-aside in Redis. TTL 24h. Invalidate on URL delete.

**Cache stampede fix:** Only one request rebuilds cache (mutex), or probabilistic early expiration.`,
      },
      {
        q: 'How do I scale a database? Replicas vs sharding — when which?',
        a: `**Read replicas** first — easiest win
- Primary handles writes, replicas handle reads
- Async replication → replication lag (eventual consistency on reads)
- Good when: read-heavy (80%+ reads)

**Sharding** when single DB can't hold data or write load
- Partition by shard key (user_id, geographic region)
- Challenges: cross-shard queries, rebalancing, distributed transactions

**Federation** — split by domain
- users_db, orders_db, products_db
- Simpler than sharding one table, but cross-DB joins are painful

**Decision tree:**
1. Indexes + query optimization
2. Read replicas
3. Caching layer
4. Sharding / federation
5. Move to purpose-built store (Cassandra for writes, Elasticsearch for search)`,
      },
    ],
    takeaways: [
      'CAP: during partition, pick consistency OR availability — give concrete examples',
      'Scale apps horizontally (stateless); scale DB vertically first, then replicas, then shard',
      'Cache-aside is default; always discuss invalidation strategy',
      'Database scaling path: optimize → replicas → cache → shard',
    ],
  }),

  'system-design:level1-problems': lessonIntro(
    'Foundation problems teach core patterns. Master these until you can whiteboard any one in 20 minutes.'
  ) + [
    dialogue(
      'Walk me through designing a URL shortener step by step.',
      `**Requirements recap:** Create short URL, redirect, optional analytics. 100M URLs/month, 100:1 read/write.

**Short code generation — two approaches:**

*Option A: Auto-increment ID → Base62*
\`\`\`
id=12345 → "dnh" (base62 encode)
\`\`\`
- Pros: No collisions, short codes, predictable length
- Cons: Need centralized ID generator (DB sequence or Snowflake ID)

*Option B: Hash of long URL*
- Pros: Same long URL → same short code (dedup)
- Cons: Collisions → need retry with salt

**Storage:** DynamoDB or PostgreSQL with index on short_code.

**Redirect path:**
1. GET /abc123
2. Redis lookup → hit? return 301
3. Miss → DB → cache → 301
4. Async: publish click event to Kafka/SQS

**301 vs 302:** 301 is cached by browsers (faster, less analytics). 302 allows server-side click tracking every time. Most products use 302 for analytics.

**Scale:** Redis cluster for hot URLs, read replicas on DB, CDN not needed (redirects are dynamic).`
    ),
    dialogue(
      'How does a rate limiter work at scale?',
      `**Goal:** Max N requests per user per minute across all API servers.

**Token bucket (most common):**
- Bucket holds N tokens, refills at rate R per second
- Each request consumes 1 token
- No tokens → 429 Too Many Requests

**Distributed implementation (Redis):**
\`\`\`
KEY: rate:{user_id}
-- Lua script for atomicity:
tokens = GET key
if tokens > 0 then DECR key; return ALLOW
else return DENY
\`\`\`

**Sliding window:** More accurate than fixed window, prevents burst at window boundaries.

**Where to enforce:** API Gateway (Kong, AWS API Gateway) before traffic hits your services.

**Response:** HTTP 429 with \`Retry-After\` header.`
    ),
    dialogue(
      'Design a notification system — email, SMS, push.',
      `**Flow:**
\`\`\`
Event → Kafka topic → Notification Service → Channel routers
                                              ├→ Email (SendGrid)
                                              ├→ SMS (Twilio)
                                              └→ Push (FCM/APNS)
\`\`\`

**Key components:**
1. **Template engine** — render "Hello {{name}}, your order shipped"
2. **User preferences** — channel opt-in, quiet hours, frequency caps
3. **Priority queues** — OTP urgent, marketing digest can wait
4. **Idempotency** — same event shouldn't send duplicate notifications
5. **Delivery tracking** — sent, delivered, failed, bounced
6. **DLQ** — failed messages for retry/investigation

**Fan-out:** One "user posted" event → notify 1000 followers. Use queue per follower batch, not 1000 sync API calls.`
    ),
  ].join('\n') + keyTakeaways([
    'URL shortener: encoding strategy, cache-aside, async analytics',
    'Rate limiter: token bucket in Redis, enforce at gateway',
    'Notifications: queue-based fan-out, templates, preferences, idempotency',
    'Practice each foundation problem timed — 20 min target',
  ]),

  'system-design:level2-problems': buildLesson({
    dialogues: [
      {
        q: 'Instagram feed — push vs pull? I hear both answers and get confused.',
        a: `**Push (fan-out on write):** When user posts, write post ID to every follower's feed cache.
- *Read:* O(1) — just read pre-built feed from Redis
- *Write:* O(followers) — slow for celebrities with 50M followers
- *Celebrity problem:* Lady Gaga posts → 50M Redis writes

**Pull (fan-out on read):** When user opens app, fetch posts from all people they follow, merge, sort.
- *Write:* O(1) — just store the post
- *Read:* O(following) — slow if you follow 2000 people

**Hybrid (what Instagram/Twitter use):**
- Push for normal users (< 10K followers)
- Pull for celebrities
- Merge at read time for mixed feeds

**Storage:** Posts in Cassandra (partition by user_id). Feed cache in Redis (sorted set by timestamp).`,
      },
      {
        q: 'How would you design Uber\'s matching system?',
        a: `**Core problem:** Match rider to nearest available driver in real-time.

**Geospatial indexing:**
- Divide city into geohash grids
- Driver location updates every 3–5 seconds → write to Redis Geo or custom index
- Rider request → query drivers in same + adjacent geohash cells

**Matching flow:**
1. Rider requests trip (pickup, dropoff)
2. Query nearby available drivers (radius expanding if none found)
3. Send request to top 3 drivers (first accept wins)
4. Trip state machine: requested → accepted → in-progress → completed

**Real-time tracking:** WebSocket from driver app → location service → rider app

**Surge pricing:** demand/supply ratio per geohash cell. High demand + low supply → multiplier.

**Challenges:** Race conditions (two riders matched to same driver) → use distributed lock or optimistic concurrency.`,
      },
      {
        q: 'Payment systems scare me. What makes them different from normal APIs?',
        a: `**Idempotency is mandatory**
- Every payment request has an idempotency key
- Retry safe — same key = same result, no double charge
\`\`\`
POST /payments  Idempotency-Key: uuid-123
\`\`\`

**Ledger-based accounting (double-entry)**
- Every debit has matching credit
- Audit trail immutable
- Balance = sum of ledger entries

**Exactly-once processing**
- Outbox pattern: write payment + outbox event in same DB transaction
- Worker polls outbox → publishes to queue

**Reconciliation**
- Nightly batch: compare your records vs bank/processor records
- Flag mismatches for investigation

**PCI compliance:** Never store raw card numbers. Use tokenization (Stripe tokens).`,
      },
    ],
    takeaways: [
      'Feed systems: hybrid push/pull solves the celebrity problem',
      'Uber: geohash + Redis Geo + state machine + WebSocket tracking',
      'Payments: idempotency keys, ledger, outbox pattern, reconciliation',
    ],
    tip: 'For Level 2 problems, always draw the data flow first, then dive into the hardest component the interviewer points at.',
  }),

  'system-design:level3-problems': buildLesson({
    dialogues: [
      {
        q: 'Design a system processing 1 million events per second. Where do I even start?',
        a: `**Step 1: What is an event?**
\`\`\`json
{ "event_id": "uuid", "type": "page_view", "user_id": "123", "timestamp": 1700000000, "properties": {...} }
\`\`\`
Size: ~500 bytes → 1M events/s = **500 MB/s ingress**

**Step 2: Architecture**
\`\`\`
Producers → Kafka (100+ partitions) → Stream processors (Flink/Kafka Streams)
                ↓                           ↓
         Real-time aggregates          Data lake (S3)
         (Redis/Cassandra)              (analytics, ML)
                ↓
         Alerting / Dashboards
\`\`\`

**Kafka partitioning:**
- Partition by user_id → ordering per user
- 100 partitions × 10K events/s each = 1M/s capacity
- Producers batch messages (linger.ms=10, batch.size=64KB)

**Consumers:**
- Horizontally scaled consumer groups
- One consumer per partition max (parallelism = partition count)
- Monitor consumer lag — alert if lag > 60 seconds

**Idempotency:** event_id dedup in processor (Bloom filter or DB)

**Failure handling:**
- Dead letter queue for poison messages
- Circuit breaker on downstream services
- Backpressure: slow consumers → lag grows → auto-scale consumers`,
      },
    ],
    takeaways: [
      '1M events/s needs partitioned Kafka + horizontal consumers',
      'Partition key determines ordering guarantees',
      'Monitor consumer lag, use DLQ, design for idempotency',
      'Split real-time path (aggregates) from batch path (data lake)',
    ],
    tip: 'Senior interviews want you to discuss operational concerns: lag alerts, replay strategy, schema evolution, and cost at scale.',
  }),

  'system-design:level2-expanded': buildLesson({
    dialogues: [
      {
        q: 'Design WhatsApp for billions of users — what are the hard parts?',
        a: `**Connection layer:** Millions of persistent WebSocket connections. Use connection gateways (sticky sessions by user_id). Each gateway handles ~50K connections.

**Message flow:**
1. Sender → WebSocket gateway → Message service
2. Message service assigns sequence number per chat (ordering)
3. Write to Cassandra (partition key: chat_id, sort: sequence)
4. If recipient online → push via their gateway
5. If offline → store + push notification (FCM/APNS)

**Delivery receipts:** sent → delivered → read (separate events, async)

**E2E encryption:** Server stores encrypted blobs, can't read content. Key exchange via Signal protocol.

**Media:** Upload to S3 → send URL in message (don't send 5MB through message queue).

**Presence:** Heartbeat every 30s → Redis "last_seen" key with TTL.`,
      },
      {
        q: 'Instagram — how do likes and comments scale?',
        a: `**Like counter problem:** 1M likes on a viral post = 1M writes to same row.

**Solutions:**
1. **Sharded counters** — aggregate in Redis, periodic flush to DB
2. **Eventual consistency** — approximate count is fine ("1.2M likes")
3. **Write-behind** — buffer likes in queue, batch update

**Comments:** Store in Cassandra by post_id. Paginate by timestamp. Fan-out comment notifications async.

**Photo upload:** Client → presigned S3 URL → upload direct to S3 → metadata to DB → CDN for serving.`,
      },
    ],
    takeaways: [
      'WhatsApp: WebSocket gateways, per-chat ordering, offline push, E2E encryption',
      'Instagram: hybrid feed, sharded counters for viral content, S3+CDN for media',
    ],
  }),

  'system-design:level3-expanded': buildLesson({
    dialogues: [
      {
        q: 'Google Drive — how does real-time collaboration work?',
        a: `**File storage:** Content-addressable chunks (hash each 4MB chunk). Deduplication — same chunk stored once.

**Upload:** Chunked resumable upload. Client uploads chunks → assemble on server → store metadata.

**Versioning:** Each save creates new version pointer. Old chunks retained for history/restore.

**Real-time collaboration (Google Docs style):**
- **Operational Transform (OT)** or **CRDT** for conflict-free merging
- WebSocket for live cursor/keystroke sync
- Server is source of truth for ordering

**Permissions:** ACL per file — owner, editor, viewer, link sharing.

**Sync model:** Client polls or receives push on changes. Conflict resolution on merge.`,
      },
      {
        q: 'Distributed logging at scale — how do companies handle billions of log lines?',
        a: `**Pipeline:**
\`\`\`
App → Fluent Bit agent → Kafka → Stream processor → Hot (Elasticsearch, 7d)
                                                  → Cold (S3, years)
\`\`\`

**Structured logs (JSON):**
\`\`\`json
{"level":"error","service":"payment","trace_id":"abc","msg":"charge failed","user_id":"123"}
\`\`\`

**Correlation IDs:** Pass trace_id across all services — one click from error to full request path.

**Sampling:** Log 100% errors, 1% debug in production (volume control).

**Cost control:** Hot storage expensive → aggressive retention. Cold storage cheap → compliance/archive.`,
      },
    ],
    takeaways: [
      'Drive: chunked upload, content-addressable storage, OT/CRDT for collaboration',
      'Logging: agents → Kafka → hot/cold tiers, structured JSON, trace IDs',
    ],
    tip: 'Level 3 problems test whether you can connect multiple subsystems. Practice drawing end-to-end flows before components.',
  }),
};
