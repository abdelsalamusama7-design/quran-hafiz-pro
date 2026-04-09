import { useState, useEffect, useCallback } from 'react';

interface MemorizationState {
  memorizedVerses: Record<string, boolean>; // "surahId:verseNum" -> true
  streak: number;
  lastPracticeDate: string;
  totalMemorized: number;
}

const STORAGE_KEY = 'hafiz-memorization';

const getInitialState = (): MemorizationState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { memorizedVerses: {}, streak: 0, lastPracticeDate: '', totalMemorized: 0 };
};

export const useMemorization = () => {
  const [state, setState] = useState<MemorizationState>(getInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const toggleVerse = useCallback((surahId: number, verseNum: number) => {
    const key = `${surahId}:${verseNum}`;
    setState(prev => {
      const isMemorized = !prev.memorizedVerses[key];
      const newVerses = { ...prev.memorizedVerses };
      if (isMemorized) {
        newVerses[key] = true;
      } else {
        delete newVerses[key];
      }

      const today = new Date().toDateString();
      const newStreak = prev.lastPracticeDate === today
        ? prev.streak
        : prev.lastPracticeDate === new Date(Date.now() - 86400000).toDateString()
          ? prev.streak + 1
          : 1;

      return {
        memorizedVerses: newVerses,
        streak: newStreak,
        lastPracticeDate: today,
        totalMemorized: Object.keys(newVerses).length,
      };
    });
  }, []);

  const isVerseMemorized = useCallback((surahId: number, verseNum: number) => {
    return !!state.memorizedVerses[`${surahId}:${verseNum}`];
  }, [state.memorizedVerses]);

  const getSurahProgress = useCallback((surahId: number, totalVerses: number) => {
    let count = 0;
    for (let i = 1; i <= totalVerses; i++) {
      if (state.memorizedVerses[`${surahId}:${i}`]) count++;
    }
    return { memorized: count, total: totalVerses, percentage: totalVerses > 0 ? Math.round((count / totalVerses) * 100) : 0 };
  }, [state.memorizedVerses]);

  return { ...state, toggleVerse, isVerseMemorized, getSurahProgress };
};
