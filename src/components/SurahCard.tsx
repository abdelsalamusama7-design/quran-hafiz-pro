import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Surah } from '@/data/surahs';

interface SurahCardProps {
  surah: Surah;
}

const SurahCard = ({ surah }: SurahCardProps) => {
  const { lang, t, dir } = useLanguage();
  const { getSurahProgress } = useMemorization();
  const navigate = useNavigate();
  const progress = getSurahProgress(surah.id, surah.versesCount);
  const Arrow = dir === 'rtl' ? ChevronLeft : ChevronRight;

  return (
    <button
      onClick={() => navigate(`/surah/${surah.id}`)}
      className="w-full bg-card rounded-2xl p-3.5 md:p-4 flex items-center gap-3 md:gap-4 shadow-card hover:shadow-islamic transition-all active:scale-[0.98] border border-border/50 group"
    >
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm md:text-base shrink-0">
        {surah.id}
      </div>
      <div className="flex-1 text-start min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground font-arabic text-sm md:text-base">{surah.name}</h3>
          {lang === 'en' && <span className="text-xs text-muted-foreground">{surah.nameEn}</span>}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] md:text-xs text-muted-foreground">
            {surah.revelationType === 'meccan' ? t('meccan') : t('medinan')}
          </span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-[10px] md:text-xs text-muted-foreground">
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
      <Arrow className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
};

export default SurahCard;
