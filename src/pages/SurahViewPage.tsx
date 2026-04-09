import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { useAudio } from '@/contexts/AudioContext';
import { surahs } from '@/data/surahs';
import { ArrowRight, ArrowLeft, Check, Volume2, Eye, EyeOff, Play } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Verse {
  number: number;
  text: string;
}

const SurahViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, dir } = useLanguage();
  const { isVerseMemorized, toggleVerse, getSurahProgress } = useMemorization();
  const audio = useAudio();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);
  const [blindMode, setBli] = useState(false);
  const [revealedVerses, setRevealedVerses] = useState<Set<number>>(new Set());

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

  const toggleReveal = (verseNum: number) => {
    setRevealedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verseNum)) next.delete(verseNum);
      else next.add(verseNum);
      return next;
    });
  };

  const maskText = (text: string) => {
    const words = text.split(' ');
    return words.map((w, i) => (i % 3 === 1 ? '●●●' : w)).join(' ');
  };

  return (
    <div className="pb-36 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <BackArrow size={18} />
          <span className="text-sm">{t('back')}</span>
        </button>
        <button
          onClick={() => { setBli(!blindMode); setRevealedVerses(new Set()); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            blindMode ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          {blindMode ? <EyeOff size={12} /> : <Eye size={12} />}
          {t('blindMode')}
        </button>
      </div>

      {/* Surah Header */}
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

      {surah.id !== 9 && (
        <p className="text-center font-quran text-xl text-foreground mb-6">{t('bismillah')}</p>
      )}

      {/* Play all button */}
      <button
        onClick={() => audio.playVerse(surah.id, 1)}
        className="w-full mb-4 py-3 rounded-xl bg-primary text-primary-foreground flex items-center justify-center gap-2 font-medium text-sm shadow-islamic hover:opacity-90 transition-opacity active:scale-[0.98]"
      >
        <Play size={16} />
        {t('play')} - {t('listen')}
      </button>

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
            const isCurrentPlaying = audio.currentSurahId === surah.id && audio.currentVerse === verse.number;
            const isRevealed = revealedVerses.has(verse.number);

            return (
              <div
                key={verse.number}
                className={`bg-card rounded-xl p-4 shadow-islamic transition-all ${
                  memorized ? 'ring-2 ring-primary/30 bg-emerald-light' : ''
                } ${isCurrentPlaying ? 'ring-2 ring-accent' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${
                    isCurrentPlaying ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {verse.number}
                  </span>
                  <p className="flex-1 font-quran text-xl leading-[2.2] text-foreground text-end" dir="rtl">
                    {blindMode && !isRevealed ? maskText(verse.text) : verse.text}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-3 justify-end flex-wrap">
                  {blindMode && (
                    <button
                      onClick={() => toggleReveal(verse.number)}
                      className="p-2 rounded-lg bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors"
                    >
                      {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                  <button
                    onClick={() => audio.playVerse(surah.id, verse.number)}
                    className={`p-2 rounded-lg transition-colors ${
                      isCurrentPlaying ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
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
