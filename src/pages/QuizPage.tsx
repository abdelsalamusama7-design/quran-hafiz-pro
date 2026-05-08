import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/PageHeader';
import { useAudio } from '@/contexts/AudioContext';
import { surahs } from '@/data/surahs';
import { useMemorization } from '@/hooks/useMemorization';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, HelpCircle, RotateCcw, Headphones, Volume2, Loader2 } from 'lucide-react';
import { logActivity } from '@/lib/logActivity';

type TestType = 'fill' | 'listen-identify' | 'listen-next' | 'order';

interface QuizQuestion {
  type: TestType;
  surahId: number;
  surahName: string;
  verseNumber: number;
  fullText: string;
  hiddenText?: string;
  answer: string;
  options?: string[];
  audioSurahId?: number;
  audioVerseNumber?: number;
}

const QuizPage = () => {
  const { t, lang } = useLanguage();
  const { memorizedVerses } = useMemorization();
  const audio = useAudio();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quizDone, setQuizDone] = useState(false);
  const [testType, setTestType] = useState<TestType | 'all'>('all');
  const [quizStart, setQuizStart] = useState<number>(Date.now());

  const memorizedSurahIds = [...new Set(
    Object.keys(memorizedVerses).map(k => parseInt(k.split(':')[0]))
  )];

  const testTypes: { id: TestType | 'all'; labelAr: string; labelEn: string; icon: any }[] = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All', icon: HelpCircle },
    { id: 'fill', labelAr: 'أكمل', labelEn: 'Fill', icon: HelpCircle },
    { id: 'listen-identify', labelAr: 'تعرّف', labelEn: 'Identify', icon: Headphones },
    { id: 'listen-next', labelAr: 'التالية', labelEn: 'Next', icon: Volume2 },
    { id: 'order', labelAr: 'رتّب', labelEn: 'Order', icon: RotateCcw },
  ];

  const generateQuiz = async () => {
    setLoading(true);
    setQuizDone(false);
    setCurrent(0);
    setScore(0);
    setShowResult(null);
    setUserAnswer('');
    setSelectedOption(null);

    const targetSurahs = memorizedSurahIds.length > 0
      ? memorizedSurahIds.slice(0, 5)
      : [1, 112, 113, 114, 36];

    const allQuestions: QuizQuestion[] = [];

    for (const surahId of targetSurahs) {
      try {
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}`);
        const data = await res.json();
        if (!data.data?.ayahs) continue;
        const ayahs = data.data.ayahs;
        const surah = surahs.find(s => s.id === surahId);
        const surahName = surah?.name || '';

        const shuffled = [...ayahs].sort(() => Math.random() - 0.5);

        for (const ayah of shuffled.slice(0, 3)) {
          const words = ayah.text.split(' ');
          if (words.length < 3) continue;

          // Fill question
          if (testType === 'all' || testType === 'fill') {
            const hideCount = Math.min(2, Math.ceil(words.length / 3));
            const visibleWords = words.slice(0, words.length - hideCount);
            const hiddenWords = words.slice(words.length - hideCount);
            allQuestions.push({
              type: 'fill',
              surahId, surahName, verseNumber: ayah.numberInSurah,
              fullText: ayah.text,
              hiddenText: visibleWords.join(' ') + ' ______',
              answer: hiddenWords.join(' '),
            });
          }

          // Listen & Identify — which surah is this verse from?
          if ((testType === 'all' || testType === 'listen-identify') && ayahs.length > 1) {
            const wrongSurahs = surahs.filter(s => s.id !== surahId).sort(() => Math.random() - 0.5).slice(0, 3);
            const options = [surahName, ...wrongSurahs.map(s => s.name)].sort(() => Math.random() - 0.5);
            allQuestions.push({
              type: 'listen-identify',
              surahId, surahName, verseNumber: ayah.numberInSurah,
              fullText: ayah.text,
              answer: surahName,
              options,
              audioSurahId: surahId,
              audioVerseNumber: ayah.numberInSurah,
            });
          }

          // Listen & Complete — what comes next?
          if ((testType === 'all' || testType === 'listen-next') && ayah.numberInSurah < ayahs.length) {
            const nextAyah = ayahs.find((a: any) => a.numberInSurah === ayah.numberInSurah + 1);
            if (nextAyah) {
              const nextWords = nextAyah.text.split(' ');
              const firstTwo = nextWords.slice(0, Math.min(3, nextWords.length)).join(' ');
              const wrongOptions = ayahs
                .filter((a: any) => a.numberInSurah !== ayah.numberInSurah + 1)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
                .map((a: any) => a.text.split(' ').slice(0, 3).join(' '));
              const options = [firstTwo, ...wrongOptions].sort(() => Math.random() - 0.5);

              allQuestions.push({
                type: 'listen-next',
                surahId, surahName, verseNumber: ayah.numberInSurah,
                fullText: ayah.text,
                answer: firstTwo,
                options,
                audioSurahId: surahId,
                audioVerseNumber: ayah.numberInSurah,
              });
            }
          }

          // Order words
          if ((testType === 'all' || testType === 'order') && words.length >= 4) {
            const chunk = words.slice(0, Math.min(5, words.length));
            const shuffledChunk = [...chunk].sort(() => Math.random() - 0.5);
            allQuestions.push({
              type: 'order',
              surahId, surahName, verseNumber: ayah.numberInSurah,
              fullText: ayah.text,
              answer: chunk.join(' '),
              options: shuffledChunk,
            });
          }
        }
      } catch {}
    }

    setQuestions(allQuestions.sort(() => Math.random() - 0.5).slice(0, 8));
    setLoading(false);
  };

  useEffect(() => { generateQuiz(); }, [testType]);

  const checkAnswer = () => {
    const q = questions[current];
    let isCorrect = false;

    if (q.type === 'fill') {
      isCorrect = userAnswer.trim() === q.answer.trim();
    } else if (q.type === 'order') {
      isCorrect = userAnswer.trim() === q.answer;
    } else {
      isCorrect = selectedOption === q.answer;
    }

    setShowResult(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setScore(prev => prev + 1);
  };

  const nextQuestion = () => {
    setShowResult(null);
    setUserAnswer('');
    setSelectedOption(null);
    if (current < questions.length - 1) {
      setCurrent(prev => prev + 1);
    } else {
      setQuizDone(true);
      const finalScore = score + (showResult === 'correct' ? 0 : 0);
      const durationMin = Math.max(1, Math.round((Date.now() - quizStart) / 60000));
      const surahIds = [...new Set(questions.map(q => q.surahId))];
      void logActivity({
        activityType: 'quiz',
        surahNumber: surahIds.length === 1 ? surahIds[0] : null,
        versesCount: questions.length,
        durationMinutes: durationMin,
        pointsEarned: finalScore * 5,
        notes: `Quiz: ${finalScore}/${questions.length}`,
      });
    }
  };

  // Order mode state
  const [orderedWords, setOrderedWords] = useState<string[]>([]);
  const [remainingWords, setRemainingWords] = useState<string[]>([]);

  useEffect(() => {
    if (questions[current]?.type === 'order') {
      setOrderedWords([]);
      setRemainingWords([...(questions[current].options || [])]);
    }
  }, [current, questions]);

  useEffect(() => {
    if (questions[current]?.type === 'order') {
      setUserAnswer(orderedWords.join(' '));
    }
  }, [orderedWords]);

  const addWord = (word: string, index: number) => {
    setOrderedWords(prev => [...prev, word]);
    setRemainingWords(prev => prev.filter((_, i) => i !== index));
  };

  const removeWord = (index: number) => {
    const word = orderedWords[index];
    setOrderedWords(prev => prev.filter((_, i) => i !== index));
    setRemainingWords(prev => [...prev, word]);
  };

  const typeLabel = (type: TestType) => {
    const labels: Record<TestType, { ar: string; en: string }> = {
      fill: { ar: 'أكمل الآية', en: 'Complete Verse' },
      'listen-identify': { ar: '🎧 حدد السورة', en: '🎧 Identify Surah' },
      'listen-next': { ar: '🎧 ما التالي؟', en: '🎧 What\'s Next?' },
      order: { ar: '🔤 رتّب الكلمات', en: '🔤 Order Words' },
    };
    return labels[type]?.[lang] || type;
  };

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6 max-w-lg mx-auto text-center">
        <PageHeader title={t('quizTitle')} />
        <Loader2 size={32} className="animate-spin text-primary mx-auto mt-12" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="pb-20 px-4 pt-6 max-w-lg mx-auto text-center">
        <PageHeader title={t('quizTitle')} />
        <HelpCircle size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground font-arabic mb-4">{t('startMemorizing')}</p>
      </div>
    );
  }

  if (quizDone) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="pb-20 px-4 pt-6 max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-bold text-foreground mb-6 font-arabic">{t('quizTitle')}</h1>
        <div className="bg-card rounded-2xl p-8 shadow-islamic animate-scale-in">
          <CheckCircle size={56} className="mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-bold text-foreground mb-2 font-arabic">{t('quizComplete')}</h2>
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-2xl font-bold mb-3 ${
            percentage >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
            percentage >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
            'bg-destructive/10 text-destructive'
          }`}>
            {percentage}%
          </div>
          <p className="text-lg font-bold text-primary mb-1">{score} / {questions.length}</p>
          <p className="text-sm text-muted-foreground mb-6">{t('score')}</p>
          <button
            onClick={generateQuiz}
            className="flex items-center gap-2 mx-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            <RotateCcw size={16} />
            {t('startQuiz')}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <PageHeader title={t('quizTitle')} />
        <span className="text-sm text-muted-foreground">{current + 1} / {questions.length}</span>
      </div>

      {/* Test Type Selector */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4 overflow-x-auto">
        {testTypes.map(tt => (
          <button
            key={tt.id}
            onClick={() => setTestType(tt.id)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-[10px] font-medium transition-all ${
              testType === tt.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {lang === 'ar' ? tt.labelAr : tt.labelEn}
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-islamic mb-4">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">{q.surahName}</span>
          <span className="text-xs text-muted-foreground">{t('verses')} {q.verseNumber}</span>
          <span className="px-2 py-0.5 bg-accent/20 text-accent-foreground rounded text-[10px]">{typeLabel(q.type)}</span>
        </div>

        {/* FILL type */}
        {q.type === 'fill' && (
          <>
            <p className="font-quran text-xl leading-[2.2] text-foreground text-center mb-4" dir="rtl">
              {q.hiddenText}
            </p>
            <p className="text-xs text-muted-foreground text-center mb-3">{t('fillVerse')}</p>
            <input
              type="text" value={userAnswer} onChange={e => setUserAnswer(e.target.value)}
              dir="rtl" disabled={showResult !== null}
              className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-lg font-quran text-foreground text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="..."
            />
          </>
        )}

        {/* LISTEN-IDENTIFY type */}
        {q.type === 'listen-identify' && (
          <>
            <p className="text-sm text-muted-foreground text-center mb-3">
              {lang === 'ar' ? 'اسمع الآية وحدد من أي سورة' : 'Listen and identify the surah'}
            </p>
            <button
              onClick={() => q.audioSurahId && q.audioVerseNumber && audio.playVerse(q.audioSurahId, q.audioVerseNumber)}
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 hover:opacity-90 active:scale-95"
            >
              <Headphones size={28} />
            </button>
            <div className="grid grid-cols-2 gap-2">
              {q.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !showResult && setSelectedOption(opt)}
                  disabled={showResult !== null}
                  className={`p-3 rounded-xl text-sm font-arabic font-medium transition-all ${
                    selectedOption === opt
                      ? showResult === 'correct' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-2 ring-green-500'
                        : showResult === 'incorrect' ? 'bg-destructive/10 text-destructive ring-2 ring-destructive'
                        : 'bg-primary text-primary-foreground'
                      : showResult && opt === q.answer ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {/* LISTEN-NEXT type */}
        {q.type === 'listen-next' && (
          <>
            <p className="text-sm text-muted-foreground text-center mb-2">
              {lang === 'ar' ? 'اسمع الآية... ما الآية التي بعدها؟' : 'Listen... what verse comes next?'}
            </p>
            <button
              onClick={() => q.audioSurahId && q.audioVerseNumber && audio.playVerse(q.audioSurahId, q.audioVerseNumber)}
              className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 hover:opacity-90 active:scale-95"
            >
              <Volume2 size={28} />
            </button>
            <div className="space-y-2">
              {q.options?.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => !showResult && setSelectedOption(opt)}
                  disabled={showResult !== null}
                  dir="rtl"
                  className={`w-full p-3 rounded-xl text-sm font-quran text-start transition-all ${
                    selectedOption === opt
                      ? showResult === 'correct' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 ring-2 ring-green-500'
                        : showResult === 'incorrect' ? 'bg-destructive/10 text-destructive ring-2 ring-destructive'
                        : 'bg-primary text-primary-foreground'
                      : showResult && opt === q.answer ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </>
        )}

        {/* ORDER type */}
        {q.type === 'order' && (
          <>
            <p className="text-sm text-muted-foreground text-center mb-3">
              {lang === 'ar' ? 'رتّب الكلمات بالترتيب الصحيح' : 'Arrange words in correct order'}
            </p>
            {/* Ordered words */}
            <div className="min-h-[50px] bg-primary/5 rounded-xl p-3 flex flex-wrap gap-2 justify-center mb-3 border-2 border-dashed border-primary/20" dir="rtl">
              {orderedWords.length === 0 && (
                <p className="text-xs text-muted-foreground">{lang === 'ar' ? 'اضغط على الكلمات بالترتيب' : 'Tap words in order'}</p>
              )}
              {orderedWords.map((w, i) => (
                <button
                  key={i}
                  onClick={() => !showResult && removeWord(i)}
                  disabled={showResult !== null}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-quran"
                >
                  {w}
                </button>
              ))}
            </div>
            {/* Remaining words */}
            <div className="flex flex-wrap gap-2 justify-center" dir="rtl">
              {remainingWords.map((w, i) => (
                <button
                  key={i}
                  onClick={() => !showResult && addWord(w, i)}
                  disabled={showResult !== null}
                  className="px-3 py-1.5 bg-muted text-foreground rounded-lg text-sm font-quran hover:bg-muted/70"
                >
                  {w}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Result feedback */}
      {showResult && (
        <div className={`rounded-xl p-4 mb-4 animate-scale-in ${
          showResult === 'correct' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-destructive/10'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {showResult === 'correct'
              ? <CheckCircle size={18} className="text-green-600" />
              : <XCircle size={18} className="text-destructive" />
            }
            <span className="font-medium text-foreground">{showResult === 'correct' ? t('correct') : t('incorrect')}</span>
          </div>
          {showResult === 'incorrect' && (
            <p className="font-quran text-lg text-foreground" dir="rtl">{q.answer}</p>
          )}
        </div>
      )}

      <div className="flex gap-3">
        {showResult === null ? (
          <button
            onClick={checkAnswer}
            disabled={q.type === 'fill' || q.type === 'order' ? !userAnswer.trim() : !selectedOption}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {t('checkAnswer')}
          </button>
        ) : (
          <button
            onClick={nextQuestion}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:opacity-90 transition-opacity"
          >
            {current < questions.length - 1 ? t('nextQuestion') : t('score')}
          </button>
        )}
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-4">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
    </div>
  );
};

export default QuizPage;
