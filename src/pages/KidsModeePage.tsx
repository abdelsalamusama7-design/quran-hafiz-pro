import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Star, Volume2, ChevronLeft, ChevronRight, Gift, Sparkles, Heart, Trophy } from 'lucide-react';
import { surahs } from '@/data/surahs';
import { Progress } from '@/components/ui/progress';

// Short surahs suitable for kids
const kidsSurahs = surahs.filter(s => [1, 112, 113, 114, 111, 110, 108, 107, 106, 105, 104, 103, 102, 101, 100, 99, 97, 95, 94, 93, 91].includes(s.id));

interface KidsReward {
  stars: number;
  totalListened: number;
  totalMemorized: number;
  streakDays: number;
  collectedAnimals: string[];
  lastDate: string;
}

const ANIMALS = ['🐱', '🐶', '🐰', '🦊', '🐻', '🐼', '🦁', '🐸', '🐵', '🦋', '🐝', '🐢', '🐬', '🦜', '🐎', '🐘', '🦒', '🐧', '🦉', '🐳'];

const STORAGE_KEY = 'hafiz-kids-rewards';

const getRewards = (): KidsReward => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { stars: 0, totalListened: 0, totalMemorized: 0, streakDays: 0, collectedAnimals: [], lastDate: '' };
};

const KidsModePage = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState<KidsReward>(getRewards);
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);
  const [verses, setVerses] = useState<string[]>([]);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [newAnimal, setNewAnimal] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [view, setView] = useState<'home' | 'learn' | 'zoo' | 'quiz'>('home');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rewards));
  }, [rewards]);

  // Fetch verses for selected surah
  useEffect(() => {
    if (!selectedSurah) return;
    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}/ar.alafasy`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setVerses(data.data.ayahs.map((a: any) => a.text));
          setCurrentVerse(0);
        }
      })
      .catch(() => {});
  }, [selectedSurah]);

  const playVerse = useCallback(() => {
    if (!selectedSurah || isPlaying) return;
    const verseNum = currentVerse + 1;
    const url = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${selectedSurah > 1 ? surahs.slice(0, selectedSurah - 1).reduce((a, s) => a + s.versesCount, 0) + verseNum : verseNum}.mp3`;
    const a = new Audio(url);
    setAudio(a);
    setIsPlaying(true);
    a.play();
    a.onended = () => {
      setIsPlaying(false);
      addStars(1);
      setRewards(prev => ({ ...prev, totalListened: prev.totalListened + 1 }));
    };
  }, [selectedSurah, currentVerse, isPlaying]);

  const addStars = (amount: number) => {
    setRewards(prev => {
      const newStars = prev.stars + amount;
      // Every 10 stars = new animal
      const animalsEarned = Math.floor(newStars / 10);
      const currentAnimals = prev.collectedAnimals.length;
      let updated = { ...prev, stars: newStars };
      if (animalsEarned > currentAnimals && currentAnimals < ANIMALS.length) {
        const animal = ANIMALS[currentAnimals];
        updated.collectedAnimals = [...prev.collectedAnimals, animal];
        setNewAnimal(animal);
        setShowReward(true);
        setTimeout(() => setShowReward(false), 3000);
      }
      return updated;
    });
  };

  const markMemorized = () => {
    addStars(3);
    setRewards(prev => ({ ...prev, totalMemorized: prev.totalMemorized + 1 }));
  };

  // Quiz state
  const [quizVerse, setQuizVerse] = useState('');
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizAnswer, setQuizAnswer] = useState('');
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(null);

  const startQuiz = () => {
    const shortSurahs = kidsSurahs.slice(0, 8);
    const surah = shortSurahs[Math.floor(Math.random() * shortSurahs.length)];
    setQuizAnswer(lang === 'ar' ? surah.name : surah.nameEn);
    const options = [lang === 'ar' ? surah.name : surah.nameEn];
    while (options.length < 3) {
      const r = shortSurahs[Math.floor(Math.random() * shortSurahs.length)];
      const name = lang === 'ar' ? r.name : r.nameEn;
      if (!options.includes(name)) options.push(name);
    }
    setQuizOptions(options.sort(() => Math.random() - 0.5));
    setQuizVerse(surah.name);
    setQuizResult(null);
    setView('quiz');
  };

  const checkQuizAnswer = (answer: string) => {
    if (answer === quizAnswer) {
      setQuizResult('correct');
      addStars(5);
    } else {
      setQuizResult('wrong');
    }
  };

  // Reward animation overlay
  const RewardPopup = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in">
      <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in-95 scale-110">
        <div className="text-7xl mb-4 animate-bounce">{newAnimal}</div>
        <p className="text-2xl font-bold text-kids-purple mb-2">
          {lang === 'ar' ? '🎉 مبروك!' : '🎉 Amazing!'}
        </p>
        <p className="text-lg text-kids-text">
          {lang === 'ar' ? 'حصلت على حيوان جديد!' : 'You got a new animal!'}
        </p>
        <div className="flex justify-center gap-1 mt-3">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={20} className="text-kids-yellow fill-kids-yellow" />
          ))}
        </div>
      </div>
    </div>
  );

  // Home view
  if (view === 'home') {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto min-h-screen bg-gradient-to-b from-kids-sky via-kids-pink/20 to-kids-mint/30">
        {showReward && <RewardPopup />}

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🌟</div>
          <h1 className="text-3xl font-bold text-kids-purple font-arabic">
            {lang === 'ar' ? 'وضع الأطفال' : 'Kids Mode'}
          </h1>
          <p className="text-kids-text mt-1 text-lg">
            {lang === 'ar' ? 'هيا نتعلم القرآن! 📖' : "Let's learn Quran! 📖"}
          </p>
        </div>

        {/* Stars & Level */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 mb-4 shadow-lg border-2 border-kids-yellow/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star size={24} className="text-kids-yellow fill-kids-yellow" />
              <span className="text-2xl font-bold text-kids-purple">{rewards.stars}</span>
              <span className="text-kids-text text-sm">{lang === 'ar' ? 'نجمة' : 'Stars'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🐾</span>
              <span className="text-lg font-bold text-kids-purple">{rewards.collectedAnimals.length}/{ANIMALS.length}</span>
            </div>
          </div>
          <Progress value={(rewards.stars % 10) * 10} className="h-4 bg-kids-pink/30" />
          <p className="text-xs text-kids-text mt-1 text-center">
            {lang === 'ar' ? `${10 - (rewards.stars % 10)} نجمات للحيوان القادم!` : `${10 - (rewards.stars % 10)} stars to next animal!`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => setView('learn')}
            className="bg-gradient-to-br from-kids-green to-emerald-400 text-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg active:scale-95 transition-transform border-2 border-white/50"
          >
            <span className="text-4xl">📖</span>
            <span className="text-base font-bold">{lang === 'ar' ? 'تعلّم سورة' : 'Learn Surah'}</span>
          </button>

          <button
            onClick={startQuiz}
            className="bg-gradient-to-br from-kids-purple to-purple-400 text-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg active:scale-95 transition-transform border-2 border-white/50"
          >
            <span className="text-4xl">🧩</span>
            <span className="text-base font-bold">{lang === 'ar' ? 'اختبار ممتع' : 'Fun Quiz'}</span>
          </button>

          <button
            onClick={() => setView('zoo')}
            className="bg-gradient-to-br from-kids-yellow to-amber-300 text-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg active:scale-95 transition-transform border-2 border-white/50"
          >
            <span className="text-4xl">🦁</span>
            <span className="text-base font-bold">{lang === 'ar' ? 'حديقة الحيوانات' : 'My Zoo'}</span>
          </button>

          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-br from-kids-pink to-rose-300 text-white rounded-2xl p-6 flex flex-col items-center gap-3 shadow-lg active:scale-95 transition-transform border-2 border-white/50"
          >
            <span className="text-4xl">🏠</span>
            <span className="text-base font-bold">{lang === 'ar' ? 'الرئيسية' : 'Home'}</span>
          </button>
        </div>

        {/* Today's Stats */}
        <div className="bg-white/80 backdrop-blur rounded-2xl p-4 shadow-lg border-2 border-kids-green/30">
          <h3 className="font-bold text-kids-purple text-center mb-3 text-lg">
            {lang === 'ar' ? '📊 إنجازاتي' : '📊 My Stats'}
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-kids-sky/50 rounded-xl p-3">
              <p className="text-2xl font-bold text-kids-purple">{rewards.totalListened}</p>
              <p className="text-[10px] text-kids-text">{lang === 'ar' ? 'آيات سمعتها' : 'Listened'}</p>
            </div>
            <div className="bg-kids-mint/50 rounded-xl p-3">
              <p className="text-2xl font-bold text-kids-purple">{rewards.totalMemorized}</p>
              <p className="text-[10px] text-kids-text">{lang === 'ar' ? 'آيات حفظتها' : 'Memorized'}</p>
            </div>
            <div className="bg-kids-pink/50 rounded-xl p-3">
              <p className="text-2xl font-bold text-kids-purple">{rewards.collectedAnimals.length}</p>
              <p className="text-[10px] text-kids-text">{lang === 'ar' ? 'حيوانات' : 'Animals'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-kids-text/60 mt-6">
          تنفيذ وتصميم insta-tech lab : Eng abdelsalam usama : 01227080430
        </p>
      </div>
    );
  }

  // Learn view
  if (view === 'learn') {
    if (!selectedSurah) {
      return (
        <div className="pb-24 px-4 pt-6 max-w-lg mx-auto min-h-screen bg-gradient-to-b from-kids-sky via-kids-mint/20 to-white">
          {showReward && <RewardPopup />}
          <button onClick={() => setView('home')} className="flex items-center gap-2 text-kids-purple mb-4 font-bold">
            <ArrowRight size={20} className="rotate-180" />
            {lang === 'ar' ? 'رجوع' : 'Back'}
          </button>
          <h2 className="text-2xl font-bold text-kids-purple text-center mb-4 font-arabic">
            {lang === 'ar' ? '📖 اختر سورة' : '📖 Pick a Surah'}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {kidsSurahs.map((surah, idx) => (
              <button
                key={surah.id}
                onClick={() => setSelectedSurah(surah.id)}
                className="bg-white/90 rounded-2xl p-4 shadow-md border-2 border-kids-purple/10 active:scale-95 transition-transform hover:border-kids-purple/40"
              >
                <div className="text-3xl mb-2">{['🌸', '🌻', '🌺', '🌷', '🌼', '🍀', '🌈', '⭐', '🌙', '☀️', '🦋', '🐝', '🌊', '🎈', '🎀', '💫', '🍄', '🌿', '🎨', '🧸', '🎶'][idx % 21]}</div>
                <p className="font-bold text-kids-purple text-sm">{surah.name}</p>
                <p className="text-[10px] text-kids-text">{surah.versesCount} {lang === 'ar' ? 'آية' : 'verses'}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    const surah = surahs.find(s => s.id === selectedSurah)!;
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto min-h-screen bg-gradient-to-b from-kids-mint/30 via-kids-sky/20 to-white">
        {showReward && <RewardPopup />}
        <button onClick={() => setSelectedSurah(null)} className="flex items-center gap-2 text-kids-purple mb-4 font-bold">
          <ArrowRight size={20} className="rotate-180" />
          {lang === 'ar' ? 'السور' : 'Surahs'}
        </button>

        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-kids-purple font-arabic">{surah.name}</h2>
          <p className="text-kids-text text-sm">{surah.nameEn}</p>
        </div>

        {/* Verse Card */}
        <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-kids-yellow/30 mb-4 min-h-[200px] flex flex-col items-center justify-center">
          {verses.length > 0 ? (
            <>
              <p className="text-kids-purple/40 text-sm mb-3">
                {lang === 'ar' ? `آية ${currentVerse + 1} من ${verses.length}` : `Verse ${currentVerse + 1} of ${verses.length}`}
              </p>
              <p className="text-2xl leading-loose text-center font-arabic text-kids-purple font-bold" dir="rtl">
                {verses[currentVerse]}
              </p>
            </>
          ) : (
            <div className="text-4xl animate-spin">🌀</div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <button
            onClick={() => setCurrentVerse(prev => Math.max(0, prev - 1))}
            disabled={currentVerse === 0}
            className="w-14 h-14 rounded-full bg-kids-purple/10 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
          >
            <ChevronRight size={28} className="text-kids-purple" />
          </button>

          <button
            onClick={playVerse}
            disabled={isPlaying || verses.length === 0}
            className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform ${
              isPlaying
                ? 'bg-kids-yellow animate-pulse'
                : 'bg-gradient-to-br from-kids-green to-emerald-400'
            }`}
          >
            <Volume2 size={36} className="text-white" />
          </button>

          <button
            onClick={() => setCurrentVerse(prev => Math.min(verses.length - 1, prev + 1))}
            disabled={currentVerse >= verses.length - 1}
            className="w-14 h-14 rounded-full bg-kids-purple/10 flex items-center justify-center disabled:opacity-30 active:scale-90 transition-transform"
          >
            <ChevronLeft size={28} className="text-kids-purple" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={markMemorized}
            className="bg-gradient-to-r from-kids-green to-emerald-400 text-white rounded-2xl py-4 font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Heart size={18} />
            {lang === 'ar' ? 'حفظتها! ⭐' : 'I memorized it! ⭐'}
          </button>
          <button
            onClick={playVerse}
            disabled={isPlaying}
            className="bg-gradient-to-r from-kids-sky to-blue-400 text-white rounded-2xl py-4 font-bold text-sm shadow-md active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <Volume2 size={18} />
            {lang === 'ar' ? 'أعد الاستماع 🔁' : 'Listen again 🔁'}
          </button>
        </div>
      </div>
    );
  }

  // Zoo view
  if (view === 'zoo') {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto min-h-screen bg-gradient-to-b from-kids-yellow/20 via-kids-mint/20 to-white">
        {showReward && <RewardPopup />}
        <button onClick={() => setView('home')} className="flex items-center gap-2 text-kids-purple mb-4 font-bold">
          <ArrowRight size={20} className="rotate-180" />
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🦁</div>
          <h2 className="text-2xl font-bold text-kids-purple font-arabic">
            {lang === 'ar' ? 'حديقة الحيوانات' : 'My Zoo'}
          </h2>
          <p className="text-kids-text text-sm mt-1">
            {lang === 'ar' ? 'اجمع نجوم واحصل على حيوانات!' : 'Collect stars to unlock animals!'}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {ANIMALS.map((animal, idx) => {
            const unlocked = rewards.collectedAnimals.includes(animal);
            return (
              <div
                key={idx}
                className={`aspect-square rounded-2xl flex items-center justify-center text-4xl shadow-md transition-all ${
                  unlocked
                    ? 'bg-white border-2 border-kids-yellow/50 animate-in zoom-in-95'
                    : 'bg-gray-200/50 grayscale opacity-40'
                }`}
              >
                {unlocked ? animal : '❓'}
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-white/80 rounded-2xl p-4 text-center shadow-md">
          <p className="text-kids-purple font-bold">
            {lang === 'ar'
              ? `اجمع ${10 - (rewards.stars % 10)} نجمات للحيوان القادم!`
              : `Collect ${10 - (rewards.stars % 10)} more stars!`}
          </p>
          <div className="flex justify-center gap-1 mt-2">
            {[...Array(10)].map((_, i) => (
              <Star
                key={i}
                size={18}
                className={i < (rewards.stars % 10)
                  ? 'text-kids-yellow fill-kids-yellow'
                  : 'text-gray-300'}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Quiz view
  if (view === 'quiz') {
    return (
      <div className="pb-24 px-4 pt-6 max-w-lg mx-auto min-h-screen bg-gradient-to-b from-kids-purple/10 via-kids-pink/20 to-white">
        {showReward && <RewardPopup />}
        <button onClick={() => setView('home')} className="flex items-center gap-2 text-kids-purple mb-4 font-bold">
          <ArrowRight size={20} className="rotate-180" />
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>

        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🧩</div>
          <h2 className="text-2xl font-bold text-kids-purple font-arabic">
            {lang === 'ar' ? 'اختبار ممتع!' : 'Fun Quiz!'}
          </h2>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border-4 border-kids-purple/20 mb-6">
          <p className="text-center text-kids-text mb-2 text-sm">
            {lang === 'ar' ? 'ما اسم هذه السورة؟' : 'What is this Surah?'}
          </p>
          <p className="text-3xl font-bold text-kids-purple text-center font-arabic mb-6">{quizVerse}</p>

          <div className="space-y-3">
            {quizOptions.map((option, idx) => (
              <button
                key={idx}
                onClick={() => checkQuizAnswer(option)}
                disabled={quizResult !== null}
                className={`w-full py-4 rounded-2xl text-lg font-bold transition-all active:scale-95 ${
                  quizResult !== null && option === quizAnswer
                    ? 'bg-kids-green text-white scale-105 shadow-lg'
                    : quizResult === 'wrong' && option !== quizAnswer
                      ? 'bg-gray-200 text-gray-400'
                      : 'bg-kids-sky/50 text-kids-purple hover:bg-kids-sky/80'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {quizResult && (
          <div className="text-center space-y-4">
            <div className="text-5xl">
              {quizResult === 'correct' ? '🎉' : '😊'}
            </div>
            <p className="text-xl font-bold text-kids-purple">
              {quizResult === 'correct'
                ? (lang === 'ar' ? 'أحسنت! +5 نجوم ⭐' : 'Great job! +5 stars ⭐')
                : (lang === 'ar' ? 'حاول مرة أخرى!' : 'Try again!')}
            </p>
            <button
              onClick={startQuiz}
              className="bg-gradient-to-r from-kids-purple to-purple-400 text-white rounded-2xl px-8 py-3 font-bold shadow-lg active:scale-95 transition-transform"
            >
              {lang === 'ar' ? 'سؤال جديد 🔄' : 'Next Question 🔄'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default KidsModePage;
