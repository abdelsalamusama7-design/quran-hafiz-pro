import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/PageHeader';
import MicLevelIndicator from '@/components/MicLevelIndicator';
import SessionSummaryModal, { type SessionSummary } from '@/components/SessionSummaryModal';
import MushafRecitationView from '@/components/MushafRecitationView';
import { surahs } from '@/data/surahs';
import { Mic, MicOff, Loader2, CheckCircle, AlertTriangle, RotateCcw, ChevronDown, Sparkles, Eye, EyeOff, Zap, MessageCircle, Volume2, VolumeX, RefreshCw, BookOpen } from 'lucide-react';
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
  const [mode, setMode] = useState<Mode>('live-listen');
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
      let finalPart = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalPart += event.results[i][0].transcript + ' ';
        }
      }

      const finalTrimmed = finalPart.trim();
      if (!finalTrimmed) return;

      // Dedupe: skip if same as last user text we added
      if (finalTrimmed === lastUserTextRef.current) return;
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
      // Auto-restart if still meant to be listening
      if (isLiveListeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };

    liveRecognitionRef.current = recognition;
    isLiveListeningRef.current = true;
    setIsLiveListening(true);
    try { recognition.start(); } catch {}
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

    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = '';
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(finalTranscript + interim);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) setTranscript(finalTranscript.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setResult(null);
    setDetectedVerses([]);
    setDetectionFeedback('');
    setTranscript('');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
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
          </div>

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
