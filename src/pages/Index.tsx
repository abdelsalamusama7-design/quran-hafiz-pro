import { useLanguage } from '@/contexts/LanguageContext';
import IslamicHeader from '@/components/IslamicHeader';
import StatsCards from '@/components/StatsCards';
import SurahCard from '@/components/SurahCard';
import { surahs } from '@/data/surahs';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, GraduationCap, HelpCircle, Trophy, BookCheck, Bot, BarChart3, Settings, Baby, Users, Home as HomeIcon, Sparkles, EyeOff, Zap, Hand, Save, Search, Headphones, ChevronLeft, ScrollText, Clock, Volume2 } from 'lucide-react';

const HomePage = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  // ========= ALL service buttons (each with a clear, friendly Arabic/English usage tip) =========
  // Grouped into 3 categories so the home page reads as a clear, browseable directory.
  type Service = {
    icon: any;
    titleAr: string; titleEn: string;
    descAr: string; descEn: string;   // one-line "what does this button do?" — pro tone
    path: string;
    gradient: string;
    ring: string;
    badgeAr?: string; badgeEn?: string;
  };

  const groups: { titleAr: string; titleEn: string; icon: string; items: Service[] }[] = [
    {
      titleAr: 'التسميع والمراجعة', titleEn: 'Recite & Review', icon: '🎙️',
      items: [
        {
          icon: Headphones, titleAr: 'تسميع مباشر', titleEn: 'Live Recitation',
          descAr: 'سمّع للشيخ AI الذي يستمع ويصحّحك آية بآية بشكل فوري.',
          descEn: 'Recite to the AI Sheikh — listens & corrects you verse by verse, live.',
          path: '/recitation?mode=live-listen', gradient: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-400/30',
          badgeAr: '⭐ موصى به', badgeEn: '⭐ Recommended',
        },
        {
          icon: Sparkles, titleAr: 'اقرأ وأنا أتابعك', titleEn: 'Auto-Detect',
          descAr: 'ابدأ بأي آية وسيتعرّف عليها التطبيق ويتابعك دون اختيار يدوي.',
          descEn: "Read any verse and the app auto-identifies it and follows along.",
          path: '/recitation?mode=auto-detect', gradient: 'from-violet-500 to-purple-600', ring: 'ring-violet-400/30',
        },
        {
          icon: Mic, titleAr: 'تصحيح التلاوة', titleEn: 'Correct Recitation',
          descAr: 'اختر آية وسجّل تلاوتك ثم احصل على تقييم نطق وتجويد مفصّل.',
          descEn: 'Pick a verse, record your recitation, get detailed pronunciation feedback.',
          path: '/recitation?mode=correct', gradient: 'from-rose-500 to-pink-600', ring: 'ring-rose-400/30',
        },
        {
          icon: Save, titleAr: 'سجّل وراجع نفسك', titleEn: 'Record & Self-Review',
          descAr: 'سجّل صوتك بضغطة واحدة ثم أعد تشغيله بجانب النص لمراجعة حفظك بنفسك.',
          descEn: 'Tap once to record, then replay alongside the text to self-review.',
          path: '/record-review', gradient: 'from-red-500 to-rose-600', ring: 'ring-red-400/30',
        },
      ],
    },
    {
      titleAr: 'الحفظ والدراسة', titleEn: 'Memorize & Study', icon: '📖',
      items: [
        {
          icon: Hand, titleAr: 'الحفظ اليدوي الصامت', titleEn: 'Silent Manual Memorization',
          descAr: 'ورقة فاضية — اقرأ من حفظك واكشف كل آية للتحقق. بدون ميكروفون ولا تسجيل.',
          descEn: 'Blank page — recite from memory & reveal each verse to verify. No mic, no recording.',
          path: '/manual-memorization', gradient: 'from-lime-500 to-emerald-600', ring: 'ring-lime-400/30',
          badgeAr: '🔇 صامت', badgeEn: '🔇 Silent',
        },
        {
          icon: EyeOff, titleAr: 'حفظ بدون نظر', titleEn: 'Blind Memorization',
          descAr: 'اختبر حفظك للسورة كاملة بدون عرض النص قبل المحاولة.',
          descEn: 'Test your memorization of a full surah without seeing the text first.',
          path: '/recitation?mode=blind', gradient: 'from-amber-500 to-orange-600', ring: 'ring-amber-400/30',
        },
        {
          icon: Zap, titleAr: 'وضع التمرين', titleEn: 'Practice Mode',
          descAr: 'تدرب على سورة كاملة بأسلوب تكرار ومراجعة موجّهة للإتقان.',
          descEn: 'Drill a full surah with guided repetition & spaced review.',
          path: '/recitation?mode=practice', gradient: 'from-blue-500 to-indigo-600', ring: 'ring-blue-400/30',
        },
        {
          icon: BookOpen, titleAr: 'القرآن الكريم', titleEn: 'The Holy Quran',
          descAr: 'تصفّح المصحف الكامل بكل السور والآيات للقراءة والمراجعة.',
          descEn: 'Browse the full Mushaf — all surahs and verses for reading & review.',
          path: '/quran', gradient: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-400/30',
        },
        {
          icon: ScrollText, titleAr: 'مصحف زاد المفسّر', titleEn: 'Quran with Tafsir',
          descAr: 'اقرأ القرآن مكتوبًا وحوله التفسير الميسّر لكل آية — على طراز مصحف زاد المفسّر.',
          descEn: 'Read the Quran with verse-by-verse Tafsir alongside — Zad Al-Mufassir style.',
          path: '/mushaf-tafsir', gradient: 'from-emerald-600 to-green-800', ring: 'ring-emerald-400/30',
          badgeAr: '📖 جديد', badgeEn: '📖 New',
        },
        {
          icon: BookCheck, titleAr: 'الورد اليومي', titleEn: 'Daily Wird',
          descAr: 'حدّد وردك اليومي من القرآن وتابع التزامك يومًا بيوم.',
          descEn: 'Set your daily Quran portion and track daily consistency.',
          path: '/daily-wird', gradient: 'from-cyan-500 to-sky-600', ring: 'ring-cyan-400/30',
        },
        {
          icon: Clock, titleAr: 'مواقيت الصلاة', titleEn: 'Prayer Times',
          descAr: 'مواقيت الصلاة لموقعك مع العدّاد للصلاة القادمة والتاريخ الهجري.',
          descEn: 'Daily prayer times for your location with countdown & Hijri date.',
          path: '/prayer-times', gradient: 'from-teal-600 to-emerald-700', ring: 'ring-teal-400/30',
        },
        {
          icon: Volume2, titleAr: 'الأذان', titleEn: 'Adhan',
          descAr: 'استمع للأذان من مكة والمدينة، وفعّل الأذان التلقائي عند دخول الوقت.',
          descEn: 'Listen to Makkah/Madinah Adhan and enable auto-play at prayer time.',
          path: '/adhan', gradient: 'from-amber-600 to-yellow-700', ring: 'ring-amber-400/30',
        },
        {
          icon: GraduationCap, titleAr: 'أحكام التجويد', titleEn: 'Tajweed Rules',
          descAr: 'تعلّم أحكام التجويد بشرح مبسّط مع أمثلة من القرآن.',
          descEn: 'Learn tajweed rules with simple explanations and Quranic examples.',
          path: '/tajweed', gradient: 'from-amber-500 to-orange-600', ring: 'ring-amber-400/30',
        },
        {
          icon: HelpCircle, titleAr: 'اختبار الحفظ', titleEn: 'Memorization Quiz',
          descAr: 'أسئلة سريعة لقياس مدى إتقانك للسور والآيات التي حفظتها.',
          descEn: 'Quick quizzes to measure mastery of surahs and verses you memorized.',
          path: '/quiz', gradient: 'from-blue-500 to-indigo-600', ring: 'ring-blue-400/30',
        },
        {
          icon: Bot, titleAr: 'الشيخ AI', titleEn: 'AI Sheikh',
          descAr: 'اسأل المعلّم الذكي عن أي آية أو حكم تجويد أو طريقة حفظ.',
          descEn: 'Ask the smart tutor about any verse, tajweed rule, or memorization tip.',
          path: '/ai-tutor', gradient: 'from-violet-500 to-purple-600', ring: 'ring-violet-400/30',
        },
      ],
    },
    {
      titleAr: 'المجتمع والتقدم', titleEn: 'Community & Progress', icon: '🏆',
      items: [
        {
          icon: Users, titleAr: 'المجتمع', titleEn: 'Community',
          descAr: 'انضم لحلقات تحفيظ، شارك في تحديات جماعية، وتابع ليدربورد الحفّاظ.',
          descEn: 'Join memorization circles, group challenges, and the leaderboard.',
          path: '/community', gradient: 'from-teal-500 to-emerald-600', ring: 'ring-teal-400/30',
          badgeAr: '🆕 جديد', badgeEn: '🆕 New',
        },
        {
          icon: HomeIcon, titleAr: 'العائلة', titleEn: 'Family',
          descAr: 'لولي الأمر/المعلّم — تابع تقدّم أطفالك وسجلّ جلساتهم وحدّد أهدافًا لهم.',
          descEn: 'For parents/teachers — track children progress, sessions & goals.',
          path: '/family', gradient: 'from-orange-500 to-red-600', ring: 'ring-orange-400/30',
        },
        {
          icon: BarChart3, titleAr: 'تقدمي', titleEn: 'My Progress',
          descAr: 'تقارير مفصّلة عن آيات حفظتها، دقة التسميع، أيام المتابعة، والإنجازات.',
          descEn: 'Detailed reports on verses memorized, accuracy, streaks & achievements.',
          path: '/progress', gradient: 'from-fuchsia-500 to-pink-600', ring: 'ring-fuchsia-400/30',
        },
        {
          icon: Trophy, titleAr: 'إنجازاتي', titleEn: 'Badges',
          descAr: 'شارات تحصل عليها كلما حفظت سورة جديدة أو حافظت على وردك اليومي.',
          descEn: 'Earn badges as you memorize new surahs and keep your daily wird.',
          path: '/badges', gradient: 'from-yellow-500 to-amber-600', ring: 'ring-yellow-400/30',
        },
        {
          icon: Baby, titleAr: 'وضع الأطفال', titleEn: 'Kids Mode',
          descAr: 'واجهة مرحة بألوان جذّابة وأصوات لتشجيع الأطفال على الحفظ.',
          descEn: 'Playful colorful interface with sounds to encourage kids to memorize.',
          path: '/kids', gradient: 'from-pink-500 to-rose-600', ring: 'ring-pink-400/30',
        },
        {
          icon: Settings, titleAr: 'الإعدادات', titleEn: 'Settings',
          descAr: 'تخصيص اللغة، الإشعارات، الميكروفون، وإعدادات حسابك.',
          descEn: 'Customize language, notifications, microphone & account settings.',
          path: '/settings', gradient: 'from-slate-500 to-slate-700', ring: 'ring-slate-400/30',
        },
      ],
    },
  ];

  const recentSurahs = surahs.filter(s => [1, 36, 55, 67, 112, 114].includes(s.id));

  return (
    <div className="pb-28 pt-4 md:pt-8 mx-auto max-w-md sm:max-w-2xl lg:max-w-5xl px-4 sm:px-6 lg:px-8 space-y-6 md:space-y-10">
      {/* Hero band — emerald + gold, full-width, with Quranic ayah */}
      <IslamicHeader />

      {/* Universal search entry */}
      <button
        onClick={() => navigate('/search')}
        className="w-full flex items-center gap-2 px-4 h-12 rounded-2xl border-2 border-[hsl(var(--gold)/0.25)] bg-card hover:border-[hsl(var(--gold)/0.5)] transition-colors text-start shadow-card"
      >
        <Search className="w-4 h-4 text-primary" />
        <span className="text-sm text-muted-foreground flex-1 truncate font-arabic">
          {lang === 'ar'
            ? 'ابحث في السور، الآيات، أو الخدمات...'
            : 'Search surahs, verses, or services...'}
        </span>
      </button>

      <StatsCards />

      {/* ALL services grouped — every button has a clear "what does it do?" caption */}
      {groups.map((group, gi) => (
        <section key={group.titleAr} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2
              className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              <span className="text-[hsl(var(--gold))]">✦</span>
              <span>{group.icon}</span>
              {lang === 'ar' ? group.titleAr : group.titleEn}
            </h2>
            <span className="text-[10px] md:text-xs text-muted-foreground font-medium tabular-nums">
              {group.items.length} {lang === 'ar' ? 'خدمة' : 'services'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {group.items.map((s, idx) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.path + s.titleAr}
                  onClick={() => navigate(s.path)}
                  style={{ animationDelay: `${(gi * 4 + idx) * 40}ms` }}
                  className="group relative w-full text-start overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-card hover:shadow-islamic hover:border-[hsl(var(--gold)/0.5)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 animate-fade-in flex flex-col h-full"
                  aria-label={lang === 'ar' ? `${s.titleAr} — ${s.descAr}` : `${s.titleEn} — ${s.descEn}`}
                  title={lang === 'ar' ? s.descAr : s.descEn}
                >
                  {/* Subtle gradient wash on hover */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-[0.06] transition-opacity duration-300 pointer-events-none`} />

                  {s.badgeAr && (
                    <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-[hsl(var(--gold)/0.18)] text-[hsl(var(--gold))] text-[10px] font-bold border border-[hsl(var(--gold)/0.3)]">
                      {lang === 'ar' ? s.badgeAr : s.badgeEn}
                    </span>
                  )}

                  <div className="relative flex items-start gap-3">
                    <div className={`shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center text-white shadow-md ring-4 ${s.ring} group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-6 h-6 md:w-7 md:h-7 drop-shadow" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-bold text-foreground text-sm md:text-base leading-tight"
                        style={{ fontFamily: 'Amiri, serif' }}
                      >
                        {lang === 'ar' ? s.titleAr : s.titleEn}
                      </p>
                    </div>
                  </div>

                  <p className="relative text-[12px] md:text-[13px] text-muted-foreground mt-3 leading-relaxed font-arabic flex-1">
                    {lang === 'ar' ? s.descAr : s.descEn}
                  </p>

                  <div className="relative flex items-center justify-end mt-3 text-[11px] font-bold text-primary opacity-80 group-hover:opacity-100 transition-opacity">
                    <span>{lang === 'ar' ? 'ابدأ الآن' : 'Open'}</span>
                    <ChevronLeft className="w-3.5 h-3.5 ms-0.5 group-hover:-translate-x-1 transition-transform rtl:rotate-180" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      {/* Popular Surahs */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: 'Amiri, serif' }}>
            <span className="text-[hsl(var(--gold))]">✦</span>
            {t('popularSurahs')}
          </h2>
          <button onClick={() => navigate('/quran')} className="text-xs md:text-sm text-primary font-bold hover:underline">{t('allSurahs')} →</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {recentSurahs.map(surah => (
            <SurahCard key={surah.id} surah={surah} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
