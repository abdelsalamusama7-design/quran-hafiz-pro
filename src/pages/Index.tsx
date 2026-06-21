import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import SurahCard from '@/components/SurahCard';
import { surahs } from '@/data/surahs';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Mic, GraduationCap, HelpCircle, Trophy, BookCheck, Bot, BarChart3,
  Settings, Baby, Users, Home as HomeIcon, Sparkles, EyeOff, Zap, Hand, Save,
  Search, Headphones, ChevronLeft, ScrollText, Clock, Volume2, Bell, Flame, Target,
  Compass,
} from 'lucide-react';

type Service = {
  icon: any;
  titleAr: string; titleEn: string;
  descAr: string; descEn: string;
  path: string;
  badgeAr?: string; badgeEn?: string;
  tone?: 'gold' | 'emerald';
};

const HomePage = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { streak, totalMemorized } = useMemorization();

  // ----- Quick actions (horizontal scroller) -----
  const quickActions: { icon: any; ar: string; en: string; path: string }[] = [
    { icon: Headphones, ar: 'التسميع', en: 'Recite',          path: '/recitation?mode=live-listen' },
    { icon: Hand,       ar: 'الحفظ الصامت', en: 'Silent Memo', path: '/manual-memorization' },
    { icon: ScrollText, ar: 'مصحف + تفسير', en: 'Mushaf',     path: '/mushaf-tafsir' },
    { icon: Clock,      ar: 'المواقيت', en: 'Prayer Times',    path: '/prayer-times' },
    { icon: Volume2,    ar: 'الأذان',  en: 'Adhan',           path: '/adhan' },
    { icon: Compass,    ar: 'القبلة', en: 'Qibla',             path: '/settings' },
    { icon: Bot,        ar: 'الشيخ AI', en: 'AI Sheikh',       path: '/ai-tutor' },
  ];

  // ----- Grouped service directory -----
  const groups: { titleAr: string; titleEn: string; icon: string; items: Service[] }[] = [
    {
      titleAr: 'التسميع والمراجعة', titleEn: 'Recite & Review', icon: '🎙️',
      items: [
        { icon: Headphones, titleAr: 'تسميع مباشر', titleEn: 'Live Recitation',
          descAr: 'سمّع للشيخ AI ويصحّحك آية بآية فوريًا.', descEn: 'Recite to the AI Sheikh — live verse-by-verse correction.',
          path: '/recitation?mode=live-listen', tone: 'gold',
          badgeAr: '⭐ موصى به', badgeEn: '⭐ Recommended' },
        { icon: Sparkles, titleAr: 'اقرأ وأنا أتابعك', titleEn: 'Auto-Detect',
          descAr: 'ابدأ بأي آية والتطبيق يتعرّف ويتابع.', descEn: 'Start anywhere — the app auto-detects & follows.',
          path: '/recitation?mode=auto-detect', tone: 'emerald' },
        { icon: Mic, titleAr: 'تصحيح التلاوة', titleEn: 'Correct Recitation',
          descAr: 'سجّل آية واحصل على تقييم تجويد.', descEn: 'Record one verse, get tajweed feedback.',
          path: '/recitation?mode=correct', tone: 'gold' },
        { icon: Save, titleAr: 'سجّل وراجع نفسك', titleEn: 'Record & Self-Review',
          descAr: 'سجّل صوتك وراجع حفظك بنفسك.', descEn: 'Record yourself, self-review.',
          path: '/record-review', tone: 'emerald' },
      ],
    },
    {
      titleAr: 'الحفظ والدراسة', titleEn: 'Memorize & Study', icon: '📖',
      items: [
        { icon: Hand, titleAr: 'الحفظ اليدوي الصامت', titleEn: 'Silent Manual',
          descAr: 'اكشف الآيات بدون ميكروفون.', descEn: 'Reveal verses — no mic.',
          path: '/manual-memorization', tone: 'gold', badgeAr: '🔇 صامت', badgeEn: '🔇 Silent' },
        { icon: EyeOff, titleAr: 'حفظ بدون نظر', titleEn: 'Blind Memorization',
          descAr: 'اختبر حفظك دون عرض النص.', descEn: 'Test memory — text hidden.',
          path: '/recitation?mode=blind', tone: 'emerald' },
        { icon: Zap, titleAr: 'وضع التمرين', titleEn: 'Practice Mode',
          descAr: 'تكرار ومراجعة موجّهة للإتقان.', descEn: 'Guided repetition for mastery.',
          path: '/recitation?mode=practice', tone: 'emerald' },
        { icon: BookOpen, titleAr: 'القرآن الكريم', titleEn: 'The Quran',
          descAr: 'تصفّح المصحف الكامل.', descEn: 'Browse the full Mushaf.',
          path: '/quran', tone: 'gold' },
        { icon: ScrollText, titleAr: 'مصحف زاد المفسّر', titleEn: 'Quran + Tafsir',
          descAr: 'قراءة وتفسير ميسّر لكل آية.', descEn: 'Read with verse-by-verse tafsir.',
          path: '/mushaf-tafsir', tone: 'gold', badgeAr: '📖 جديد', badgeEn: '📖 New' },
        { icon: BookCheck, titleAr: 'الورد اليومي', titleEn: 'Daily Wird',
          descAr: 'حدّد وردك وتابع التزامك.', descEn: 'Set daily portion, track streak.',
          path: '/daily-wird', tone: 'emerald' },
        { icon: Clock, titleAr: 'مواقيت الصلاة', titleEn: 'Prayer Times',
          descAr: 'مواقيت دقيقة وعدّاد للصلاة القادمة.', descEn: 'Accurate times & countdown.',
          path: '/prayer-times', tone: 'emerald' },
        { icon: Volume2, titleAr: 'الأذان', titleEn: 'Adhan',
          descAr: 'استمع للأذان وفعّل التنبيه التلقائي.', descEn: 'Listen & auto-play at prayer time.',
          path: '/adhan', tone: 'gold' },
        { icon: GraduationCap, titleAr: 'أحكام التجويد', titleEn: 'Tajweed Rules',
          descAr: 'تعلّم التجويد بأمثلة قرآنية.', descEn: 'Learn tajweed with examples.',
          path: '/tajweed', tone: 'gold' },
        { icon: HelpCircle, titleAr: 'اختبار الحفظ', titleEn: 'Quiz',
          descAr: 'أسئلة سريعة لقياس الإتقان.', descEn: 'Quick mastery quizzes.',
          path: '/quiz', tone: 'emerald' },
        { icon: Bot, titleAr: 'الشيخ AI', titleEn: 'AI Sheikh',
          descAr: 'اسأل المعلّم الذكي بأي وقت.', descEn: 'Ask the smart tutor anytime.',
          path: '/ai-tutor', tone: 'gold' },
      ],
    },
    {
      titleAr: 'المجتمع والتقدم', titleEn: 'Community & Progress', icon: '🏆',
      items: [
        { icon: Users, titleAr: 'المجتمع', titleEn: 'Community',
          descAr: 'حلقات تحفيظ وتحديات وليدربورد.', descEn: 'Circles, challenges & leaderboard.',
          path: '/community', tone: 'gold', badgeAr: '🆕 جديد', badgeEn: '🆕 New' },
        { icon: HomeIcon, titleAr: 'العائلة', titleEn: 'Family',
          descAr: 'تابع تقدّم أطفالك وجلساتهم.', descEn: 'Track children progress & sessions.',
          path: '/family', tone: 'emerald' },
        { icon: BarChart3, titleAr: 'تقدمي', titleEn: 'My Progress',
          descAr: 'تقارير وإحصاءات تفصيلية.', descEn: 'Detailed reports & stats.',
          path: '/progress', tone: 'emerald' },
        { icon: Trophy, titleAr: 'إنجازاتي', titleEn: 'Badges',
          descAr: 'شارات على كل إنجاز.', descEn: 'Earn badges for milestones.',
          path: '/badges', tone: 'gold' },
        { icon: Baby, titleAr: 'وضع الأطفال', titleEn: 'Kids Mode',
          descAr: 'واجهة مرحة بألوان وأصوات.', descEn: 'Playful kids interface.',
          path: '/kids', tone: 'emerald' },
        { icon: Settings, titleAr: 'الإعدادات', titleEn: 'Settings',
          descAr: 'لغة، إشعارات، وحسابك.', descEn: 'Language, notifications & account.',
          path: '/settings', tone: 'emerald' },
      ],
    },
  ];

  const popularSurahs = surahs.filter(s => [1, 36, 55, 67, 112, 114].includes(s.id));

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="relative isolate min-h-screen bg-emerald-950 text-white pb-32 overflow-x-hidden"
      style={{ fontFamily: 'Cairo, system-ui, sans-serif' }}
    >
      {/* Decorative gradient backdrop */}
      <div className="absolute inset-x-0 top-0 h-[360px] overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-24 -right-16 w-60 h-60 bg-amber-400/10 rounded-full blur-2xl" />
        <div className="absolute -top-16 -left-16 w-60 h-60 bg-emerald-400/10 rounded-full blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-md sm:max-w-2xl lg:max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* ============== HEADER ============== */}
        <header className="pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-amber-200 shadow-inner" />
            </div>
            <div className="leading-tight">
              <p className="text-[11px] text-emerald-300/80">
                {lang === 'ar' ? 'السلام عليكم' : 'As-salāmu ʿalaykum'}
              </p>
              <h1
                className="text-sm font-bold text-amber-100"
                style={{ fontFamily: 'Amiri, serif' }}
              >
                {lang === 'ar' ? 'في رحاب القرآن' : 'In the company of the Quran'}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/search')}
              aria-label={lang === 'ar' ? 'بحث' : 'Search'}
              className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-800 flex items-center justify-center text-amber-300 hover:bg-emerald-800/60 transition-colors"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              aria-label={lang === 'ar' ? 'إشعارات' : 'Notifications'}
              className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-800 flex items-center justify-center text-amber-300 hover:bg-emerald-800/60 transition-colors"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* ============== HERO PROGRESS CARD ============== */}
        <section className="mt-3">
          <div className="relative rounded-3xl overflow-hidden border border-emerald-700/50 bg-gradient-to-br from-emerald-800 to-emerald-900 p-5 sm:p-6 shadow-2xl shadow-emerald-950/60">
            <div className="absolute -left-12 -top-12 w-40 h-40 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-end justify-between gap-4">
              <div className="space-y-2 min-w-0">
                <span className="inline-block px-2.5 py-1 bg-amber-400/20 text-amber-300 text-[10px] font-bold rounded-md tracking-wider">
                  {lang === 'ar' ? '✦ ورد اليوم' : '✦ Today\'s wird'}
                </span>
                <h2
                  className="text-2xl sm:text-3xl font-bold leading-tight"
                  style={{ fontFamily: 'Amiri, serif' }}
                >
                  {lang === 'ar' ? 'تابع رحلتك' : 'Continue your journey'}
                  <br />
                  <span className="text-amber-300 text-lg sm:text-xl">
                    {totalMemorized > 0
                      ? (lang === 'ar' ? `${totalMemorized} آية محفوظة` : `${totalMemorized} verses memorized`)
                      : (lang === 'ar' ? 'ابدأ أول آية الآن' : 'Start your first verse')}
                  </span>
                </h2>
                <p className="text-xs text-emerald-200/80">
                  {lang === 'ar'
                    ? `سلسلة متتابعة: ${streak} يوم`
                    : `Current streak: ${streak} days`}
                </p>
              </div>

              {/* Progress ring */}
              <div className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-emerald-950/60" />
                  <circle
                    cx="40" cy="40" r="34"
                    stroke="currentColor" strokeWidth="5" fill="transparent"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={(1 - Math.min(streak, 30) / 30) * 2 * Math.PI * 34}
                    strokeLinecap="round"
                    className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Flame className="w-4 h-4 text-amber-300" />
                  <span className="text-sm font-bold text-amber-100 tabular-nums">{streak}</span>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => navigate('/manual-memorization')}
                className="py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-sm transition-colors shadow-lg shadow-amber-400/20"
                style={{ fontFamily: 'Amiri, serif' }}
              >
                {lang === 'ar' ? 'الحفظ الصامت' : 'Silent Memo'}
              </button>
              <button
                onClick={() => navigate('/recitation?mode=live-listen')}
                className="py-3 rounded-xl bg-emerald-700/60 hover:bg-emerald-700 text-amber-100 font-bold text-sm border border-amber-400/30 transition-colors"
                style={{ fontFamily: 'Amiri, serif' }}
              >
                {lang === 'ar' ? 'ابدأ التسميع' : 'Start Reciting'}
              </button>
            </div>
          </div>
        </section>

        {/* ============== MINI STATS ============== */}
        <section className="mt-5 grid grid-cols-3 gap-2.5">
          {[
            { icon: Flame,  label: lang === 'ar' ? 'سلسلة' : 'Streak',   value: streak },
            { icon: Target, label: lang === 'ar' ? 'هدف اليوم' : 'Today', value: 5 },
            { icon: BookCheck, label: lang === 'ar' ? 'محفوظ' : 'Saved',  value: totalMemorized },
          ].map((s, i) => {
            const I = s.icon;
            return (
              <div key={i} className="rounded-2xl bg-emerald-900/40 border border-emerald-800/70 px-3 py-3 text-center">
                <I className="w-4 h-4 mx-auto text-amber-300 mb-1" />
                <p className="text-lg font-bold text-amber-100 tabular-nums">{s.value}</p>
                <p className="text-[10px] text-emerald-300/80 mt-0.5">{s.label}</p>
              </div>
            );
          })}
        </section>

        {/* ============== QUICK ACTIONS (horizontal scroll) ============== */}
        <section className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3
              className="text-base font-bold text-amber-100 flex items-center gap-2"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              <span className="text-amber-400">✦</span>
              {lang === 'ar' ? 'وصول سريع' : 'Quick access'}
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar snap-x">
            {quickActions.map((q, i) => {
              const I = q.icon;
              return (
                <button
                  key={i}
                  onClick={() => navigate(q.path)}
                  className="snap-start shrink-0 flex flex-col items-center gap-2 w-[72px] active:scale-95 transition-transform"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-900/50 border border-emerald-800 hover:border-amber-400/40 flex items-center justify-center text-amber-300 shadow-lg shadow-emerald-950/40">
                    <I className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-medium text-emerald-100 text-center leading-tight">
                    {lang === 'ar' ? q.ar : q.en}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ============== GROUPED SERVICES ============== */}
        {groups.map((group) => (
          <section key={group.titleAr} className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3
                className="text-lg font-bold text-amber-100 flex items-center gap-2"
                style={{ fontFamily: 'Amiri, serif' }}
              >
                <span className="text-amber-400">✦</span>
                <span>{group.icon}</span>
                {lang === 'ar' ? group.titleAr : group.titleEn}
              </h3>
              <span className="text-[10px] text-emerald-300/70 tabular-nums">
                {group.items.length} {lang === 'ar' ? 'خدمة' : 'services'}
              </span>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {group.items.map((s) => {
                const I = s.icon;
                const accent =
                  s.tone === 'gold'
                    ? { iconBg: 'bg-amber-400/10', iconText: 'text-amber-300' }
                    : { iconBg: 'bg-emerald-400/10', iconText: 'text-emerald-300' };
                return (
                  <button
                    key={s.path + s.titleAr}
                    onClick={() => navigate(s.path)}
                    title={lang === 'ar' ? s.descAr : s.descEn}
                    aria-label={lang === 'ar' ? `${s.titleAr} — ${s.descAr}` : `${s.titleEn} — ${s.descEn}`}
                    className="group relative text-start rounded-3xl p-4 bg-emerald-900/30 border border-emerald-800/60 hover:border-amber-400/40 hover:bg-emerald-900/50 active:scale-[0.98] transition-all duration-200 flex flex-col gap-3 min-h-[140px]"
                  >
                    {s.badgeAr && (
                      <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[9px] font-bold border border-amber-400/30">
                        {lang === 'ar' ? s.badgeAr : s.badgeEn}
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-xl ${accent.iconBg} flex items-center justify-center ${accent.iconText} group-hover:scale-110 transition-transform`}>
                      <I className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4
                        className="font-bold text-sm text-amber-50 leading-tight mb-1"
                        style={{ fontFamily: 'Amiri, serif' }}
                      >
                        {lang === 'ar' ? s.titleAr : s.titleEn}
                      </h4>
                      <p className="text-[11px] text-emerald-200/70 leading-snug line-clamp-2">
                        {lang === 'ar' ? s.descAr : s.descEn}
                      </p>
                    </div>
                    <div className="flex items-center text-[10px] font-bold text-amber-300/80 group-hover:text-amber-300 transition-colors">
                      <span>{lang === 'ar' ? 'افتح' : 'Open'}</span>
                      <ChevronLeft className="w-3 h-3 ms-0.5 rtl:rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        {/* ============== POPULAR SURAHS ============== */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-lg font-bold text-amber-100 flex items-center gap-2"
              style={{ fontFamily: 'Amiri, serif' }}
            >
              <span className="text-amber-400">✦</span>
              {lang === 'ar' ? 'سور مشهورة' : 'Popular Surahs'}
            </h3>
            <button
              onClick={() => navigate('/quran')}
              className="text-[11px] font-bold text-amber-300 hover:text-amber-200"
            >
              {lang === 'ar' ? 'عرض الكل ←' : 'View all →'}
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {popularSurahs.map((s) => (
              <SurahCard key={s.id} surah={s} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
