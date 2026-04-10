import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import { Mic, MicOff, Loader2, CheckCircle, XCircle, AlertTriangle, RotateCcw, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

const RecitationPage = () => {
  const { t, lang } = useLanguage();
  const { toast } = useToast();
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number>(1);
  const [verses, setVerses] = useState<{ number: number; text: string }[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showSurahPicker, setShowSurahPicker] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Fetch verses when surah selected
  useEffect(() => {
    if (!selectedSurah) return;
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
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: lang === 'ar' ? 'غير مدعوم' : 'Not supported',
        description: lang === 'ar' ? 'المتصفح لا يدعم التعرف على الصوت. استخدم Chrome.' : 'Browser does not support speech recognition. Use Chrome.',
        variant: 'destructive',
      });
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

    recognition.onerror = () => {
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        setTranscript(finalTranscript.trim());
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    setResult(null);
    setTranscript('');
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const analyzeRecitation = async () => {
    if (!transcript.trim() || !selectedSurah) return;

    const verse = verses.find(v => v.number === selectedVerse);
    if (!verse) return;

    const surah = surahs.find(s => s.id === selectedSurah);
    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-recitation', {
        body: {
          userText: transcript.trim(),
          correctText: verse.text,
          surahName: surah?.name || '',
          verseNumber: selectedVerse,
        },
      });

      if (error) throw error;
      setResult(data as AnalysisResult);
    } catch (err: any) {
      toast({
        title: lang === 'ar' ? 'خطأ' : 'Error',
        description: err.message || (lang === 'ar' ? 'فشل التحليل' : 'Analysis failed'),
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const mistakeTypeLabel = (type: string) => {
    const labels: Record<string, { ar: string; en: string }> = {
      pronunciation: { ar: 'نطق', en: 'Pronunciation' },
      missing_word: { ar: 'كلمة ناقصة', en: 'Missing Word' },
      extra_word: { ar: 'كلمة زائدة', en: 'Extra Word' },
      tajweed: { ar: 'تجويد', en: 'Tajweed' },
      order: { ar: 'ترتيب', en: 'Order' },
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

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground font-arabic">
        {lang === 'ar' ? '🎤 تصحيح التلاوة' : '🎤 Recitation Correction'}
      </h1>
      <p className="text-sm text-muted-foreground">
        {lang === 'ar' ? 'سجّل تلاوتك واحصل على تصحيح فوري بالذكاء الاصطناعي' : 'Record your recitation and get instant AI correction'}
      </p>

      {/* Surah Picker */}
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <button
          onClick={() => setShowSurahPicker(!showSurahPicker)}
          className="w-full flex items-center justify-between"
        >
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
                onClick={() => { setSelectedSurah(s.id); setSelectedVerse(1); setShowSurahPicker(false); setResult(null); }}
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

      {/* Verse selector */}
      {selectedSurah && verses.length > 0 && (
        <div className="bg-card rounded-xl p-4 shadow-islamic">
          <p className="text-xs text-muted-foreground mb-2">{lang === 'ar' ? 'اختر الآية' : 'Select Verse'}</p>
          <div className="flex gap-1.5 flex-wrap">
            {verses.slice(0, 20).map(v => (
              <button
                key={v.number}
                onClick={() => { setSelectedVerse(v.number); setResult(null); }}
                className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                  selectedVerse === v.number ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {v.number}
              </button>
            ))}
            {verses.length > 20 && (
              <span className="text-xs text-muted-foreground self-center">+{verses.length - 20}</span>
            )}
          </div>

          {/* Show selected verse */}
          <div className="mt-3 p-3 bg-emerald-light rounded-lg">
            <p className="font-quran text-lg leading-[2] text-foreground text-center" dir="rtl">
              {verses.find(v => v.number === selectedVerse)?.text}
            </p>
          </div>
        </div>
      )}

      {/* Recording area */}
      {selectedSurah && (
        <div className="bg-card rounded-xl p-6 shadow-islamic text-center space-y-4">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isAnalyzing}
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-destructive text-destructive-foreground animate-pulse'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
          </button>
          <p className="text-sm text-muted-foreground">
            {isRecording
              ? (lang === 'ar' ? '🔴 جاري التسجيل... اضغط للإيقاف' : '🔴 Recording... tap to stop')
              : (lang === 'ar' ? 'اضغط للبدء بالتلاوة' : 'Tap to start reciting')}
          </p>

          {transcript && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{lang === 'ar' ? 'تلاوتك:' : 'Your recitation:'}</p>
              <p className="font-quran text-lg text-foreground" dir="rtl">{transcript}</p>
            </div>
          )}

          {transcript && !isRecording && !result && (
            <button
              onClick={analyzeRecitation}
              disabled={isAnalyzing}
              className="w-full py-3 bg-accent text-accent-foreground rounded-xl font-medium flex items-center justify-center gap-2"
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : null}
              {isAnalyzing
                ? (lang === 'ar' ? 'جاري التحليل...' : 'Analyzing...')
                : (lang === 'ar' ? '🧠 تحليل التلاوة بالذكاء الاصطناعي' : '🧠 Analyze with AI')}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4 animate-fade-in">
          {/* Accuracy Score */}
          <div className="bg-card rounded-2xl p-6 shadow-islamic text-center">
            <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center text-3xl font-bold mb-3 ${
              result.accuracy >= 80 ? 'bg-emerald-light text-primary' :
              result.accuracy >= 50 ? 'bg-accent/20 text-accent-foreground' :
              'bg-destructive/10 text-destructive'
            }`}>
              {result.accuracy}%
            </div>
            <p className="font-semibold text-foreground">{lang === 'ar' ? 'نسبة الدقة' : 'Accuracy Score'}</p>
            <p className="text-sm text-muted-foreground mt-1">{result.overallFeedback}</p>
          </div>

          {/* Mistakes */}
          {result.mistakes && result.mistakes.length > 0 && (
            <div className="bg-card rounded-xl p-4 shadow-islamic">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-accent" />
                {lang === 'ar' ? 'الأخطاء المكتشفة' : 'Detected Mistakes'} ({result.mistakes.length})
              </h3>
              <div className="space-y-3">
                {result.mistakes.map((m, i) => (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${mistakeColor(m.type)}`}>
                        {mistakeTypeLabel(m.type)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm mt-1">
                      <span className="text-destructive line-through font-quran">{m.word}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-primary font-bold font-quran">{m.correction}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{m.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tajweed Notes */}
          {result.tajweedNotes && result.tajweedNotes.length > 0 && (
            <div className="bg-card rounded-xl p-4 shadow-islamic">
              <h3 className="font-semibold text-foreground mb-3">
                {lang === 'ar' ? '📖 ملاحظات التجويد' : '📖 Tajweed Notes'}
              </h3>
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
          {result.tips && result.tips.length > 0 && (
            <div className="bg-card rounded-xl p-4 shadow-islamic">
              <h3 className="font-semibold text-foreground mb-3">
                {lang === 'ar' ? '💡 نصائح للتحسين' : '💡 Improvement Tips'}
              </h3>
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

          {/* Retry */}
          <button
            onClick={() => { setResult(null); setTranscript(''); }}
            className="w-full py-3 bg-muted text-foreground rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-muted/80"
          >
            <RotateCcw size={16} />
            {lang === 'ar' ? 'إعادة التلاوة' : 'Try Again'}
          </button>
        </div>
      )}
    </div>
  );
};

export default RecitationPage;
