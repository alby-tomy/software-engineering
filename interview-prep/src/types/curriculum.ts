export type QuestionLevel =
  | 'recall'
  | 'understanding'
  | 'application'
  | 'debugging'
  | 'optimization'
  | 'architecture'
  | 'tradeoffs'
  | 'production'
  | 'senior';

export type ModuleLevel = 'beginner' | 'intermediate' | 'advanced' | 'senior';

export interface CodeExample {
  title: string;
  language: string;
  code: string;
  explanation?: string;
}

export interface Question {
  id: string;
  level: QuestionLevel;
  question: string;
  answer: string;
  keyPoints?: string[];
  codeExample?: string;
}

export interface Section {
  id: string;
  title: string;
  content: string;
  codeExamples?: CodeExample[];
  practicalExercise?: string;
}

export interface SeniorScenario {
  title: string;
  scenario: string;
  approach: string;
  keyConsiderations: string[];
  followUpQuestions?: string[];
}

export interface Resource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'book' | 'practice' | 'documentation';
}

export interface VideoLesson {
  id: string;
  title: string;
  description: string;
  youtubeId: string;
  duration: string;
  channel: string;
  moduleId: string;
  concept: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  keyTakeaways: string[];
  detailedExplanation: string;
  watchOrder?: number;
}

export interface DetailedConcept {
  id: string;
  moduleId: string;
  title: string;
  summary: string;
  content: string;
  analogy?: string;
  realWorldExample?: string;
  commonMistakes?: string[];
  interviewTips?: string[];
  relatedVideoIds: string[];
}

export interface Module {
  id: string;
  title: string;
  stage: number;
  level: ModuleLevel;
  icon: string;
  description: string;
  prerequisites?: string[];
  learningObjectives: string[];
  estimatedHours: number;
  sections: Section[];
  questions: Question[];
  seniorScenarios: SeniorScenario[];
  resources: Resource[];
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  targetRole: string;
  duration: string;
  moduleIds: string[];
  milestones: { week: number; title: string; modules: string[] }[];
}

export interface Stage {
  id: number;
  title: string;
  description: string;
  targetLevel: string;
  moduleIds: string[];
}

export const QUESTION_LEVEL_LABELS: Record<QuestionLevel, string> = {
  recall: 'Level A — Recall',
  understanding: 'Level B — Understanding',
  application: 'Level C — Application',
  debugging: 'Level D — Debugging',
  optimization: 'Level E — Optimization',
  architecture: 'Level F — Architecture',
  tradeoffs: 'Level G — Trade-offs',
  production: 'Level H — Production',
  senior: 'Level I — Senior',
};

export const QUESTION_LEVEL_COLORS: Record<QuestionLevel, string> = {
  recall: '#22c55e',
  understanding: '#3b82f6',
  application: '#8b5cf6',
  debugging: '#f59e0b',
  optimization: '#ef4444',
  architecture: '#06b6d4',
  tradeoffs: '#ec4899',
  production: '#f97316',
  senior: '#dc2626',
};
