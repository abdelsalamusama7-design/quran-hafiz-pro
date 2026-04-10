import { useLanguage } from '@/contexts/LanguageContext';
import { useGamification } from '@/hooks/useGamification';
import { useMemorization } from '@/hooks/useMemorization';
import { Trophy, Star, Flame, Target, Zap } from 'lucide-react';
import { useEffect } from 'react';

const BadgesPage = () => {
  const { lang } = useLanguage();
  const { streak, totalMemorized } = useMemorization();
  const gamification = useGamification();

  useEffect(() => {
    gamification.syncWithMemorization(totalMemorized, streak);
  }, [totalMemorized, streak]);

  const allBadges = gamification.getAllBadges();
  const earned = gamification.getEarnedBadges();
  const pointsToNext = gamification.getPointsToNextLevel();

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground font-arabic">
        {lang === 'ar' ? '🏆 الإنجازات والتحفيز' : '🏆 Achievements'}
      </h1>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card rounded-xl p-4 text-center shadow-islamic">
          <Zap size={20} className="mx-auto mb-1 text-accent" />
          <p className="text-xl font-bold text-foreground">{gamification.points}</p>
          <p className="text-[9px] text-muted-foreground">{lang === 'ar' ? 'نقاط' : 'Points'}</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center shadow-islamic">
          <Star size={20} className="mx-auto mb-1 text-primary" />
          <p className="text-xl font-bold text-foreground">{gamification.level}</p>
          <p className="text-[9px] text-muted-foreground">{lang === 'ar' ? 'المستوى' : 'Level'}</p>
        </div>
        <div className="bg-card rounded-xl p-4 text-center shadow-islamic">
          <Flame size={20} className="mx-auto mb-1 text-orange-500" />
          <p className="text-xl font-bold text-foreground">{gamification.streak}</p>
          <p className="text-[9px] text-muted-foreground">{lang === 'ar' ? 'أيام متتالية' : 'Streak'}</p>
        </div>
      </div>

      {/* Level progress */}
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-foreground font-medium">{lang === 'ar' ? 'المستوى' : 'Level'} {gamification.level}</span>
          <span className="text-muted-foreground">{pointsToNext} {lang === 'ar' ? 'نقطة للمستوى التالي' : 'pts to next'}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
            style={{ width: `${((gamification.points % 200) / 200) * 100}%` }}
          />
        </div>
      </div>

      {/* Daily challenge */}
      <div className={`bg-card rounded-xl p-4 shadow-islamic ${gamification.dailyChallengeCompleted ? 'ring-2 ring-primary/30' : ''}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
            gamification.dailyChallengeCompleted ? 'bg-primary text-primary-foreground' : 'bg-accent/20'
          }`}>
            {gamification.dailyChallengeCompleted ? '✓' : '🎯'}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{lang === 'ar' ? 'التحدي اليومي' : 'Daily Challenge'}</p>
            <p className="text-xs text-muted-foreground">
              {gamification.dailyChallengeCompleted
                ? (lang === 'ar' ? 'تم الإنجاز! +25 نقطة' : 'Completed! +25 pts')
                : (lang === 'ar' ? 'احفظ 5 آيات اليوم' : 'Memorize 5 verses today')}
            </p>
          </div>
          {!gamification.dailyChallengeCompleted && (
            <Target size={18} className="text-accent" />
          )}
        </div>
      </div>

      {/* Badges */}
      <div>
        <h2 className="font-semibold text-foreground mb-3 font-arabic">
          {lang === 'ar' ? '🎖️ الشارات' : '🎖️ Badges'} ({earned.length}/{allBadges.length})
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {allBadges.map(badge => {
            const isEarned = gamification.earnedBadges.includes(badge.id);
            return (
              <div
                key={badge.id}
                className={`bg-card rounded-xl p-4 shadow-islamic text-center transition-all ${
                  isEarned ? 'ring-2 ring-primary/30' : 'opacity-50 grayscale'
                }`}
              >
                <div className="text-3xl mb-2">{badge.icon}</div>
                <p className="text-sm font-semibold text-foreground">{lang === 'ar' ? badge.nameAr : badge.nameEn}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{lang === 'ar' ? badge.descAr : badge.descEn}</p>
                {isEarned && (
                  <span className="inline-block mt-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-medium">
                    {lang === 'ar' ? 'مكتسب ✓' : 'Earned ✓'}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BadgesPage;
