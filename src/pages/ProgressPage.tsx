import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { surahs, totalVerses } from '@/data/surahs';
import { BookCheck, Flame, TrendingUp, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProgressPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { streak, totalMemorized, getSurahProgress } = useMemorization();

  const overallPercentage = totalVerses > 0 ? Math.round((totalMemorized / totalVerses) * 100) : 0;

  const surahsWithProgress = surahs
    .map(s => ({ ...s, progress: getSurahProgress(s.id, s.versesCount) }))
    .filter(s => s.progress.memorized > 0)
    .sort((a, b) => b.progress.percentage - a.progress.percentage);

  // Juz progress
  const juzProgress = Array.from({ length: 30 }, (_, i) => {
    const juzNum = i + 1;
    const juzSurahs = surahs.filter(s => s.juz.includes(juzNum));
    const totalVersesInJuz = juzSurahs.reduce((sum, s) => sum + s.versesCount, 0);
    const memorizedInJuz = juzSurahs.reduce((sum, s) => sum + getSurahProgress(s.id, s.versesCount).memorized, 0);
    const pct = totalVersesInJuz > 0 ? Math.round((memorizedInJuz / totalVersesInJuz) * 100) : 0;
    return { juz: juzNum, percentage: pct, memorized: memorizedInJuz, total: totalVersesInJuz };
  });

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6 font-arabic">{t('progress')}</h1>

      {/* Overall */}
      <div className="bg-card rounded-2xl p-5 shadow-islamic mb-6">
        <p className="text-sm text-muted-foreground mb-2">{t('overallProgress')}</p>
        <div className="flex items-end gap-3 mb-3">
          <span className="text-4xl font-bold text-foreground">{overallPercentage}%</span>
          <span className="text-sm text-muted-foreground mb-1">{totalMemorized} / {totalVerses} {t('versesMemorized')}</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${overallPercentage}%` }} />
        </div>
      </div>

      {/* Stats */}
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

      {/* Quran Map - Juz Grid */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Map size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground font-arabic">{t('quranMap')}</h2>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {juzProgress.map(j => (
            <div
              key={j.juz}
              className="aspect-square rounded-lg flex flex-col items-center justify-center text-[10px] transition-all relative overflow-hidden"
              style={{
                backgroundColor: j.percentage === 0
                  ? 'hsl(var(--muted))'
                  : j.percentage === 100
                    ? 'hsl(var(--primary))'
                    : `hsl(var(--primary) / ${0.15 + j.percentage * 0.0085})`,
                color: j.percentage > 50 ? 'hsl(var(--primary-foreground))' : 'hsl(var(--foreground))',
              }}
            >
              <span className="font-bold">{j.juz}</span>
              {j.percentage > 0 && <span className="text-[8px] opacity-80">{j.percentage}%</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Surah progress list */}
      {surahsWithProgress.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-semibold text-foreground font-arabic">{t('inProgress')}</h2>
          {surahsWithProgress.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/surah/${s.id}`)}
              className="w-full bg-card rounded-xl p-4 shadow-islamic text-start"
            >
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
            </button>
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
