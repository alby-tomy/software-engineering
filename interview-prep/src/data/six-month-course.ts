import type { SixMonthCourse } from '../types/curriculum';

export const sixMonthCourse: SixMonthCourse = {
  id: 'six-month-mastery',
  title: '6-Month Software Engineering Mastery',
  description:
    'A complete university-style bootcamp: foundations → backend → production → system design → generative & agentic AI → senior interview readiness. Study ~12–15 hours/week.',
  totalWeeks: 24,
  hoursPerWeek: '12–15 hours',
  targetOutcome:
    'Senior software engineer ready for backend, full-stack, or AI-engineering roles — with deep reasoning, not memorization.',
  phases: [
    {
      month: 1,
      title: 'Month 1 — Foundations',
      theme: 'How computers work + Python mastery',
      description:
        'Build mental models for memory, processes, and concurrency. Master Python from syntax through async — the language backbone for backend and AI engineering.',
      goals: [
        'Explain process vs thread, stack vs heap, and virtual memory',
        'Write idiomatic Python with types, decorators, and async/await',
        'Choose threading vs asyncio vs multiprocessing with reasoning',
      ],
      weeks: [
        {
          week: 1,
          title: 'Computer Science Fundamentals',
          focus: 'What happens when code runs on a machine',
          moduleIds: ['cs-fundamentals'],
        },
        {
          week: 2,
          title: 'Python Core & Type System',
          focus: 'Syntax, data structures, OOP, type hints',
          moduleIds: ['python'],
        },
        {
          week: 3,
          title: 'Python Memory & GIL',
          focus: 'Reference counting, GIL, when threads help',
          moduleIds: ['python', 'concurrency'],
        },
        {
          week: 4,
          title: 'Async Python & Concurrency',
          focus: 'asyncio, worker pools, backpressure',
          moduleIds: ['python', 'concurrency', 'design-patterns'],
        },
      ],
    },
    {
      month: 2,
      title: 'Month 2 — Algorithms & Data',
      theme: 'DSA patterns + SQL + databases',
      description:
        'Daily algorithm practice with patterns (not grinding). SQL and database internals for every backend interview.',
      goals: [
        'Apply 10+ DSA patterns under interview time pressure',
        'Write optimized SQL with indexes and explain EXPLAIN output',
        'Design caching and replication strategies with PostgreSQL + Redis',
      ],
      weeks: [
        {
          week: 5,
          title: 'DSA — Complexity & Patterns',
          focus: 'Big-O, sliding window, two pointers, hash maps',
          moduleIds: ['dsa'],
        },
        {
          week: 6,
          title: 'DSA — Graphs, Trees & DP',
          focus: 'BFS/DFS, tree problems, dynamic programming',
          moduleIds: ['dsa'],
        },
        {
          week: 7,
          title: 'SQL Mastery',
          focus: 'JOINs, indexes, window functions, transactions',
          moduleIds: ['sql'],
        },
        {
          week: 8,
          title: 'Databases & NoSQL',
          focus: 'PostgreSQL MVCC, Redis, MongoDB, Elasticsearch',
          moduleIds: ['databases', 'mongodb', 'elasticsearch'],
        },
      ],
    },
    {
      month: 3,
      title: 'Month 3 — Backend & APIs',
      theme: 'FastAPI, REST, and modern API design',
      description:
        'Build production-grade APIs. Learn when to use REST, GraphQL, and gRPC. Optional full-stack week with React.',
      goals: [
        'Build async FastAPI services with auth, validation, and observability',
        'Design REST APIs with versioning, pagination, and idempotency',
        'Compare REST vs GraphQL vs gRPC trade-offs',
      ],
      weeks: [
        {
          week: 9,
          title: 'FastAPI Production',
          focus: 'ASGI, dependency injection, async DB, circuit breakers',
          moduleIds: ['fastapi'],
        },
        {
          week: 10,
          title: 'API Design & Protocols',
          focus: 'REST, GraphQL, gRPC, design patterns',
          moduleIds: ['rest-api', 'graphql', 'grpc', 'design-patterns'],
        },
        {
          week: 11,
          title: 'React Fundamentals',
          focus: 'Hooks, state, component architecture',
          moduleIds: ['react'],
        },
        {
          week: 12,
          title: 'Next.js & Full-Stack',
          focus: 'SSR, API routes, full-stack integration',
          moduleIds: ['nextjs', 'fastapi'],
        },
      ],
    },
    {
      month: 4,
      title: 'Month 4 — Production Engineering',
      theme: 'Ship code safely at scale',
      description:
        'Networking, containers, CI/CD, Kubernetes, cloud, security, and observability — what separates junior from senior.',
      goals: [
        'Trace a request through DNS, TCP, TLS, and HTTP',
        'Use Git branching workflows, PRs, and CI/CD pipelines to ship code safely',
        'Containerize apps and deploy with Docker + Kubernetes',
        'Implement security checklist and production observability',
      ],
      weeks: [
        {
          week: 13,
          title: 'Version Control & Git Workflows',
          focus: 'Git fundamentals, branching, PRs, merge/rebase, recovery',
          moduleIds: ['git'],
        },
        {
          week: 14,
          title: 'Docker & CI/CD DevOps',
          focus: 'Containers, GitHub Actions, deployment strategies, IaC',
          moduleIds: ['docker', 'cicd'],
        },
        {
          week: 15,
          title: 'Networking, Linux & Cloud',
          focus: 'HTTP lifecycle, DNS, TLS, Linux debugging, AWS/GCP',
          moduleIds: ['networking', 'linux', 'cloud'],
        },
        {
          week: 16,
          title: 'Kubernetes & Production Quality',
          focus: 'K8s operations, testing, security, observability',
          moduleIds: ['kubernetes', 'testing', 'security', 'observability', 'performance'],
        },
      ],
    },
    {
      month: 5,
      title: 'Month 5 — System Design',
      theme: 'Architect distributed systems',
      description:
        'The core of senior interviews. Design URL shorteners through Netflix-scale systems. Microservices, queues, and failure modes.',
      goals: [
        'Apply 45-minute system design framework confidently',
        'Design feeds, chat, payments, and event pipelines',
        'Explain CAP, consistency models, and distributed failure modes',
      ],
      weeks: [
        {
          week: 17,
          title: 'System Design Framework',
          focus: 'Requirements, estimation, caching, scaling',
          moduleIds: ['system-design'],
        },
        {
          week: 18,
          title: 'Intermediate Designs',
          focus: 'WhatsApp, Instagram, Uber, payments',
          moduleIds: ['system-design'],
        },
        {
          week: 19,
          title: 'Distributed Systems',
          focus: 'CAP, replication, message queues, event-driven',
          moduleIds: ['distributed-systems', 'microservices', 'message-queues', 'event-driven'],
        },
        {
          week: 20,
          title: 'Performance at Scale',
          focus: 'Profiling, load testing, optimization patterns',
          moduleIds: ['performance', 'go', 'cpp'],
        },
      ],
    },
    {
      month: 6,
      title: 'Month 6 — AI Engineering & Career',
      theme: 'Generative AI, agentic systems, and interview mastery',
      description:
        'Learn how LLMs, RAG, and AI agents work — then build them in production. Finish with behavioral prep and mock interviews.',
      goals: [
        'Explain transformers, embeddings, RAG, and agent architectures',
        'Build tool-using agents with evaluation and safety guardrails',
        'Pass senior technical + behavioral interviews with structured reasoning',
      ],
      weeks: [
        {
          week: 21,
          title: 'Generative AI Fundamentals',
          focus: 'LLMs, prompts, fine-tuning, model selection',
          moduleIds: ['generative-ai'],
        },
        {
          week: 22,
          title: 'RAG & Vector Search',
          focus: 'Embeddings, chunking, vector DBs, RAG evaluation',
          moduleIds: ['rag-embeddings'],
        },
        {
          week: 23,
          title: 'Agentic AI Systems',
          focus: 'Agents, tools, planning, multi-agent, MCP',
          moduleIds: ['agentic-ai'],
        },
        {
          week: 24,
          title: 'AI Production & Interviews',
          focus: 'Deploy AI apps, responsible AI, behavioral, mocks',
          moduleIds: ['ai-engineering', 'behavioral', 'senior-engineering'],
        },
      ],
    },
  ],
};

export function getCourseWeek(weekNumber: number) {
  for (const phase of sixMonthCourse.phases) {
    const week = phase.weeks.find((w) => w.week === weekNumber);
    if (week) return { phase, week };
  }
  return undefined;
}

export function getAllCourseWeeks() {
  return sixMonthCourse.phases.flatMap((p) => p.weeks);
}
