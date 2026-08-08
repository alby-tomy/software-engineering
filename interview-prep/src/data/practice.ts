import { allModules } from '../data/modules';
import type { Module, Question } from '../types/curriculum';

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

export function getFlashcardsByModule(moduleId: string): FlashcardItem[] {
  return getAllFlashcards().filter((c) => c.module.id === moduleId);
}

export function getFlashcardsByLevel(level: Question['level']): FlashcardItem[] {
  return getAllFlashcards().filter((c) => c.question.level === level);
}

export function shuffleCards(cards: FlashcardItem[]): FlashcardItem[] {
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
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
