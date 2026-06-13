import { useState, useRef, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/PageHeader';
import MicLevelIndicator from '@/components/MicLevelIndicator';
import AudioQualityAlert from '@/components/AudioQualityAlert';
import { useAudioQuality, type AudioQuality } from '@/hooks/useAudioQuality';
import SessionSummaryModal, { type SessionSummary } from '@/components/SessionSummaryModal';
import MushafRecitationView from '@/components/MushafRecitationView';
import PreSessionWarmup from '@/components/PreSessionWarmup';
import StickyStartBar from '@/components/StickyStartBar';
import { surahs } from '@/data/surahs';
import { Mic, MicOff, Loader2, CheckCircle, AlertTriangle, RotateCcw, ChevronDown, Sparkles, Eye, EyeOff, Zap, MessageCircle, Volume2, VolumeX, RefreshCw, BookOpen, ListChecks, Trash2, Pencil, X, Check, Power } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { logActivity } from '@/lib/logActivity';

type Mode = 'live-listen' | 'auto-detect' | 'correct' | 'blind' | 'practice';

interface Mistake {
  type: 'pronunciation' | 'missing_word' | 'extra_word' | 'tajweed' | 'order';
  word: string;
  correction: string;
  explanation: string;
}

interface AnalysisResult {
  accuracy: number;
  mistakes: Mistake[];
  tajweedNotes?: string[];
  overallFeedback: string;
  tips: string[];
}

interface DetectedVerse {
  surahNumber: number;
  surahName: string;
  verseNumber: number;
  verseText: string;
  confidence: number;
}

interface LiveMessage {
  id: number;
  type: 'user' | 'agent' | 'system';
  text: string;
  status?: 'correct' | 'mistake' | 'forgot' | 'partial';
  wrongWord?: string;
  correctWord?: string;
  accuracy?: number;
  timestamp: Date;
}

const RecitationPage = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as Mode) || 'live-listen';
  const validModes: Mode[] = ['live-listen', 'auto-detect', 'correct', 'blind', 'practice'];
  const [mode, setMode] = useState<Mode>(
    validModes.includes(initialMode) ? initialMode : 'live-listen'
  );
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number>(1);
  const [verses, setVerses] = useState<{ number: number; text: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [detectedVerses, setDetectedVerses] = useState<DetectedVerse[]>([]);
  const [detectionFeedback, setDetectionFeedback] = useState('');
  const [showSurahPicker, setShowSurahPicker] = useState(false);
  const [showVerseText, setShowVerseText] = useState(true);
  const [blindRevealedWords, setBlindRevealedWords] = useState<Set<number>>(new Set());
  const recognitionRef = useRef<any>(null);

  // Live listening state
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [liveAccuracy, setLiveAccuracy] = useState<number | null>(null);
  const [voiceFeedback, setVoiceFeedback] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastProcessedRef = useRef('');
  const lastUserTextRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  const msgIdRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const liveRecognitionRef = useRef<any>(null);
  const isLiveListeningRef = useRef(false);
  // Track finalized result indices to avoid double-counting when browsers
  // re-emit results from before resultIndex (Chrome Android bug)
  const finalizedIndicesRef = useRef<Set<number>>(new Set());
  const seenFinalKeysRef = useRef<Set<string>>(new Set());
  // Visible log of accepted vs skipped (duplicate) chunks for the user
  const [transcriptLog, setTranscriptLog] = useState<Array<{
    id: number;
    text: string;
    status: 'final' | 'duplicate';
    timestamp: number;
  }>>([]);
  const logIdRef = useRef(0);
  const [showTranscriptLog, setShowTranscriptLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  // Show pre-session warmup once per session
  const [warmupDone, setWarmupDone] = useState(false);
  const isProcessingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveContextRef = useRef<{ surahId: number | null; verseNum: number; verseText: string; surahName: string }>({
    surahId: null, verseNum: 1, verseText: '', surahName: '',
  });
  const previousMistakesRef = useRef<string[]>([]);
  // Track mistakes for session summary (word -> count)
  const mistakeWordsRef = useRef<Map<string, number>>(new Map());

  // Auto-advance + session tracking
  const [versesCompleted, setVersesCompleted] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const sessionStartRef = useRef<number | null>(null);
  const accuracySumRef = useRef(0);
  const accuracyCountRef = useRef(0);
  const versesCompletedRef = useRef(0);
  const sessionSavedRef = useRef(false);

  // End-of-session summary
  const [sessionSummary, setSessionSummary] = useState<SessionSummary | null>(null);

  // Mushaf-style fullscreen reading view
  const [mushafOpen, setMushafOpen] = useState(false);

  // Structured mistakes list (for the mushaf view's "أخطاء" panel)
  const [sessionMistakes, setSessionMistakes] = useState<Array<{
    wrongWord?: string; correctWord?: string; message?: string; verseNumber?: number;
  }>>([]);

  // Keep refs in sync
  useEffect(() => { isLiveListeningRef.current = isLiveListening; }, [isLiveListening]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);
  useEffect(() => { versesCompletedRef.current = versesCompleted; }, [versesCompleted]);
  const autoAdvanceRef = useRef(autoAdvance);
  useEffect(() => { autoAdvanceRef.current = autoAdvance; }, [autoAdvance]);
  const versesRef = useRef(verses);
  useEffect(() => { versesRef.current = verses; }, [verses]);

  // === Audio quality monitoring (live-listen mode) ===
  const [qualityDismissed, setQualityDismissed] = useState(false);
  const [autoRestartCountdown, setAutoRestartCountdown] = useState<number | null>(null);
  const autoRestartTimerRef = useRef<number | null>(null);

  const cancelAutoRestart = useCallback(() => {
    if (autoRestartTimerRef.current) {
      window.clearInterval(autoRestartTimerRef.current);
      autoRestartTimerRef.current = null;
    }
    setAutoRestartCountdown(null);
  }, []);

  const handleQualityIssue = useCallback((q: AudioQuality) => {
    if (q === 'good' || q === 'idle') return;
    if (qualityDismissed) return;
    // Only auto-restart when there's actual evidence of a bad capture:
    //   • the session has been running long enough (>= 10s), AND
    //   • very few finalized STT segments were produced (low yield).
    // Pure background noise without a capture failure → just warn, don't restart.
    const elapsedSec = (Date.now() - (sessionStartRef.current || Date.now())) / 1000;
    const finalCount = finalizedIndicesRef.current.size;
    const lowYield = elapsedSec >= 10 && (finalCount === 0 || elapsedSec / Math.max(finalCount, 1) > 8);

    if ((q === 'silent' && elapsedSec >= 8) || (q === 'noisy' && lowYield)) {
      // Avoid stacking timers
      if (autoRestartTimerRef.current) return;
      let remaining = 6;
      setAutoRestartCountdown(remaining);
      autoRestartTimerRef.current = window.setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          cancelAutoRestart();
          // Soft restart: stop + restart listening to get a fresh stream
          if (isLiveListeningRef.current) {
            try { liveRecognitionRef.current?.abort?.(); } catch {}
            try { liveRecognitionRef.current?.stop(); } catch {}
            setTimeout(() => {
              if (isLiveListeningRef.current) {
                try { startLiveListening(); } catch {}
              }
            }, 400);
            toast({
              title: lang === 'ar' ? '🔄 إعادة تسجيل تلقائية' : '🔄 Auto-restart',
              description: lang === 'ar'
                ? `مقاطع منخفضة (${finalCount}) خلال ${Math.round(elapsedSec)}ث — أعدنا التسجيل.`
                : `Low capture (${finalCount} segments in ${Math.round(elapsedSec)}s) — restarted.`,
            });
          }
        } else {
          setAutoRestartCountdown(remaining);
        }
      }, 1000);
    } else if (q === 'noisy') {
      // Noise without low yield → passive warning only, no restart
      // (The AudioQualityAlert UI already reflects quality state.)
    }
    // 'low' → AudioQualityAlert handles the warning UI; no restart.
  }, [qualityDismissed, cancelAutoRestart, lang, toast]);

  // Load any saved mic-calibration thresholds (set once via the "Calibrate" button)
  const calOverrides = (() => {
    try {
      const raw = localStorage.getItem('hafiz_mic_calibration');
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return {
        silenceThreshold: typeof parsed.silenceThreshold === 'number' ? parsed.silenceThreshold : undefined,
        lowThreshold: typeof parsed.lowThreshold === 'number' ? parsed.lowThreshold : undefined,
      };
    } catch { return {}; }
  })();

  const audioQuality = useAudioQuality({
    active: isLiveListening && mode === 'live-listen',
    onIssue: handleQualityIssue,
    ...calOverrides,
  });

  // === Mic calibration (saves personalized sensitivity thresholds) ===
  const [calibrating, setCalibrating] = useState(false);
  const runMicCalibration = useCallback(async () => {
    if (calibrating) return;
    setCalibrating(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      const samples: number[] = [];
      const start = performance.now();
      const DURATION = 3500;
      toast({
        title: lang === 'ar' ? '🎚️ معايرة الميكروفون' : '🎚️ Calibrating mic',
        description: lang === 'ar' ? 'اقرأ "بسم الله الرحمن الرحيم" بصوت طبيعي…' : 'Recite "Bismillah..." in your normal voice…',
      });
      await new Promise<void>((resolve) => {
        const tick = () => {
          an.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          samples.push(Math.sqrt(sum / buf.length));
          if (performance.now() - start < DURATION) requestAnimationFrame(tick);
          else resolve();
        };
        tick();
      });
      stream.getTracks().forEach(t => t.stop());
      ctx.close().catch(() => {});

      if (samples.length < 10) {
        toast({ title: lang === 'ar' ? 'فشلت المعايرة' : 'Calibration failed', variant: 'destructive' });
        return;
      }
      // Robust stats: noise floor = 20th percentile, voice level = 70th percentile
      const sorted = [...samples].sort((a, b) => a - b);
      const floor = sorted[Math.floor(sorted.length * 0.20)] || 0;
      const voice = sorted[Math.floor(sorted.length * 0.70)] || 0;
      // Derive thresholds with safety bounds. Silence ≈ 1.6× noise floor; low ≈ 40% of voice.
      const silenceThreshold = Math.min(0.04, Math.max(0.005, floor * 1.6));
      const lowThreshold = Math.min(0.10, Math.max(silenceThreshold * 1.8, voice * 0.40));
      const payload = {
        silenceThreshold: +silenceThreshold.toFixed(4),
        lowThreshold: +lowThreshold.toFixed(4),
        floor: +floor.toFixed(4),
        voice: +voice.toFixed(4),
        savedAt: Date.now(),
      };
      localStorage.setItem('hafiz_mic_calibration', JSON.stringify(payload));
      toast({
        title: lang === 'ar' ? '✅ تمت المعايرة' : '✅ Calibrated',
        description: lang === 'ar'
          ? `حُفظت الحساسية تلقائيًا (سكون ${payload.silenceThreshold} / منخفض ${payload.lowThreshold}).`
          : `Sensitivity saved (silence ${payload.silenceThreshold} / low ${payload.lowThreshold}).`,
      });
    } catch {
      toast({
        title: lang === 'ar' ? 'لا يمكن الوصول للميكروفون' : 'Mic access denied',
        variant: 'destructive',
      });
    } finally {
      setCalibrating(false);
    }
  }, [calibrating, lang, toast]);

  // Reset dismissed flag + cancel pending restart whenever listening toggles
  useEffect(() => {
    if (!isLiveListening) {
      cancelAutoRestart();
      setQualityDismissed(false);
    }
  }, [isLiveListening, cancelAutoRestart]);

  // If quality recovers to 'good', cancel pending auto-restart
  useEffect(() => {
    if (audioQuality.quality === 'good' && autoRestartTimerRef.current) {
      cancelAutoRestart();
    }
  }, [audioQuality.quality, cancelAutoRestart]);

  useEffect(() => () => cancelAutoRestart(), [cancelAutoRestart]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveMessages]);

  const modes: { id: Mode; icon: any; labelAr: string; labelEn: string; descAr: string; descEn: string }[] = [
    { id: 'live-listen', icon: MessageCircle, labelAr: 'تسميع مباشر', labelEn: 'Live Listen', descAr: 'شيخ AI يسمعلك ويصحح فوراً', descEn: 'AI teacher listens & corrects live' },
    { id: 'auto-detect', icon: Sparkles, labelAr: 'اقرأ وأنا أتابعك', labelEn: 'Auto Detect', descAr: 'اقرأ أي آية وسأحددها تلقائياً', descEn: 'Read any verse and I\'ll identify it' },
    { id: 'correct', icon: Mic, labelAr: 'تصحيح التلاوة', labelEn: 'Correction', descAr: 'اختر آية وسجّل تلاوتك', descEn: 'Select a verse and record' },
    { id: 'blind', icon: EyeOff, labelAr: 'حفظ بدون نظر', labelEn: 'Blind Mode', descAr: 'اختبر حفظك بدون رؤية النص', descEn: 'Test memorization without seeing text' },
    { id: 'practice', icon: Zap, labelAr: 'وضع التمرين', labelEn: 'Practice', descAr: 'تدرب على سورة كاملة', descEn: 'Practice a full surah' },
  ];

  const fetchVerses = useCallback((surahId: number) => {
    fetch(`https://api.alquran.cloud/v1/surah/${surahId}`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setVerses(data.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
        }
      })
      .catch(() => {});
  }, []);

  // Speech synthesis for voice feedback
  const speak = useCallback((text: string) => {
    if (!voiceFeedback) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    // Try to find Arabic voice
    const voices = synth.getVoices();
    const arVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arVoice) utterance.voice = arVoice;
    synth.speak(utterance);
  }, [voiceFeedback]);

  // === LIVE LISTENING FUNCTIONS ===
  const addLiveMessage = useCallback((msg: Omit<LiveMessage, 'id' | 'timestamp'>) => {
    const newMsg: LiveMessage = { ...msg, id: ++msgIdRef.current, timestamp: new Date() };
    setLiveMessages(prev => [...prev, newMsg]);
    return newMsg;
  }, []);

  const sendLiveCorrection = useCallback(async (userText: string) => {
    if (isProcessingRef.current) return;
    const ctx = liveContextRef.current;
    if (!ctx.surahId || !ctx.verseText) return;

    const trimmed = userText.trim();
    // Don't re-process same text
    if (!trimmed || trimmed === lastProcessedRef.current) return;
    lastProcessedRef.current = trimmed;

    setIsProcessing(true);
    isProcessingRef.current = true;
    try {
      const previousCorrections = previousMistakesRef.current.slice(-3).join(' | ');

      const { data, error } = await supabase.functions.invoke('live-correct', {
        body: {
          userText: trimmed,
          expectedText: ctx.verseText,
          surahName: ctx.surahName,
          verseNumber: ctx.verseNum,
          previousCorrections: previousCorrections || undefined,
        },
      });

      if (error) throw error;

      if (data?.message) {
        const newMsg: LiveMessage = {
          id: ++msgIdRef.current,
          type: 'agent',
          text: data.message,
          status: data.status,
          wrongWord: data.wrongWord,
          correctWord: data.correctWord,
          accuracy: data.accuracy,
          timestamp: new Date(),
        };
        setLiveMessages(prev => [...prev, newMsg]);

        if (data.status === 'mistake') {
          previousMistakesRef.current.push(data.message);
          // Track for session summary (use the wrong word if available, else first word of message)
          const mistakeKey = (data.wrongWord || data.correctWord || '').trim();
          if (mistakeKey) {
            const map = mistakeWordsRef.current;
            map.set(mistakeKey, (map.get(mistakeKey) || 0) + 1);
          }
          // Track for the Mushaf-view "أخطاء" drawer
          setSessionMistakes(prev => [...prev, {
            wrongWord: data.wrongWord,
            correctWord: data.correctWord,
            message: data.message,
            verseNumber: ctx.verseNum,
          }]);
        }

        if (data.accuracy !== undefined) {
          setLiveAccuracy(data.accuracy);
          accuracySumRef.current += data.accuracy;
          accuracyCountRef.current += 1;
        }

        // Voice feedback
        if (data.status === 'mistake' && data.message) {
          speak(data.message);
        } else if (data.status === 'forgot' && data.correctWord) {
          speak(data.correctWord);
        }

        // === AUTO-ADVANCE on high accuracy ===
        if (autoAdvanceRef.current && data.status === 'correct' && (data.accuracy ?? 0) >= 85) {
          // Mark verse as completed
          setVersesCompleted(c => c + 1);
          versesCompletedRef.current += 1;

          const completedVerseNum = ctx.verseNum;
          const surahId = ctx.surahId;
          const surah = surahs.find(s => s.id === surahId);
          const allVerses = versesRef.current;
          const nextVerse = allVerses.find(v => v.number === completedVerseNum + 1);

          if (nextVerse) {
            // Add encouragement system message
            setLiveMessages(prev => [...prev, {
              id: ++msgIdRef.current,
              type: 'system',
              text: lang === 'ar'
                ? `🎉 أحسنت! انتقال تلقائي للآية ${nextVerse.number}`
                : `🎉 Excellent! Auto-advancing to verse ${nextVerse.number}`,
              timestamp: new Date(),
            }]);
            speak(lang === 'ar' ? 'أحسنت، الآية التالية' : 'Excellent, next verse');

            // Update verse selection + context after a brief pause
            setTimeout(() => {
              setSelectedVerse(nextVerse.number);
              liveContextRef.current = {
                surahId,
                verseNum: nextVerse.number,
                verseText: nextVerse.text,
                surahName: surah?.name || ctx.surahName,
              };
              // Reset per-verse buffers but keep session running
              lastProcessedRef.current = '';
              lastUserTextRef.current = '';
              accumulatedTranscriptRef.current = '';
              previousMistakesRef.current = [];
            }, 1200);
          } else {
            // Reached end of surah
            setLiveMessages(prev => [...prev, {
              id: ++msgIdRef.current,
              type: 'system',
              text: lang === 'ar'
                ? `🌟 ما شاء الله! أتممت سورة ${surah?.name}`
                : `🌟 MashaAllah! You completed Surah ${surah?.nameEn}`,
              timestamp: new Date(),
            }]);
            speak(lang === 'ar' ? 'ما شاء الله، أتممت السورة' : 'MashaAllah');
          }
        }
      }
    } catch (err: any) {
      console.error('Live correction error:', err);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [speak]);

  const startLiveListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: lang === 'ar' ? 'غير مدعوم' : 'Not supported', description: lang === 'ar' ? 'استخدم Chrome' : 'Use Chrome', variant: 'destructive' });
      return;
    }

    if (!selectedSurah || verses.length === 0) {
      toast({ title: lang === 'ar' ? 'اختر سورة أولاً' : 'Select a Surah first', variant: 'destructive' });
      return;
    }

    const verse = verses.find(v => v.number === selectedVerse);
    if (!verse) return;
    const surah = surahs.find(s => s.id === selectedSurah);

    // Proactively request mic permission so user gets the prompt explicitly.
    // Some browsers silently block speech recognition without this.
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => stream.getTracks().forEach(t => t.stop()))
        .catch(() => {
          toast({
            title: lang === 'ar' ? '🎙️ يحتاج الإذن للميكروفون' : '🎙️ Mic permission needed',
            description: lang === 'ar' ? 'اسمح للمتصفح باستخدام الميكروفون ثم اضغط ابدأ مرة أخرى' : 'Allow microphone access then press start again',
            variant: 'destructive',
          });
        });
    }

    // Reset state for new session
    setLiveMessages([]);
    setLiveAccuracy(null);
    setVersesCompleted(0);
    versesCompletedRef.current = 0;
    accuracySumRef.current = 0;
    accuracyCountRef.current = 0;
    sessionStartRef.current = Date.now();
    sessionSavedRef.current = false;
    lastProcessedRef.current = '';
    lastUserTextRef.current = '';
    accumulatedTranscriptRef.current = '';
    msgIdRef.current = 0;
    previousMistakesRef.current = [];
    mistakeWordsRef.current = new Map();
    setSessionSummary(null);
    setSessionMistakes([]);
    finalizedIndicesRef.current = new Set();
    seenFinalKeysRef.current = new Set();
    setTranscriptLog([]);
    logIdRef.current = 0;

    // Update context ref
    liveContextRef.current = {
      surahId: selectedSurah,
      verseNum: selectedVerse,
      verseText: verse.text,
      surahName: surah?.name || '',
    };

    setLiveMessages([{
      id: ++msgIdRef.current,
      type: 'system',
      text: lang === 'ar'
        ? `🎧 بسم الله، ابدأ تلاوة الآية ${selectedVerse} من سورة ${surah?.name}. أنا أستمع لك...`
        : `🎧 Start reciting verse ${selectedVerse} of ${surah?.nameEn}. I'm listening...`,
      timestamp: new Date(),
    }]);

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      // Robust: iterate ALL results and skip ones we've already finalized.
      // Also dedupe by normalized text content (some browsers re-emit identical
      // finals across restarts). This eliminates the duplicated/garbled text.
      let newFinalText = '';
      const newLogEntries: Array<{ id: number; text: string; status: 'final' | 'duplicate'; timestamp: number }> = [];
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (!res.isFinal) continue;
        if (finalizedIndicesRef.current.has(i)) continue;
        const text = (res[0]?.transcript || '').trim();
        if (!text) continue;
        const key = text.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/\s+/g, ' ').toLowerCase();
        if (seenFinalKeysRef.current.has(key)) {
          finalizedIndicesRef.current.add(i);
          newLogEntries.push({ id: ++logIdRef.current, text, status: 'duplicate', timestamp: Date.now() });
          continue;
        }
        seenFinalKeysRef.current.add(key);
        finalizedIndicesRef.current.add(i);
        newFinalText += text + ' ';
        newLogEntries.push({ id: ++logIdRef.current, text, status: 'final', timestamp: Date.now() });
      }

      if (newLogEntries.length) {
        setTranscriptLog(prev => [...prev, ...newLogEntries]);
      }

      const finalTrimmed = newFinalText.trim();
      if (!finalTrimmed) return;
      lastUserTextRef.current = finalTrimmed;

      // Accumulate transcript
      accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + finalTrimmed).trim();
      setTranscript(accumulatedTranscriptRef.current);

      // Add user message (only if different from last user message in list)
      setLiveMessages(prev => {
        const lastUserMsg = [...prev].reverse().find(m => m.type === 'user');
        if (lastUserMsg && lastUserMsg.text === finalTrimmed) return prev;
        return [...prev, {
          id: ++msgIdRef.current,
          type: 'user',
          text: finalTrimmed,
          timestamp: new Date(),
        }];
      });

      // Debounce AI correction
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        sendLiveCorrection(accumulatedTranscriptRef.current);
      }, 900);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        setLiveMessages(prev => [...prev, {
          id: ++msgIdRef.current,
          type: 'system',
          text: lang === 'ar' ? '⚠️ خطأ في التسجيل' : '⚠️ Recording error',
          timestamp: new Date(),
        }]);
      }
    };

    recognition.onend = () => {
      // Auto-restart if still meant to be listening. Reset the per-session
      // index dedupe because the new session restarts indices from 0.
      if (isLiveListeningRef.current) {
        finalizedIndicesRef.current = new Set();
        try { recognition.start(); } catch {}
      }
    };

    liveRecognitionRef.current = recognition;
    isLiveListeningRef.current = true;
    setIsLiveListening(true);
    try {
      recognition.start();
      toast({
        title: lang === 'ar' ? '✅ بدأ التسميع' : '✅ Started',
        description: lang === 'ar' ? 'اقرأ بصوت واضح' : 'Read clearly',
      });
    } catch (err) {
      toast({
        title: lang === 'ar' ? '⚠️ تعذّر بدء التسميع' : '⚠️ Could not start',
        description: lang === 'ar' ? 'حاول مرة أخرى' : 'Please try again',
        variant: 'destructive',
      });
    }
  }, [selectedSurah, selectedVerse, verses, lang, toast, sendLiveCorrection]);

  const stopLiveListening = useCallback(() => {
    isLiveListeningRef.current = false;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    try { liveRecognitionRef.current?.stop(); } catch {}
    liveRecognitionRef.current = null;
    setIsLiveListening(false);
    window.speechSynthesis.cancel();

    // Save session to child_activity_logs (with offline queue fallback)
    const completed = versesCompletedRef.current;
    const avgAccuracy = accuracyCountRef.current > 0
      ? Math.round(accuracySumRef.current / accuracyCountRef.current)
      : (liveAccuracy ?? 0);
    const durationMin = sessionStartRef.current
      ? Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000))
      : 1;
    const points = completed * 10 + Math.round(avgAccuracy / 10);

    if (!sessionSavedRef.current && (completed > 0 || accuracyCountRef.current > 0)) {
      sessionSavedRef.current = true;
      const ctx = liveContextRef.current;
      void logActivity({
        activityType: 'live_recitation',
        surahNumber: ctx.surahId,
        versesCount: completed,
        durationMinutes: durationMin,
        pointsEarned: points,
        notes: `Avg accuracy: ${avgAccuracy}%`,
      }).then((res) => {
        if (res.queued) {
          toast({
            title: lang === 'ar' ? '💾 تم الحفظ محلياً' : '💾 Saved locally',
            description: lang === 'ar' ? 'سيُرفع تلقائياً عند رجوع الاتصال' : 'Will sync when online',
          });
        }
      });
    }

    setLiveMessages(prev => [...prev, {
      id: ++msgIdRef.current,
      type: 'system',
      text: lang === 'ar'
        ? `✅ انتهى التسميع - ${completed} آية مكتملة - دقة ${avgAccuracy}%`
        : `✅ Session ended - ${completed} verses completed - ${avgAccuracy}% accuracy`,
      timestamp: new Date(),
    }]);

    // Build interactive session summary if user actually recited something
    if (completed > 0 || accuracyCountRef.current > 0) {
      const topMistakes = Array.from(mistakeWordsRef.current.entries())
        .map(([word, count]) => ({ word, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      const ctx = liveContextRef.current;
      const surah = surahs.find(s => s.id === ctx.surahId);
      setSessionSummary({
        surahName: lang === 'ar' ? (surah?.name || ctx.surahName) : (surah?.nameEn || ctx.surahName),
        versesCompleted: completed,
        averageAccuracy: avgAccuracy,
        durationMinutes: durationMin,
        topMistakes,
        pointsEarned: points,
      });
    }
  }, [lang, liveAccuracy, toast]);

  // Quick reset: clear chat and state, keep listening if active
  const resetLiveSession = useCallback(() => {
    // Cancel pending debounce + speech
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    window.speechSynthesis.cancel();

    // Reset all session refs
    lastProcessedRef.current = '';
    lastUserTextRef.current = '';
    accumulatedTranscriptRef.current = '';
    previousMistakesRef.current = [];
    msgIdRef.current = 0;
    finalizedIndicesRef.current = new Set();
    seenFinalKeysRef.current = new Set();
    setTranscriptLog([]);
    logIdRef.current = 0;
    setEditingLogId(null);
    setEditingText('');

    // Reset visible state
    setLiveAccuracy(null);
    setTranscript('');
    setIsProcessing(false);
    isProcessingRef.current = false;

    const surah = surahs.find(s => s.id === selectedSurah);
    const stillListening = isLiveListeningRef.current;

    setLiveMessages([{
      id: ++msgIdRef.current,
      type: 'system',
      text: stillListening
        ? (lang === 'ar'
            ? `🔄 تم إعادة التعيين. ابدأ التلاوة من جديد للآية ${selectedVerse} من سورة ${surah?.name}...`
            : `🔄 Reset. Start reciting verse ${selectedVerse} of ${surah?.nameEn}...`)
        : (lang === 'ar' ? '🔄 تم مسح المحادثة' : '🔄 Chat cleared'),
      timestamp: new Date(),
    }]);

    toast({
      title: lang === 'ar' ? '✅ تمت إعادة التعيين' : '✅ Reset complete',
      description: stillListening
        ? (lang === 'ar' ? 'استمر في التلاوة' : 'Continue reciting')
        : (lang === 'ar' ? 'اضغط ابدأ التسميع' : 'Press start to begin'),
    });
  }, [lang, selectedSurah, selectedVerse, toast]);

  // HARD restart: stop any auto-restart loop, clear everything, optionally restart fresh
  const hardRestartLive = useCallback(() => {
    // 1. Tell auto-restart loop to die
    isLiveListeningRef.current = false;
    setIsLiveListening(false);
    // 2. Cancel pending work
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    window.speechSynthesis.cancel();
    // 3. Stop the recognition object cleanly
    try { liveRecognitionRef.current?.abort?.(); } catch {}
    try { liveRecognitionRef.current?.stop(); } catch {}
    liveRecognitionRef.current = null;
    // 4. Clear ALL state and dedupe
    lastProcessedRef.current = '';
    lastUserTextRef.current = '';
    accumulatedTranscriptRef.current = '';
    previousMistakesRef.current = [];
    finalizedIndicesRef.current = new Set();
    seenFinalKeysRef.current = new Set();
    msgIdRef.current = 0;
    logIdRef.current = 0;
    setLiveMessages([]);
    setTranscriptLog([]);
    setTranscript('');
    setLiveAccuracy(null);
    setIsProcessing(false);
    isProcessingRef.current = false;
    setEditingLogId(null);
    setEditingText('');
    toast({
      title: lang === 'ar' ? '🔌 إعادة تشغيل آمن' : '🔌 Safe restart',
      description: lang === 'ar' ? 'تم إيقاف كل الحلقات. اضغط ابدأ من جديد.' : 'All loops stopped. Press start to begin.',
    });
  }, [lang, toast]);

  // Edit / delete a transcript log entry. Edits to a 'final' entry rebuild
  // accumulatedTranscript so subsequent AI calls use the corrected text.
  const updateLogEntry = useCallback((id: number, newText: string) => {
    setTranscriptLog(prev => {
      const next = prev.map(e => e.id === id ? { ...e, text: newText } : e);
      // Rebuild accumulated transcript from final entries only
      const rebuilt = next.filter(e => e.status === 'final').map(e => e.text).join(' ').trim();
      accumulatedTranscriptRef.current = rebuilt;
      setTranscript(rebuilt);
      return next;
    });
  }, []);

  const deleteLogEntry = useCallback((id: number) => {
    setTranscriptLog(prev => {
      const next = prev.filter(e => e.id !== id);
      const rebuilt = next.filter(e => e.status === 'final').map(e => e.text).join(' ').trim();
      accumulatedTranscriptRef.current = rebuilt;
      setTranscript(rebuilt);
      // Also clean dedupe key for the deleted entry so it can be re-captured if user repeats
      const removed = prev.find(e => e.id === id);
      if (removed) {
        const key = removed.text.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/\s+/g, ' ').toLowerCase();
        seenFinalKeysRef.current.delete(key);
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isLiveListeningRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      try { liveRecognitionRef.current?.stop(); } catch {}
      try { recognitionRef.current?.stop(); } catch {}
      window.speechSynthesis.cancel();
    };
  }, []);

  // === EXISTING FUNCTIONS ===
  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: lang === 'ar' ? 'غير مدعوم' : 'Not supported', description: lang === 'ar' ? 'استخدم Chrome' : 'Use Chrome', variant: 'destructive' });
      return;
    }

    // Proactively request mic permission for explicit prompt
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => stream.getTracks().forEach(t => t.stop()))
        .catch(() => {
          toast({
            title: lang === 'ar' ? '🎙️ يحتاج إذن الميكروفون' : '🎙️ Mic permission needed',
            description: lang === 'ar' ? 'اسمح للمتصفح ثم اضغط ابدأ مرة أخرى' : 'Allow access then press start again',
            variant: 'destructive',
          });
        });
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

    // Per-session dedupe of finalized indices + content keys
    const localFinalized = new Set<number>();
    const localSeenKeys = new Set<string>();
    let finalTranscript = '';
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        const text = (res[0]?.transcript || '');
        if (res.isFinal) {
          if (localFinalized.has(i)) continue;
          const trimmed = text.trim();
          if (!trimmed) continue;
          const key = trimmed.replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/\s+/g, ' ').toLowerCase();
          if (localSeenKeys.has(key)) {
            localFinalized.add(i);
            continue;
          }
          localSeenKeys.add(key);
          localFinalized.add(i);
          finalTranscript += trimmed + ' ';
        } else if (i >= event.resultIndex) {
          // Only show currently-active interim (latest segment)
          interim += text;
        }
      }
      setTranscript((finalTranscript + interim).trim());
    };

    recognition.onerror = (e: any) => {
      setIsRecording(false);
      if (e?.error && e.error !== 'no-speech' && e.error !== 'aborted') {
        toast({
          title: lang === 'ar' ? '⚠️ خطأ في التسجيل' : '⚠️ Recording error',
          description: lang === 'ar' ? 'حاول مرة أخرى' : 'Please try again',
          variant: 'destructive',
        });
      }
    };
    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) setTranscript(finalTranscript.trim());
      localFinalized.clear();
      localSeenKeys.clear();
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsRecording(true);
      toast({
        title: lang === 'ar' ? '✅ بدأ التسجيل' : '✅ Recording started',
        description: lang === 'ar' ? 'اقرأ بصوت واضح' : 'Read clearly',
      });
    } catch {
      toast({
        title: lang === 'ar' ? '⚠️ تعذّر بدء التسجيل' : '⚠️ Could not start',
        variant: 'destructive',
      });
    }
    setResult(null);
    setDetectedVerses([]);
    setDetectionFeedback('');
    setTranscript('');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    toast({
      title: lang === 'ar' ? '⏹️ تم الإيقاف' : '⏹️ Stopped',
      description: lang === 'ar' ? 'يمكنك الآن تحليل التلاوة' : 'You can now analyze',
    });
  };

  const autoDetectVerse = async () => {
    if (!transcript.trim()) return;
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('detect-verse', {
        body: { userText: transcript.trim() },
      });
      if (error) throw error;
      setDetectedVerses(data.detected || []);
      setDetectionFeedback(data.feedback || '');
    } catch (err: any) {
      toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeRecitation = async () => {
    if (!transcript.trim() || !selectedSurah) return;
    const verse = verses.find(v => v.number === selectedVerse);
    if (!verse) return;
    const surah = surahs.find(s => s.id === selectedSurah);
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-recitation', {
        body: { userText: transcript.trim(), correctText: verse.text, surahName: surah?.name || '', verseNumber: selectedVerse },
      });
      if (error) throw error;
      setResult(data as AnalysisResult);
    } catch (err: any) {
      toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getBlindWords = () => {
    const verse = verses.find(v => v.number === selectedVerse);
    if (!verse) return [];
    return verse.text.split(' ');
  };

  const toggleBlindWord = (index: number) => {
    setBlindRevealedWords(prev => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const mistakeTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pronunciation: { ar: '🗣️ نطق', en: 'Pronunciation' },
      missing_word: { ar: '⬜ كلمة ناقصة', en: 'Missing Word' },
      extra_word: { ar: '➕ كلمة زائدة', en: 'Extra Word' },
      tajweed: { ar: '📖 تجويد', en: 'Tajweed' },
      order: { ar: '🔄 ترتيب', en: 'Order' },
    };
    return labels[type]?.[lang] || type;
  };

  const mistakeColor = (type: string) => {
    switch (type) {
      case 'pronunciation': return 'bg-destructive/10 text-destructive';
      case 'tajweed': return 'bg-accent/20 text-accent-foreground';
      case 'missing_word': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      case 'extra_word': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const needsSurahSelection = mode === 'correct' || mode === 'blind' || mode === 'practice' || mode === 'live-listen';

  const resetAll = () => {
    setResult(null);
    setTranscript('');
    setDetectedVerses([]);
    setDetectionFeedback('');
    setBlindRevealedWords(new Set());
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'correct': return '✅';
      case 'mistake': return '❌';
      case 'forgot': return '💡';
      case 'partial': return '⚠️';
      default: return '💬';
    }
  };

  const getStatusBg = (status?: string) => {
    switch (status) {
      case 'correct': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
      case 'mistake': return 'bg-destructive/5 border-destructive/20';
      case 'forgot': return 'bg-accent/10 border-accent/30';
      default: return 'bg-card border-border';
    }
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <PageHeader title={lang === 'ar' ? '🎤 تصحيح التلاوة' : '🎤 Recitation'} />

      {/* === STICKY TOP ACTION BAR — always-visible Start/Stop button === */}
      {(() => {
        const isLive = mode === 'live-listen';
        const liveReady = !!selectedSurah && verses.length > 0;
        const otherReady = mode === 'auto-detect' || ((mode === 'correct' || mode === 'blind' || mode === 'practice') && !!selectedSurah && verses.length > 0);
        const showLive = isLive && liveReady;
        const showOther = !isLive && otherReady;
        if (!showLive && !showOther) return null;

        const active = isLive ? isLiveListening : isRecording;
        const onStart = isLive ? startLiveListening : startRecording;
        const onStop = isLive ? stopLiveListening : stopRecording;
        const startLabel = lang === 'ar' ? '🎤 ابدأ التسميع' : '🎤 Start Recitation';
        const stopLabel = lang === 'ar' ? '⏹️ إيقاف التسميع' : '⏹️ Stop';

        return (
          <StickyStartBar
            active={active}
            onStart={onStart}
            onStop={onStop}
            disabled={isAnalyzing}
            startLabel={startLabel}
            stopLabel={stopLabel}
            activeHint={lang === 'ar' ? '🔴 يستمع الآن... اقرأ بصوت واضح' : '🔴 Listening... read clearly'}
          />
        );
      })()}

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-2">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); resetAll(); setLiveMessages([]); setLiveAccuracy(null); if (isLiveListening) stopLiveListening(); }}
            className={`p-3 rounded-xl text-start transition-all ${
              mode === m.id
                ? m.id === 'live-listen'
                  ? 'bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground shadow-lg scale-[1.02]'
                  : 'bg-primary text-primary-foreground shadow-lg scale-[1.02]'
                : 'bg-card text-foreground shadow-islamic hover:bg-muted'
            }`}
          >
            <m.icon size={18} className="mb-1" />
            <p className="text-sm font-bold font-arabic">{lang === 'ar' ? m.labelAr : m.labelEn}</p>
            <p className="text-[10px] opacity-70 mt-0.5">{lang === 'ar' ? m.descAr : m.descEn}</p>
          </button>
        ))}
      </div>

      {/* Surah Picker (for modes that need it) */}
      {needsSurahSelection && (
        <div className="bg-card rounded-xl p-4 shadow-islamic">
          <button onClick={() => setShowSurahPicker(!showSurahPicker)} className="w-full flex items-center justify-between">
            <span className="font-semibold text-foreground font-arabic">
              {selectedSurah ? surahs.find(s => s.id === selectedSurah)?.name : (lang === 'ar' ? 'اختر سورة' : 'Select Surah')}
            </span>
            <ChevronDown size={18} className={`text-muted-foreground transition-transform ${showSurahPicker ? 'rotate-180' : ''}`} />
          </button>
          {showSurahPicker && (
            <div className="mt-3 max-h-48 overflow-y-auto space-y-1">
              {surahs.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedSurah(s.id); setSelectedVerse(1); setShowSurahPicker(false); resetAll(); setLiveMessages([]); fetchVerses(s.id); }}
                  className={`w-full text-start px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSurah === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="font-arabic">{s.id}. {s.name}</span>
                  <span className="text-xs opacity-60 ms-2">{s.nameEn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Verse selector (correct, blind, live-listen) */}
      {(mode === 'correct' || mode === 'blind' || mode === 'live-listen') && selectedSurah && verses.length > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-islamic">
          <p className="text-xs text-muted-foreground mb-2">{lang === 'ar' ? 'اختر الآية' : 'Select Verse'}</p>
          <div className="flex gap-1.5 flex-wrap">
            {verses.map(v => (
              <button
                key={v.number}
                onClick={() => { setSelectedVerse(v.number); resetAll(); setLiveMessages([]); }}
                className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                  selectedVerse === v.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {v.number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === LIVE LISTEN MODE === */}
      {mode === 'live-listen' && selectedSurah && verses.length > 0 && (
        <div className="space-y-4">
          {/* Pre-session warmup (mic calibration + quick pronunciation test) */}
          {!warmupDone && (
            <PreSessionWarmup onReady={() => setWarmupDone(true)} />
          )}

          {/* Open fullscreen Mushaf-style reading view */}
          <button
            onClick={() => setMushafOpen(true)}
            className="w-full py-3 bg-gradient-to-r from-accent/20 to-primary/10 border-2 border-primary/30 rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm"
          >
            <BookOpen size={18} className="text-primary" />
            <span className="font-bold text-foreground font-arabic">
              {lang === 'ar' ? '📖 افتح المصحف للتسميع' : '📖 Open Mushaf View'}
            </span>
          </button>

          {/* Current verse display */}
          <div className="bg-card rounded-xl p-4 shadow-islamic">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{lang === 'ar' ? `الآية ${selectedVerse}` : `Verse ${selectedVerse}`}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowVerseText(!showVerseText)} className="text-muted-foreground">
                  {showVerseText ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <button onClick={() => setVoiceFeedback(!voiceFeedback)} className="text-muted-foreground">
                  {voiceFeedback ? <Volume2 size={16} className="text-primary" /> : <VolumeX size={16} />}
                </button>
              </div>
            </div>
            {showVerseText && (
              <p className="font-quran text-lg leading-[2] text-foreground text-center" dir="rtl">
                {verses.find(v => v.number === selectedVerse)?.text}
              </p>
            )}
          </div>

          {/* Stats row: accuracy + verses completed + auto-advance toggle */}
          <div className="grid grid-cols-3 gap-2">
            <div className={`rounded-xl p-2.5 text-center ${
              liveAccuracy === null ? 'bg-muted text-muted-foreground' :
              liveAccuracy >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300' :
              liveAccuracy >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300' :
              'bg-destructive/10 text-destructive'
            }`}>
              <p className="text-[10px] opacity-80">{lang === 'ar' ? 'الدقة' : 'Accuracy'}</p>
              <p className="text-lg font-bold">{liveAccuracy !== null ? `${liveAccuracy}%` : '—'}</p>
            </div>
            <div className="rounded-xl p-2.5 text-center bg-primary/10 text-primary">
              <p className="text-[10px] opacity-80">{lang === 'ar' ? 'آيات مكتملة' : 'Completed'}</p>
              <p className="text-lg font-bold">{versesCompleted}</p>
            </div>
            <button
              onClick={() => setAutoAdvance(v => !v)}
              className={`rounded-xl p-2.5 text-center transition-all ${
                autoAdvance ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
              }`}
            >
              <p className="text-[10px] opacity-80">{lang === 'ar' ? 'انتقال تلقائي' : 'Auto-advance'}</p>
              <p className="text-xs font-bold mt-0.5">{autoAdvance ? (lang === 'ar' ? '✓ مُفعّل' : '✓ ON') : (lang === 'ar' ? 'مُعطّل' : 'OFF')}</p>
            </button>
          </div>

          {/* Chat area */}
          <div className="bg-card rounded-xl shadow-islamic overflow-hidden">
            <div className="bg-gradient-to-r from-primary to-emerald-600 px-4 py-3 flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isLiveListening ? 'bg-green-300 animate-pulse' : 'bg-muted-foreground/50'}`} />
              <span className="text-primary-foreground font-bold text-sm">
                {lang === 'ar' ? '🎧 الشيخ AI - التسميع المباشر' : '🎧 AI Sheikh - Live Listening'}
              </span>
              <div className="ms-auto flex items-center gap-2">
                {isProcessing && <Loader2 size={14} className="text-primary-foreground animate-spin" />}
                {liveMessages.length > 0 && (
                  <button
                    onClick={resetLiveSession}
                    title={lang === 'ar' ? 'إعادة تعيين سريع' : 'Quick reset'}
                    className="p-1.5 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 active:scale-90 transition-all"
                  >
                    <RefreshCw size={14} className="text-primary-foreground" />
                  </button>
                )}
              </div>
            </div>

            <div className="h-72 overflow-y-auto p-3 space-y-3 bg-muted/20">
              {liveMessages.length === 0 && !isLiveListening && (
                <div className="text-center text-muted-foreground text-sm py-12">
                  <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
                  <p>{lang === 'ar' ? 'اضغط "ابدأ التسميع" لتبدأ' : 'Press "Start" to begin'}</p>
                </div>
              )}

              {liveMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.type === 'system' ? (
                    <div className="w-full text-center">
                      <span className="inline-block bg-muted px-3 py-1.5 rounded-full text-xs text-muted-foreground">
                        {msg.text}
                      </span>
                    </div>
                  ) : msg.type === 'user' ? (
                    <div className="max-w-[80%] bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5">
                      <p className="font-quran text-base leading-relaxed" dir="rtl">{msg.text}</p>
                    </div>
                  ) : (
                    <div className={`max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 border ${getStatusBg(msg.status)}`}>
                      <div className="flex items-start gap-2">
                        <span className="text-lg shrink-0">{getStatusIcon(msg.status)}</span>
                        <div className="flex-1">
                          <p className="text-sm text-foreground font-arabic leading-relaxed">{msg.text}</p>
                          {msg.wrongWord && msg.correctWord && (
                            <div className="mt-2 flex items-center gap-2 text-sm bg-background/50 p-2 rounded-lg">
                              <span className="text-destructive line-through font-quran">{msg.wrongWord}</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-primary font-bold font-quran">{msg.correctWord}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* Live mic level indicator (visible only when listening) */}
          {isLiveListening && (
            <div className="bg-card rounded-xl py-2 px-4 shadow-islamic flex items-center gap-3 animate-fade-in">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive" />
                </span>
                <span className="text-[11px] font-bold text-foreground">
                  {lang === 'ar' ? 'يستمع' : 'LIVE'}
                </span>
              </div>
              <div className="flex-1">
                <MicLevelIndicator active={isLiveListening} />
              </div>
              {isProcessing && <Loader2 size={14} className="text-primary animate-spin" />}
            </div>
          )}

          {!isLiveListening && mode === 'live-listen' && (
            <button
              onClick={runMicCalibration}
              disabled={calibrating}
              className="self-start text-[11px] px-3 py-1.5 rounded-full bg-card border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center gap-1.5 font-medium"
              title={lang === 'ar' ? 'معايرة سريعة لتقليل الإنذارات الكاذبة' : 'Quick calibration to reduce false alarms'}
            >
              {calibrating
                ? <Loader2 size={12} className="animate-spin" />
                : <span>🎚️</span>}
              {calibrating
                ? (lang === 'ar' ? 'جارٍ المعايرة…' : 'Calibrating…')
                : (lang === 'ar' ? 'معايرة الميكروفون' : 'Calibrate mic')}
            </button>
          )}

          {isLiveListening && mode === 'live-listen' && (
            <AudioQualityAlert
              quality={audioQuality.quality}
              level={audioQuality.level}
              autoRestartIn={autoRestartCountdown}
              onRestart={() => {
                cancelAutoRestart();
                hardRestartLive();
                setTimeout(() => { try { startLiveListening(); } catch {} }, 350);
              }}
              onDismiss={() => {
                cancelAutoRestart();
                setQualityDismissed(true);
              }}
            />
          )}

          {/* Control buttons */}
          <div className="flex gap-2">
            {!isLiveListening ? (
              <button
                onClick={startLiveListening}
                className="flex-1 py-4 bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform"
              >
                <Mic size={22} />
                {lang === 'ar' ? '🎤 ابدأ التسميع' : '🎤 Start Listening'}
              </button>
            ) : (
              <button
                onClick={stopLiveListening}
                className="flex-1 py-4 bg-destructive text-destructive-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-3 shadow-lg active:scale-95 transition-transform animate-pulse"
              >
                <MicOff size={22} />
                {lang === 'ar' ? '⏹️ إيقاف' : '⏹️ Stop'}
              </button>
            )}
            {liveMessages.length > 0 && (
              <button
                onClick={resetLiveSession}
                title={lang === 'ar' ? 'إعادة تعيين سريع' : 'Quick reset'}
                className="px-5 py-4 bg-card border-2 border-primary/30 text-primary rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-md hover:bg-primary/5 active:scale-95 transition-all"
              >
                <RefreshCw size={20} />
                <span className="hidden sm:inline text-sm">{lang === 'ar' ? 'إعادة' : 'Reset'}</span>
              </button>
            )}
            {(isLiveListening || transcriptLog.length > 0) && (
              <button
                onClick={hardRestartLive}
                title={lang === 'ar' ? 'إعادة تشغيل آمن' : 'Safe restart'}
                className="px-4 py-4 bg-destructive/10 border-2 border-destructive/40 text-destructive rounded-2xl font-bold flex items-center justify-center gap-1.5 shadow-md hover:bg-destructive/15 active:scale-95 transition-all"
              >
                <Power size={18} />
                <span className="hidden sm:inline text-sm">{lang === 'ar' ? 'إيقاف آمن' : 'Safe stop'}</span>
              </button>
            )}
          </div>

          {/* Transcript Log: accepted finals + skipped duplicates */}
          {transcriptLog.length > 0 && (
            <div className="bg-card rounded-xl shadow-islamic overflow-hidden border border-border/60">
              <button
                onClick={() => setShowTranscriptLog(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/40 hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ListChecks size={16} className="text-primary" />
                  <span className="text-xs font-bold text-foreground">
                    {lang === 'ar' ? 'سجل التفريغ النصي' : 'Transcript log'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {transcriptLog.filter(e => e.status === 'final').length} {lang === 'ar' ? 'مقبول' : 'accepted'}
                    {' · '}
                    {transcriptLog.filter(e => e.status === 'duplicate').length} {lang === 'ar' ? 'مكرر' : 'duplicates'}
                  </span>
                </div>
                <ChevronDown size={14} className={`transition-transform ${showTranscriptLog ? 'rotate-180' : ''}`} />
              </button>
              {showTranscriptLog && (
                <div className="max-h-64 overflow-y-auto p-2 space-y-1.5">
                  {transcriptLog.map(entry => (
                    <div
                      key={entry.id}
                      className={`rounded-lg p-2 border ${
                        entry.status === 'final'
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-muted/40 border-border/50 opacity-70'
                      }`}
                    >
                      {editingLogId === entry.id ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateLogEntry(entry.id, editingText.trim());
                                setEditingLogId(null);
                              }
                              if (e.key === 'Escape') setEditingLogId(null);
                            }}
                            autoFocus
                            dir="rtl"
                            className="flex-1 font-quran text-sm bg-background text-foreground rounded px-2 py-1 border border-primary/40 outline-none focus:ring-2 focus:ring-primary/30"
                          />
                          <button
                            onClick={() => { updateLogEntry(entry.id, editingText.trim()); setEditingLogId(null); }}
                            className="w-7 h-7 rounded bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90"
                            title={lang === 'ar' ? 'حفظ' : 'Save'}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setEditingLogId(null)}
                            className="w-7 h-7 rounded bg-muted text-foreground flex items-center justify-center hover:bg-muted/80"
                            title={lang === 'ar' ? 'إلغاء' : 'Cancel'}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            entry.status === 'final'
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted-foreground/20 text-muted-foreground line-through'
                          }`}>
                            {entry.status === 'final'
                              ? (lang === 'ar' ? '✓ مقبول' : '✓ Final')
                              : (lang === 'ar' ? '✕ مكرر' : '✕ Dup')}
                          </span>
                          <p className={`flex-1 font-quran text-sm text-right ${
                            entry.status === 'duplicate' ? 'line-through text-muted-foreground' : 'text-foreground'
                          }`} dir="rtl">
                            {entry.text}
                          </p>
                          {entry.status === 'final' && (
                            <button
                              onClick={() => { setEditingLogId(entry.id); setEditingText(entry.text); }}
                              className="w-7 h-7 rounded text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center shrink-0"
                              title={lang === 'ar' ? 'تعديل' : 'Edit'}
                            >
                              <Pencil size={11} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteLogEntry(entry.id)}
                            className="w-7 h-7 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10 flex items-center justify-center shrink-0"
                            title={lang === 'ar' ? 'حذف' : 'Delete'}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
            <p>💡 {lang === 'ar' ? 'نصائح:' : 'Tips:'}</p>
            <p>• {lang === 'ar' ? 'تحدث بوضوح وبصوت مسموع' : 'Speak clearly and audibly'}</p>
            <p>• {lang === 'ar' ? 'الشيخ AI سيصحح لك فوراً لو غلطت' : 'AI will correct you instantly'}</p>
            <p>• {lang === 'ar' ? 'لو نسيت، سيذكرك بالكلمة التالية' : 'If you forget, it will remind you'}</p>
            <p>• {lang === 'ar' ? 'فعّل الصوت ليقرأ لك التصحيح' : 'Enable voice for spoken corrections'}</p>
          </div>
        </div>
      )}

      {/* === AUTO-DETECT MODE === */}
      {mode === 'auto-detect' && (
        <div className="bg-card rounded-xl p-6 shadow-islamic text-center space-y-4">
          <div className="bg-primary/5 rounded-xl p-4 mb-2">
            <p className="text-sm text-foreground font-arabic font-medium">
              {lang === 'ar' ? '👉 اقرأ أي آية وسأحددها لك تلقائياً وأصححك' : '👉 Read any verse and I\'ll identify and correct it'}
            </p>
          </div>

          <RecordButton isRecording={isRecording} isAnalyzing={isAnalyzing} lang={lang} onStart={startRecording} onStop={stopRecording} />

          {transcript && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{lang === 'ar' ? 'تلاوتك:' : 'Your recitation:'}</p>
              <p className="font-quran text-lg text-foreground" dir="rtl">{transcript}</p>
            </div>
          )}

          {transcript && !isRecording && detectedVerses.length === 0 && !result && (
            <button onClick={autoDetectVerse} disabled={isAnalyzing}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium flex items-center justify-center gap-2">
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {isAnalyzing ? (lang === 'ar' ? 'جاري التعرف...' : 'Identifying...') : (lang === 'ar' ? '🧠 تعرّف على الآية' : '🧠 Identify Verse')}
            </button>
          )}

          {detectedVerses.length > 0 && (
            <div className="space-y-3 animate-fade-in text-start">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                {lang === 'ar' ? 'الآيات المكتشفة' : 'Detected Verses'}
              </h3>
              {detectedVerses.map((v, i) => (
                <div key={i} className="p-3 bg-primary/5 rounded-xl border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-primary font-arabic text-sm">{v.surahName} - آية {v.verseNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${v.confidence >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                      {v.confidence}%
                    </span>
                  </div>
                  <p className="font-quran text-base leading-[2] text-foreground" dir="rtl">{v.verseText}</p>
                </div>
              ))}
              {detectionFeedback && (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">{detectionFeedback}</p>
              )}
              <button onClick={resetAll} className="w-full py-2 bg-muted text-foreground rounded-xl text-sm flex items-center justify-center gap-2">
                <RotateCcw size={14} /> {lang === 'ar' ? 'تلاوة جديدة' : 'New Recitation'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* === CORRECT MODE === */}
      {mode === 'correct' && selectedSurah && verses.length > 0 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 shadow-islamic">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'الآية الصحيحة' : 'Correct Verse'}</p>
              <button onClick={() => setShowVerseText(!showVerseText)} className="text-muted-foreground">
                {showVerseText ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
            {showVerseText && (
              <p className="font-quran text-lg leading-[2] text-foreground text-center" dir="rtl">
                {verses.find(v => v.number === selectedVerse)?.text}
              </p>
            )}
          </div>

          <div className="bg-card rounded-xl p-6 shadow-islamic text-center space-y-4">
            <RecordButton isRecording={isRecording} isAnalyzing={isAnalyzing} lang={lang} onStart={startRecording} onStop={stopRecording} />
            {transcript && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{lang === 'ar' ? 'تلاوتك:' : 'Your recitation:'}</p>
                <p className="font-quran text-lg text-foreground" dir="rtl">{transcript}</p>
              </div>
            )}
            {transcript && !isRecording && !result && (
              <button onClick={analyzeRecitation} disabled={isAnalyzing}
                className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium flex items-center justify-center gap-2">
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : null}
                {isAnalyzing ? (lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...') : (lang === 'ar' ? '🧠 تحليل التلاوة' : '🧠 Analyze')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* === BLIND MODE === */}
      {mode === 'blind' && selectedSurah && verses.length > 0 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 shadow-islamic">
            <p className="text-xs text-muted-foreground mb-3">{lang === 'ar' ? 'اضغط على الكلمة لكشفها' : 'Tap a word to reveal it'}</p>
            <div className="flex flex-wrap gap-2 justify-center" dir="rtl">
              {getBlindWords().map((word, i) => (
                <button
                  key={i}
                  onClick={() => toggleBlindWord(i)}
                  className={`px-3 py-2 rounded-lg font-quran text-base transition-all ${
                    blindRevealedWords.has(i) ? 'bg-primary/10 text-foreground' : 'bg-muted text-transparent hover:bg-muted/80'
                  }`}
                  style={!blindRevealedWords.has(i) ? { textShadow: '0 0 12px hsl(var(--foreground))' } : {}}
                >
                  {word}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-islamic text-center space-y-4">
            <RecordButton isRecording={isRecording} isAnalyzing={isAnalyzing} lang={lang} onStart={startRecording} onStop={stopRecording} />
            {transcript && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-quran text-lg text-foreground" dir="rtl">{transcript}</p>
              </div>
            )}
            {transcript && !isRecording && !result && (
              <button onClick={analyzeRecitation} disabled={isAnalyzing}
                className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium flex items-center justify-center gap-2">
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : null}
                {lang === 'ar' ? '🧠 تحليل' : '🧠 Analyze'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* === PRACTICE MODE === */}
      {mode === 'practice' && selectedSurah && verses.length > 0 && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl p-4 shadow-islamic">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">{lang === 'ar' ? 'تقدم التمرين' : 'Practice Progress'}</p>
              <span className="text-xs text-primary font-bold">{selectedVerse}/{verses.length}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(selectedVerse / verses.length) * 100}%` }} />
            </div>
          </div>

          <div className="bg-card rounded-xl p-4 shadow-islamic">
            <p className="text-xs text-muted-foreground mb-1">{lang === 'ar' ? `آية ${selectedVerse}` : `Verse ${selectedVerse}`}</p>
            <p className="font-quran text-lg leading-[2] text-foreground text-center" dir="rtl">
              {verses.find(v => v.number === selectedVerse)?.text}
            </p>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-islamic text-center space-y-4">
            <RecordButton isRecording={isRecording} isAnalyzing={isAnalyzing} lang={lang} onStart={startRecording} onStop={stopRecording} />
            {transcript && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-quran text-lg text-foreground" dir="rtl">{transcript}</p>
              </div>
            )}
            {transcript && !isRecording && !result && (
              <button onClick={analyzeRecitation} disabled={isAnalyzing}
                className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium flex items-center justify-center gap-2">
                {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : null}
                {lang === 'ar' ? '🧠 تحليل' : '🧠 Analyze'}
              </button>
            )}
          </div>

          {result && (
            <div className="flex gap-2">
              {selectedVerse > 1 && (
                <button onClick={() => { setSelectedVerse(v => v - 1); resetAll(); }}
                  className="flex-1 py-3 bg-muted text-foreground rounded-xl font-medium">
                  {lang === 'ar' ? '← السابقة' : '← Previous'}
                </button>
              )}
              {selectedVerse < verses.length && (
                <button onClick={() => { setSelectedVerse(v => v + 1); resetAll(); }}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium">
                  {lang === 'ar' ? 'التالية →' : 'Next →'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* === RESULTS (shared for correct/blind/practice) === */}
      {result && (
        <ResultsPanel result={result} lang={lang} mistakeTypeLabel={mistakeTypeLabel} mistakeColor={mistakeColor} onReset={resetAll} />
      )}

      {/* === END-OF-SESSION INTERACTIVE SUMMARY === */}
      <SessionSummaryModal summary={sessionSummary} onClose={() => setSessionSummary(null)} />

      {/* === MUSHAF-STYLE FULLSCREEN READING VIEW === */}
      {mushafOpen && mode === 'live-listen' && selectedSurah && verses.length > 0 && (() => {
        const surah = surahs.find(s => s.id === selectedSurah);
        return (
          <MushafRecitationView
            surahName={surah?.name || ''}
            surahNameEn={surah?.nameEn || ''}
            surahId={selectedSurah}
            verses={verses}
            currentVerse={selectedVerse}
            isListening={isLiveListening}
            isProcessing={isProcessing}
            liveAccuracy={liveAccuracy}
            mistakes={sessionMistakes}
            lang={lang as 'ar' | 'en'}
            onClose={() => setMushafOpen(false)}
            onStart={startLiveListening}
            onStop={stopLiveListening}
            onPrevVerse={() => {
              if (selectedVerse > 1) {
                setSelectedVerse(v => v - 1);
                // Sync the live context if mid-session
                const prev = verses.find(v => v.number === selectedVerse - 1);
                if (prev && liveContextRef.current.surahId) {
                  liveContextRef.current = {
                    ...liveContextRef.current,
                    verseNum: prev.number,
                    verseText: prev.text,
                  };
                  lastProcessedRef.current = '';
                  lastUserTextRef.current = '';
                  accumulatedTranscriptRef.current = '';
                }
              }
            }}
            onNextVerse={() => {
              if (selectedVerse < verses.length) {
                setSelectedVerse(v => v + 1);
                const next = verses.find(v => v.number === selectedVerse + 1);
                if (next && liveContextRef.current.surahId) {
                  liveContextRef.current = {
                    ...liveContextRef.current,
                    verseNum: next.number,
                    verseText: next.text,
                  };
                  lastProcessedRef.current = '';
                  lastUserTextRef.current = '';
                  accumulatedTranscriptRef.current = '';
                }
              }
            }}
            onReset={resetLiveSession}
          />
        );
      })()}
    </div>
  );
};

/* === Sub-components === */

const RecordButton = ({ isRecording, isAnalyzing, lang, onStart, onStop }: {
  isRecording: boolean; isAnalyzing: boolean; lang: string;
  onStart: () => void; onStop: () => void;
}) => (
  <div className="space-y-2">
    <button
      onClick={isRecording ? onStop : onStart}
      disabled={isAnalyzing}
      className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
        isRecording ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-primary text-primary-foreground hover:opacity-90'
      }`}
    >
      {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
    </button>
    <p className="text-sm text-muted-foreground">
      {isRecording ? (lang === 'ar' ? '🔴 جاري التسجيل...' : '🔴 Recording...') : (lang === 'ar' ? 'اضغط للتسجيل' : 'Tap to record')}
    </p>
  </div>
);

const ResultsPanel = ({ result, lang, mistakeTypeLabel, mistakeColor, onReset }: {
  result: AnalysisResult; lang: string;
  mistakeTypeLabel: (t: string) => string; mistakeColor: (t: string) => string;
  onReset: () => void;
}) => (
  <div className="space-y-4 animate-fade-in">
    <div className="bg-card rounded-2xl p-6 shadow-islamic text-center">
      <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-3 ${
        result.accuracy >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
        result.accuracy >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
        'bg-destructive/10 text-destructive'
      }`}>
        {result.accuracy}%
      </div>
      <p className="font-semibold text-foreground">{lang === 'ar' ? 'نسبة الدقة' : 'Accuracy'}</p>
      <p className="text-sm text-muted-foreground mt-1">{result.overallFeedback}</p>
    </div>

    {result.mistakes?.length > 0 && (
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-accent" />
          {lang === 'ar' ? 'الأخطاء المكتشفة' : 'Mistakes'} ({result.mistakes.length})
        </h3>
        <div className="space-y-3">
          {result.mistakes.map((m, i) => (
            <div key={i} className="p-3 bg-muted/50 rounded-lg">
              <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${mistakeColor(m.type)}`}>
                {mistakeTypeLabel(m.type)}
              </span>
              <div className="flex items-center gap-2 text-sm mt-2">
                <span className="text-destructive line-through font-quran">{m.word}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-primary font-bold font-quran">{m.correction}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 bg-background/50 p-2 rounded">{m.explanation}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {result.tajweedNotes && result.tajweedNotes.length > 0 && (
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <h3 className="font-semibold text-foreground mb-3">📖 {lang === 'ar' ? 'ملاحظات التجويد' : 'Tajweed Notes'}</h3>
        <ul className="space-y-2">
          {result.tajweedNotes.map((note, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] shrink-0 mt-0.5">{i + 1}</span>
              {note}
            </li>
          ))}
        </ul>
      </div>
    )}

    {result.tips?.length > 0 && (
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <h3 className="font-semibold text-foreground mb-3">💡 {lang === 'ar' ? 'نصائح' : 'Tips'}</h3>
        <ul className="space-y-2">
          {result.tips.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle size={14} className="text-primary shrink-0 mt-0.5" />
              {tip}
            </li>
          ))}
        </ul>
      </div>
    )}

    <button onClick={onReset} className="w-full py-3 bg-muted text-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-muted/80">
      <RotateCcw size={16} /> {lang === 'ar' ? 'إعادة التلاوة' : 'Try Again'}
    </button>
  </div>
);

export default RecitationPage;
