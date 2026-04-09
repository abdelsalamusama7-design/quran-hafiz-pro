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
