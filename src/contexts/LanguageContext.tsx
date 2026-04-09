import React, { createContext, useContext, useState, useCallback } from 'react';

type Lang = 'ar' | 'en';

interface Translations {
  [key: string]: { ar: string; en: string };
}

const translations: Translations = {
  appName: { ar: 'حافظ', en: 'Hafiz' },
  appTagline: { ar: 'رفيقك في حفظ القرآن الكريم', en: 'Your Quran Memorization Companion' },
  home: { ar: 'الرئيسية', en: 'Home' },
  quran: { ar: 'القرآن', en: 'Quran' },
  progress: { ar: 'التقدم', en: 'Progress' },
  settings: { ar: 'الإعدادات', en: 'Settings' },
  dailyVerse: { ar: 'آية اليوم', en: 'Verse of the Day' },
  startMemorizing: { ar: 'ابدأ الحفظ', en: 'Start Memorizing' },
  continueMemorizing: { ar: 'تابع الحفظ', en: 'Continue Memorizing' },
  memorized: { ar: 'تم حفظه', en: 'Memorized' },
  inProgress: { ar: 'قيد الحفظ', en: 'In Progress' },
  notStarted: { ar: 'لم يبدأ', en: 'Not Started' },
  surahs: { ar: 'السور', en: 'Surahs' },
  verses: { ar: 'آيات', en: 'Verses' },
  juz: { ar: 'جزء', en: 'Juz' },
  search: { ar: 'ابحث عن سورة...', en: 'Search for a surah...' },
  streak: { ar: 'أيام متتالية', en: 'Day Streak' },
  todayGoal: { ar: 'هدف اليوم', en: "Today's Goal" },
  totalMemorized: { ar: 'إجمالي المحفوظ', en: 'Total Memorized' },
  bismillah: { ar: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', en: 'In the name of Allah, the Most Gracious, the Most Merciful' },
  markMemorized: { ar: 'تمييز كمحفوظ', en: 'Mark as Memorized' },
  unmark: { ar: 'إلغاء التمييز', en: 'Unmark' },
  listen: { ar: 'استمع', en: 'Listen' },
  language: { ar: 'اللغة', en: 'Language' },
  arabic: { ar: 'العربية', en: 'Arabic' },
  english: { ar: 'الإنجليزية', en: 'English' },
  welcomeMessage: { ar: 'السلام عليكم', en: 'Assalamu Alaikum' },
  motivational: { ar: '﴿ إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ وَإِنَّا لَهُ لَحَافِظُونَ ﴾', en: '"Indeed, it is We who sent down the Quran and indeed, We will be its guardian."' },
  meccan: { ar: 'مكية', en: 'Meccan' },
  medinan: { ar: 'مدنية', en: 'Medinan' },
  back: { ar: 'رجوع', en: 'Back' },
  review: { ar: 'المراجعة', en: 'Review' },
  tajweed: { ar: 'التجويد', en: 'Tajweed' },
  plan: { ar: 'خطة الحفظ', en: 'Memorization Plan' },
  quiz: { ar: 'اختبار', en: 'Quiz' },
  quranMap: { ar: 'خريطة القرآن', en: 'Quran Map' },
  dailyPlan: { ar: 'خطة اليوم', en: "Today's Plan" },
  newVerses: { ar: 'آيات جديدة', en: 'New Verses' },
  revisionVerses: { ar: 'مراجعة', en: 'Revision' },
  speed: { ar: 'السرعة', en: 'Speed' },
  slow: { ar: 'بطيء', en: 'Slow' },
  normal: { ar: 'عادي', en: 'Normal' },
  fast: { ar: 'سريع', en: 'Fast' },
  repeat: { ar: 'تكرار', en: 'Repeat' },
  playing: { ar: 'يعمل الآن', en: 'Now Playing' },
  pause: { ar: 'إيقاف', en: 'Pause' },
  play: { ar: 'تشغيل', en: 'Play' },
  next: { ar: 'التالي', en: 'Next' },
  previous: { ar: 'السابق', en: 'Previous' },
  loopVerse: { ar: 'تكرار الآية', en: 'Loop Verse' },
  reciter: { ar: 'القارئ', en: 'Reciter' },
  alAfasy: { ar: 'مشاري العفاسي', en: 'Mishary Al-Afasy' },
  alHusary: { ar: 'محمود خليل الحصري', en: 'Mahmoud Al-Husary' },
  alMinshawi: { ar: 'محمد صديق المنشاوي', en: 'Al-Minshawi' },
  abdelBaset: { ar: 'عبد الباسط عبد الصمد', en: 'Abdul Basit' },
  quizTitle: { ar: 'اختبر حفظك', en: 'Test Your Memorization' },
  fillVerse: { ar: 'أكمل الآية', en: 'Complete the Verse' },
  listeningTest: { ar: 'اختبار استماع', en: 'Listening Test' },
  checkAnswer: { ar: 'تحقق', en: 'Check Answer' },
  correct: { ar: 'صحيح!', en: 'Correct!' },
  incorrect: { ar: 'حاول مرة أخرى', en: 'Try Again' },
  score: { ar: 'النتيجة', en: 'Score' },
  startQuiz: { ar: 'ابدأ الاختبار', en: 'Start Quiz' },
  nextQuestion: { ar: 'السؤال التالي', en: 'Next Question' },
  quizComplete: { ar: 'أحسنت! أكملت الاختبار', en: 'Well done! Quiz Complete' },
  selectSurah: { ar: 'اختر سورة', en: 'Select a Surah' },
  juzNumber: { ar: 'الجزء', en: 'Juz' },
  completed: { ar: 'مكتمل', en: 'Completed' },
  versesMemorized: { ar: 'آية محفوظة', en: 'verses memorized' },
  overallProgress: { ar: 'التقدم الكلي', en: 'Overall Progress' },
  dailyGoalSetting: { ar: 'عدد الآيات اليومي', en: 'Daily Verse Goal' },
  notifications: { ar: 'الإشعارات', en: 'Notifications' },
  fontSize: { ar: 'حجم الخط', en: 'Font Size' },
  small: { ar: 'صغير', en: 'Small' },
  medium: { ar: 'متوسط', en: 'Medium' },
  large: { ar: 'كبير', en: 'Large' },
  extraLarge: { ar: 'كبير جداً', en: 'Extra Large' },
  blindMode: { ar: 'وضع الحفظ الأعمى', en: 'Blind Memorization' },
  blindModeDesc: { ar: 'إخفاء أجزاء من الآيات لاختبار حفظك', en: 'Hide parts of verses to test your memory' },
  showAnswer: { ar: 'أظهر الإجابة', en: 'Show Answer' },
  hideAnswer: { ar: 'أخفِ الإجابة', en: 'Hide Answer' },
  allSurahs: { ar: 'كل السور', en: 'All Surahs' },
  popularSurahs: { ar: 'السور الشائعة', en: 'Popular Surahs' },
  shortSurahs: { ar: 'السور القصيرة', en: 'Short Surahs' },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('ar');

  const t = useCallback((key: string) => {
    return translations[key]?.[lang] || key;
  }, [lang]);

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir }}>
      <div dir={dir} className={lang === 'ar' ? 'font-arabic' : 'font-sans'}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
