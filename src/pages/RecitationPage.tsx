import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import { Mic, MicOff, Loader2, CheckCircle, AlertTriangle, RotateCcw, ChevronDown, Sparkles, Eye, EyeOff, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Mode = 'auto-detect' | 'correct' | 'blind' | 'practice';

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

const RecitationPage = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>('auto-detect');
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

  const modes: { id: Mode; icon: any; labelAr: string; labelEn: string; descAr: string; descEn: string }[] = [
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

  const needsSurahSelection = mode === 'correct' || mode === 'blind' || mode === 'practice';

  const resetAll = () => {
    setResult(null);
    setTranscript('');
    setDetectedVerses([]);
    setDetectionFeedback('');
    setBlindRevealedWords(new Set());
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground font-arabic">
        {lang === 'ar' ? '🎤 تصحيح التلاوة بالذكاء الاصطناعي' : '🎤 AI Recitation Correction'}
      </h1>

      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-2">
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); resetAll(); }}
            className={`p-3 rounded-xl text-start transition-all ${
              mode === m.id ? 'bg-primary text-primary-foreground shadow-lg scale-[1.02]' : 'bg-card text-foreground shadow-islamic hover:bg-muted'
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
                  onClick={() => { setSelectedSurah(s.id); setSelectedVerse(1); setShowSurahPicker(false); resetAll(); fetchVerses(s.id); }}
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

      {/* Verse selector (correct & blind modes) */}
      {(mode === 'correct' || mode === 'blind') && selectedSurah && verses.length > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-islamic">
          <p className="text-xs text-muted-foreground mb-2">{lang === 'ar' ? 'اختر الآية' : 'Select Verse'}</p>
          <div className="flex gap-1.5 flex-wrap">
            {verses.map(v => (
              <button
                key={v.number}
                onClick={() => { setSelectedVerse(v.number); resetAll(); }}
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

          {/* Detected verses */}
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
          {/* Show verse */}
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

          {/* Practice navigation */}
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
    {/* Accuracy */}
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

    {/* Mistakes */}
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

    {/* Tajweed Notes */}
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

    {/* Tips */}
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
