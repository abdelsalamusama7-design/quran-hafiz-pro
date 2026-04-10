import { useState, useEffect, useCallback } from 'react';

interface Badge {
  id: string;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  icon: string;
  condition: (stats: GamificationState) => boolean;
}

export interface GamificationState {
  points: number;
  level: number;
  streak: number;
  totalVersesMemorized: number;
  quizzesTaken: number;
  dailyChallengeCompleted: boolean;
  lastDailyChallengeDate: string;
  earnedBadges: string[];
}

const STORAGE_KEY = 'hafiz-gamification';

const badges: Badge[] = [
  { id: 'first_verse', nameAr: 'أول آية', nameEn: 'First Verse', descAr: 'حفظت أول آية', descEn: 'Memorized your first verse', icon: '🌟', condition: s => s.totalVersesMemorized >= 1 },
  { id: 'ten_verses', nameAr: 'عشر آيات', nameEn: 'Ten Verses', descAr: 'حفظت 10 آيات', descEn: 'Memorized 10 verses', icon: '⭐', condition: s => s.totalVersesMemorized >= 10 },
  { id: 'fifty_verses', nameAr: 'خمسون آية', nameEn: 'Fifty Verses', descAr: 'حفظت 50 آية', descEn: 'Memorized 50 verses', icon: '🏆', condition: s => s.totalVersesMemorized >= 50 },
  { id: 'hundred_verses', nameAr: 'مئة آية', nameEn: '100 Verses', descAr: 'حفظت 100 آية', descEn: 'Memorized 100 verses', icon: '👑', condition: s => s.totalVersesMemorized >= 100 },
  { id: 'streak_3', nameAr: '3 أيام متتالية', nameEn: '3-Day Streak', descAr: 'حافظت على 3 أيام متتالية', descEn: '3-day streak', icon: '🔥', condition: s => s.streak >= 3 },
  { id: 'streak_7', nameAr: 'أسبوع كامل', nameEn: 'Full Week', descAr: '7 أيام متتالية', descEn: '7-day streak', icon: '💪', condition: s => s.streak >= 7 },
  { id: 'streak_30', nameAr: 'شهر كامل', nameEn: 'Full Month', descAr: '30 يوم متتالي', descEn: '30-day streak', icon: '🌙', condition: s => s.streak >= 30 },
  { id: 'quiz_master', nameAr: 'خبير الاختبارات', nameEn: 'Quiz Master', descAr: 'أكملت 10 اختبارات', descEn: 'Completed 10 quizzes', icon: '🎓', condition: s => s.quizzesTaken >= 10 },
  { id: 'level_5', nameAr: 'المستوى الخامس', nameEn: 'Level 5', descAr: 'وصلت للمستوى 5', descEn: 'Reached level 5', icon: '🎖️', condition: s => s.level >= 5 },
  { id: 'points_1000', nameAr: '1000 نقطة', nameEn: '1000 Points', descAr: 'جمعت 1000 نقطة', descEn: 'Earned 1000 points', icon: '💎', condition: s => s.points >= 1000 },
];

const getInitialState = (): GamificationState => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    points: 0,
    level: 1,
    streak: 0,
    totalVersesMemorized: 0,
    quizzesTaken: 0,
    dailyChallengeCompleted: false,
    lastDailyChallengeDate: '',
    earnedBadges: [],
  };
};

export const useGamification = () => {
  const [state, setState] = useState<GamificationState>(getInitialState);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addPoints = useCallback((amount: number) => {
    setState(prev => {
      const newPoints = prev.points + amount;
      const newLevel = Math.floor(newPoints / 200) + 1;
      return { ...prev, points: newPoints, level: newLevel };
    });
  }, []);

  const syncWithMemorization = useCallback((totalVerses: number, streak: number) => {
    setState(prev => {
      const updated = { ...prev, totalVersesMemorized: totalVerses, streak };
      // Check for new badges
      const newBadges = badges
        .filter(b => b.condition(updated) && !updated.earnedBadges.includes(b.id))
        .map(b => b.id);
      if (newBadges.length > 0) {
        updated.earnedBadges = [...updated.earnedBadges, ...newBadges];
        updated.points += newBadges.length * 50;
        updated.level = Math.floor(updated.points / 200) + 1;
      }
      return updated;
    });
  }, []);

  const completeDailyChallenge = useCallback(() => {
    const today = new Date().toDateString();
    setState(prev => {
      if (prev.lastDailyChallengeDate === today) return prev;
      return {
        ...prev,
        dailyChallengeCompleted: true,
        lastDailyChallengeDate: today,
        points: prev.points + 25,
        level: Math.floor((prev.points + 25) / 200) + 1,
      };
    });
  }, []);

  const completeQuiz = useCallback(() => {
    setState(prev => ({
      ...prev,
      quizzesTaken: prev.quizzesTaken + 1,
      points: prev.points + 15,
      level: Math.floor((prev.points + 15) / 200) + 1,
    }));
  }, []);

  const getAllBadges = useCallback(() => badges, []);
  const getEarnedBadges = useCallback(() => badges.filter(b => state.earnedBadges.includes(b.id)), [state.earnedBadges]);
  const getPointsToNextLevel = useCallback(() => ((state.level) * 200) - state.points, [state.level, state.points]);

  return {
    ...state,
    addPoints,
    syncWithMemorization,
    completeDailyChallenge,
    completeQuiz,
    getAllBadges,
    getEarnedBadges,
    getPointsToNextLevel,
  };
};
