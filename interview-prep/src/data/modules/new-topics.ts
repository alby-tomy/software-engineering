import { createModule } from './helpers';

export const concurrency = createModule({
  id: 'concurrency',
  title: 'Concurrency & Parallelism',
  stage: 3,
  level: 'advanced',
  icon: '🔀',
  description:
    'Threads, processes, async, locks, semaphores, worker pools, and choosing the right concurrency model for production.',
  prerequisites: ['cs-fundamentals', 'python'],
  estimatedHours: 25,
  learningObjectives: [
    'Compare threads vs processes vs async vs multiprocessing',
    'Implement worker pools, backpressure, and rate limiting',
    'Debug race conditions, deadlocks, and livelocks',
    'Choose concurrency model based on workload characteristics',
  ],
  sections: [
    {
      id: 'models',
      title: 'Concurrency Models Compared',
      content: `### Four models every senior engineer must understand

| Model | Best For | Isolation | Overhead | Parallelism |
|-------|----------|-----------|----------|-------------|
| **Threads** | I/O-bound, shared state | Low (shared memory) | ~8MB stack each | Limited by GIL (Python) |
| **Processes** | CPU-bound, isolation | High (separate memory) | High (fork cost) | True multi-core |
| **Async/Event loop** | High I/O concurrency | Single thread | Very low | Cooperative |
| **Actor model** | Distributed systems | Message passing | Medium | Per-actor sequential |

### Decision tree
\`\`\`
Is it CPU-bound?
  YES → multiprocessing / process pool
  NO → Is it I/O-bound with 1000+ connections?
    YES → asyncio (if async libraries available)
    NO → threading (if blocking libraries) or asyncio
\`\`\`

### Common mistakes
1. Using threads for CPU-bound Python work (GIL blocks parallelism)
2. Blocking the event loop with sync calls in async code
3. Unbounded thread/process spawning under load
4. No timeout on concurrent operations
5. Shared mutable state without synchronization`,
      practicalExercise:
        'Implement the same "fetch 100 URLs" task using threads, asyncio, and multiprocessing. Benchmark and explain results.',
    },
    {
      id: 'synchronization',
      title: 'Synchronization Primitives',
      content: `### Locks & Mutexes
Exclusive access to shared resource. Risk: deadlock if lock order inconsistent.

### Semaphores
Limit concurrent access to N resources. Used for connection pools, rate limiting.

### Read-Write Locks
Multiple readers OR one writer. Good for read-heavy caches.

### Condition Variables
Threads wait for a condition to become true. Used in producer-consumer patterns.

### Atomic Operations
Lock-free updates for counters, flags. Lower overhead than mutex for simple ops.

### Deadlock conditions (all four required)
1. Mutual exclusion
2. Hold and wait
3. No preemption
4. Circular wait

**Prevention:** consistent lock ordering, lock timeouts, try-lock with backoff.`,
      codeExamples: [
        {
          title: 'Python asyncio Semaphore for rate limiting',
          language: 'python',
          code: `import asyncio

class RateLimiter:
    def __init__(self, max_concurrent: int):
        self.semaphore = asyncio.Semaphore(max_concurrent)

    async def acquire(self):
        await self.semaphore.acquire()

    def release(self):
        self.semaphore.release()

    async def __aenter__(self):
        await self.acquire()
        return self

    async def __aexit__(self, *args):
        self.release()

# Usage: max 10 concurrent DB queries
limiter = RateLimiter(10)
async with limiter:
    result = await db.query(...)`,
        },
      ],
    },
    {
      id: 'worker-pools',
      title: 'Worker Pools & Backpressure',
      content: `### Worker pool pattern
Fixed number of workers consume from a queue. Prevents resource exhaustion.

### Backpressure
When consumer is slower than producer, signal upstream to slow down.
- Bounded queues (drop or block when full)
- Semaphores limiting in-flight requests
- HTTP 429 / 503 responses
- Kafka consumer lag monitoring

### Production architecture
\`\`\`
HTTP Request → API (async) → Bounded Queue → Worker Pool → DB
                    ↓                              ↓
              Return 503 if               Process with
              queue full                  timeout + retry
\`\`\``,
      codeExamples: [
        {
          title: 'Async worker pool with bounded queue',
          language: 'python',
          code: `import asyncio
from asyncio import Queue

async def worker(queue: Queue, worker_id: int):
    while True:
        item = await queue.get()
        try:
            await process_item(item)
        except Exception as e:
            log.error(f"Worker {worker_id} failed: {e}")
        finally:
            queue.task_done()

async def main():
    queue = Queue(maxsize=100)  # Backpressure at 100
    workers = [asyncio.create_task(worker(queue, i)) for i in range(4)]
    
    for item in items:
        await queue.put(item)  # Blocks if queue full
    await queue.join()`,
        },
      ],
    },
    {
      id: 'debugging',
      title: 'Debugging Concurrency Issues',
      content: `### Race condition symptoms
- Intermittent wrong results
- Works in dev, fails in production under load
- Different results on different runs

### Tools
- **Python:** threading debug mode, asyncio debug, py-spy
- **Go:** race detector (\`-race\` flag)
- **General:** thread dumps, strace, perf

### Investigation steps
1. Reproduce under load (not single-threaded test)
2. Add logging with thread/goroutine IDs
3. Use race detector / thread sanitizer
4. Review all shared mutable state
5. Check lock ordering for deadlocks`,
    },
  ],
  questions: [
    { id: 'conc-q1', level: 'understanding', question: 'Threads vs processes — when and why?', answer: 'Processes: separate memory, crash isolation, true parallelism (bypass GIL). Use for CPU-bound work. Threads: shared memory, lower overhead, good for I/O-bound. Use when you need shared state and I/O concurrency.' },
    { id: 'conc-q2', level: 'application', question: 'CPU-bound work in Python — threads, processes, or async?', answer: 'Processes (multiprocessing or ProcessPoolExecutor). Threads blocked by GIL for CPU work. Async is single-threaded — no parallelism for CPU. For heavy CPU: offload to process pool from async event loop.' },
    { id: 'conc-q3', level: 'debugging', question: 'Intermittent data corruption in multi-threaded app. How do you debug?', answer: '1) Enable race detection. 2) Add synchronized logging with thread IDs. 3) Identify shared mutable state. 4) Reproduce under concurrent load. 5) Review all read-modify-write operations. 6) Add locks or use thread-safe data structures.' },
    { id: 'conc-q4', level: 'architecture', question: 'Design a system to process 1M jobs/day with variable processing time.', answer: 'API accepts jobs → SQS/Kafka queue → Worker pool (auto-scaled on queue depth). Dead letter queue for failures. Idempotent job processing. Visibility timeout > max processing time. Monitor queue depth, processing rate, error rate.' },
    { id: 'conc-q5', level: 'senior', question: 'How do you implement backpressure in a high-throughput Python service?', answer: '1) Bounded asyncio.Queue or semaphore limiting in-flight requests. 2) Return 503 when at capacity. 3) Client-side retry with backoff. 4) Monitor queue depth, alert before saturation. 5) Auto-scale workers based on queue depth. 6) Circuit breaker on downstream services.' },
  ],
  seniorScenarios: [
    { title: 'Thread pool exhaustion', scenario: 'FastAPI sync endpoints cause thread pool exhaustion under load. Latency spikes to 30s.', approach: 'Root cause: sync DB calls in def endpoints exhaust 40-thread pool. Fix: migrate to async endpoints + asyncpg. Short-term: increase thread pool + add request timeout. Monitor active threads.', keyConsiderations: ['Thread pool size', 'Request timeouts', 'Async migration path'] },
  ],
  resources: [
    { title: 'Python concurrent.futures', url: 'https://docs.python.org/3/library/concurrent.futures.html', type: 'documentation' },
    { title: 'Java Concurrency in Practice', url: 'https://jcip.net/', type: 'book' },
  ],
});

export const messageQueues = createModule({
  id: 'message-queues',
  title: 'Message Queues & Event Streaming',
  stage: 8,
  level: 'advanced',
  icon: '📨',
  description: 'Kafka, RabbitMQ, SQS, pub/sub patterns, delivery guarantees, and building reliable async pipelines.',
  prerequisites: ['distributed-systems'],
  estimatedHours: 20,
  learningObjectives: [
    'Compare Kafka, RabbitMQ, and SQS for different use cases',
    'Implement at-least-once, exactly-once, and at-most-once delivery',
    'Design dead letter queues and retry strategies',
    'Handle ordering, partitioning, and consumer lag',
  ],
  sections: [
    {
      id: 'fundamentals',
      title: 'Messaging Fundamentals',
      content: `### Delivery guarantees
- **At-most-once:** Fire and forget. May lose messages. Fastest.
- **At-least-once:** Retry until ack. May duplicate. Most common.
- **Exactly-once:** Hard. Requires idempotent consumers + transactional writes.

### Queue vs Pub/Sub vs Log
- **Queue (RabbitMQ, SQS):** Point-to-point. One consumer per message.
- **Pub/Sub (SNS, Redis):** Broadcast to all subscribers.
- **Log (Kafka):** Durable, ordered, replayable. Multiple consumer groups.

### When to use what
| Use Case | Technology |
|----------|-----------|
| Task queue, job processing | SQS, RabbitMQ, Celery |
| Event streaming, analytics | Kafka |
| Real-time notifications | Redis Pub/Sub, SNS |
| Decouple microservices | Kafka, RabbitMQ |
| Simple async tasks | SQS + Lambda |`,
    },
    {
      id: 'kafka',
      title: 'Apache Kafka Deep Dive',
      content: `### Core concepts
- **Topic:** Category of messages
- **Partition:** Ordered, immutable sequence. Enables parallelism.
- **Offset:** Position in partition. Consumer tracks offset.
- **Consumer group:** Partitions distributed among group members.

### Ordering guarantee
Ordering only within a partition. Use same partition key for related events.

### Consumer lag
Difference between latest offset and consumer offset. Alert when lag grows.

### Idempotent consumer pattern
\`\`\`python
def process_message(msg):
    if already_processed(msg.id):
        return  # Skip duplicate
    do_work(msg)
    mark_processed(msg.id)
\`\`\``,
      codeExamples: [
        {
          title: 'Kafka producer with partitioning',
          language: 'python',
          code: `from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode(),
    # Same user_id always goes to same partition
    key_serializer=lambda k: k.encode(),
)

producer.send(
    'user-events',
    key=str(user_id),  # Partition key
    value={'event': 'signup', 'user_id': user_id}
)`,
        },
      ],
    },
    {
      id: 'patterns',
      title: 'Messaging Patterns',
      content: `### Outbox pattern
Write event to DB outbox table in same transaction as business data. Separate process publishes to queue. Guarantees consistency.

### Saga pattern
Distributed transaction as sequence of local transactions. Compensating transactions on failure.

### Dead Letter Queue (DLQ)
Failed messages after N retries go to DLQ for investigation. Never lose messages silently.

### Poison message
Message that always fails processing. Move to DLQ after max retries. Alert on DLQ depth.`,
    },
  ],
  questions: [
    { id: 'mq-q1', level: 'understanding', question: 'Kafka vs RabbitMQ vs SQS?', answer: 'Kafka: high-throughput event log, replay, multiple consumers, ordering per partition. RabbitMQ: flexible routing, task queues, lower latency. SQS: fully managed, simple, AWS-native, at-least-once, no ordering (except FIFO).' },
    { id: 'mq-q2', level: 'application', question: 'How do you achieve exactly-once processing?', answer: 'Idempotent consumers (dedup by message ID). Transactional outbox pattern. Kafka transactions (exactly-once semantics within Kafka). In practice: at-least-once + idempotent consumer is the pragmatic choice.' },
    { id: 'mq-q3', level: 'debugging', question: 'Consumer lag is growing. How do you investigate?', answer: '1) Check consumer processing time — slow handler? 2) Downstream dependency slow? 3) Not enough consumers? Scale consumer group. 4) Poison messages blocking partition? 5) Rebalancing in progress? 6) Compare produce rate vs consume rate.' },
    { id: 'mq-q4', level: 'senior', question: 'Design a notification system for 10M users.', answer: 'Event → Kafka topic (partitioned by user_id) → Notification workers → Channel routers (email/SMS/push). Template service. Preference store (Redis). Rate limiting per channel. DLQ for failures. Idempotent delivery tracking. Batch similar notifications.' },
  ],
  seniorScenarios: [
    { title: 'Duplicate message processing', scenario: 'Payment charged twice due to message redelivery.', approach: 'Implement idempotency key on payment API. Store processed message IDs in Redis with TTL. Check before processing. Use outbox pattern for DB + queue consistency.', keyConsiderations: ['Idempotency keys', 'Deduplication store', 'Outbox pattern'] },
  ],
  resources: [
    { title: 'Kafka Documentation', url: 'https://kafka.apache.org/documentation/', type: 'documentation' },
    { title: 'AWS SQS Developer Guide', url: 'https://docs.aws.amazon.com/sqs/', type: 'documentation' },
  ],
});

export const microservices = createModule({
  id: 'microservices',
  title: 'Microservices Architecture',
  stage: 8,
  level: 'senior',
  icon: '🧩',
  description: 'Service decomposition, API gateways, service mesh, inter-service communication, and migration strategies.',
  prerequisites: ['system-design', 'distributed-systems'],
  estimatedHours: 20,
  learningObjectives: [
    'Decide when microservices vs monolith is appropriate',
    'Design service boundaries using domain-driven design',
    'Implement API gateway, service discovery, and circuit breakers',
    'Plan monolith-to-microservices migration',
  ],
  sections: [
    {
      id: 'when-why',
      title: 'When to Use Microservices',
      content: `### Monolith first, microservices when needed
Start monolith unless you have clear reasons:
- Different scaling requirements per component
- Different teams owning different domains
- Technology diversity needed
- Independent deployment cadence required

### Costs of microservices
- Network latency between services
- Distributed debugging complexity
- Data consistency challenges
- Operational overhead (deploy, monitor N services)
- Testing complexity

### Service boundary principles (DDD)
- Bounded context = service boundary
- Each service owns its data (no shared DB)
- Communicate via APIs or events
- Avoid distributed monolith (tight coupling)`,
    },
    {
      id: 'communication',
      title: 'Inter-Service Communication',
      content: `### Sync (REST/gRPC)
Request-response. Simple but creates coupling. Use circuit breakers and timeouts.

### Async (Events/Messages)
Loose coupling. Eventual consistency. Harder to debug.

### API Gateway
Single entry point: routing, auth, rate limiting, request aggregation.

### Service Mesh (Istio, Linkerd)
Handles cross-cutting concerns: mTLS, retries, load balancing, observability.

### Patterns
- **BFF (Backend for Frontend):** Separate API per client type
- **Strangler Fig:** Gradually replace monolith
- **Saga:** Distributed transactions via events`,
    },
    {
      id: 'data',
      title: 'Data in Microservices',
      content: `### Database per service
Each service has its own database. No direct cross-service DB access.

### Challenges
- Joins across services → API composition or CQRS read models
- Transactions → Saga pattern or eventual consistency
- Reporting → Event sourcing + analytics DB

### CQRS (Command Query Responsibility Segregation)
Write model optimized for commands. Read model optimized for queries. Synced via events.`,
    },
  ],
  questions: [
    { id: 'ms-q1', level: 'tradeoffs', question: 'Monolith vs microservices for a startup with 5 engineers?', answer: 'Monolith. Team too small for microservices overhead. Deploy complexity, distributed debugging, and data consistency issues outweigh benefits. Extract services later when team/domain grows.' },
    { id: 'ms-q2', level: 'architecture', question: 'How do you handle transactions across microservices?', answer: 'Avoid distributed transactions (2PC is fragile). Use Saga pattern: sequence of local transactions with compensating actions. Or embrace eventual consistency with idempotent event handlers.' },
    { id: 'ms-q3', level: 'senior', question: 'How would you migrate a monolith to microservices?', answer: 'Strangler fig pattern: 1) Identify bounded contexts. 2) Extract least-coupled service first. 3) Dual-write or event sync during transition. 4) Route traffic gradually via API gateway. 5) Decompose DB last (hardest). 6) Never big-bang rewrite.' },
  ],
  seniorScenarios: [
    { title: 'Cascading failure', scenario: 'One microservice goes down and takes down 5 others via retry storms.', approach: 'Circuit breakers on all inter-service calls. Bulkhead isolation (separate connection pools). Timeout budgets. Retry with jitter, max 2 retries. Fallback responses. Health check aggregation at gateway.', keyConsiderations: ['Circuit breakers', 'Bulkheads', 'Timeout budgets', 'Graceful degradation'] },
  ],
  resources: [
    { title: 'Building Microservices (Newman)', url: 'https://www.oreilly.com/library/view/building-microservices-2nd-edition/9781492034018/', type: 'book' },
  ],
});

export const designPatterns = createModule({
  id: 'design-patterns',
  title: 'Design Patterns',
  stage: 5,
  level: 'intermediate',
  icon: '🎨',
  description: 'GoF patterns, architectural patterns, and when to apply them in real production code.',
  prerequisites: ['python'],
  estimatedHours: 15,
  learningObjectives: [
    'Apply creational, structural, and behavioral patterns appropriately',
    'Recognize architectural patterns in system design',
    'Avoid over-engineering with unnecessary patterns',
  ],
  sections: [
    {
      id: 'creational',
      title: 'Creational Patterns',
      content: `### Singleton
One instance globally. Use: config, connection pool, logger. Python: module-level instance or @lru_cache.

### Factory / Abstract Factory
Create objects without specifying exact class. Use: plugin systems, DB driver selection.

### Builder
Step-by-step complex object construction. Use: query builders, config objects, test data.

### Prototype
Clone existing object. Use: deep copy of complex objects.`,
    },
    {
      id: 'structural',
      title: 'Structural Patterns',
      content: `### Adapter
Wrap incompatible interface. Use: integrating third-party libraries.

### Decorator
Add behavior without modifying class. Use: Python @decorator, middleware, logging wrappers.

### Facade
Simplified interface to complex subsystem. Use: service layer over multiple repositories.

### Proxy
Control access to object. Use: caching proxy, lazy loading, access control.`,
    },
    {
      id: 'behavioral',
      title: 'Behavioral Patterns',
      content: `### Strategy
Interchangeable algorithms. Use: payment methods, sorting strategies, pricing rules.

### Observer
Notify dependents of state changes. Use: event systems, pub/sub, reactive UI.

### Command
Encapsulate request as object. Use: undo/redo, job queues, transaction logs.

### Template Method
Algorithm skeleton with customizable steps. Use: base service classes, test fixtures.`,
    },
    {
      id: 'architectural',
      title: 'Architectural Patterns',
      content: `| Pattern | Use Case |
|---------|----------|
| **MVC/MVT** | Web applications |
| **Repository** | Data access abstraction |
| **Unit of Work** | Transaction boundary |
| **CQRS** | Separate read/write models |
| **Event Sourcing** | Audit trail, temporal queries |
| **Hexagonal/Ports & Adapters** | Testable, swappable dependencies |
| **Circuit Breaker** | Fault tolerance |
| **Bulkhead** | Failure isolation |`,
    },
  ],
  questions: [
    { id: 'dp-q1', level: 'application', question: 'When would you use the Strategy pattern?', answer: 'When you have multiple interchangeable algorithms for the same task. Example: different payment processors (Stripe, PayPal), different notification channels (email, SMS, push). Avoids if/else chains, easy to add new strategies.' },
    { id: 'dp-q2', level: 'tradeoffs', question: 'When is applying design patterns harmful?', answer: 'When used without need — adds complexity for hypothetical future requirements. Signs: abstract factories for one implementation, strategy for two cases that never change, observer for simple callbacks. YAGNI applies.' },
    { id: 'dp-q3', level: 'understanding', question: 'Repository pattern — what problem does it solve?', answer: 'Abstracts data access behind an interface. Business logic doesn\'t know about SQL/ORM. Enables: easy testing (mock repository), swapping data stores, centralized query logic.' },
  ],
  seniorScenarios: [],
  resources: [
    { title: 'Refactoring Guru — Design Patterns', url: 'https://refactoring.guru/design-patterns', type: 'article' },
  ],
});

export const behavioral = createModule({
  id: 'behavioral',
  title: 'Behavioral & Leadership Interviews',
  stage: 10,
  level: 'senior',
  icon: '🗣️',
  description: 'STAR method, senior behavioral questions, conflict resolution, and demonstrating leadership impact.',
  estimatedHours: 10,
  learningObjectives: [
    'Structure answers using STAR method',
    'Prepare stories for common senior behavioral themes',
    'Demonstrate leadership, ownership, and impact with metrics',
  ],
  sections: [
    {
      id: 'star',
      title: 'STAR Method',
      content: `### Structure every behavioral answer
- **Situation:** Context (1-2 sentences)
- **Task:** Your responsibility
- **Action:** What YOU did (specific, not "we")
- **Result:** Quantified outcome

### Senior answer quality
- Include trade-offs you considered
- Mention what you'd do differently
- Show impact with numbers: "reduced latency 80%", "saved $50k/year"
- Demonstrate leadership even as IC: influenced, mentored, drove initiative`,
    },
    {
      id: 'common-questions',
      title: 'Common Senior Questions',
      content: `### Technical leadership
- "Tell me about a technical decision you made that was controversial"
- "Describe a time you improved system reliability"
- "How do you handle technical debt?"

### Conflict & collaboration
- "Describe a disagreement with a teammate/manager"
- "How do you handle an underperforming team member?"
- "Tell me about a failed project"

### Ownership & impact
- "What's the most impactful thing you've built?"
- "Describe a production incident you handled"
- "How do you prioritize when everything is urgent?"

### Growth & mentoring
- "How do you stay current with technology?"
- "Describe mentoring someone junior"
- "What's a mistake you made and what you learned?"`,
    },
    {
      id: 'preparation',
      title: 'How to Prepare',
      content: `### Build a story bank (8-10 stories)
Cover these themes:
1. Technical challenge solved
2. Production incident handled
3. Conflict resolved
4. Mentoring/coaching
5. Failed project / mistake learned
6. Cross-team collaboration
7. Process improvement
8. Handling ambiguity

### Practice
- Record yourself answering (2-3 min each)
- Get feedback on clarity and impact
- Prepare follow-up details for each story`,
    },
  ],
  questions: [
    { id: 'beh-q1', level: 'application', question: 'Tell me about a production incident you handled.', answer: 'STAR example: Situation: API p99 latency spiked to 5s affecting 10k users. Task: I was on-call, needed to restore service. Action: Checked dashboards, identified DB connection pool exhaustion from new deploy. Rolled back deploy, increased pool size, added alerting on pool utilization. Result: Restored in 12 minutes. Post-mortem led to connection pool monitoring and deploy canary process.' },
    { id: 'beh-q2', level: 'senior', question: 'Describe a technical decision you disagreed with. How did you handle it?', answer: 'Show: data-driven argument, respect for others\' views, willingness to commit once decided. "I presented benchmarks showing approach A was 3x faster. Team chose B for maintainability. I committed fully, documented trade-offs, and we revisited after 6 months with metrics."' },
  ],
  seniorScenarios: [],
  resources: [
    { title: 'STAR Method Guide', url: 'https://www.themuse.com/advice/star-interview-method', type: 'article' },
  ],
});

export const grpc = createModule({
  id: 'grpc',
  title: 'gRPC & Protocol Buffers',
  stage: 5,
  level: 'advanced',
  icon: '⚡',
  description: 'Protocol Buffers, gRPC services, streaming, and when to choose gRPC over REST.',
  prerequisites: ['networking', 'rest-api'],
  estimatedHours: 12,
  learningObjectives: [
    'Define services with Protocol Buffers',
    'Implement unary, server streaming, and bidirectional streaming',
    'Compare gRPC vs REST for microservice communication',
  ],
  sections: [
    {
      id: 'protobuf',
      title: 'Protocol Buffers',
      content: `### Why protobuf
- Binary serialization (smaller, faster than JSON)
- Strong typing with schema (.proto files)
- Code generation for multiple languages
- Backward/forward compatibility with field numbers

### .proto example
\`\`\`protobuf
syntax = "proto3";
message User {
  int32 id = 1;
  string name = 2;
  string email = 3;
}
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (stream User);
}
\`\`\``,
    },
    {
      id: 'grpc-vs-rest',
      title: 'gRPC vs REST',
      content: `| Feature | gRPC | REST |
|---------|------|------|
| Protocol | HTTP/2, binary | HTTP/1.1 or HTTP/2, JSON |
| Performance | Faster (binary, multiplexing) | Slower (text parsing) |
| Browser support | Limited (needs grpc-web) | Native |
| Streaming | Built-in (server, client, bidirectional) | SSE, WebSocket (separate) |
| Contract | .proto schema (strict) | OpenAPI (optional) |
| Best for | Internal microservices | Public APIs, browsers |

Use gRPC for service-to-service. Use REST for public/client-facing APIs.`,
    },
    {
      id: 'streaming',
      title: 'gRPC Streaming',
      content: `### Unary
Single request → single response (like REST)

### Server streaming
Single request → stream of responses (e.g., live feed)

### Client streaming
Stream of requests → single response (e.g., file upload)

### Bidirectional streaming
Both sides stream (e.g., chat)`,
    },
  ],
  questions: [
    { id: 'grpc-q1', level: 'tradeoffs', question: 'When would you choose gRPC over REST?', answer: 'Internal microservice communication: need performance, strong typing, streaming, or polyglot services. NOT for browser-facing APIs (use REST or grpc-web). NOT when team lacks protobuf experience.' },
    { id: 'grpc-q2', level: 'application', question: 'How does protobuf handle schema evolution?', answer: 'Field numbers (not names) identify fields. New fields are optional (ignored by old clients). Never reuse field numbers. Use reserved for removed fields. Backward compatible if you only add optional fields.' },
  ],
  seniorScenarios: [],
  resources: [
    { title: 'gRPC Documentation', url: 'https://grpc.io/docs/', type: 'documentation' },
  ],
});

export const cicd = createModule({
  id: 'cicd',
  title: 'CI/CD & DevOps',
  stage: 7,
  level: 'intermediate',
  icon: '🔄',
  description:
    'DevOps culture, continuous integration, deployment pipelines, GitHub Actions, infrastructure as code, and zero-downtime release strategies.',
  prerequisites: ['git', 'docker'],
  estimatedHours: 20,
  learningObjectives: [
    'Explain DevOps principles and the CI/CD feedback loop',
    'Design CI pipelines with lint, test, build, and security gates',
    'Implement blue-green, canary, and rolling deployment strategies',
    'Build GitHub Actions workflows and manage secrets safely',
    'Apply infrastructure as code with Terraform basics',
  ],
  sections: [
    {
      id: 'devops-culture',
      title: 'DevOps Culture & Principles',
      content: `### What is DevOps?
DevOps is **not a tool** — it's a culture and set of practices that break down silos between development and operations. Goal: ship software faster, safer, and more reliably.

### CALMS framework
- **Culture** — shared responsibility for production; blameless post-mortems
- **Automation** — CI/CD, IaC, automated testing — eliminate manual toil
- **Lean** — small batches, limit WIP, fast feedback loops
- **Measurement** — DORA metrics: deployment frequency, lead time, MTTR, change failure rate
- **Sharing** — knowledge sharing, runbooks, on-call rotation

### CI/CD feedback loop
\`\`\`
Code → Commit → CI (lint, test, build) → CD (deploy staging) → Manual/auto promote → Production
         ↑________________________________feedback___________________________________|
\`\`\`

### Key metrics (DORA)
| Metric | Elite teams | What it means |
|--------|-------------|---------------|
| Deploy frequency | Multiple/day | How often you ship |
| Lead time | < 1 hour | Commit to production |
| MTTR | < 1 hour | Time to recover from failure |
| Change failure rate | < 15% | % of deploys causing incidents |

### DevOps vs SRE vs Platform Engineering
- **DevOps** — culture + practices (everyone owns reliability)
- **SRE** — Google's approach: treat ops as software problem, error budgets
- **Platform Engineering** — internal developer platform (IDP) for self-service infra`,
    },
    {
      id: 'ci',
      title: 'Continuous Integration (CI)',
      content: `### What CI solves
Without CI: developers merge broken code, integration happens days later, bugs are hard to trace. **CI** runs automated checks on every commit/PR — catch problems in minutes.

### CI pipeline stages (in order)
1. **Lint & format** — ruff, eslint, prettier (< 30s)
2. **Type check** — mypy, tsc (< 1 min)
3. **Unit tests** — fast, isolated, no external deps (< 2 min)
4. **Integration tests** — DB, Redis, APIs (< 5 min)
5. **Build** — Docker image, compile artifacts
6. **Security scan** — SAST, dependency audit (Snyk, Dependabot)
7. **Deploy to staging** — automatic on merge to main

### Best practices
- **Fast feedback** — target < 10 min total CI time
- **Fail fast** — lint before expensive integration tests
- **Parallelize** — independent jobs run concurrently
- **Cache dependencies** — pip, npm, Docker layers
- **Required checks** — block merge until CI passes
- **Trunk-based** — small PRs, merge frequently

### Branch protection
Require: passing CI, 1+ code review, up-to-date with main, signed commits (optional).`,
      codeExamples: [
        {
          title: 'GitHub Actions CI pipeline',
          language: 'yaml',
          code: `name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
          cache: 'pip'
      - run: pip install -r requirements.txt
      - run: ruff check .
      - run: mypy app/
      - run: pytest --cov=app tests/
      - run: docker build -t app:\${{ github.sha }} .`,
        },
      ],
    },
    {
      id: 'github-actions',
      title: 'GitHub Actions — Workflows & Secrets',
      content: `### Core concepts
- **Workflow** — automated process (YAML file in \`.github/workflows/\`)
- **Event** — trigger (push, pull_request, schedule, workflow_dispatch)
- **Job** — set of steps on same runner
- **Step** — individual task (run command or use action)
- **Action** — reusable unit (checkout, setup-node, deploy)

### Workflow structure
\`\`\`yaml
name: Deploy
on:
  push:
    branches: [main]
env:
  REGISTRY: ghcr.io
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Login to registry
        uses: docker/login-action@v3
        with:
          registry: \${{ env.REGISTRY }}
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}
      - run: docker build -t \${{ env.REGISTRY }}/myapp:\${{ github.sha }} .
      - run: docker push \${{ env.REGISTRY }}/myapp:\${{ github.sha }}
\`\`\`

### Secrets management
- Store in **GitHub Secrets** (repo or org level)
- Never log secrets — GitHub masks known secrets
- Use **environments** (staging, production) with protection rules
- Rotate secrets regularly; use OIDC for cloud auth (no long-lived keys)

### Reusable workflows & matrix builds
\`\`\`yaml
strategy:
  matrix:
    python-version: ['3.11', '3.12']
    os: [ubuntu-latest, macos-latest]
\`\`\`
Test across versions in parallel.`,
    },
    {
      id: 'cd',
      title: 'Continuous Delivery & Deployment Strategies',
      content: `### CI vs CD
- **Continuous Integration** — automatically test every change
- **Continuous Delivery** — always deployable; manual promote to production
- **Continuous Deployment** — automatic deploy to production after CI passes

### Rolling update
Replace instances gradually. Default Kubernetes strategy. Brief mixed-version period. Low resource cost.

### Blue-green deployment
Two identical environments (blue=live, green=idle). Deploy to green, test, switch traffic instantly. **Fast rollback** — switch back to blue. Cost: 2x infrastructure during deploy.

### Canary deployment
Route small % of traffic (5%) to new version. Monitor error rate, latency, business metrics. Gradually increase to 100%. **Safest** for high-risk changes. Tools: Argo Rollouts, Flagger, Istio.

### Feature flags
Deploy code without enabling feature. Decouple **deploy** (code in production) from **release** (feature visible to users). Tools: LaunchDarkly, Unleash, custom DB flags.

### Zero-downtime requirements
- Health checks before routing traffic
- Graceful shutdown (drain connections, PreStop hook)
- Backward-compatible database migrations
- Readiness probes in Kubernetes`,
    },
    {
      id: 'iac',
      title: 'Infrastructure as Code (IaC)',
      content: `### Why IaC?
Manual infrastructure (clicking AWS console) is **not reproducible, not reviewable, not versioned**. IaC defines servers, networks, databases as code in git.

### Benefits
- **Reproducible** — same config every time
- **Reviewable** — PR for infra changes
- **Versioned** — rollback infrastructure like code
- **Documented** — code is the documentation

### Tools
| Tool | Best for |
|------|----------|
| **Terraform** | Multi-cloud, declarative, large ecosystem |
| **Pulumi** | IaC in Python/TypeScript/Go |
| **AWS CDK** | AWS-native, generates CloudFormation |
| **Ansible** | Configuration management, agentless |
| **Helm** | Kubernetes package manager |

### Terraform basics
\`\`\`hcl
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  tags = { Name = "web-server" }
}
\`\`\`
\`terraform plan\` → preview changes. \`terraform apply\` → execute. State file tracks what exists.

### GitOps
Infrastructure and app config live in git. ArgoCD or Flux watches git repo and syncs cluster to desired state. PR merges trigger deployments.`,
    },
    {
      id: 'release-management',
      title: 'Release Management & Rollbacks',
      content: `### Semantic versioning
\`MAJOR.MINOR.PATCH\` — e.g., \`2.4.1\`
- **MAJOR** — breaking API changes
- **MINOR** — new features, backward compatible
- **PATCH** — bug fixes

### Release checklist
1. All CI checks pass on release branch
2. Changelog updated
3. Version bumped in code
4. Git tag created: \`git tag -a v2.4.0 -m "Release 2.4.0"\`
5. Deploy to staging, run smoke tests
6. Deploy to production (canary → full)
7. Monitor metrics for 30 min post-deploy

### Database migrations in CI/CD
**Expand-contract pattern** (zero-downtime):
1. Add new column (nullable) — deploy 1
2. Dual-write to old and new — deploy 2
3. Backfill existing data — background job
4. Switch reads to new column — deploy 3
5. Stop writing to old column — deploy 4
6. Drop old column — deploy 5

Never rename/drop columns in a single deploy.

### Rollback strategies
- **Blue-green** — switch traffic back (seconds)
- **Kubernetes** — \`kubectl rollout undo deployment/app\`
- **Database** — forward-only migrations; rollback = new migration that reverses
- **Feature flag** — disable feature without redeploying`,
    },
  ],
  questions: [
    { id: 'cicd-q1', level: 'application', question: 'Blue-green vs canary deployment?', answer: 'Blue-green: instant switch, fast rollback, but 2x resources and all-or-nothing risk. Canary: gradual rollout, monitor real traffic, safer but slower. Use canary for high-risk changes, blue-green for low-risk with fast rollback needs.' },
    { id: 'cicd-q2', level: 'senior', question: 'How do you do zero-downtime database migrations?', answer: 'Expand-contract pattern: 1) Add new column (nullable). 2) Dual-write to old and new. 3) Backfill existing data. 4) Switch reads to new column. 5) Stop writing to old column. 6) Drop old column. Never rename/drop in single deploy.' },
    { id: 'cicd-q3', level: 'understanding', question: 'What is the difference between CI, Continuous Delivery, and Continuous Deployment?', answer: 'CI: automatically test every commit. Continuous Delivery: code is always deployable, manual production promote. Continuous Deployment: automatic production deploy after CI passes. Most teams aim for CD; full continuous deployment requires very high test confidence.' },
    { id: 'cicd-q4', level: 'architecture', question: 'What are DORA metrics and why do they matter?', answer: 'Deployment frequency, lead time for changes, mean time to recover (MTTR), change failure rate. They measure software delivery performance. Elite teams deploy multiple times per day with <1hr lead time and <15% failure rate.' },
    { id: 'cicd-q5', level: 'production', question: 'How do you manage secrets in CI/CD pipelines?', answer: 'Store in CI platform secrets (GitHub Secrets, GitLab CI variables). Never commit to git. Use environment-scoped secrets for staging vs production. Prefer OIDC short-lived tokens over long-lived API keys. Rotate on schedule and on any leak.' },
  ],
  seniorScenarios: [
    {
      title: 'CI pipeline takes 45 minutes',
      scenario: 'Developers complain CI is too slow. They skip waiting and merge without green checks.',
      approach: 'Profile pipeline: identify slowest jobs. Parallelize independent stages. Cache dependencies aggressively. Split unit vs integration tests — run unit on every PR, integration nightly. Target <10 min for PR checks.',
      keyConsiderations: ['Fast CI increases adoption', 'Flaky tests are worse than slow tests — fix or quarantine them', 'Consider test impact analysis to run only affected tests'],
    },
  ],
  resources: [
    { title: 'GitHub Actions Documentation', url: 'https://docs.github.com/en/actions', type: 'documentation' },
    { title: 'DORA Research', url: 'https://dora.dev/', type: 'article' },
    { title: 'Terraform Documentation', url: 'https://developer.hashicorp.com/terraform/docs', type: 'documentation' },
  ],
});

export const eventDriven = createModule({
  id: 'event-driven',
  title: 'Event-Driven Architecture',
  stage: 8,
  level: 'senior',
  icon: '⚡',
  description: 'Event sourcing, CQRS, event-driven microservices, and building reactive systems.',
  prerequisites: ['distributed-systems', 'message-queues'],
  estimatedHours: 15,
  learningObjectives: [
    'Design event-driven systems with proper event schemas',
    'Understand event sourcing and CQRS trade-offs',
    'Handle event ordering, replay, and versioning',
  ],
  sections: [
    {
      id: 'fundamentals',
      title: 'Event-Driven Fundamentals',
      content: `### Event
Something that happened in the past. Immutable. Named in past tense: \`OrderPlaced\`, \`PaymentReceived\`.

### Event-driven vs request-driven
- **Request-driven:** "Give me user 123" (tight coupling, sync)
- **Event-driven:** "User 123 was created" (loose coupling, async)

### Benefits
- Loose coupling between services
- Natural audit trail
- Easy to add new consumers
- Scales independently

### Challenges
- Eventual consistency
- Debugging distributed flows
- Event schema evolution
- Ordering guarantees`,
    },
    {
      id: 'event-sourcing',
      title: 'Event Sourcing',
      content: `### Concept
Store state changes as sequence of events, not current state. Rebuild state by replaying events.

### Benefits
- Complete audit trail
- Temporal queries ("what was balance on Jan 1?")
- Debug by replaying events
- Natural fit for event-driven systems

### Challenges
- Querying current state (need snapshots/projections)
- Event schema evolution
- Storage grows over time
- Complexity

### When to use
Financial systems, audit-heavy domains, collaborative editing. NOT for simple CRUD.`,
    },
    {
      id: 'cqrs',
      title: 'CQRS',
      content: `### Command Query Responsibility Segregation
Separate models for writes (commands) and reads (queries).

### Write side
Validates commands, applies business rules, emits events.

### Read side
Optimized projections/materialized views for queries.

### Often paired with event sourcing
Commands → Events → Projections → Query models`,
    },
  ],
  questions: [
    { id: 'eda-q1', level: 'understanding', question: 'Event sourcing vs traditional CRUD?', answer: 'CRUD: store current state, lose history. Event sourcing: store events, derive state, full history. Use event sourcing when audit trail, temporal queries, or event-driven architecture needed. CRUD for simple domains.' },
    { id: 'eda-q2', level: 'senior', question: 'How do you handle event schema changes in production?', answer: 'Backward compatible changes only (add optional fields). Version events (v1, v2). Upcasters transform old events to new schema on read. Never remove/rename fields. Consumers handle unknown fields gracefully.' },
  ],
  seniorScenarios: [],
  resources: [
    { title: 'Martin Fowler — Event Sourcing', url: 'https://martinfowler.com/eaaDev/EventSourcing.html', type: 'article' },
  ],
});

export const mongodb = createModule({
  id: 'mongodb',
  title: 'MongoDB & Document Databases',
  stage: 4,
  level: 'intermediate',
  icon: '🍃',
  description: 'Document modeling, aggregation pipeline, indexing, and when NoSQL fits over SQL.',
  prerequisites: ['databases'],
  estimatedHours: 12,
  learningObjectives: [
    'Design document schemas for query patterns',
    'Use aggregation pipeline for analytics',
    'Choose embedding vs referencing',
  ],
  sections: [
    {
      id: 'modeling',
      title: 'Document Modeling',
      content: `### Embed vs Reference
- **Embed:** One-to-few, data accessed together, no independent queries
- **Reference:** One-to-many, data queried independently, large arrays

### Schema design for queries
Design schema around query patterns, not normalization.

### Example: E-commerce
\`\`\`json
// Embed: order items (always read with order)
{
  "_id": "order123",
  "user_id": "user456",
  "items": [
    {"product_id": "p1", "qty": 2, "price": 29.99}
  ],
  "total": 59.98
}
\`\`\``,
    },
    {
      id: 'aggregation',
      title: 'Aggregation Pipeline',
      content: `### Stages
$match → $group → $sort → $project → $lookup (join) → $limit

### Example: Top products by revenue
\`\`\`javascript
db.orders.aggregate([
  { $unwind: "$items" },
  { $group: {
      _id: "$items.product_id",
      revenue: { $sum: { $multiply: ["$items.qty", "$items.price"] } }
  }},
  { $sort: { revenue: -1 } },
  { $limit: 10 }
])
\`\`\``,
    },
  ],
  questions: [
    { id: 'mongo-q1', level: 'application', question: 'When MongoDB over PostgreSQL?', answer: 'Flexible/evolving schema, document-oriented data (CMS, catalogs), horizontal scaling needed, nested data without joins. PostgreSQL when: complex queries, ACID transactions across entities, reporting, relational integrity.' },
    { id: 'mongo-q2', level: 'understanding', question: 'Embed vs reference in MongoDB?', answer: 'Embed when data is read together and bounded in size (order items). Reference when data is large, independently queried, or shared across documents (user profile referenced by many orders).' },
  ],
  seniorScenarios: [],
  resources: [
    { title: 'MongoDB University', url: 'https://learn.mongodb.com/', type: 'documentation' },
  ],
});

export const elasticsearch = createModule({
  id: 'elasticsearch',
  title: 'Elasticsearch & Search',
  stage: 4,
  level: 'advanced',
  icon: '🔎',
  description: 'Full-text search, inverted indexes, aggregations, and building search at scale.',
  prerequisites: ['databases'],
  estimatedHours: 12,
  learningObjectives: [
    'Understand inverted indexes and relevance scoring',
    'Build search APIs with filters and facets',
    'Design index mappings and analyzers',
  ],
  sections: [
    {
      id: 'fundamentals',
      title: 'Search Fundamentals',
      content: `### Inverted index
Maps terms → document IDs. Enables fast full-text search.

### Analyzer pipeline
Character filters → Tokenizer → Token filters
"Quick Brown Fox" → ["quick", "brown", "fox"]

### Relevance scoring (BM25)
Considers: term frequency, inverse document frequency, field length.

### SQL vs Elasticsearch
SQL: exact matches, joins, transactions. Elasticsearch: full-text search, fuzzy matching, aggregations, autocomplete.`,
    },
    {
      id: 'queries',
      title: 'Query Types',
      content: `### Match query
Full-text search with relevance scoring.

### Term query
Exact value match (keyword fields).

### Bool query
Combine must, should, must_not, filter.

### Aggregations
Facets, histograms, metrics — like GROUP BY but for search.`,
      codeExamples: [
        {
          title: 'Search with filters and facets',
          language: 'json',
          code: `{
  "query": {
    "bool": {
      "must": [{ "match": { "title": "python tutorial" } }],
      "filter": [
        { "term": { "category": "programming" } },
        { "range": { "price": { "lte": 50 } } }
      ]
    }
  },
  "aggs": {
    "categories": { "terms": { "field": "category" } }
  }
}`,
        },
      ],
    },
  ],
  questions: [
    { id: 'es-q1', level: 'application', question: 'When would you add Elasticsearch?', answer: 'Full-text search, autocomplete, log analytics (ELK stack), faceted search, fuzzy matching. NOT as primary database — use as search layer synced from main DB via events or CDC.' },
    { id: 'es-q2', level: 'debugging', question: 'Search results seem irrelevant. How do you improve?', answer: '1) Check analyzer — is text tokenized correctly? 2) Boost important fields (title > description). 3) Use function_score for business rules. 4) Add synonyms. 5) Review slow queries. 6) A/B test relevance with user feedback.' },
  ],
  seniorScenarios: [],
  resources: [
    { title: 'Elasticsearch Guide', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html', type: 'documentation' },
  ],
});
