import type { Module, Question } from '../types/curriculum';
import { allModules } from './modules';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface SystemDesignStep {
  id: string;
  phase: string;
  title: string;
  duration: string;
  prompts: string[];
  tips: string[];
  checklist: string[];
}

export interface SystemDesignWalkthrough {
  id: string;
  title: string;
  difficulty: 'intermediate' | 'advanced' | 'senior';
  description: string;
  requirements: { functional: string[]; nonFunctional: string[] };
  estimates: { users: string; qps: string; storage: string };
  steps: SystemDesignStep[];
  keyDecisions: { decision: string; rationale: string; alternative: string }[];
}

export const systemDesignWalkthroughs: SystemDesignWalkthrough[] = [
  {
    id: 'url-shortener',
    title: 'Design a URL Shortener',
    difficulty: 'intermediate',
    description: 'Classic system design problem. Practice the full framework from requirements to scaling.',
    requirements: {
      functional: [
        'Given a long URL, return a short unique URL',
        'Redirect short URL to original URL',
        'Optional: custom aliases, expiration, analytics',
      ],
      nonFunctional: [
        '100M URLs created per month',
        '100:1 read/write ratio (reads dominate)',
        'Low latency redirects (<100ms)',
        'High availability (99.9%)',
      ],
    },
    estimates: {
      users: '100M URLs/month ≈ 38 URLs/sec write, 3800 reads/sec',
      qps: 'Peak ~10k reads/sec, ~100 writes/sec',
      storage: '100M URLs × 500 bytes ≈ 50GB/year',
    },
    steps: [
      {
        id: 'clarify',
        phase: '0-5 min',
        title: 'Clarify Requirements',
        duration: '5 min',
        prompts: [
          'What is the expected scale? (URLs/month, read/write ratio)',
          'Do we need custom short URLs or just auto-generated?',
          'Do URLs expire? Analytics on clicks?',
          'What latency is acceptable for redirects?',
        ],
        tips: [
          'Always ask about read vs write ratio — it drives architecture',
          'Confirm character set for short codes (base62: a-z, A-Z, 0-9)',
          'Ask if analytics are real-time or batch',
        ],
        checklist: ['Scale numbers', 'Custom aliases?', 'Expiration?', 'Analytics?'],
      },
      {
        id: 'api',
        phase: '5-10 min',
        title: 'API Design',
        duration: '5 min',
        prompts: [
          'POST /api/v1/urls — body: { long_url, custom_alias?, expires_at? }',
          'GET /{short_code} — returns 301/302 redirect',
          'GET /api/v1/urls/{short_code}/stats — click analytics',
        ],
        tips: [
          'Use 301 (permanent) if URL never changes — cacheable by browsers',
          'Use 302 (temporary) if you need to track every click',
          'Return 201 with short URL on create',
        ],
        checklist: ['Create endpoint', 'Redirect endpoint', 'Analytics endpoint', 'Status codes'],
      },
      {
        id: 'data-model',
        phase: '10-15 min',
        title: 'Data Model & Encoding',
        duration: '5 min',
        prompts: [
          'How do we generate short codes? Auto-increment ID → base62 OR hash?',
          'Table: id, short_code, long_url, created_at, expires_at, user_id',
          '7-char base62 = 62^7 ≈ 3.5 trillion unique codes',
        ],
        tips: [
          'Auto-increment + base62 is simpler and collision-free',
          'Hash (MD5/SHA) needs collision handling — check DB before insert',
          'Index on short_code for O(1) lookups',
        ],
        checklist: ['Encoding strategy', 'Schema design', 'Indexes', 'Collision handling'],
      },
      {
        id: 'high-level',
        phase: '15-20 min',
        title: 'High-Level Architecture',
        duration: '5 min',
        prompts: [
          'Client → Load Balancer → API Servers → Database',
          'Cache layer (Redis) for hot URLs — 80/20 rule',
          'Read replicas for analytics queries',
        ],
        tips: [
          'Draw boxes: Client, LB, App, Cache, DB, Analytics',
          'Mention CDN only if serving static content — redirects go to API',
          'Separate write path (create) from read path (redirect)',
        ],
        checklist: ['Load balancer', 'App servers', 'Cache', 'Database', 'Read replicas'],
      },
      {
        id: 'deep-dive',
        phase: '20-30 min',
        title: 'Deep Dive — Caching & Scaling',
        duration: '10 min',
        prompts: [
          'Cache-aside: check Redis → miss → query DB → populate cache',
          'What TTL for cache? (popular URLs: long TTL, rare: short)',
          'How to handle cache stampede on popular URL expiry?',
          'Database sharding by short_code hash if single DB insufficient',
        ],
        tips: [
          'Pre-generate short codes in batch to avoid DB contention on insert',
          'Use consistent hashing for cache distribution',
          'Analytics: async queue → worker → analytics DB (don\'t block redirect)',
        ],
        checklist: ['Cache strategy', 'Cache invalidation', 'DB sharding plan', 'Async analytics'],
      },
      {
        id: 'wrap-up',
        phase: '30-45 min',
        title: 'Bottlenecks, Monitoring & Trade-offs',
        duration: '15 min',
        prompts: [
          'Single points of failure? (DB, cache cluster)',
          'What metrics to monitor? (redirect latency p99, cache hit rate, error rate)',
          'How to handle DB failover?',
        ],
        tips: [
          'Mention trade-off: 301 vs 302 (caching vs analytics accuracy)',
          'Discuss CAP: AP for redirects (availability over consistency)',
          'Future: custom domains, A/B testing on redirects',
        ],
        checklist: ['Failure modes', 'Monitoring/alerting', 'Trade-offs discussed', 'Future improvements'],
      },
    ],
    keyDecisions: [
      {
        decision: 'Auto-increment + base62 encoding',
        rationale: 'Simple, no collisions, predictable capacity',
        alternative: 'Hash-based — shorter codes but needs collision handling',
      },
      {
        decision: 'Redis cache-aside for redirects',
        rationale: '100:1 read/write ratio — cache eliminates 90%+ DB reads',
        alternative: 'Write-through cache — more complex, overkill for this ratio',
      },
      {
        decision: '301 redirect for permanent URLs',
        rationale: 'Browser caches redirect — reduces server load',
        alternative: '302 — needed if URL mapping can change or for click tracking',
      },
    ],
  },
  {
    id: 'notification-system',
    title: 'Design a Notification System',
    difficulty: 'advanced',
    description: 'Design a system to send email, SMS, and push notifications to millions of users.',
    requirements: {
      functional: [
        'Send notifications via email, SMS, push',
        'Support templates and personalization',
        'User preference management (opt-in/out per channel)',
        'Delivery status tracking',
      ],
      nonFunctional: [
        '10M notifications/day',
        'At-least-once delivery',
        'Rate limiting per user (no spam)',
        'Priority levels (urgent vs digest)',
      ],
    },
    estimates: {
      users: '10M notifications/day ≈ 115/sec average, 500/sec peak',
      qps: '500 events/sec peak ingestion',
      storage: '10M × 1KB metadata/day ≈ 10GB/day',
    },
    steps: [
      {
        id: 'clarify',
        phase: '0-5 min',
        title: 'Clarify Requirements',
        duration: '5 min',
        prompts: [
          'Which channels? (email, SMS, push, in-app)',
          'Real-time or batch/digest?',
          'Priority levels? Retry policy?',
          'User preferences — can users opt out per channel?',
        ],
        tips: ['Distinguish transactional (password reset) vs marketing notifications'],
        checklist: ['Channels', 'Real-time vs batch', 'Priority', 'User preferences'],
      },
      {
        id: 'architecture',
        phase: '5-15 min',
        title: 'Architecture',
        duration: '10 min',
        prompts: [
          'Event → Kafka topic → Notification Service → Channel Workers',
          'Template service for rendering',
          'User preference store (Redis/DB)',
          'Provider abstraction (SendGrid, Twilio, FCM)',
        ],
        tips: [
          'Separate queues per channel for independent scaling',
          'Dead letter queue for failed deliveries',
          'Idempotency key to prevent duplicate sends',
        ],
        checklist: ['Message queue', 'Workers per channel', 'Template service', 'DLQ'],
      },
      {
        id: 'scaling',
        phase: '15-30 min',
        title: 'Scaling & Reliability',
        duration: '15 min',
        prompts: [
          'Rate limit per user (max 10 emails/day)',
          'Batch similar notifications into digest',
          'Circuit breaker on external providers',
          'How to handle provider outage?',
        ],
        tips: [
          'Priority queue: urgent bypasses rate limits',
          'Store delivery status for retry and analytics',
          'Fan-out: one event → N users via separate messages',
        ],
        checklist: ['Rate limiting', 'Circuit breakers', 'Retry strategy', 'Provider failover'],
      },
    ],
    keyDecisions: [
      {
        decision: 'Kafka for event ingestion',
        rationale: 'Durable, high throughput, replay capability',
        alternative: 'SQS — simpler but less ordering control',
      },
      {
        decision: 'Separate workers per channel',
        rationale: 'Independent scaling — SMS slow, push fast',
        alternative: 'Single worker — simpler but bottlenecked',
      },
    ],
  },
  {
    id: 'rate-limiter',
    title: 'Design a Distributed Rate Limiter',
    difficulty: 'senior',
    description: 'Design a rate limiter that works across multiple API servers.',
    requirements: {
      functional: [
        'Limit requests per user/IP (e.g., 100 req/min)',
        'Return 429 when limit exceeded',
        'Support different limits per endpoint/plan',
      ],
      nonFunctional: [
        'Distributed across 10+ API servers',
        'Low latency overhead (<5ms)',
        'Accurate enough (not strict financial precision)',
      ],
    },
    estimates: {
      users: '1M active users',
      qps: '50k requests/sec across cluster',
      storage: 'Minimal — counters in Redis',
    },
    steps: [
      {
        id: 'algorithms',
        phase: '0-10 min',
        title: 'Algorithm Comparison',
        duration: '10 min',
        prompts: [
          'Token bucket — allows bursts, smooth refill',
          'Sliding window log — precise, memory heavy',
          'Fixed window counter — simple, boundary problem',
          'Sliding window counter — hybrid, recommended',
        ],
        tips: [
          'Draw timeline showing boundary issue with fixed window',
          'Token bucket: good for APIs that allow bursts',
          'For distributed: all servers must share state (Redis)',
        ],
        checklist: ['Algorithm chosen', 'Trade-offs explained', 'Burst handling'],
      },
      {
        id: 'implementation',
        phase: '10-25 min',
        title: 'Distributed Implementation',
        duration: '15 min',
        prompts: [
          'Redis key: rate:{user_id}:{window}',
          'Lua script for atomic increment + check',
          'Where to place: API gateway vs app middleware',
          'Response headers: X-RateLimit-Remaining, Retry-After',
        ],
        tips: [
          'Lua script prevents race condition across servers',
          'Consider local cache + Redis for lower latency',
          'Fail open or closed? (usually fail open to not block users)',
        ],
        checklist: ['Redis atomicity', 'Middleware placement', 'Response headers', 'Fail strategy'],
      },
    ],
    keyDecisions: [
      {
        decision: 'Sliding window counter in Redis',
        rationale: 'Good balance of accuracy and memory',
        alternative: 'Token bucket — better for burst tolerance',
      },
      {
        decision: 'Rate limit at API gateway',
        rationale: 'Centralized, protects all downstream services',
        alternative: 'Per-service — more granular but duplicated logic',
      },
    ],
  },
];

export function getModuleQuiz(moduleId: string): QuizQuestion[] {
  const quizzes: Record<string, QuizQuestion[]> = {
    python: [
      {
        id: 'py-qz-1',
        question: 'When does the GIL prevent parallelism?',
        options: ['I/O-bound threading', 'CPU-bound threading', 'Asyncio I/O', 'Multiprocessing'],
        correctIndex: 1,
        explanation: 'GIL prevents multiple threads from executing Python bytecode simultaneously. CPU-bound threading cannot achieve parallelism. I/O-bound threading works because GIL is released during I/O waits.',
      },
      {
        id: 'py-qz-2',
        question: 'What does `await` do in asyncio?',
        options: [
          'Blocks the entire program',
          'Suspends the coroutine and yields control to the event loop',
          'Creates a new thread',
          'Runs code in parallel',
        ],
        correctIndex: 1,
        explanation: 'await suspends the current coroutine, allowing the event loop to run other coroutines while waiting for I/O.',
      },
      {
        id: 'py-qz-3',
        question: 'Best approach for 10,000 concurrent HTTP requests in Python?',
        options: ['Threading', 'Multiprocessing', 'Asyncio with aiohttp', 'Sequential requests'],
        correctIndex: 2,
        explanation: 'Asyncio handles thousands of I/O-bound connections efficiently with a single thread and low memory overhead.',
      },
      {
        id: 'py-qz-4',
        question: 'What causes a memory leak with mutable default arguments?',
        options: [
          'Python GC failure',
          'Default list/dict is created once at function definition, shared across calls',
          'Reference counting bug',
          'Circular imports',
        ],
        correctIndex: 1,
        explanation: 'Default mutable arguments are evaluated once at definition time, not per call. All calls share the same list/dict object.',
      },
      {
        id: 'py-qz-5',
        question: 'How do you run CPU-bound work from an async function?',
        options: [
          'Use threading directly in async def',
          'ProcessPoolExecutor via run_in_executor',
          'Add more await statements',
          'Use time.sleep in async',
        ],
        correctIndex: 1,
        explanation: 'ProcessPoolExecutor bypasses GIL for CPU work. run_in_executor bridges sync CPU code into async context without blocking the event loop.',
      },
    ],
    fastapi: [
      {
        id: 'fa-qz-1',
        question: 'What happens when you use `def` (sync) endpoint in FastAPI?',
        options: [
          'Runs on event loop',
          'Runs in a thread pool',
          'Returns error',
          'Automatically converted to async',
        ],
        correctIndex: 1,
        explanation: 'Sync endpoints run in Starlette\'s thread pool (default 40 threads), not on the async event loop.',
      },
      {
        id: 'fa-qz-2',
        question: 'Why is cursor pagination better than offset pagination?',
        options: [
          'Simpler to implement',
          'Consistent results when data changes between requests',
          'Works with any database',
          'Faster for page 1',
        ],
        correctIndex: 1,
        explanation: 'Offset pagination skips/duplicates items when data is inserted/deleted between requests. Cursor pagination uses a stable pointer.',
      },
      {
        id: 'fa-qz-3',
        question: 'Where should authorization checks live?',
        options: [
          'Only in frontend',
          'In dependency injection / middleware, before business logic',
          'Only in database',
          'In response serialization',
        ],
        correctIndex: 1,
        explanation: 'Authorization must happen server-side in dependencies or middleware, before any business logic executes.',
      },
      {
        id: 'fa-qz-4',
        question: 'What does a circuit breaker do when downstream is failing?',
        options: [
          'Retries infinitely',
          'Fails fast without calling downstream',
          'Increases timeout',
          'Caches all responses',
        ],
        correctIndex: 1,
        explanation: 'Circuit breaker opens after failure threshold, returning errors immediately without calling the failing service, preventing retry storms.',
      },
    ],
    sql: [
      {
        id: 'sql-qz-1',
        question: 'When might PostgreSQL choose sequential scan over index scan?',
        options: [
          'Always prefers index',
          'When query returns large portion of table (>5-10%)',
          'When table is empty',
          'When index exists',
        ],
        correctIndex: 1,
        explanation: 'For large result sets, sequential scan is faster than random index lookups. Low selectivity queries often skip indexes.',
      },
      {
        id: 'sql-qz-2',
        question: 'What does MVCC enable?',
        options: [
          'Faster writes only',
          'Readers don\'t block writers, writers don\'t block readers',
          'Automatic indexing',
          'Data compression',
        ],
        correctIndex: 1,
        explanation: 'MVCC allows concurrent reads and writes without locking by maintaining multiple row versions.',
      },
      {
        id: 'sql-qz-3',
        question: 'Composite index on (a, b, c) supports which query?',
        options: [
          'WHERE b = ?',
          'WHERE a = ? AND b = ?',
          'WHERE c = ?',
          'WHERE b = ? AND c = ?',
        ],
        correctIndex: 1,
        explanation: 'Composite indexes support leftmost prefix. (a,b,c) supports a, a+b, a+b+c but not b alone or c alone.',
      },
    ],
    'system-design': [
      {
        id: 'sd-qz-1',
        question: 'In CAP theorem during a network partition, you must choose:',
        options: ['Consistency and Partition tolerance', 'Availability or Consistency', 'All three', 'None'],
        correctIndex: 1,
        explanation: 'During partition, you cannot have both consistency and availability. CP systems (banking) vs AP systems (social feeds).',
      },
      {
        id: 'sd-qz-2',
        question: 'Cache-aside pattern: who populates the cache?',
        options: [
          'Database automatically',
          'Application checks cache, on miss reads DB and writes cache',
          'Cache writes to DB',
          'CDN only',
        ],
        correctIndex: 1,
        explanation: 'Application manages cache: read cache → miss → read DB → write cache. Simple and most common pattern.',
      },
      {
        id: 'sd-qz-3',
        question: 'What causes a thundering herd / cache stampede?',
        options: [
          'Too many cache hits',
          'Popular cache key expires, all requests hit DB simultaneously',
          'Slow network',
          'Index missing',
        ],
        correctIndex: 1,
        explanation: 'When a hot cache entry expires, all concurrent requests miss cache and hit DB at once, potentially overwhelming it.',
      },
    ],
    dsa: [
      {
        id: 'dsa-qz-1',
        question: 'When to use a heap over a BST?',
        options: [
          'Need sorted traversal',
          'Only need min/max repeatedly',
          'Need range queries',
          'Need O(1) lookup by key',
        ],
        correctIndex: 1,
        explanation: 'Heap gives O(log n) insert and O(1) min/max. Use when you only need extreme values, not full sorting.',
      },
      {
        id: 'dsa-qz-2',
        question: 'Sliding window technique is best for:',
        options: [
          'Graph shortest path',
          'Contiguous subarray/substring problems',
          'Tree traversal',
          'Sorting',
        ],
        correctIndex: 1,
        explanation: 'Sliding window efficiently solves problems about contiguous sequences with a constraint (max sum, longest substring, etc.).',
      },
      {
        id: 'dsa-qz-3',
        question: 'Union-Find time complexity with path compression:',
        options: ['O(n)', 'O(log n)', 'O(α(n)) ≈ O(1)', 'O(n²)'],
        correctIndex: 2,
        explanation: 'With path compression and union by rank, Union-Find operations are nearly O(1) amortized (inverse Ackermann).',
      },
    ],
  };
  return quizzes[moduleId] ?? [];
}

export function getDailyPlan(weekNumber: number) {
  const plans: Record<number, { title: string; tasks: { type: string; label: string; link: string; duration: string }[] }> = {
    1: {
      title: 'Week 1: Python Async & Concurrency',
      tasks: [
        { type: 'learn', label: 'CS Fundamentals — Process vs Thread', link: '/module/cs-fundamentals', duration: '45 min' },
        { type: 'learn', label: 'Python — GIL & Memory Management', link: '/module/python', duration: '60 min' },
        { type: 'learn', label: 'Python — Asyncio Deep Dive', link: '/module/python', duration: '60 min' },
        { type: 'practice', label: 'Flashcards — Python questions', link: '/flashcards', duration: '20 min' },
        { type: 'quiz', label: 'Python Module Quiz', link: '/quiz/python', duration: '15 min' },
      ],
    },
    2: {
      title: 'Week 2: FastAPI Production',
      tasks: [
        { type: 'learn', label: 'FastAPI — ASGI & async vs sync', link: '/module/fastapi', duration: '45 min' },
        { type: 'learn', label: 'FastAPI — API Design & Pagination', link: '/module/fastapi', duration: '45 min' },
        { type: 'learn', label: 'FastAPI — Circuit Breakers & Production', link: '/module/fastapi', duration: '45 min' },
        { type: 'practice', label: 'Mock Interview — 3 questions', link: '/mock-interview', duration: '30 min' },
        { type: 'quiz', label: 'FastAPI Module Quiz', link: '/quiz/fastapi', duration: '15 min' },
      ],
    },
    3: {
      title: 'Week 3: SQL & Databases',
      tasks: [
        { type: 'learn', label: 'SQL — Indexes & EXPLAIN ANALYZE', link: '/module/sql', duration: '60 min' },
        { type: 'learn', label: 'Databases — PostgreSQL MVCC & Redis', link: '/module/databases', duration: '45 min' },
        { type: 'learn', label: 'Concurrency — Worker Pools', link: '/module/concurrency', duration: '30 min' },
        { type: 'practice', label: 'Flashcards — SQL & DB questions', link: '/flashcards', duration: '20 min' },
        { type: 'quiz', label: 'SQL Module Quiz', link: '/quiz/sql', duration: '15 min' },
      ],
    },
    4: {
      title: 'Week 4: DSA Patterns',
      tasks: [
        { type: 'learn', label: 'DSA — Sliding Window & Two Pointers', link: '/module/dsa', duration: '60 min' },
        { type: 'learn', label: 'DSA — Graphs & Dynamic Programming', link: '/module/dsa', duration: '60 min' },
        { type: 'practice', label: 'Solve 2 LeetCode mediums', link: '/module/dsa', duration: '60 min' },
        { type: 'quiz', label: 'DSA Module Quiz', link: '/quiz/dsa', duration: '15 min' },
      ],
    },
    5: {
      title: 'Week 5: System Design',
      tasks: [
        { type: 'learn', label: 'System Design — Framework & Concepts', link: '/module/system-design', duration: '45 min' },
        { type: 'practice', label: 'Walkthrough: URL Shortener', link: '/system-design-practice/url-shortener', duration: '45 min' },
        { type: 'practice', label: 'Walkthrough: Rate Limiter', link: '/system-design-practice/rate-limiter', duration: '30 min' },
        { type: 'practice', label: 'Mock Interview — System design', link: '/mock-interview', duration: '45 min' },
      ],
    },
    6: {
      title: 'Week 6: Networking & Security',
      tasks: [
        { type: 'learn', label: 'Networking — DNS, TLS, Load Balancing', link: '/module/networking', duration: '45 min' },
        { type: 'learn', label: 'Security — JWT, OWASP, API Security', link: '/module/security', duration: '45 min' },
        { type: 'learn', label: 'Distributed Systems — Failure Modes', link: '/module/distributed-systems', duration: '45 min' },
        { type: 'practice', label: 'Flashcards — Security & Networking', link: '/flashcards', duration: '20 min' },
      ],
    },
    7: {
      title: 'Week 7: Senior Scenarios',
      tasks: [
        { type: 'learn', label: 'Senior Engineering — Mindset', link: '/module/senior-engineering', duration: '30 min' },
        { type: 'learn', label: 'Microservices & Message Queues', link: '/module/microservices', duration: '45 min' },
        { type: 'practice', label: 'Mock Interview — Full session (5 questions)', link: '/mock-interview', duration: '60 min' },
        { type: 'practice', label: 'Behavioral — Prepare STAR stories', link: '/module/behavioral', duration: '30 min' },
      ],
    },
    8: {
      title: 'Week 8: Mock Interviews & Review',
      tasks: [
        { type: 'practice', label: 'Mock Interview — Full session', link: '/mock-interview', duration: '60 min' },
        { type: 'practice', label: 'System Design — Notification System', link: '/system-design-practice/notification-system', duration: '45 min' },
        { type: 'review', label: 'Review bookmarked questions', link: '/dashboard', duration: '30 min' },
        { type: 'review', label: 'Flashcards — All senior questions', link: '/flashcards', duration: '30 min' },
        { type: 'review', label: 'Dashboard — Check weak areas', link: '/dashboard', duration: '15 min' },
      ],
    },
  };
  return plans[weekNumber] ?? plans[1];
}

export function getAllDailyWeeks() {
  return Array.from({ length: 8 }, (_, i) => getDailyPlan(i + 1));
}

export interface FlashcardItem {
  id: string;
  module: Module;
  question: Question;
}

export function getAllFlashcards(): FlashcardItem[] {
  const cards: FlashcardItem[] = [];
  for (const module of allModules) {
    for (const question of module.questions) {
      cards.push({
        id: `${module.id}-${question.id}`,
        module,
        question,
      });
    }
  }
  return cards;
}

export function shuffleCards<T>(cards: T[]): T[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export interface MockInterviewQuestion {
  id: string;
  module: Module;
  type: 'question' | 'scenario';
  title: string;
  prompt: string;
  answer: string;
  keyPoints?: string[];
  timeMinutes: number;
}

export function getMockInterviewPool(): MockInterviewQuestion[] {
  const pool: MockInterviewQuestion[] = [];
  for (const module of allModules) {
    for (const q of module.questions) {
      if (['architecture', 'tradeoffs', 'production', 'senior'].includes(q.level)) {
        pool.push({
          id: `q-${module.id}-${q.id}`,
          module,
          type: 'question',
          title: q.question,
          prompt: q.question,
          answer: q.answer,
          keyPoints: q.keyPoints,
          timeMinutes: q.level === 'senior' ? 15 : 10,
        });
      }
    }
    for (const s of module.seniorScenarios) {
      pool.push({
        id: `s-${module.id}-${s.title}`,
        module,
        type: 'scenario',
        title: s.title,
        prompt: s.scenario,
        answer: s.approach,
        keyPoints: s.keyConsiderations,
        timeMinutes: 20,
      });
    }
  }
  return pool;
}

export function pickMockInterviewSet(count = 5): MockInterviewQuestion[] {
  const pool = [...getMockInterviewPool()];
  return shuffleCards(pool).slice(0, count);
}
