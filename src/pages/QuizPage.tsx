import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import { useMemorization } from '@/hooks/useMemorization';
import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, HelpCircle, RotateCcw } from 'lucide-react';

interface QuizQuestion {
  surahId: number;
  surahName: string;
  verseNumber: number;
  fullText: string;
  hiddenText: string;
  answer: string;
}

const QuizPage = () => {
  const { t, lang } = useLanguage();
  const { memorizedVerses } = useMemorization();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [showResult, setShowResult] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quizDone, setQuizDone] = useState(false);

  // Get memorized surah IDs
  const memorizedSurahIds = [...new Set(
    Object.keys(memorizedVerses).map(k => parseInt(k.split(':')[0]))
  )];

  const generateQuiz = async () => {
    setLoading(true);
    setQuizDone(false);
    setCurrent(0);
    setScore(0);

    const targetSurahs = memorizedSurahIds.length > 0
      ? memorizedSurahIds.slice(0, 3)
      : [1, 112, 114]; // default short surahs

    const allQuestions: QuizQuestion[] = [];

    for (const surahId of targetSurahs) {
      try {
        const res = await fetch(`https://api.alquran.cloud/v1/surah/${surahId}`);
        const data = await res.json();
        if (data.data?.ayahs) {
          const ayahs = data.data.ayahs;
          const surah = surahs.find(s => s.id === surahId);
          // Pick up to 2 random verses from this surah
          const shuffled = [...ayahs].sort(() => Math.random() - 0.5).slice(0, 2);
          for (const ayah of shuffled) {
            const words = ayah.text.split(' ');
            if (words.length < 3) continue;
            // Hide last 2 words
            const hideCount = Math.min(2, Math.ceil(words.length / 3));
            const visibleWords = words.slice(0, words.length - hideCount);
            const hiddenWords = words.slice(words.length - hideCount);
            allQuestions.push({
              surahId,
              surahName: surah?.name || '',
              verseNumber: ayah.numberInSurah,
              fullText: ayah.text,
              hiddenText: visibleWords.join(' ') + ' ______',
              answer: hiddenWords.join(' '),
            });
          }
        }
      } catch {}
    }

    setQuestions(allQuestions.sort(() => Math.random() - 0.5).slice(0, 5));
    setLoading(false);
  };

  useEffect(() => {
    generateQuiz();
  }, []);

  const checkAnswer = () => {
    const isCorrect = userAnswer.trim() === questions[current].answer.trim();
    setShowResult(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) setScore(prev => prev + 1);
  };

  const nextQuestion = () => {
    setShowResult(null);
    setUserAnswer('');
    if (current < questions.length - 1) {
      setCurrent(prev => prev + 1);
    } else {
      setQuizDone(true);
    }
  };

  if (loading) {
    return (
      <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6 font-arabic">{t('quizTitle')}</h1>
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-card rounded-xl p-6 animate-pulse">
              <div className="h-8 bg-muted rounded w-3/4 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="pb-20 px-4 pt-6 max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-bold text-foreground mb-6 font-arabic">{t('quizTitle')}</h1>
        <HelpCircle size={48} className="mx-auto mb-4 text-muted-foreground opacity-40" />
        <p className="text-muted-foreground font-arabic mb-4">{t('startMemorizing')}</p>
      </div>
    );
  }

  if (quizDone) {
    return (
      <div className="pb-20 px-4 pt-6 max-w-lg mx-auto text-center">
        <h1 className="text-2xl font-bold text-foreground mb-6 font-arabic">{t('quizTitle')}</h1>
        <div className="bg-card rounded-2xl p-8 shadow-islamic animate-scale-in">
          <CheckCircle size={56} className="mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-bold text-foreground mb-2 font-arabic">{t('quizComplete')}</h2>
          <p className="text-3xl font-bold text-primary mb-1">{score} / {questions.length}</p>
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground font-arabic">{t('quizTitle')}</h1>
        <span className="text-sm text-muted-foreground">{current + 1} / {questions.length}</span>
      </div>

      <div className="bg-card rounded-2xl p-6 shadow-islamic mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">{q.surahName}</span>
          <span className="text-xs text-muted-foreground">{t('verses')} {q.verseNumber}</span>
        </div>

        <p className="font-quran text-xl leading-[2.2] text-foreground text-center mb-4" dir="rtl">
          {q.hiddenText}
        </p>

        <p className="text-xs text-muted-foreground text-center mb-4">{t('fillVerse')}</p>

        <input
          type="text"
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          dir="rtl"
          className="w-full bg-muted border border-border rounded-xl py-3 px-4 text-lg font-quran text-foreground text-center placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          placeholder="..."
          disabled={showResult !== null}
        />
      </div>

      {showResult && (
        <div className={`rounded-xl p-4 mb-4 animate-scale-in ${
          showResult === 'correct' ? 'bg-emerald-light' : 'bg-destructive/10'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {showResult === 'correct' 
              ? <CheckCircle size={18} className="text-primary" />
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
            disabled={!userAnswer.trim()}
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

      {/* Progress bar */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-4">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
      </div>
    </div>
  );
};

export default QuizPage;
