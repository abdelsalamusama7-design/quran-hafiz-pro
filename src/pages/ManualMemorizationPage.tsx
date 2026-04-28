import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, BookOpen, ChevronDown, RotateCcw, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import { toast } from 'sonner';

interface Verse {
  number: number;
  text: string;
}

const toArabicNum = (n: number) =>
  n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);

const ManualMemorizationPage = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showSurahPicker, setShowSurahPicker] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const currentSurah = surahs.find(s => s.id === selectedSurah);

  useEffect(() => {
    setLoading(true);
    setVerses([]);
    setRevealed(new Set());
    setShowAll(false);
    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setVerses(data.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedSurah]);

  const toggleVerse = (n: number) => {
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const reset = () => {
    setRevealed(new Set());
    setShowAll(false);
  };

  const toggleAll = () => {
    if (showAll || revealed.size === verses.length) {
      setRevealed(new Set());
      setShowAll(false);
      toast.success(lang === 'ar' ? '⏸️ تم إخفاء كل النص' : '⏸️ All text hidden', {
        description: lang === 'ar' ? 'اقرأ من حفظك' : 'Recite from memory',
      });
    } else {
      setRevealed(new Set(verses.map(v => v.number)));
      setShowAll(true);
      toast.success(lang === 'ar' ? '✅ تم عرض كل النص' : '✅ All text shown', {
        description: lang === 'ar' ? 'تحقق من حفظك' : 'Verify your memorization',
      });
    }
  };

  const goToSurah = (offset: number) => {
    const next = selectedSurah + offset;
    if (next >= 1 && next <= 114) setSelectedSurah(next);
  };

  const progress = verses.length ? Math.round((revealed.size / verses.length) * 100) : 0;
  const ArrowBack = lang === 'ar' ? ArrowRight : ArrowLeft;
  const ArrowFwd = lang === 'ar' ? ArrowLeft : ArrowRight;

  return (
    <div className="pb-28 max-w-lg mx-auto min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
            aria-label="back"
          >
            <ArrowBack size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-base font-arabic flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              {lang === 'ar' ? 'الحفظ اليدوي' : 'Manual Memorization'}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {lang === 'ar'
                ? 'اقرأ من حفظك ثم اضغط على رقم الآية لكشفها والتحقق'
                : 'Recite from memory then tap the verse number to reveal'}
            </p>
          </div>
        </div>

        {/* Surah selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToSurah(-1)}
            disabled={selectedSurah === 1}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30"
          >
            <ArrowBack size={16} />
          </button>
          <button
            onClick={() => setShowSurahPicker(v => !v)}
            className="flex-1 flex items-center justify-between gap-1 px-3 py-2 rounded-lg bg-primary/10 text-foreground text-sm font-medium border border-primary/20"
          >
            <span className="truncate font-arabic">
              {currentSurah?.name} ({toArabicNum(currentSurah?.versesCount || 0)} {lang === 'ar' ? 'آية' : 'verses'})
            </span>
            <ChevronDown size={14} className={`transition-transform ${showSurahPicker ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => goToSurah(1)}
            disabled={selectedSurah === 114}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30"
          >
            <ArrowFwd size={16} />
          </button>
        </div>

        {showSurahPicker && (
          <div className="max-h-56 overflow-y-auto border border-border rounded-lg p-1 space-y-0.5 mt-2 bg-card">
            {surahs.map(s => (
              <button
                key={s.id}
                onClick={() => { setSelectedSurah(s.id); setShowSurahPicker(false); }}
                className={`w-full text-start px-3 py-1.5 rounded text-xs font-arabic flex items-center justify-between ${
                  selectedSurah === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                }`}
              >
                <span>{s.id}. {s.name}</span>
                <span className="opacity-60 text-[10px]">{s.versesCount}</span>
              </button>
            ))}
          </div>
        )}

        {/* Progress + actions */}
        {verses.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {revealed.size}/{verses.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleAll}
                className="flex-1 py-1.5 rounded-lg bg-muted text-foreground text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-muted/80"
              >
                {showAll ? <EyeOff size={12} /> : <Eye size={12} />}
                {showAll
                  ? (lang === 'ar' ? 'إخفاء الكل' : 'Hide all')
                  : (lang === 'ar' ? 'إظهار الكل' : 'Show all')}
              </button>
              <button
                onClick={reset}
                className="flex-1 py-1.5 rounded-lg bg-muted text-foreground text-[11px] font-medium flex items-center justify-center gap-1.5 hover:bg-muted/80"
              >
                <RotateCcw size={12} />
                {lang === 'ar' ? 'إعادة' : 'Reset'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mushaf-style body — empty page with verse number badges */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin mb-2" size={28} />
            <p className="text-xs">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : (
          <>
            {/* Mushaf page — looks like a real Quran page (empty, lined paper feel) */}
            <div
              className="relative bg-gradient-to-b from-amber-50/40 to-amber-50/20 dark:from-amber-950/10 dark:to-amber-950/5 border border-amber-200/40 dark:border-amber-900/30 rounded-2xl shadow-sm overflow-hidden"
              dir="rtl"
            >
              {/* Decorative top border */}
              <div className="h-1.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

              <div className="px-5 py-6">
                {/* Surah title banner */}
                <div className="text-center mb-4">
                  <div className="inline-block border-2 border-primary/30 rounded-lg px-6 py-2 bg-card/60">
                    <p className="font-arabic text-base font-bold text-foreground">
                      سُورَةُ {currentSurah?.name}
                    </p>
                  </div>
                </div>

                {/* Bismillah */}
                {selectedSurah !== 1 && selectedSurah !== 9 && (
                  <p className="font-quran text-2xl text-center text-foreground/90 mb-6 leading-loose">
                    بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                  </p>
                )}

                {/* Lined paper background with verse markers floating on lines */}
                <div
                  className="relative space-y-5 min-h-[60vh]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(to bottom, transparent 0, transparent 47px, hsl(var(--border) / 0.4) 47px, hsl(var(--border) / 0.4) 48px)',
                  }}
                >
                  {verses.map((v, idx) => {
                    const isRevealed = revealed.has(v.number);
                    // alternate alignment to mimic mushaf layout (verses scattered across the page)
                    const align = idx % 3 === 0 ? 'justify-start' : idx % 3 === 1 ? 'justify-center' : 'justify-end';
                    return (
                      <div key={v.number} className="relative">
                        {isRevealed ? (
                          <p
                            className="font-quran text-xl md:text-2xl text-foreground leading-loose text-justify animate-fade-in"
                            style={{ textAlignLast: 'center' }}
                          >
                            {v.text}
                            <button
                              onClick={() => toggleVerse(v.number)}
                              className="inline-flex items-center justify-center w-8 h-8 mx-1 align-middle rounded-full border-2 border-primary/60 text-primary text-xs font-bold bg-card hover:bg-primary hover:text-primary-foreground transition-all"
                              aria-label="hide verse"
                              title={lang === 'ar' ? 'إخفاء الآية' : 'Hide verse'}
                            >
                              {toArabicNum(v.number)}
                            </button>
                          </p>
                        ) : (
                          <div className={`flex ${align} py-2`}>
                            <button
                              onClick={() => toggleVerse(v.number)}
                              className="group relative w-12 h-12 flex items-center justify-center rounded-full border-2 border-primary/50 bg-card hover:bg-primary/10 hover:border-primary hover:scale-110 active:scale-95 transition-all shadow-sm"
                              aria-label={lang === 'ar' ? `كشف الآية ${v.number}` : `Reveal verse ${v.number}`}
                              title={lang === 'ar' ? 'اضغط لكشف الآية إذا نسيتها' : 'Tap to reveal if forgotten'}
                            >
                              <span className="font-arabic font-bold text-primary text-base">
                                {toArabicNum(v.number)}
                              </span>
                              {/* Subtle pulse ring for hint */}
                              <span className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping opacity-0 group-hover:opacity-100" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Decorative bottom border */}
              <div className="h-1.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            </div>

            {/* Helper hint */}
            <p className="mt-4 text-center text-[11px] text-muted-foreground font-arabic">
              {lang === 'ar'
                ? '💡 الصفحة فارغة كالمصحف — اضغط على رقم الآية إذا نسيتها لكشفها'
                : '💡 Empty mushaf page — tap a verse number if you forgot it'}
            </p>

            {verses.length > 0 && revealed.size === verses.length && (
              <div className="mt-6 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/30 rounded-xl p-4 text-center animate-fade-in">
                <CheckCircle2 className="mx-auto text-primary mb-2" size={32} />
                <p className="font-bold text-foreground font-arabic">
                  {lang === 'ar' ? '🎉 أكملت مراجعة السورة!' : '🎉 Surah review complete!'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === 'ar' ? 'بارك الله في حفظك' : 'May Allah bless your memorization'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ManualMemorizationPage;
