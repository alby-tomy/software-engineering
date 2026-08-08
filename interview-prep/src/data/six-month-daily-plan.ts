import { capstoneSteps } from './capstone-steps';

export interface DailyTask {
  type: 'learn' | 'practice' | 'quiz' | 'review' | 'project';
  label: string;
  link: string;
  duration: string;
}

export interface WeeklyPlan {
  week: number;
  month: number;
  title: string;
  tasks: DailyTask[];
}

export const sixMonthDailyPlans: WeeklyPlan[] = [
  {
    week: 1, month: 1, title: 'Week 1: Computer Science Fundamentals',
    tasks: [
      { type: 'learn', label: 'CS — Program execution & memory model', link: '/module/cs-fundamentals', duration: '60 min' },
      { type: 'learn', label: 'CS — Process vs thread deep dive', link: '/module/cs-fundamentals', duration: '45 min' },
      { type: 'practice', label: 'Watch CS concept videos', link: '/videos', duration: '30 min' },
      { type: 'quiz', label: 'Flashcards — CS fundamentals', link: '/flashcards', duration: '20 min' },
    ],
  },
  {
    week: 2, month: 1, title: 'Week 2: Python Core',
    tasks: [
      { type: 'learn', label: 'Python — Memory management & mutability', link: '/module/python', duration: '60 min' },
      { type: 'learn', label: 'Python — Type hints & fundamentals', link: '/module/python', duration: '45 min' },
      { type: 'practice', label: 'Python module quiz', link: '/quiz/python', duration: '15 min' },
      { type: 'practice', label: 'Flashcards — Python', link: '/flashcards', duration: '20 min' },
    ],
  },
  {
    week: 3, month: 1, title: 'Week 3: Python GIL & Concurrency Intro',
    tasks: [
      { type: 'learn', label: 'Python — GIL & when it matters', link: '/module/python', duration: '45 min' },
      { type: 'learn', label: 'Concurrency — Models compared', link: '/module/concurrency', duration: '45 min' },
      { type: 'learn', label: 'Design patterns — Creational & structural', link: '/module/design-patterns', duration: '30 min' },
      { type: 'practice', label: 'Benchmark threading vs multiprocessing', link: '/module/python', duration: '45 min' },
    ],
  },
  {
    week: 4, month: 1, title: 'Week 4: Async Python',
    tasks: [
      { type: 'learn', label: 'Python — Asyncio deep dive', link: '/module/python', duration: '60 min' },
      { type: 'learn', label: 'Concurrency — Worker pools & backpressure', link: '/module/concurrency', duration: '45 min' },
      { type: 'practice', label: 'Mock interview — 2 Python questions', link: '/mock-interview', duration: '30 min' },
      { type: 'review', label: 'Month 1 review — Dashboard progress', link: '/dashboard', duration: '15 min' },
    ],
  },
  {
    week: 5, month: 2, title: 'Week 5: DSA Patterns',
    tasks: [
      { type: 'learn', label: 'DSA — Complexity analysis', link: '/module/dsa', duration: '45 min' },
      { type: 'learn', label: 'DSA — Core patterns (sliding window, two pointers)', link: '/module/dsa', duration: '60 min' },
      { type: 'practice', label: 'Solve 2 LeetCode mediums', link: '/module/dsa', duration: '60 min' },
      { type: 'quiz', label: 'DSA module quiz', link: '/quiz/dsa', duration: '15 min' },
    ],
  },
  {
    week: 6, month: 2, title: 'Week 6: Graphs, Trees & DP',
    tasks: [
      { type: 'learn', label: 'DSA — Graph algorithms', link: '/module/dsa', duration: '60 min' },
      { type: 'learn', label: 'DSA — Dynamic programming patterns', link: '/module/dsa', duration: '60 min' },
      { type: 'practice', label: 'Solve 2 graph/DP problems', link: '/module/dsa', duration: '60 min' },
      { type: 'practice', label: 'Flashcards — DSA', link: '/flashcards', duration: '20 min' },
    ],
  },
  {
    week: 7, month: 2, title: 'Week 7: SQL Mastery',
    tasks: [
      { type: 'learn', label: 'SQL — Fundamentals & JOINs', link: '/module/sql', duration: '60 min' },
      { type: 'learn', label: 'SQL — Indexes & EXPLAIN ANALYZE', link: '/module/sql', duration: '45 min' },
      { type: 'learn', label: 'SQL — Transactions & ACID', link: '/module/sql', duration: '45 min' },
      { type: 'quiz', label: 'SQL module quiz', link: '/quiz/sql', duration: '15 min' },
    ],
  },
  {
    week: 8, month: 2, title: 'Week 8: Databases & NoSQL',
    tasks: [
      { type: 'learn', label: 'Databases — PostgreSQL MVCC & Redis', link: '/module/databases', duration: '60 min' },
      { type: 'learn', label: 'MongoDB — Document modeling', link: '/module/mongodb', duration: '45 min' },
      { type: 'learn', label: 'Elasticsearch — Search fundamentals', link: '/module/elasticsearch', duration: '30 min' },
      { type: 'review', label: 'Month 2 review — weak areas', link: '/dashboard', duration: '20 min' },
    ],
  },
  {
    week: 9, month: 3, title: 'Week 9: FastAPI Production',
    tasks: [
      { type: 'learn', label: 'FastAPI — ASGI & async endpoints', link: '/module/fastapi', duration: '45 min' },
      { type: 'learn', label: 'FastAPI — Dependency injection & API design', link: '/module/fastapi', duration: '60 min' },
      { type: 'learn', label: 'FastAPI — Production patterns', link: '/module/fastapi', duration: '45 min' },
      { type: 'quiz', label: 'FastAPI module quiz', link: '/quiz/fastapi', duration: '15 min' },
    ],
  },
  {
    week: 10, month: 3, title: 'Week 10: API Design & Protocols',
    tasks: [
      { type: 'learn', label: 'REST API — HTTP deep dive', link: '/module/rest-api', duration: '45 min' },
      { type: 'learn', label: 'GraphQL — Schema & resolvers', link: '/module/graphql', duration: '45 min' },
      { type: 'learn', label: 'gRPC — Protocol buffers & streaming', link: '/module/grpc', duration: '30 min' },
      { type: 'practice', label: 'Mock interview — API design', link: '/mock-interview', duration: '30 min' },
    ],
  },
  {
    week: 11, month: 3, title: 'Week 11: React Fundamentals',
    tasks: [
      { type: 'learn', label: 'React — Hooks & state management', link: '/module/react', duration: '60 min' },
      { type: 'practice', label: 'Build a small React component library', link: '/module/react', duration: '90 min' },
      { type: 'practice', label: 'Watch React concept videos', link: '/videos', duration: '30 min' },
    ],
  },
  {
    week: 12, month: 3, title: 'Week 12: Next.js & Full-Stack',
    tasks: [
      { type: 'learn', label: 'Next.js — SSR, routing, API routes', link: '/module/nextjs', duration: '60 min' },
      { type: 'project', label: 'Project: Full-stack app (FastAPI + Next.js)', link: '/module/fastapi', duration: '2 hours' },
      { type: 'review', label: 'Month 3 review', link: '/dashboard', duration: '15 min' },
    ],
  },
  {
    week: 13, month: 4, title: 'Week 13: Version Control & Git Workflows',
    tasks: [
      { type: 'learn', label: 'Git — Fundamentals & how version control works', link: '/module/git', duration: '60 min' },
      { type: 'learn', label: 'Git — Collaboration, PRs & code review', link: '/module/git', duration: '45 min' },
      { type: 'learn', label: 'Git — Branching strategies (trunk-based vs Gitflow)', link: '/module/git', duration: '45 min' },
      { type: 'practice', label: 'Watch Git concept videos', link: '/videos', duration: '30 min' },
      { type: 'quiz', label: 'Git module quiz', link: '/quiz/git', duration: '15 min' },
    ],
  },
  {
    week: 14, month: 4, title: 'Week 14: Docker & CI/CD DevOps',
    tasks: [
      { type: 'learn', label: 'DevOps — Culture, CALMS & DORA metrics', link: '/module/cicd', duration: '30 min' },
      { type: 'learn', label: 'CI/CD — Pipelines, GitHub Actions & secrets', link: '/module/cicd', duration: '60 min' },
      { type: 'learn', label: 'CI/CD — Deployment strategies & release management', link: '/module/cicd', duration: '45 min' },
      { type: 'learn', label: 'Docker — Fundamentals & optimization', link: '/module/docker', duration: '45 min' },
      { type: 'project', label: 'Dockerize your FastAPI app + write a CI workflow', link: '/module/cicd', duration: '60 min' },
    ],
  },
  {
    week: 15, month: 4, title: 'Week 15: Networking, Linux & Cloud',
    tasks: [
      { type: 'learn', label: 'Networking — Request lifecycle & DNS', link: '/module/networking', duration: '60 min' },
      { type: 'learn', label: 'Networking — TLS & protocols', link: '/module/networking', duration: '45 min' },
      { type: 'learn', label: 'Linux — Shell & debugging', link: '/module/linux', duration: '45 min' },
      { type: 'learn', label: 'Cloud — AWS/GCP patterns', link: '/module/cloud', duration: '45 min' },
    ],
  },
  {
    week: 16, month: 4, title: 'Week 16: Kubernetes & Production Quality',
    tasks: [
      { type: 'learn', label: 'Kubernetes — Core concepts', link: '/module/kubernetes', duration: '60 min' },
      { type: 'learn', label: 'Kubernetes — Production operations', link: '/module/kubernetes', duration: '45 min' },
      { type: 'learn', label: 'Testing — Pyramid & quality gates in CI', link: '/module/testing', duration: '30 min' },
      { type: 'learn', label: 'Security & Observability', link: '/module/security', duration: '45 min' },
      { type: 'review', label: 'Month 4 review — Dashboard progress', link: '/dashboard', duration: '15 min' },
    ],
  },
  {
    week: 17, month: 5, title: 'Week 17: System Design Framework',
    tasks: [
      { type: 'learn', label: 'System Design — Interview framework', link: '/module/system-design', duration: '60 min' },
      { type: 'learn', label: 'System Design — Core concepts', link: '/module/system-design', duration: '45 min' },
      { type: 'practice', label: 'Walkthrough: URL Shortener', link: '/system-design-practice/url-shortener', duration: '45 min' },
      { type: 'quiz', label: 'System Design quiz', link: '/quiz/system-design', duration: '15 min' },
    ],
  },
  {
    week: 18, month: 5, title: 'Week 18: Intermediate System Designs',
    tasks: [
      { type: 'learn', label: 'System Design — Level 2 problems', link: '/module/system-design', duration: '60 min' },
      { type: 'practice', label: 'Walkthrough: Rate Limiter', link: '/system-design-practice/rate-limiter', duration: '30 min' },
      { type: 'practice', label: 'Walkthrough: Notification System', link: '/system-design-practice/notification-system', duration: '45 min' },
      { type: 'practice', label: 'Mock interview — System design', link: '/mock-interview', duration: '45 min' },
    ],
  },
  {
    week: 19, month: 5, title: 'Week 19: Distributed Systems',
    tasks: [
      { type: 'learn', label: 'Distributed Systems — Consistency & CAP', link: '/module/distributed-systems', duration: '45 min' },
      { type: 'learn', label: 'Microservices — When & communication', link: '/module/microservices', duration: '45 min' },
      { type: 'learn', label: 'Message Queues — Kafka deep dive', link: '/module/message-queues', duration: '45 min' },
      { type: 'learn', label: 'Event-Driven — CQRS & event sourcing', link: '/module/event-driven', duration: '30 min' },
    ],
  },
  {
    week: 20, month: 5, title: 'Week 20: Performance Engineering',
    tasks: [
      { type: 'learn', label: 'Performance — Profiling & optimization', link: '/module/performance', duration: '45 min' },
      { type: 'learn', label: 'Go — Concurrency patterns', link: '/module/go', duration: '45 min' },
      { type: 'practice', label: 'Mock interview — Senior scenarios', link: '/mock-interview', duration: '60 min' },
      { type: 'review', label: 'Month 5 review', link: '/dashboard', duration: '15 min' },
    ],
  },
  {
    week: 21, month: 6, title: 'Week 21: Generative AI Fundamentals',
    tasks: [
      { type: 'learn', label: 'Generative AI — LLM basics & transformers', link: '/module/generative-ai', duration: '60 min' },
      { type: 'learn', label: 'Generative AI — Prompt engineering', link: '/module/generative-ai', duration: '45 min' },
      { type: 'learn', label: 'Generative AI — Model selection & fine-tuning', link: '/module/generative-ai', duration: '45 min' },
      { type: 'practice', label: 'Watch AI concept videos', link: '/videos', duration: '30 min' },
    ],
  },
  {
    week: 22, month: 6, title: 'Week 22: RAG & Vector Search',
    tasks: [
      { type: 'learn', label: 'RAG — Embeddings & similarity search', link: '/module/rag-embeddings', duration: '45 min' },
      { type: 'learn', label: 'RAG — Pipeline & chunking strategies', link: '/module/rag-embeddings', duration: '60 min' },
      { type: 'learn', label: 'RAG — Vector DBs & evaluation', link: '/module/rag-embeddings', duration: '45 min' },
      { type: 'project', label: 'Build a minimal RAG pipeline', link: '/module/rag-embeddings', duration: '2 hours' },
    ],
  },
  {
    week: 23, month: 6, title: 'Week 23: Agentic AI Systems',
    tasks: [
      { type: 'learn', label: 'Agentic AI — Agent fundamentals & tool use', link: '/module/agentic-ai', duration: '60 min' },
      { type: 'learn', label: 'Agentic AI — ReAct & multi-agent patterns', link: '/module/agentic-ai', duration: '45 min' },
      { type: 'learn', label: 'Agentic AI — MCP & production deployment', link: '/module/agentic-ai', duration: '45 min' },
      { type: 'project', label: 'Build a tool-using research agent', link: '/module/agentic-ai', duration: '2 hours' },
    ],
  },
  {
    week: 24, month: 6, title: 'Week 24: AI Production & Interview Mastery',
    tasks: [
      { type: 'learn', label: 'AI Engineering — Production & evals', link: '/module/ai-engineering', duration: '45 min' },
      { type: 'learn', label: 'AI Engineering — Responsible AI development', link: '/module/ai-engineering', duration: '30 min' },
      { type: 'learn', label: 'Behavioral — STAR method & stories', link: '/module/behavioral', duration: '45 min' },
      { type: 'practice', label: 'Full mock interview session', link: '/mock-interview', duration: '60 min' },
      { type: 'review', label: 'Course completion review', link: '/dashboard', duration: '30 min' },
    ],
  },
];

function withCapstoneTask(plan: WeeklyPlan): WeeklyPlan {
  const capstoneStep = capstoneSteps.find((s) => s.week === plan.week);
  if (!capstoneStep) return plan;
  if (plan.tasks.some((t) => t.link.startsWith('/capstone'))) return plan;
  return {
    ...plan,
    tasks: [
      ...plan.tasks,
      {
        type: 'project',
        label: `🚨 PulseGrid Week ${plan.week}: ${capstoneStep.title}`,
        link: `/capstone#week-${plan.week}`,
        duration: '90 min',
      },
    ],
  };
}

export function getSixMonthPlan(weekNumber: number): WeeklyPlan {
  const plan = sixMonthDailyPlans.find((p) => p.week === weekNumber) ?? sixMonthDailyPlans[0];
  return withCapstoneTask(plan);
}

export function getAllSixMonthWeeks(): WeeklyPlan[] {
  return sixMonthDailyPlans.map(withCapstoneTask);
}
