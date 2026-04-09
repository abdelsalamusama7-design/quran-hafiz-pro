import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { useNavigate } from 'react-router-dom';
import type { Surah } from '@/data/surahs';

interface SurahCardProps {
  surah: Surah;
}

const SurahCard = ({ surah }: SurahCardProps) => {
  const { lang, t } = useLanguage();
  const { getSurahProgress } = useMemorization();
  const navigate = useNavigate();
  const progress = getSurahProgress(surah.id, surah.versesCount);

  return (
    <button
      onClick={() => navigate(`/surah/${surah.id}`)}
      className="w-full bg-card rounded-xl p-4 flex items-center gap-4 shadow-islamic hover:shadow-lg transition-all active:scale-[0.98]"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
        {surah.id}
      </div>
      <div className="flex-1 text-start min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground font-arabic">{surah.name}</h3>
          {lang === 'en' && <span className="text-xs text-muted-foreground">{surah.nameEn}</span>}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-muted-foreground">
            {surah.revelationType === 'meccan' ? t('meccan') : t('medinan')}
          </span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-[10px] text-muted-foreground">
            {surah.versesCount} {t('verses')}
          </span>
        </div>
        {progress.memorized > 0 && (
          <div className="mt-2">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </button>
  );
};

export default SurahCard;
