import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { useAudio } from '@/contexts/AudioContext';
import { surahs } from '@/data/surahs';
import { ArrowRight, ArrowLeft, Check, Volume2, Eye, EyeOff, Play, BookOpen, Languages, Type } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Verse {
  number: number;
  text: string;
}

interface Translation {
  number: number;
  text: string;
}

interface WordInfo {
  text: string;
  translation: string;
  transliteration: string;
}

type ViewTab = 'arabic' | 'translation' | 'wordbyword' | 'tafsir';

const SurahViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang, dir } = useLanguage();
  const { isVerseMemorized, toggleVerse, getSurahProgress } = useMemorization();
  const audio = useAudio();
  const [verses, setVerses] = useState<Verse[]>([]);
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [tafsir, setTafsir] = useState<Translation[]>([]);
  const [wordsData, setWordsData] = useState<Record<number, WordInfo[]>>({});
  const [loading, setLoading] = useState(true);
  const [blindMode, setBlindMode] = useState(false);
  const [revealedVerses, setRevealedVerses] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<ViewTab>('arabic');
  const [expandedVerse, setExpandedVerse] = useState<number | null>(null);

  const surah = surahs.find(s => s.id === Number(id));
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!surah) return;
    setLoading(true);

    // Fetch Arabic text
    const fetchArabic = fetch(`https://api.alquran.cloud/v1/surah/${surah.id}`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setVerses(data.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
        }
      });

    // Fetch English translation
    const fetchTranslation = fetch(`https://api.alquran.cloud/v1/surah/${surah.id}/en.asad`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setTranslations(data.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
        }
      })
      .catch(() => {});

    // Fetch Arabic Tafsir (Al-Muyassar)
    const fetchTafsir = fetch(`https://api.alquran.cloud/v1/surah/${surah.id}/ar.muyassar`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setTafsir(data.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
        }
      })
      .catch(() => {});

    Promise.all([fetchArabic, fetchTranslation, fetchTafsir])
      .finally(() => setLoading(false));
  }, [surah]);

  // Fetch word-by-word data for a specific verse on demand
  const fetchWordByWord = async (verseNum: number) => {
    if (wordsData[verseNum] || !surah) return;
    try {
      const res = await fetch(`https://api.quran.com/api/v4/verses/by_key/${surah.id}:${verseNum}?language=en&words=true&word_fields=text_uthmani,translation`);
      const data = await res.json();
      if (data.verse?.words) {
        setWordsData(prev => ({
          ...prev,
          [verseNum]: data.verse.words.map((w: any) => ({
            text: w.text_uthmani || w.text,
            translation: w.translation?.text || '',
            transliteration: w.transliteration?.text || '',
          })),
        }));
      }
    } catch {}
  };

  if (!surah) return <div className="p-8 text-center text-muted-foreground">Surah not found</div>;

  const progress = getSurahProgress(surah.id, surah.versesCount);

  const toggleReveal = (verseNum: number) => {
    setRevealedVerses(prev => {
      const next = new Set(prev);
      next.has(verseNum) ? next.delete(verseNum) : next.add(verseNum);
      return next;
    });
  };

  const maskText = (text: string) => {
    const words = text.split(' ');
    return words.map((w, i) => (i % 3 === 1 ? '●●●' : w)).join(' ');
  };

  const handleExpandVerse = (verseNum: number) => {
    setExpandedVerse(expandedVerse === verseNum ? null : verseNum);
    if (activeTab === 'wordbyword') fetchWordByWord(verseNum);
  };

  const tabs: { id: ViewTab; icon: any; labelAr: string; labelEn: string }[] = [
    { id: 'arabic', icon: BookOpen, labelAr: 'العربية', labelEn: 'Arabic' },
    { id: 'translation', icon: Languages, labelAr: 'الترجمة', labelEn: 'Translation' },
    { id: 'wordbyword', icon: Type, labelAr: 'كلمة بكلمة', labelEn: 'Word by Word' },
    { id: 'tafsir', icon: BookOpen, labelAr: 'التفسير', labelEn: 'Tafsir' },
  ];

  return (
    <div className="pb-36 px-4 pt-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <BackArrow size={18} />
          <span className="text-sm">{t('back')}</span>
        </button>
        <button
          onClick={() => { setBlindMode(!blindMode); setRevealedVerses(new Set()); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            blindMode ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'
          }`}
        >
          {blindMode ? <EyeOff size={12} /> : <Eye size={12} />}
          {t('blindMode')}
        </button>
      </div>

      {/* Surah Header */}
      <div className="gradient-islamic rounded-2xl p-5 text-primary-foreground mb-4 shadow-islamic">
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

      {/* View Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[10px] font-medium transition-all ${
              activeTab === tab.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            <tab.icon size={12} />
            {lang === 'ar' ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {surah.id !== 9 && activeTab === 'arabic' && (
        <p className="text-center font-quran text-xl text-foreground mb-4">{t('bismillah')}</p>
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
            const isExpanded = expandedVerse === verse.number;
            const translation = translations.find(t => t.number === verse.number);
            const tafsirText = tafsir.find(t => t.number === verse.number);
            const words = wordsData[verse.number];

            return (
              <div
                key={verse.number}
                className={`bg-card rounded-xl p-4 shadow-islamic transition-all ${
                  memorized ? 'ring-2 ring-primary/30 bg-emerald-light' : ''
                } ${isCurrentPlaying ? 'ring-2 ring-accent' : ''}`}
              >
                <div className="flex items-start gap-3" onClick={() => handleExpandVerse(verse.number)}>
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1 ${
                    isCurrentPlaying ? 'bg-accent text-accent-foreground' : 'bg-primary/10 text-primary'
                  }`}>
                    {verse.number}
                  </span>

                  <div className="flex-1">
                    {/* Arabic Text (always shown) */}
                    <p className="font-quran text-xl leading-[2.2] text-foreground text-end" dir="rtl">
                      {blindMode && !isRevealed ? maskText(verse.text) : verse.text}
                    </p>

                    {/* Translation (inline if tab active) */}
                    {activeTab === 'translation' && translation && (
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2" dir="ltr">
                        {translation.text}
                      </p>
                    )}

                    {/* Word by Word */}
                    {activeTab === 'wordbyword' && isExpanded && (
                      <div className="mt-3 border-t border-border pt-3">
                        {words ? (
                          <div className="flex flex-wrap gap-2 justify-center" dir="rtl">
                            {words.map((w, i) => (
                              <div key={i} className="bg-primary/5 rounded-lg p-2 text-center min-w-[60px]">
                                <p className="font-quran text-base text-foreground">{w.text}</p>
                                {w.transliteration && <p className="text-[9px] text-muted-foreground mt-0.5 italic" dir="ltr">{w.transliteration}</p>}
                                <p className="text-[10px] text-primary font-medium mt-0.5" dir="ltr">{w.translation}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center animate-pulse">
                            {lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                          </p>
                        )}
                      </div>
                    )}

                    {activeTab === 'wordbyword' && !isExpanded && (
                      <p className="text-[10px] text-primary mt-1 text-center">
                        {lang === 'ar' ? '⬆️ اضغط لعرض الكلمات' : '⬆️ Tap to show words'}
                      </p>
                    )}

                    {/* Tafsir */}
                    {activeTab === 'tafsir' && tafsirText && (
                      <div className="mt-2 border-t border-border pt-2">
                        <p className="text-sm text-muted-foreground leading-relaxed" dir="rtl">{tafsirText.text}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3 justify-end flex-wrap">
                  {blindMode && (
                    <button onClick={() => toggleReveal(verse.number)} className="p-2 rounded-lg bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors">
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
