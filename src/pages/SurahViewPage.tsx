import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { surahs } from '@/data/surahs';
import { ArrowRight, ArrowLeft, Check, Volume2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Verse {
  number: number;
  text: string;
}

const SurahViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, dir } = useLanguage();
  const { isVerseMemorized, toggleVerse, getSurahProgress } = useMemorization();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);

  const surah = surahs.find(s => s.id === Number(id));
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!surah) return;
    setLoading(true);
    fetch(`https://api.alquran.cloud/v1/surah/${surah.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setVerses(data.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [surah]);

  if (!surah) return <div className="p-8 text-center text-muted-foreground">Surah not found</div>;

  const progress = getSurahProgress(surah.id, surah.versesCount);

  const playVerse = (verseNum: number) => {
    const audio = new Audio(`https://cdn.islamic.network/quran/audio/128/ar.alafasy/${verses.find(v => v.number === verseNum) ? surah.id * 1000 + verseNum : 1}.mp3`);
    audio.play().catch(() => {});
  };

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground mb-4 hover:text-foreground transition-colors">
        <BackArrow size={18} />
        <span className="text-sm">{t('back')}</span>
      </button>

      <div className="gradient-islamic rounded-2xl p-5 text-primary-foreground mb-6 shadow-islamic">
        <h1 className="text-2xl font-bold font-quran text-center mb-1">{surah.name}</h1>
        <p className="text-center text-sm opacity-80">{surah.nameEn} - {surah.nameTranslation}</p>
        <p className="text-center text-xs opacity-60 mt-1">{surah.versesCount} {t('verses')}</p>
        {progress.memorized > 0 && (
          <div className="mt-3">
            <div className="h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary-foreground/80 rounded-full transition-all" style={{ width: `${progress.percentage}%` }} />
            </div>
            <p className="text-center text-[10px] opacity-70 mt-1">{progress.percentage}% {t('memorized')}</p>
          </div>
        )}
      </div>

      <p className="text-center font-quran text-xl text-foreground mb-6">{t('bismillah')}</p>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="bg-card rounded-xl p-4 animate-pulse">
              <div className="h-6 bg-muted rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {verses.map(verse => {
            const memorized = isVerseMemorized(surah.id, verse.number);
            return (
              <div
                key={verse.number}
                className={`bg-card rounded-xl p-4 shadow-islamic transition-all ${memorized ? 'ring-2 ring-primary/30 bg-emerald-light' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 mt-1">
                    {verse.number}
                  </span>
                  <p className="flex-1 font-quran text-xl leading-[2.2] text-foreground text-end" dir="rtl">
                    {verse.text}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3 justify-end">
                  <button
                    onClick={() => playVerse(verse.number)}
                    className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={t('listen')}
                  >
                    <Volume2 size={14} />
                  </button>
                  <button
                    onClick={() => toggleVerse(surah.id, verse.number)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      memorized
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    <Check size={12} />
                    {memorized ? t('memorized') : t('markMemorized')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SurahViewPage;
