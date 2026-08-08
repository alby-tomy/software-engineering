import { csFundamentals } from './cs-fundamentals';
import { python } from './python';
import { fastapi } from './fastapi';
import { dsa } from './dsa';
import { sql } from './sql';
import { systemDesign } from './system-design';
import {
  concurrency,
  messageQueues,
  microservices,
  designPatterns,
  behavioral,
  grpc,
  cicd,
  eventDriven,
  mongodb,
  elasticsearch,
} from './new-topics';
import {
  databases,
  go,
  cpp,
  react,
  nextjs,
  restApi,
  graphql,
  networking,
  linux,
  git,
  docker,
  kubernetes,
  distributedSystems,
  security,
  testing,
  performance,
  observability,
  cloud,
  aiEngineering,
  seniorEngineering,
} from './remaining';
import type { Module } from '../../types/curriculum';

export const allModules: Module[] = [
  csFundamentals,
  python,
  concurrency,
  go,
  cpp,
  dsa,
  sql,
  databases,
  mongodb,
  elasticsearch,
  fastapi,
  designPatterns,
  restApi,
  graphql,
  grpc,
  react,
  nextjs,
  networking,
  linux,
  git,
  docker,
  cicd,
  kubernetes,
  cloud,
  systemDesign,
  microservices,
  messageQueues,
  eventDriven,
  distributedSystems,
  security,
  testing,
  performance,
  observability,
  aiEngineering,
  behavioral,
  seniorEngineering,
];

export const modulesById: Record<string, Module> = Object.fromEntries(
  allModules.map((m) => [m.id, m])
);

export function getModule(id: string): Module | undefined {
  return modulesById[id];
}

export function searchModules(query: string): Module[] {
  const q = query.toLowerCase();
  return allModules.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.sections.some((s) => s.title.toLowerCase().includes(q) || s.content.toLowerCase().includes(q)) ||
      m.questions.some((question) => question.question.toLowerCase().includes(q) || question.answer.toLowerCase().includes(q))
  );
}

export function searchQuestions(query: string) {
  const q = query.toLowerCase();
  const results: { module: Module; question: Module['questions'][0] }[] = [];
  for (const module of allModules) {
    for (const question of module.questions) {
      if (
        question.question.toLowerCase().includes(q) ||
        question.answer.toLowerCase().includes(q)
      ) {
        results.push({ module, question });
      }
    }
  }
  return results;
}
