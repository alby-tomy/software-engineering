import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'interview-prep-progress';

export function useProgress() {
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
  }, [completed]);

  const toggleSection = useCallback((moduleId: string, sectionId: string) => {
    const key = `${moduleId}:${sectionId}`;
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const isSectionComplete = useCallback(
    (moduleId: string, sectionId: string) => completed.has(`${moduleId}:${sectionId}`),
    [completed]
  );

  const getModuleProgress = useCallback(
    (moduleId: string, totalSections: number) => {
      const done = [...completed].filter((k) => k.startsWith(`${moduleId}:`)).length;
      return totalSections > 0 ? Math.round((done / totalSections) * 100) : 0;
    },
    [completed]
  );

  const getTotalProgress = useCallback(
    (totalSections: number) => {
      return totalSections > 0 ? Math.round((completed.size / totalSections) * 100) : 0;
    },
    [completed]
  );

  return { completed, toggleSection, isSectionComplete, getModuleProgress, getTotalProgress };
}
