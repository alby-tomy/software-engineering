import type { Module, Question, SeniorScenario, Section } from '../../types/curriculum';

interface ModuleTemplate {
  id: string;
  title: string;
  stage: number;
  level: Module['level'];
  icon: string;
  description: string;
  prerequisites?: string[];
  estimatedHours: number;
  learningObjectives: string[];
  sections: Section[];
  questions: Question[];
  seniorScenarios: SeniorScenario[];
  resources: { title: string; url: string; type: 'article' | 'video' | 'book' | 'practice' | 'documentation' }[];
}

export function createModule(template: ModuleTemplate): Module {
  return template;
}
