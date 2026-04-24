import { useState } from 'react';
import { Mic, MicOff, Eye, EyeOff, ChevronLeft, ChevronRight, BookOpen, AlertTriangle, X, ChevronsLeft, ChevronsRight, RefreshCw } from 'lucide-react';

interface Verse {
  number: number;
  text: string;
}

interface Mistake {
  wrongWord?: string;
  correctWord?: string;
  message?: string;
  verseNumber?: number;
}

interface MushafRecitationViewProps {
  surahName: string;
  surahNameEn: string;
  surahId: number;
  verses: Verse[];
  currentVerse: number;
  isListening: boolean;
  isProcessing: boolean;
  liveAccuracy: number | null;
  mistakes: Mistake[];
  lang: 'ar' | 'en';
  juzNumber?: number;
  pageNumber?: number;
  onClose: () => void;
  onStart: () => void;
  onStop: () => void;
  onPrevVerse: () => void;
  onNextVerse: () => void;
  onPrevSurah?: () => void;
  onNextSurah?: () => void;
  onReset: () => void;
}

/**
 * Mushaf-style reading view for Live Recitation.
 * Mimics a printed Quran page with verse markers (ornate circles),
 * a floating mic button, and a bottom control bar.
 */
const MushafRecitationView = ({
  surahName, surahNameEn, surahId, verses, currentVerse,
  isListening, isProcessing, liveAccuracy, mistakes, lang,
  juzNumber, pageNumber,
  onClose, onStart, onStop, onPrevVerse, onNextVerse,
  onPrevSurah, onNextSurah, onReset,
}: MushafRecitationViewProps) => {
  const [showText, setShowText] = useState(true);
  const [showVerseList, setShowVerseList] = useState(false);
  const [showMistakes, setShowMistakes] = useState(false);

  // Render a verse-end marker (Arabic numeral inside an ornate circle)
  const VerseMarker = ({ num, active }: { num: number; active?: boolean }) => {
    const arabicNum = num.toLocaleString('ar-EG');
    return (
      <span
        className={`inline-flex items-center justify-center w-9 h-9 rounded-full border-2 mx-1 transition-all ${
          active
            ? 'border-primary bg-primary/15 text-primary scale-110 shadow-md'
            : 'border-foreground/40 bg-background text-foreground/80'
        }`}
        style={{
          backgroundImage: !active
            ? 'radial-gradient(circle at center, transparent 55%, hsl(var(--foreground) / 0.08) 56%, transparent 70%)'
            : undefined,
        }}
      >
        <span className="font-quran text-sm font-bold">{arabicNum}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-[hsl(var(--background))] flex flex-col" dir="rtl">
      {/* === Top Header === */}
      <header className="shrink-0 bg-card/95 backdrop-blur border-b border-border px-3 py-2.5 flex items-center gap-2 shadow-sm">
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-muted active:scale-90 transition-all"
          aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
        >
          <X size={20} className="text-foreground" />
        </button>

        <div className="flex-1 mx-2 bg-muted/50 rounded-lg px-3 py-1.5 text-center">
          <p className="font-arabic text-base font-bold text-foreground leading-tight">
            {lang === 'ar' ? `سورة ${surahName}` : `Surah ${surahNameEn}`}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5 font-arabic">
            {lang === 'ar'
              ? `${pageNumber ? `صفحة ${pageNumber} • ` : ''}${juzNumber ? `جزء ${juzNumber}` : ''}`
              : `${pageNumber ? `Page ${pageNumber} • ` : ''}${juzNumber ? `Juz ${juzNumber}` : ''}`}
          </p>
        </div>

        <button
          onClick={onReset}
          className="p-2 rounded-lg hover:bg-muted active:scale-90 transition-all"
          aria-label={lang === 'ar' ? 'إعادة' : 'Reset'}
        >
          <RefreshCw size={18} className="text-foreground" />
        </button>
      </header>

      {/* === Mushaf page (scrollable) === */}
      <main className="flex-1 overflow-y-auto bg-[hsl(40_40%_97%)] dark:bg-[hsl(var(--card))] relative">
        <div className="max-w-2xl mx-auto px-5 py-6 min-h-full">
          {/* Bismillah header (decorative) */}
          {currentVerse <= 7 && surahId !== 1 && surahId !== 9 && (
            <div className="text-center my-6">
              <p className="font-quran text-2xl text-foreground tracking-wide">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
              <div className="mt-2 mx-auto w-32 h-px bg-gradient-to-r from-transparent via-foreground/30 to-transparent" />
            </div>
          )}

          {/* Verses with verse-markers, justified mushaf style */}
          <div
            className="font-quran text-foreground"
            style={{
              fontSize: '1.7rem',
              lineHeight: '3.2rem',
              textAlign: 'justify',
              textAlignLast: 'center',
              wordSpacing: '0.15rem',
            }}
          >
            {verses.map((v) => {
              const isCurrent = v.number === currentVerse;
              return (
                <span
                  key={v.number}
                  className={`transition-colors ${
                    isCurrent
                      ? 'text-primary font-bold'
                      : showText
                        ? 'text-foreground'
                        : 'text-transparent select-none'
                  }`}
                  style={
                    !showText && !isCurrent
                      ? { textShadow: '0 0 14px hsl(var(--foreground) / 0.85)' }
                      : undefined
                  }
                >
                  {showText || isCurrent ? v.text : v.text.replace(/\S/g, '•')}
                  {' '}
                  <VerseMarker num={v.number} active={isCurrent} />
                  {' '}
                </span>
              );
            })}
          </div>

          {/* spacer for floating controls */}
          <div className="h-40" />
        </div>

        {/* === Floating Mic button === */}
        <button
          onClick={isListening ? onStop : onStart}
          className={`fixed bottom-24 right-5 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-all z-30 ${
            isListening
              ? 'bg-destructive text-destructive-foreground animate-pulse'
              : 'bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground'
          }`}
          aria-label={isListening ? (lang === 'ar' ? 'إيقاف' : 'Stop') : (lang === 'ar' ? 'تسميع' : 'Listen')}
        >
          {isListening ? <MicOff size={26} /> : <Mic size={26} />}

          {/* Pulse ring while listening */}
          {isListening && (
            <span className="absolute inset-0 rounded-full border-2 border-destructive animate-ping opacity-60" />
          )}
        </button>

        {/* Live accuracy badge (floating) */}
        {liveAccuracy !== null && (
          <div className={`fixed bottom-44 right-6 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg z-30 ${
            liveAccuracy >= 80 ? 'bg-green-500 text-white' :
            liveAccuracy >= 50 ? 'bg-yellow-500 text-white' :
            'bg-destructive text-destructive-foreground'
          }`}>
            {liveAccuracy}%
          </div>
        )}
      </main>

      {/* === Bottom Control Bar === */}
      <footer className="shrink-0 bg-card border-t border-border px-3 py-2.5 flex items-center justify-between gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {/* Mistakes button (left in RTL) */}
        <button
          onClick={() => setShowMistakes(true)}
          className="relative px-4 py-2 rounded-full bg-muted hover:bg-muted/80 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <AlertTriangle size={14} className="text-destructive" />
          <span className="text-xs font-bold text-foreground font-arabic">
            {lang === 'ar' ? 'أخطاء' : 'Mistakes'}
          </span>
          {mistakes.length > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {mistakes.length}
            </span>
          )}
        </button>

        {/* Center icon group */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowVerseList(true)}
            className="w-10 h-10 rounded-full hover:bg-muted active:scale-90 transition-all flex items-center justify-center"
            aria-label={lang === 'ar' ? 'عرض الآيات' : 'Show verses'}
          >
            <BookOpen size={18} className="text-foreground" />
          </button>

          <button
            onClick={() => setShowText(v => !v)}
            className="w-10 h-10 rounded-full hover:bg-muted active:scale-90 transition-all flex items-center justify-center"
            aria-label={showText ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')}
          >
            {showText ? <EyeOff size={18} className="text-foreground" /> : <Eye size={18} className="text-primary" />}
          </button>

          {/* Prev verse */}
          <button
            onClick={onPrevVerse}
            disabled={currentVerse <= 1}
            className="w-10 h-10 rounded-full border border-border hover:bg-muted active:scale-90 transition-all flex items-center justify-center disabled:opacity-30"
            aria-label={lang === 'ar' ? 'الآية السابقة' : 'Previous verse'}
          >
            <ChevronRight size={18} className="text-foreground" />
          </button>

          {/* Next verse */}
          <button
            onClick={onNextVerse}
            disabled={currentVerse >= verses.length}
            className="w-10 h-10 rounded-full border border-border hover:bg-muted active:scale-90 transition-all flex items-center justify-center disabled:opacity-30"
            aria-label={lang === 'ar' ? 'الآية التالية' : 'Next verse'}
          >
            <ChevronLeft size={18} className="text-foreground" />
          </button>

          {/* Surah jumps */}
          {onPrevSurah && (
            <button
              onClick={onPrevSurah}
              className="w-10 h-10 rounded-full border border-border hover:bg-muted active:scale-90 transition-all flex items-center justify-center"
              aria-label={lang === 'ar' ? 'السورة السابقة' : 'Previous surah'}
            >
              <ChevronsRight size={18} className="text-foreground" />
            </button>
          )}
        </div>

        {/* Status pill (right in RTL) */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold ${
          isListening
            ? 'bg-destructive/15 text-destructive'
            : isProcessing
              ? 'bg-accent/20 text-accent-foreground'
              : 'bg-muted text-muted-foreground'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-destructive animate-pulse' : 'bg-current'}`} />
          {isListening
            ? (lang === 'ar' ? 'يستمع' : 'LIVE')
            : isProcessing
              ? (lang === 'ar' ? 'يحلل' : '...')
              : (lang === 'ar' ? 'جاهز' : 'IDLE')}
        </div>
      </footer>

      {/* === Verse list drawer === */}
      {showVerseList && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end animate-fade-in"
          onClick={() => setShowVerseList(false)}
        >
          <div
            className="w-full bg-card rounded-t-3xl max-h-[75vh] overflow-hidden flex flex-col animate-slide-in-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card">
              <h3 className="font-bold text-foreground font-arabic">
                {lang === 'ar' ? `آيات ${surahName}` : `${surahNameEn} verses`}
                <span className="text-xs text-muted-foreground ms-2">({verses.length})</span>
              </h3>
              <button onClick={() => setShowVerseList(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X size={18} className="text-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2">
              {verses.map(v => (
                <button
                  key={v.number}
                  onClick={() => {
                    // Jump by stepping next/prev; cleanest is to call onNext/onPrev,
                    // but for direct jump we expose via a custom event-free path:
                    // we rely on parent updating selectedVerse externally; here we
                    // dispatch through onNextVerse/onPrevVerse repeatedly — instead,
                    // simpler: just close and let user use prev/next. To enable
                    // direct jump we read currentVerse and call the right one once.
                    const diff = v.number - currentVerse;
                    if (diff > 0) {
                      for (let i = 0; i < diff; i++) onNextVerse();
                    } else if (diff < 0) {
                      for (let i = 0; i < -diff; i++) onPrevVerse();
                    }
                    setShowVerseList(false);
                  }}
                  className={`w-full text-start p-3 rounded-xl transition-all ${
                    v.number === currentVerse
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted/40 border-2 border-transparent hover:bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                      v.number === currentVerse ? 'bg-primary text-primary-foreground' : 'bg-background text-foreground border border-border'
                    }`}>
                      {v.number}
                    </span>
                    <p className="font-quran text-base leading-[2] text-foreground flex-1" dir="rtl">
                      {v.text}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === Mistakes drawer === */}
      {showMistakes && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end animate-fade-in"
          onClick={() => setShowMistakes(false)}
        >
          <div
            className="w-full bg-card rounded-t-3xl max-h-[70vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-card">
              <h3 className="font-bold text-foreground font-arabic flex items-center gap-2">
                <AlertTriangle size={18} className="text-destructive" />
                {lang === 'ar' ? 'الأخطاء' : 'Mistakes'}
                <span className="text-xs text-muted-foreground">({mistakes.length})</span>
              </h3>
              <button onClick={() => setShowMistakes(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X size={18} className="text-foreground" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {mistakes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <span className="text-4xl">✨</span>
                  <p className="mt-3 font-arabic">
                    {lang === 'ar' ? 'لا توجد أخطاء حتى الآن، أحسنت!' : 'No mistakes yet, great job!'}
                  </p>
                </div>
              ) : (
                mistakes.map((m, i) => (
                  <div key={i} className="p-3 bg-destructive/5 border border-destructive/20 rounded-xl">
                    {m.verseNumber && (
                      <p className="text-[10px] text-muted-foreground mb-1.5 font-arabic">
                        {lang === 'ar' ? `الآية ${m.verseNumber}` : `Verse ${m.verseNumber}`}
                      </p>
                    )}
                    {m.wrongWord && m.correctWord ? (
                      <div className="flex items-center gap-2 text-base">
                        <span className="text-destructive line-through font-quran">{m.wrongWord}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-primary font-bold font-quran">{m.correctWord}</span>
                      </div>
                    ) : null}
                    {m.message && (
                      <p className="text-xs text-foreground mt-2 font-arabic">{m.message}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MushafRecitationView;