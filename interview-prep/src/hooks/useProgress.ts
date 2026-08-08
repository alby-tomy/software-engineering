import { useState, useEffect, useCallback } from 'react';

const PROGRESS_KEY = 'interview-prep-progress';
const BOOKMARKS_KEY = 'interview-prep-bookmarks';
const STREAK_KEY = 'interview-prep-streak';
const QUIZ_SCORES_KEY = 'interview-prep-quiz-scores';

export interface StreakData {
  lastStudyDate: string;
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
}

export interface QuizScore {
  moduleId: string;
  score: number;
  total: number;
  date: string;
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadStreak(): StreakData {
  try {
    const stored = localStorage.getItem(STREAK_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { lastStudyDate: '', currentStreak: 0, longestStreak: 0, totalStudyDays: 0 };
}

export function useProgress() {
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(PROGRESS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [streak, setStreak] = useState<StreakData>(loadStreak);

  const [quizScores, setQuizScores] = useState<QuizScore[]>(() => {
    try {
      const stored = localStorage.getItem(QUIZ_SCORES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...completed]));
  }, [completed]);

  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...bookmarks]));
  }, [bookmarks]);

  useEffect(() => {
    localStorage.setItem(STREAK_KEY, JSON.stringify(streak));
  }, [streak]);

  useEffect(() => {
    localStorage.setItem(QUIZ_SCORES_KEY, JSON.stringify(quizScores));
  }, [quizScores]);

  const recordStudySession = useCallback(() => {
    const today = todayStr();
    setStreak((prev) => {
      if (prev.lastStudyDate === today) return prev;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().slice(0, 10);
      const continued = prev.lastStudyDate === yesterdayStr;
      const newStreak = continued ? prev.currentStreak + 1 : 1;
      return {
        lastStudyDate: today,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        totalStudyDays: prev.totalStudyDays + 1,
      };
    });
  }, []);

  const toggleSection = useCallback((moduleId: string, sectionId: string) => {
    const key = `${moduleId}:${sectionId}`;
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else {
        next.add(key);
        recordStudySession();
      }
      return next;
    });
  }, [recordStudySession]);

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

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isBookmarked = useCallback((id: string) => bookmarks.has(id), [bookmarks]);

  const saveQuizScore = useCallback((moduleId: string, score: number, total: number) => {
    setQuizScores((prev) => [
      ...prev.filter((q) => !(q.moduleId === moduleId && q.date === todayStr())),
      { moduleId, score, total, date: todayStr() },
    ]);
    recordStudySession();
  }, [recordStudySession]);

  const getQuizScore = useCallback(
    (moduleId: string) => quizScores.find((q) => q.moduleId === moduleId),
    [quizScores]
  );

  return {
    completed,
    bookmarks,
    streak,
    quizScores,
    toggleSection,
    isSectionComplete,
    getModuleProgress,
    getTotalProgress,
    toggleBookmark,
    isBookmarked,
    saveQuizScore,
    getQuizScore,
    recordStudySession,
  };
}
