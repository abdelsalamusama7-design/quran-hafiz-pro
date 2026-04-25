import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Loader2, Sparkles, AlertTriangle, CheckCircle2, ChevronDown, RotateCcw, Award, BookOpen } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { surahs } from '@/data/surahs';
import MicLevelIndicator from '@/components/MicLevelIndicator';
import { supabase } from '@/integrations/supabase/client';

interface TajweedError {
  rule: string;
  ruleCategory: 'noon' | 'meem' | 'madd' | 'qalqalah' | 'ghunnah' | 'tafkheem' | 'makharij' | 'waqf' | 'other';
  word: string;
  location?: string;
  severity: 'minor' | 'moderate' | 'major';
  whatHappened: string;
  correction: string;
  practiceTip?: string;
}

interface TajweedReport {
  overallScore: number;
  level: 'excellent' | 'good' | 'needs_practice' | 'weak';
  errors: TajweedError[];
  strengths?: string[];
  summary: string;
}

const severityStyles = {
  minor: 'bg-secondary/20 text-secondary-foreground border-secondary/40',
  moderate: 'bg-accent/20 text-accent-foreground border-accent/40',
  major: 'bg-destructive/15 text-destructive border-destructive/30',
};

const severityHighlight = {
  minor: 'bg-secondary/40 text-secondary-foreground border-b-2 border-secondary',
  moderate: 'bg-accent/40 text-accent-foreground border-b-2 border-accent',
  major: 'bg-destructive/25 text-destructive border-b-2 border-destructive',
};

// Strip Arabic diacritics (tashkeel) for matching
const stripDiacritics = (s: string) =>
  s.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[إأآا]/g, 'ا').trim();

const wordsMatch = (a: string, b: string) => {
  const na = stripDiacritics(a);
  const nb = stripDiacritics(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
};

const severityLabel = (s: TajweedError['severity'], lang: 'ar' | 'en') => {
  if (lang === 'ar') return s === 'minor' ? 'بسيط' : s === 'moderate' ? 'متوسط' : 'شديد';
  return s === 'minor' ? 'Minor' : s === 'moderate' ? 'Moderate' : 'Major';
};

const levelLabel = (l: TajweedReport['level'], lang: 'ar' | 'en') => {
  const map = {
    excellent: { ar: 'ممتاز', en: 'Excellent' },
    good: { ar: 'جيد', en: 'Good' },
    needs_practice: { ar: 'يحتاج تدريب', en: 'Needs practice' },
    weak: { ar: 'ضعيف', en: 'Weak' },
  };
  return map[l][lang];
};

const TajweedChecker = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [selectedVerse, setSelectedVerse] = useState<number>(1);
  const [verses, setVerses] = useState<{ number: number; text: string }[]>([]);
  const [showSurahPicker, setShowSurahPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<TajweedReport | null>(null);
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const currentSurah = surahs.find(s => s.id === selectedSurah);
  const currentVerseText = verses.find(v => v.number === selectedVerse)?.text || '';

  useEffect(() => {
    setVerses([]);
    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setVerses(data.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
        }
      })
      .catch(() => {});
  }, [selectedSurah]);

  const startRecording = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({
        title: lang === 'ar' ? 'الميكروفون غير مدعوم' : 'Mic not supported',
        description: lang === 'ar' ? 'استخدم Chrome أو Edge' : 'Use Chrome or Edge',
        variant: 'destructive',
      });
      return;
    }
    const recognition = new SR();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalText = '';
    recognition.onresult = (e: any) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t + ' ';
        else interim += t;
      }
      setTranscript((finalText + interim).trim());
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
    setReport(null);
    setTranscript('');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const analyze = async () => {
    if (!transcript.trim() || !currentVerseText) {
      toast({
        title: lang === 'ar' ? 'لا يوجد تسجيل' : 'No recording',
        variant: 'destructive',
      });
      return;
    }
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('tajweed-check', {
        body: {
          userText: transcript,
          correctText: currentVerseText,
          surahName: currentSurah?.name || '',
          verseNumber: selectedVerse,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data as TajweedReport);
    } catch (e: any) {
      toast({
        title: lang === 'ar' ? 'فشل التحليل' : 'Analysis failed',
        description: e?.message || '',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setReport(null);
    setTranscript('');
    setExpandedError(null);
  };

  const focusError = (i: number) => {
    setExpandedError(i);
    setTimeout(() => {
      const el = document.getElementById(`tajweed-err-${i}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  // Render verse text with errors highlighted
  const renderHighlightedVerse = () => {
    if (!report || report.errors.length === 0) {
      return <span>{currentVerseText}</span>;
    }
    const tokens = currentVerseText.split(/(\s+)/);
    return tokens.map((tok, idx) => {
      if (/^\s+$/.test(tok)) return <span key={idx}>{tok}</span>;
      const errIdx = report.errors.findIndex(e => wordsMatch(tok, e.word));
      if (errIdx === -1) return <span key={idx}>{tok}</span>;
      const err = report.errors[errIdx];
      return (
        <button
          key={idx}
          onClick={() => focusError(errIdx)}
          className={`inline-block px-1 mx-0.5 rounded-md transition-all hover:scale-105 cursor-pointer ${severityHighlight[err.severity]}`}
          title={`${err.rule} — ${severityLabel(err.severity, lang)}`}
        >
          {tok}
        </button>
      );
    });
  };

  return (
    <div className="bg-card rounded-xl shadow-islamic p-4 space-y-4 border border-primary/20">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Sparkles size={18} />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground text-sm">
            {lang === 'ar' ? '🎯 مدقق التجويد الذكي' : '🎯 AI Tajweed Checker'}
          </h3>
          <p className="text-[10px] text-muted-foreground">
            {lang === 'ar' ? 'سجّل تلاوتك واحصل على تصحيح فوري لأخطاء التجويد' : 'Record your recitation and get instant tajweed corrections'}
          </p>
        </div>
      </div>

      {/* Surah + Verse picker */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setShowSurahPicker(v => !v)}
          className="flex items-center justify-between gap-1 px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-medium"
        >
          <span className="truncate font-arabic">{currentSurah?.name || ''}</span>
          <ChevronDown size={14} className={`transition-transform ${showSurahPicker ? 'rotate-180' : ''}`} />
        </button>
        <select
          value={selectedVerse}
          onChange={e => { setSelectedVerse(Number(e.target.value)); reset(); }}
          className="px-3 py-2 rounded-lg bg-muted text-foreground text-xs font-medium"
        >
          {Array.from({ length: currentSurah?.versesCount || 1 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>{lang === 'ar' ? `آية ${n}` : `Verse ${n}`}</option>
          ))}
        </select>
      </div>

      {showSurahPicker && (
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-1 space-y-0.5">
          {surahs.map(s => (
            <button
              key={s.id}
              onClick={() => { setSelectedSurah(s.id); setSelectedVerse(1); setShowSurahPicker(false); reset(); }}
              className={`w-full text-start px-3 py-1.5 rounded text-xs font-arabic ${
                selectedSurah === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
              }`}
            >
              {s.id}. {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Verse text */}
      {currentVerseText && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-muted-foreground">
              {lang === 'ar' ? 'النص الصحيح:' : 'Correct text:'}
            </p>
            {report && report.errors.length > 0 && (
              <p className="text-[9px] text-muted-foreground">
                {lang === 'ar' ? 'اضغط على الكلمة الملوّنة لعرض التصحيح' : 'Tap colored word for correction'}
              </p>
            )}
          </div>
          <p className="font-quran text-base text-foreground leading-loose text-right" dir="rtl">
            {renderHighlightedVerse()}
          </p>
          {report && report.errors.length > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/10 flex-wrap">
              <span className="text-[9px] text-muted-foreground">
                {lang === 'ar' ? 'الدلالة:' : 'Legend:'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/40 text-secondary-foreground">
                {lang === 'ar' ? 'بسيط' : 'Minor'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/40 text-accent-foreground">
                {lang === 'ar' ? 'متوسط' : 'Moderate'}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-destructive/25 text-destructive">
                {lang === 'ar' ? 'شديد' : 'Major'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Mic button */}
      <div className="flex flex-col items-center gap-2 py-2">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
            isRecording
              ? 'bg-destructive text-destructive-foreground animate-pulse'
              : 'bg-primary text-primary-foreground hover:scale-105'
          } disabled:opacity-50`}
        >
          {isRecording ? <MicOff size={26} /> : <Mic size={26} />}
        </button>
        <MicLevelIndicator active={isRecording} />
        <p className="text-[11px] text-muted-foreground">
          {isRecording
            ? (lang === 'ar' ? 'جاري الاستماع... اقرأ الآية' : 'Listening... recite the verse')
            : (lang === 'ar' ? 'اضغط للتسجيل' : 'Tap to record')}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-[10px] text-muted-foreground mb-1">
            {lang === 'ar' ? 'تلاوتك:' : 'Your recitation:'}
          </p>
          <p className="font-quran text-sm text-foreground leading-loose text-right" dir="rtl">
            {transcript}
          </p>
        </div>
      )}

      {/* Action buttons */}
      {transcript && !isRecording && !report && (
        <button
          onClick={analyze}
          disabled={isAnalyzing}
          className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
        >
          {isAnalyzing ? (
            <><Loader2 size={16} className="animate-spin" /> {lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}</>
          ) : (
            <><Sparkles size={16} /> {lang === 'ar' ? 'حلّل التجويد' : 'Check Tajweed'}</>
          )}
        </button>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-3 animate-fade-in">
          {/* Score card */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Award className="text-primary" size={18} />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {lang === 'ar' ? 'تقييم التجويد' : 'Tajweed Score'}
              </span>
            </div>
            <p className="text-3xl font-bold text-primary">{report.overallScore}<span className="text-base text-muted-foreground">/100</span></p>
            <p className="text-xs text-foreground mt-1 font-medium">{levelLabel(report.level, lang)}</p>
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{report.summary}</p>
          </div>

          {/* Strengths */}
          {report.strengths && report.strengths.length > 0 && (
            <div className="bg-secondary/10 border border-secondary/30 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <CheckCircle2 size={14} className="text-secondary-foreground" />
                <span className="text-xs font-semibold text-foreground">
                  {lang === 'ar' ? 'نقاط القوة' : 'Strengths'}
                </span>
              </div>
              <ul className="space-y-1">
                {report.strengths.map((s, i) => (
                  <li key={i} className="text-[11px] text-foreground flex gap-1.5">
                    <span className="text-secondary-foreground">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors */}
          {report.errors.length === 0 ? (
            <div className="bg-secondary/15 border border-secondary/30 rounded-lg p-4 text-center">
              <CheckCircle2 className="mx-auto text-secondary-foreground mb-1" size={24} />
              <p className="text-sm font-semibold text-foreground">
                {lang === 'ar' ? 'لا توجد أخطاء تجويد!' : 'No tajweed errors!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-destructive" />
                <span className="text-xs font-semibold text-foreground">
                  {lang === 'ar' ? `${report.errors.length} أخطاء تجويد` : `${report.errors.length} Tajweed Issues`}
                </span>
              </div>
              {report.errors.map((err, i) => {
                const expanded = expandedError === i;
                return (
                  <div key={i} className={`rounded-lg border ${severityStyles[err.severity]} overflow-hidden`}>
                    <button
                      onClick={() => setExpandedError(expanded ? null : i)}
                      className="w-full p-3 flex items-start gap-2 text-start"
                    >
                      <BookOpen size={16} className="shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold">{err.rule}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-background/40 font-semibold">
                            {severityLabel(err.severity, lang)}
                          </span>
                        </div>
                        <p className="text-[11px] mt-0.5 font-quran" dir="rtl">
                          {lang === 'ar' ? 'في كلمة: ' : 'In word: '}<strong>{err.word}</strong>
                        </p>
                      </div>
                      <ChevronDown size={14} className={`shrink-0 mt-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>
                    {expanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-current/10 pt-2 animate-fade-in">
                        <div>
                          <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                            {lang === 'ar' ? '✗ الخطأ:' : '✗ Issue:'}
                          </p>
                          <p className="text-[11px] leading-relaxed">{err.whatHappened}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                            {lang === 'ar' ? '✓ التصحيح:' : '✓ Correction:'}
                          </p>
                          <p className="text-[11px] leading-relaxed">{err.correction}</p>
                        </div>
                        {err.practiceTip && (
                          <div className="bg-background/40 rounded-md p-2">
                            <p className="text-[10px] font-semibold opacity-70 mb-0.5">
                              {lang === 'ar' ? '💡 تمرين:' : '💡 Practice:'}
                            </p>
                            <p className="text-[11px] leading-relaxed">{err.practiceTip}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={reset}
            className="w-full py-2.5 rounded-lg bg-muted text-foreground font-medium text-xs flex items-center justify-center gap-2 hover:bg-muted/80"
          >
            <RotateCcw size={14} /> {lang === 'ar' ? 'حاول مرة أخرى' : 'Try again'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TajweedChecker;