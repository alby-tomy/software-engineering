import type { Module } from '../../types/curriculum';

export const systemDesign: Module = {
  id: 'system-design',
  title: 'System Design',
  stage: 8,
  level: 'senior',
  icon: '🏗️',
  description:
    'The core of senior interviews. Learn to design scalable, reliable systems and defend every decision with trade-offs.',
  prerequisites: ['cs-fundamentals', 'networking', 'databases', 'distributed-systems'],
  learningObjectives: [
    'Apply a structured framework to any system design question',
    'Discuss scalability, availability, consistency trade-offs',
    'Design URL shorteners through Netflix-scale systems',
    'Identify bottlenecks, failure modes, and observability strategies',
    'Communicate architecture clearly with diagrams',
  ],
  estimatedHours: 50,
  sections: [
    {
      id: 'framework',
      title: 'System Design Interview Framework',
      content: `### The 45-minute framework

**Minutes 0-5: Clarify requirements**
- Functional: What does the system do?
- Non-functional: Scale (users, QPS, data size), latency, availability
- Constraints: Budget, team size, timeline

**Minutes 5-10: High-level design**
- Draw boxes: clients → LB → services → DB/cache/queue
- Identify core components
- Estimate scale (back-of-envelope)

**Minutes 10-25: Deep dive**
- API design
- Data model
- Key algorithms/flows
- Scaling strategy

**Minutes 25-35: Bottlenecks & trade-offs**
- Single points of failure
- Consistency vs availability
- Caching strategy
- Failure modes

**Minutes 35-45: Wrap up**
- Monitoring & alerting
- Future improvements
- What you'd do differently at 10x scale

### Back-of-envelope calculations
- 1M users, 10 requests/day = ~115 QPS average, ~350 QPS peak
- 1KB per request × 350 QPS = 350 KB/s = ~30 GB/day
- 1 char = 1 byte, 1M chars = 1 MB`,
    },
    {
      id: 'core-concepts',
      title: 'Core Concepts',
      content: `### CAP Theorem
In a partition, choose Consistency OR Availability (not both).
- **CP**: Banking, inventory (PostgreSQL, ZooKeeper)
- **AP**: Social feeds, DNS (Cassandra, DynamoDB)

### Scaling strategies
- **Vertical**: Bigger machine (limited, expensive)
- **Horizontal**: More machines (preferred, requires stateless design)

### Caching patterns
- **Cache-aside**: App checks cache, on miss reads DB, writes cache
- **Write-through**: Write to cache and DB simultaneously
- **Write-behind**: Write to cache, async flush to DB

### Load balancing algorithms
- Round robin, weighted round robin
- Least connections
- Consistent hashing (for caches)

### Database scaling
- **Read replicas**: Scale reads
- **Sharding**: Partition data across DBs
- **Federation**: Split by function (users DB, products DB)`,
    },
    {
      id: 'level1-problems',
      title: 'Level 1 — Foundation Problems',
      content: `Practice these until you can do them in 20 minutes:

1. **URL Shortener** — hashing, base62, redirect, analytics
2. **Pastebin** — object storage, expiration, access control
3. **Rate Limiter** — token bucket, sliding window, distributed Redis
4. **Notification Service** — queue, fan-out, delivery guarantees
5. **File Upload** — chunked upload, S3, CDN, metadata DB
6. **Chat Application** — WebSocket, message ordering, presence

### URL Shortener deep dive
- **Encode**: Auto-increment ID → base62 OR hash (collision handling)
- **Store**: NoSQL (DynamoDB) for key-value, high write throughput
- **Redirect**: 301 (cacheable) vs 302 (track analytics)
- **Scale**: Read-heavy → cache hot URLs in Redis
- **Analytics**: Async queue → process clicks → store in analytics DB`,
      practicalExercise:
        'Design a URL shortener on paper in 25 minutes. Time yourself. Record and review.',
    },
    {
      id: 'level2-problems',
      title: 'Level 2 — Intermediate Problems',
      content: `1. **WhatsApp** — WebSocket, message queue, delivery receipts, E2E encryption
2. **Instagram** — feed generation (push vs pull), CDN, media storage
3. **YouTube** — video upload/transcoding pipeline, CDN, recommendation
4. **Uber** — geospatial indexing, matching, real-time tracking
5. **Payment System** — idempotency, exactly-once, ledger, reconciliation

### Feed generation (Instagram/Twitter)
**Push (fan-out on write)**: Pre-compute feed when user posts
- Pro: Fast reads
- Con: Slow for users with millions of followers (celebrity problem)

**Pull (fan-out on read)**: Compute feed when user opens app
- Pro: Simple writes
- Con: Slow reads for users following many people

**Hybrid**: Push for normal users, pull for celebrities`,
    },
    {
      id: 'level3-problems',
      title: 'Level 3 — Senior Problems',
      content: `### Design a system processing 1M events/second

**Architecture**:
\`\`\`
Producers → Kafka (partitioned) → Stream processors → 
  → Real-time DB (for queries)
  → Data lake (for analytics)
  → Alerting system
\`\`\`

**Key decisions**:
- **Partitioning**: By event type or user_id for ordering guarantees
- **Ordering**: Per-partition ordering in Kafka
- **Idempotency**: Event ID deduplication
- **Backpressure**: Consumer lag monitoring, auto-scaling
- **Dead letter queue**: Failed events for retry/investigation
- **Observability**: Lag, throughput, error rate per partition`,
    },
  ],
  questions: [
    {
      id: 'sd-q1',
      level: 'architecture',
      question: 'Design a URL shortener for 100M URLs/month.',
      answer:
        'API: POST /shorten (long URL → short code), GET /{code} (redirect). Storage: DynamoDB/Redis for mappings. Encoding: base62 of auto-increment ID or hash with collision check. Cache: Redis for hot URLs (80/20 rule). Analytics: async SQS → worker → clickhouse. Scale: read replicas, CDN for redirects, multi-region.',
    },
    {
      id: 'sd-q2',
      level: 'tradeoffs',
      question: 'When would you choose SQL vs NoSQL?',
      answer:
        'SQL: Complex queries, ACID transactions, relationships, reporting. NoSQL: Massive scale, flexible schema, high write throughput, geographic distribution. Often use both: PostgreSQL for transactional data, Redis for cache, Elasticsearch for search, S3 for blobs.',
    },
    {
      id: 'sd-q3',
      level: 'senior',
      question: 'Design an API for 100 million users.',
      answer:
        'Auth: JWT with short expiry + refresh tokens. API Gateway for rate limiting, versioning. Stateless microservices behind ALB. PostgreSQL with read replicas + sharding by user_id. Redis for sessions and hot data. SQS for async tasks. S3 for media. CDN (CloudFront). Observability: distributed tracing, metrics (p50/p95/p99), structured logs. Multi-region for availability. Feature flags for gradual rollout.',
      keyPoints: ['Stateless services', 'Caching layers', 'Async processing', 'Observability', 'Multi-region'],
    },
    {
      id: 'sd-q4',
      level: 'senior',
      question: 'Design a system capable of processing 1 million events per second.',
      answer:
        'Ingestion: Kafka with 100+ partitions, producers batching. Processing: Kafka Streams/Flink consumers, horizontally scaled. Storage: Cassandra for real-time queries (partitioned by event_id), S3 data lake for analytics. Monitoring: consumer lag alerts, per-partition throughput. Failure: dead letter queue, idempotent consumers, circuit breakers on downstream. Ordering: per-partition ordering, event timestamps for cross-partition.',
    },
  ],
  seniorScenarios: [
    {
      title: 'Migrate database with zero downtime',
      scenario: 'You need to migrate 500GB PostgreSQL database to a new schema. Zero downtime required.',
      approach:
        '1) Dual-write: new code writes to both old and new schema. 2) Backfill: migrate historical data in batches. 3) Verify: compare counts and checksums. 4) Switch reads: gradually route reads to new schema (feature flag). 5) Stop dual-write to old schema. 6) Drop old tables. Alternative: logical replication for table-level migration.',
      keyConsiderations: ['Dual-write consistency', 'Backfill without locking', 'Rollback plan', 'Verification'],
      followUpQuestions: ['What if backfill takes 2 weeks?', 'How do you handle schema conflicts?'],
    },
  ],
  resources: [
    { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'article' },
    { title: 'Designing Data-Intensive Applications', url: 'https://dataintensive.net/', type: 'book' },
  ],
};
