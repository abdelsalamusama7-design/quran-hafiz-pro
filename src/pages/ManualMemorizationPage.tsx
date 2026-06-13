import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, BookOpen, ChevronDown, RotateCcw, CheckCircle2, Loader2, Clock, Settings as SettingsIcon, Repeat, SkipForward } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import { toast } from 'sonner';
import { logActivity } from '@/lib/logActivity';

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
  const sessionStartRef = useRef<number>(Date.now());
  const loggedRef = useRef<boolean>(false);

  // ===== Optional reveal-timer (gentle nudge) =====
  const [timerEnabled, setTimerEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('hafiz_manual_timer_on') === '1'; } catch { return false; }
  });
  const [timerSeconds, setTimerSeconds] = useState<number>(() => {
    try { return parseInt(localStorage.getItem('hafiz_manual_timer_secs') || '10', 10) || 10; } catch { return 10; }
  });
  const [showSettings, setShowSettings] = useState(false);
  // verseNumber -> remaining seconds (null/undefined = no active timer)
  const [pendingTimers, setPendingTimers] = useState<Record<number, number>>({});
  const timersRef = useRef<Record<number, number>>({});

  useEffect(() => {
    try { localStorage.setItem('hafiz_manual_timer_on', timerEnabled ? '1' : '0'); } catch {}
  }, [timerEnabled]);
  useEffect(() => {
    try { localStorage.setItem('hafiz_manual_timer_secs', String(timerSeconds)); } catch {}
  }, [timerSeconds]);

  const clearVerseTimer = (n: number) => {
    const id = timersRef.current[n];
    if (id) { window.clearInterval(id); delete timersRef.current[n]; }
    setPendingTimers(prev => {
      const next = { ...prev };
      delete next[n];
      return next;
    });
  };

  const startVerseTimer = (n: number) => {
    // cancel any existing
    clearVerseTimer(n);
    let remaining = timerSeconds;
    setPendingTimers(prev => ({ ...prev, [n]: remaining }));
    const id = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        window.clearInterval(id);
        delete timersRef.current[n];
        setPendingTimers(prev => {
          const next = { ...prev }; delete next[n]; return next;
        });
        // Gentle prompt — does NOT auto-reveal
        toast(lang === 'ar' ? `⏰ آية ${n} — هل تحتاج كشفها؟` : `⏰ Verse ${n} — reveal?`, {
          description: lang === 'ar' ? 'تمهّل، حاول استرجاعها من حفظك' : 'Take your time, try to recall it',
          duration: 6000,
          action: {
            label: lang === 'ar' ? 'كشف' : 'Reveal',
            onClick: () => setRevealed(prev => new Set(prev).add(n)),
          },
        });
      } else {
        setPendingTimers(prev => ({ ...prev, [n]: remaining }));
      }
    }, 1000);
    timersRef.current[n] = id;
  };

  // cleanup all timers on unmount / surah change
  useEffect(() => () => {
    Object.values(timersRef.current).forEach(id => window.clearInterval(id));
    timersRef.current = {};
  }, []);

  const replayVerse = (n: number) => {
    // Hide the verse text (reveal toggle off), scroll back to its badge, and restart the timer if enabled
    setRevealed(prev => {
      const next = new Set(prev);
      next.delete(n);
      return next;
    });
    setShowAll(false);
    if (timerEnabled) startVerseTimer(n);
    toast(lang === 'ar' ? `🔁 إعادة آية ${n}` : `🔁 Replay verse ${n}`, {
      description: lang === 'ar' ? 'اقرأ مرة أخرى من حفظك' : 'Recite again from memory',
      duration: 2500,
    });
    setTimeout(() => {
      const el = document.getElementById(`mm-verse-${n}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  };

  const currentSurah = surahs.find(s => s.id === selectedSurah);

  useEffect(() => {
    setLoading(true);
    setVerses([]);
    setRevealed(new Set());
    setShowAll(false);
    loggedRef.current = false;
    sessionStartRef.current = Date.now();
    // cancel any timers from previous surah
    Object.values(timersRef.current).forEach(id => window.clearInterval(id));
    timersRef.current = {};
    setPendingTimers({});
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

  // Auto-log when user reveals all verses (treated as a completed review session)
  useEffect(() => {
    if (verses.length > 0 && revealed.size === verses.length && !loggedRef.current) {
      loggedRef.current = true;
      const durationMin = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000));
      void logActivity({
        activityType: 'review',
        surahNumber: selectedSurah,
        versesCount: verses.length,
        durationMinutes: durationMin,
        pointsEarned: verses.length * 2,
        notes: 'Manual memorization review',
      });
    }
  }, [revealed, verses, selectedSurah]);

  const toggleVerse = (n: number) => {
    // Cancel any pending nudge timer for this verse
    clearVerseTimer(n);
    setRevealed(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
    // If timer feature is on AND the verse is currently hidden (about to become revealed -> skip),
    // OR the verse is currently revealed (about to be re-hidden -> start timer for next attempt)
    const willBecomeHidden = revealed.has(n);
    if (timerEnabled && willBecomeHidden) {
      startVerseTimer(n);
    }
  };

  const reset = () => {
    setRevealed(new Set());
    setShowAll(false);
  };

  // Reveal verses one-by-one in order — no listening / no recording
  const revealNextInSequence = () => {
    if (verses.length === 0) return;
    // Find the lowest-numbered verse that is NOT yet revealed
    const next = verses.find(v => !revealed.has(v.number));
    if (!next) {
      toast.success(lang === 'ar' ? '🎉 تم كشف كل الآيات' : '🎉 All verses revealed');
      return;
    }
    clearVerseTimer(next.number);
    setRevealed(prev => new Set(prev).add(next.number));
    setShowAll(false);
    // Scroll to the freshly revealed verse
    setTimeout(() => {
      const el = document.getElementById(`mm-verse-${next.number}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
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
          <button
            onClick={() => setShowSettings(s => !s)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
              timerEnabled ? 'bg-primary/15 text-primary' : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
            aria-label="settings"
            title={lang === 'ar' ? 'إعدادات المؤقت' : 'Timer settings'}
          >
            <SettingsIcon size={16} />
          </button>
        </div>

        {showSettings && (
          <div className="mb-3 rounded-lg border border-border bg-card p-3 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Clock size={13} className="text-primary" />
                {lang === 'ar' ? 'مؤقت اختياري للكشف' : 'Optional reveal timer'}
              </label>
              <button
                onClick={() => setTimerEnabled(v => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${timerEnabled ? 'bg-primary' : 'bg-muted'}`}
                role="switch"
                aria-checked={timerEnabled}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 rounded-full bg-card shadow transition-transform ${
                    timerEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              {[5, 10, 15, 20, 30].map(s => (
                <button
                  key={s}
                  onClick={() => setTimerSeconds(s)}
                  disabled={!timerEnabled}
                  className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40 ${
                    timerSeconds === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {s}{lang === 'ar' ? 'ث' : 's'}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {lang === 'ar'
                ? 'عند تفعيله: اضغط 🕒 على الآية لبدء المؤقت — يصلك إشعار لطيف عند انتهاء الوقت دون كشف تلقائي.'
                : 'When on: tap 🕒 on a verse to start the timer — you get a gentle prompt at time-up, no auto-reveal.'}
            </p>
          </div>
        )}

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
            {/* Sequential reveal — no listening / no recording */}
            <button
              onClick={revealNextInSequence}
              disabled={verses.length > 0 && revealed.size === verses.length}
              className="w-full py-2 rounded-lg bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
              title={lang === 'ar' ? 'كشف الآية التالية بالترتيب' : 'Reveal next verse in order'}
            >
              <SkipForward size={14} />
              {revealed.size === 0
                ? (lang === 'ar' ? '👁️ كشف الآية الأولى' : '👁️ Reveal first verse')
                : verses.length > 0 && revealed.size === verses.length
                ? (lang === 'ar' ? '✓ اكتمل الكشف' : '✓ All revealed')
                : (lang === 'ar'
                    ? `كشف الآية التالية (${revealed.size + 1}/${verses.length})`
                    : `Reveal next verse (${revealed.size + 1}/${verses.length})`)}
            </button>
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
                    const countdown = pendingTimers[v.number];
                    // alternate alignment to mimic mushaf layout (verses scattered across the page)
                    const align = idx % 3 === 0 ? 'justify-start' : idx % 3 === 1 ? 'justify-center' : 'justify-end';
                    return (
                      <div key={v.number} id={`mm-verse-${v.number}`} className="relative scroll-mt-32">
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
                            <button
                              onClick={() => replayVerse(v.number)}
                              className="inline-flex items-center justify-center gap-1 mx-1 px-2 h-7 align-middle rounded-full border border-accent/50 text-accent-foreground bg-accent/15 hover:bg-accent/30 text-[11px] font-medium transition-all"
                              aria-label={lang === 'ar' ? `إعادة الآية ${v.number}` : `Replay verse ${v.number}`}
                              title={lang === 'ar' ? 'إعادة الآية — إخفاء النص ومحاولة من جديد' : 'Replay verse — hide & retry'}
                            >
                              <Repeat size={11} />
                              {lang === 'ar' ? 'إعادة' : 'Replay'}
                            </button>
                          </p>
                        ) : (
                          <div className={`flex ${align} py-2 items-center gap-2`}>
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
                            {timerEnabled && (
                              countdown !== undefined ? (
                                <button
                                  onClick={() => clearVerseTimer(v.number)}
                                  className="h-9 px-2.5 rounded-full bg-primary/15 border border-primary/40 text-primary text-[11px] font-bold flex items-center gap-1 animate-pulse"
                                  title={lang === 'ar' ? 'إلغاء المؤقت' : 'Cancel timer'}
                                >
                                  <Clock size={11} />
                                  {countdown}{lang === 'ar' ? 'ث' : 's'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => startVerseTimer(v.number)}
                                  className="h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary flex items-center justify-center transition-colors"
                                  title={lang === 'ar' ? `ابدأ مؤقت ${timerSeconds}ث` : `Start ${timerSeconds}s timer`}
                                  aria-label="start timer"
                                >
                                  <Clock size={14} />
                                </button>
                              )
                            )}
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
