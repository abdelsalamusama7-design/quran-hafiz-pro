import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { surahs } from '@/data/surahs';
import { BookCheck, Flame, Target, TrendingUp } from 'lucide-react';

const ProgressPage = () => {
  const { t } = useLanguage();
  const { streak, totalMemorized, getSurahProgress } = useMemorization();

  const surahsWithProgress = surahs
    .map(s => ({ ...s, progress: getSurahProgress(s.id, s.versesCount) }))
    .filter(s => s.progress.memorized > 0)
    .sort((a, b) => b.progress.percentage - a.progress.percentage);

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6 font-arabic">{t('progress')}</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card rounded-xl p-4 shadow-islamic">
          <Flame className="text-orange-500 mb-2" size={22} />
          <p className="text-2xl font-bold text-foreground">{streak}</p>
          <p className="text-xs text-muted-foreground">{t('streak')}</p>
        </div>
        <div className="bg-card rounded-xl p-4 shadow-islamic">
          <BookCheck className="text-gold mb-2" size={22} />
          <p className="text-2xl font-bold text-foreground">{totalMemorized}</p>
          <p className="text-xs text-muted-foreground">{t('totalMemorized')}</p>
        </div>
      </div>

      {surahsWithProgress.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground font-arabic">{t('inProgress')}</h2>
          {surahsWithProgress.map(s => (
            <div key={s.id} className="bg-card rounded-xl p-4 shadow-islamic">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground font-arabic">{s.name}</h3>
                <span className="text-xs text-primary font-bold">{s.progress.percentage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${s.progress.percentage}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {s.progress.memorized} / {s.progress.total} {t('verses')}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <TrendingUp size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-arabic">{t('startMemorizing')}</p>
        </div>
      )}
    </div>
  );
};

export default ProgressPage;
