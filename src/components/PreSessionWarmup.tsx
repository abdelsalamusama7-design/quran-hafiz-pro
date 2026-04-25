import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Loader2, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Volume2, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import MicLevelIndicator from '@/components/MicLevelIndicator';

type Step = 'idle' | 'calibrating' | 'cal-done' | 'reciting' | 'analyzing' | 'done';

interface QuickReport {
  overallScore: number;
  level: string;
  errors: Array<{ rule: string; word: string; severity: string; correction: string }>;
  summary: string;
}

const SHORT_VERSES = [
  { surah: 1, verse: 1, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', label: 'البسملة' },
  { surah: 112, verse: 1, text: 'قُلْ هُوَ اللَّهُ أَحَدٌ', label: 'الإخلاص ١' },
  { surah: 113, verse: 1, text: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ', label: 'الفلق ١' },
  { surah: 114, verse: 1, text: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ', label: 'الناس ١' },
];

interface Props {
  onReady?: () => void;
}

const PreSessionWarmup = ({ onReady }: Props) => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState<Step>('idle');
  const [verseIdx, setVerseIdx] = useState(0);
  const verse = SHORT_VERSES[verseIdx];

  // Calibration
  const [calLevel, setCalLevel] = useState(0);
  const [calSeconds, setCalSeconds] = useState(0);
  const calStreamRef = useRef<MediaStream | null>(null);
  const calCtxRef = useRef<AudioContext | null>(null);
  const calRafRef = useRef<number | null>(null);

  // Recitation
  const [transcript, setTranscript] = useState('');
  const [report, setReport] = useState<QuickReport | null>(null);
  const recRef = useRef<any>(null);

  // ============ Calibration ============
  const startCalibration = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      calStreamRef.current = stream;
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new Ctx();
      calCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const start = Date.now();
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) sum += Math.abs(data[i] - 128);
        const level = Math.min(100, Math.round((sum / data.length) * 4));
        setCalLevel(level);
        const elapsed = (Date.now() - start) / 1000;
        setCalSeconds(elapsed);
        if (elapsed < 4) {
          calRafRef.current = requestAnimationFrame(tick);
        } else {
          stopCalibration();
          setStep('cal-done');
          if (level < 8) {
            toast({
              title: lang === 'ar' ? '🔇 الصوت منخفض' : '🔇 Low audio',
              description: lang === 'ar' ? 'حاول الاقتراب من الميكروفون أكثر' : 'Move closer to the mic',
            });
          }
        }
      };
      setStep('calibrating');
      tick();
    } catch (e) {
      toast({
        title: lang === 'ar' ? 'لا يمكن الوصول للميكروفون' : 'Mic access denied',
        variant: 'destructive',
      });
    }
  };

  const stopCalibration = () => {
    if (calRafRef.current) cancelAnimationFrame(calRafRef.current);
    calStreamRef.current?.getTracks().forEach(t => t.stop());
    calCtxRef.current?.close().catch(() => {});
    calStreamRef.current = null;
    calCtxRef.current = null;
  };

  useEffect(() => () => stopCalibration(), []);

  // ============ Recitation ============
  const startReciting = () => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: lang === 'ar' ? 'غير مدعوم' : 'Not supported', variant: 'destructive' });
      return;
    }
    const recognition = new SR();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

    const finalizedIdx = new Set<number>();
    const seenKeys = new Set<string>();
    let finalText = '';
    recognition.onresult = (e: any) => {
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0]?.transcript || '';
        if (res.isFinal) {
          if (finalizedIdx.has(i)) continue;
          const trimmed = t.trim();
          if (!trimmed) continue;
          const key = trimmed.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/\s+/g, ' ').toLowerCase();
          if (seenKeys.has(key)) { finalizedIdx.add(i); continue; }
          seenKeys.add(key);
          finalizedIdx.add(i);
          finalText += trimmed + ' ';
        } else if (i >= e.resultIndex) {
          interim += t;
        }
      }
      setTranscript((finalText + interim).trim());
    };
    recognition.onerror = () => setStep('cal-done');
    recognition.onend = () => {
      // Auto-stop after end (single segment fine)
    };
    recRef.current = recognition;
    setStep('reciting');
    setTranscript('');
    setReport(null);
    try { recognition.start(); } catch {}
  };

  const stopReciting = () => {
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    if (transcript.trim()) {
      analyze();
    } else {
      setStep('cal-done');
    }
  };

  const analyze = async () => {
    setStep('analyzing');
    try {
      const { data, error } = await supabase.functions.invoke('tajweed-check', {
        body: {
          userText: transcript,
          correctText: verse.text,
          surahName: verse.label,
          verseNumber: verse.verse,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data as QuickReport);
      setStep('done');
    } catch (e: any) {
      toast({
        title: lang === 'ar' ? 'فشل التحليل' : 'Analysis failed',
        description: e?.message || '',
        variant: 'destructive',
      });
      setStep('cal-done');
    }
  };

  const skipAndStart = () => {
    setOpen(false);
    onReady?.();
  };

  if (!open) return null;

  const goodMic = calLevel >= 8;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-2 border-amber-300/50 dark:border-amber-700/30 rounded-2xl p-4 space-y-3 animate-fade-in">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-sm">
              {lang === 'ar' ? '🚀 تجهيز سريع قبل البدء' : '🚀 Quick warm-up'}
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {lang === 'ar'
                ? 'معايرة الميكروفون + اختبار نطق آية قصيرة'
                : 'Mic check + quick pronunciation test'}
            </p>
          </div>
        </div>
        <button
          onClick={skipAndStart}
          className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded shrink-0"
        >
          {lang === 'ar' ? 'تخطي ←' : 'Skip →'}
        </button>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1">
        {['mic', 'recite', 'feedback'].map((s, i) => {
          const active =
            (i === 0 && (step === 'idle' || step === 'calibrating')) ||
            (i === 1 && (step === 'cal-done' || step === 'reciting')) ||
            (i === 2 && (step === 'analyzing' || step === 'done'));
          const completed =
            (i === 0 && ['cal-done', 'reciting', 'analyzing', 'done'].includes(step)) ||
            (i === 1 && ['analyzing', 'done'].includes(step)) ||
            (i === 2 && step === 'done');
          return (
            <div key={s} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${
                completed ? 'bg-primary' : active ? 'bg-primary/50' : 'bg-muted'
              }`} />
            </div>
          );
        })}
      </div>

      {/* STEP 1: Calibration */}
      {(step === 'idle' || step === 'calibrating') && (
        <div className="bg-card/60 rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Volume2 size={14} className="text-primary" />
            <p className="text-xs font-bold text-foreground">
              {lang === 'ar' ? '١. معايرة الميكروفون' : '1. Mic calibration'}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {lang === 'ar'
              ? 'تكلم بصوت مسموع لمدة ٤ ثوانٍ لقياس مستوى الصوت.'
              : 'Speak audibly for 4 seconds to measure your audio level.'}
          </p>
          {step === 'calibrating' && (
            <div className="space-y-2">
              <MicLevelIndicator active={true} />
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{lang === 'ar' ? `المستوى: ${calLevel}` : `Level: ${calLevel}`}</span>
                <span>{Math.max(0, 4 - calSeconds).toFixed(1)}s</span>
              </div>
            </div>
          )}
          {step === 'idle' && (
            <button
              onClick={startCalibration}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Mic size={14} /> {lang === 'ar' ? 'ابدأ المعايرة' : 'Start calibration'}
            </button>
          )}
        </div>
      )}

      {/* STEP 2: Recitation */}
      {(step === 'cal-done' || step === 'reciting') && (
        <div className="bg-card/60 rounded-xl p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {goodMic ? (
                <CheckCircle2 size={14} className="text-green-600" />
              ) : (
                <AlertTriangle size={14} className="text-amber-600" />
              )}
              <p className="text-xs font-bold text-foreground">
                {lang === 'ar' ? '٢. اختبار نطق سريع' : '2. Quick pronunciation test'}
              </p>
            </div>
            <button
              onClick={() => setVerseIdx((v) => (v + 1) % SHORT_VERSES.length)}
              disabled={step === 'reciting'}
              className="text-[10px] text-primary hover:underline flex items-center gap-1 disabled:opacity-40"
            >
              {lang === 'ar' ? 'آية أخرى' : 'Other verse'} <ChevronDown size={10} />
            </button>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-[9px] text-muted-foreground mb-1">{verse.label}</p>
            <p className="font-quran text-base text-foreground text-right leading-loose" dir="rtl">
              {verse.text}
            </p>
          </div>

          {transcript && (
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-[9px] text-muted-foreground mb-0.5">
                {lang === 'ar' ? 'تلاوتك:' : 'Your recitation:'}
              </p>
              <p className="font-quran text-sm text-foreground text-right" dir="rtl">{transcript}</p>
            </div>
          )}

          {step === 'reciting' ? (
            <button
              onClick={stopReciting}
              className="w-full py-2.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center gap-2 animate-pulse"
            >
              <MicOff size={14} /> {lang === 'ar' ? 'إيقاف وتحليل' : 'Stop & analyze'}
            </button>
          ) : (
            <button
              onClick={startReciting}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center gap-2 hover:opacity-90"
            >
              <Mic size={14} /> {lang === 'ar' ? 'ابدأ التلاوة' : 'Start reciting'}
            </button>
          )}
        </div>
      )}

      {/* STEP 3: Analyzing */}
      {step === 'analyzing' && (
        <div className="bg-card/60 rounded-xl p-4 flex items-center justify-center gap-2 text-foreground">
          <Loader2 size={16} className="animate-spin text-primary" />
          <span className="text-xs">{lang === 'ar' ? 'تحليل الأخطاء...' : 'Analyzing...'}</span>
        </div>
      )}

      {/* STEP 4: Report */}
      {step === 'done' && report && (
        <div className="space-y-2 animate-fade-in">
          <div className="bg-card rounded-xl p-3 text-center border border-primary/20">
            <p className="text-[10px] text-muted-foreground uppercase">{lang === 'ar' ? 'النتيجة' : 'Score'}</p>
            <p className="text-2xl font-bold text-primary">{report.overallScore}<span className="text-sm text-muted-foreground">/100</span></p>
            <p className="text-[11px] text-foreground mt-1">{report.summary}</p>
          </div>
          {report.errors.length > 0 ? (
            <div className="space-y-1">
              <p className="text-[11px] font-bold text-foreground">
                {lang === 'ar' ? 'أهم الملاحظات:' : 'Top issues:'}
              </p>
              {report.errors.slice(0, 3).map((err, i) => (
                <div key={i} className="bg-card rounded-lg p-2 border border-border/60">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-foreground">{err.rule}</span>
                    <span className="text-[9px] text-muted-foreground font-quran">({err.word})</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{err.correction}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
              <CheckCircle2 className="inline text-green-600" size={16} />
              <span className="text-[11px] font-bold text-foreground ms-1">
                {lang === 'ar' ? 'نطق ممتاز! ابدأ الجلسة' : 'Excellent! Start your session'}
              </span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => { setStep('cal-done'); setReport(null); setTranscript(''); }}
              className="flex-1 py-2 rounded-lg bg-muted text-foreground text-[11px] font-medium flex items-center justify-center gap-1.5"
            >
              <RefreshCw size={12} /> {lang === 'ar' ? 'إعادة' : 'Retry'}
            </button>
            <button
              onClick={skipAndStart}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold"
            >
              {lang === 'ar' ? 'ابدأ التسميع ←' : 'Start session →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreSessionWarmup;
