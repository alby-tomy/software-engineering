import { useState, useEffect, useCallback } from 'react';

const CAPSTONE_KEY = 'interview-prep-capstone';

export function useCapstoneProgress() {
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(CAPSTONE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(CAPSTONE_KEY, JSON.stringify([...completed]));
  }, [completed]);

  const toggleStep = useCallback((stepId: string) => {
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  }, []);

  const isStepComplete = useCallback(
    (stepId: string) => completed.has(stepId),
    [completed]
  );

  const getProgress = useCallback(
    (totalSteps: number) => {
      return totalSteps > 0 ? Math.round((completed.size / totalSteps) * 100) : 0;
    },
    [completed]
  );

  return { completed, toggleStep, isStepComplete, getProgress };
}
