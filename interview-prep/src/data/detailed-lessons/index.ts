import { systemDesignLessons } from './system-design';
import { pythonLessons } from './python';
import { fastapiLessons } from './fastapi';
import { sqlLessons } from './sql';
import { csLessons } from './cs-fundamentals';
import { dsaLessons } from './dsa';
import { coreLessons } from './core-modules';
import { aiCurriculumLessons } from './ai-curriculum';

const allLessons: Record<string, string> = {
  ...systemDesignLessons,
  ...pythonLessons,
  ...fastapiLessons,
  ...sqlLessons,
  ...csLessons,
  ...dsaLessons,
  ...coreLessons,
  ...aiCurriculumLessons,
};

export function getDetailedLesson(moduleId: string, sectionId: string): string | undefined {
  return allLessons[`${moduleId}:${sectionId}`];
}

export function hasDetailedLesson(moduleId: string, sectionId: string): boolean {
  return `${moduleId}:${sectionId}` in allLessons;
}

export function getDetailedLessonCount(): number {
  return Object.keys(allLessons).length;
}
