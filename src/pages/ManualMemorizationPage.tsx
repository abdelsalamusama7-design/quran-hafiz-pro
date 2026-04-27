import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, BookOpen, ChevronDown, RotateCcw, CheckCircle2, Loader2, Play, Pause } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import StickyStartBar from '@/components/StickyStartBar';
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

  const sessionActive = revealed.size > 0;

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

      {/* Sticky start/stop bar — consistent with other recitation tools */}
      {verses.length > 0 && (
        <div className="px-4 pt-3">
          <StickyStartBar
            active={sessionActive}
            onStart={toggleAll}
            onStop={toggleAll}
            startLabel={lang === 'ar' ? '📖 ابدأ المراجعة' : '📖 Start Review'}
            stopLabel={lang === 'ar' ? '⏸️ إخفاء النص' : '⏸️ Hide Text'}
            hint={lang === 'ar' ? 'اقرأ من حفظك ثم اضغط لكشف النص للتحقق' : 'Recite from memory then tap to reveal'}
            activeHint={lang === 'ar' ? '🟢 وضع المراجعة نشط — تحقق من حفظك' : '🟢 Review mode active — verify your memory'}
            StartIcon={Play}
            StopIcon={Pause}
          />
        </div>
      )}

      {/* Body */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="animate-spin mb-2" size={28} />
            <p className="text-xs">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
          </div>
        ) : (
          <>
            {/* Bismillah */}
            {selectedSurah !== 1 && selectedSurah !== 9 && (
              <p className="font-quran text-xl text-center text-primary mb-4 leading-loose">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
            )}

            <div className="space-y-3">
              {verses.map(v => {
                const isRevealed = revealed.has(v.number);
                return (
                  <div
                    key={v.number}
                    className={`rounded-xl border transition-all ${
                      isRevealed
                        ? 'bg-primary/5 border-primary/30 shadow-sm'
                        : 'bg-card border-border/60 hover:border-primary/40'
                    }`}
                  >
                    <button
                      onClick={() => toggleVerse(v.number)}
                      className="w-full p-4 flex items-start gap-3 text-start"
                    >
                      {/* Verse number badge */}
                      <div
                        className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                          isRevealed
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted text-foreground border-2 border-dashed border-primary/40 hover:bg-primary/10'
                        }`}
                      >
                        {isRevealed ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <span className="font-arabic">{toArabicNum(v.number)}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {isRevealed ? (
                          <p
                            className="font-quran text-lg text-foreground leading-loose text-right animate-fade-in"
                            dir="rtl"
                          >
                            {v.text}
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border border-primary/40 text-primary text-xs font-bold mr-2 align-middle">
                              {toArabicNum(v.number)}
                            </span>
                          </p>
                        ) : (
                          <div className="flex items-center justify-between gap-2 py-1">
                            <span className="text-xs text-muted-foreground font-arabic flex-1 min-w-0 truncate">
                              {lang === 'ar'
                                ? `الآية ${toArabicNum(v.number)} — اقرأ من حفظك`
                                : `Verse ${v.number} — recite from memory`}
                            </span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); toggleVerse(v.number); }}
                              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleVerse(v.number); } }}
                              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold shadow-sm hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
                            >
                              <Eye size={13} />
                              {lang === 'ar' ? 'عرض النص' : 'Show text'}
                            </span>
                          </div>
                        )}
                      </div>
                    </button>
                    {isRevealed && (
                      <div className="px-4 pb-3 -mt-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleVerse(v.number); }}
                          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          <EyeOff size={11} /> {lang === 'ar' ? 'إخفاء النص' : 'Hide text'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

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
