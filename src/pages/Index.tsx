import { useLanguage } from '@/contexts/LanguageContext';
import IslamicHeader from '@/components/IslamicHeader';
import StatsCards from '@/components/StatsCards';
import SurahCard from '@/components/SurahCard';
import { surahs } from '@/data/surahs';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, GraduationCap, HelpCircle, Trophy, BookCheck, Bot, BarChart3, Settings, Baby, Users, Home as HomeIcon, MessageCircle, Sparkles, EyeOff, Zap, Hand, Save } from 'lucide-react';

const HomePage = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  // Recitation modes — surfaced on the home page so users discover them immediately
  const recitationModes = [
    {
      id: 'live-listen',
      icon: MessageCircle,
      labelAr: 'تسميع مباشر',
      labelEn: 'Live Listen',
      descAr: 'شيخ AI يسمعلك ويصحح فوراً',
      descEn: 'AI sheikh listens & corrects live',
      gradient: 'from-emerald-500 to-teal-600',
      ring: 'ring-emerald-400/30',
    },
    {
      id: 'auto-detect',
      icon: Sparkles,
      labelAr: 'اقرأ وأنا أتابعك',
      labelEn: 'Auto Detect',
      descAr: 'اقرأ أي آية وسأحددها تلقائياً',
      descEn: "Read any verse, I'll identify it",
      gradient: 'from-violet-500 to-purple-600',
      ring: 'ring-violet-400/30',
    },
    {
      id: 'correct',
      icon: Mic,
      labelAr: 'تصحيح التلاوة',
      labelEn: 'Correction',
      descAr: 'اختر آية وسجّل تلاوتك',
      descEn: 'Pick a verse and record',
      gradient: 'from-rose-500 to-pink-600',
      ring: 'ring-rose-400/30',
    },
    {
      id: 'blind',
      icon: EyeOff,
      labelAr: 'حفظ بدون نظر',
      labelEn: 'Blind Mode',
      descAr: 'اختبر حفظك بدون النص',
      descEn: 'Test memorization without text',
      gradient: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-400/30',
    },
    {
      id: 'practice',
      icon: Zap,
      labelAr: 'وضع التمرين',
      labelEn: 'Practice',
      descAr: 'تدرب على سورة كاملة',
      descEn: 'Practice a full surah',
      gradient: 'from-blue-500 to-indigo-600',
      ring: 'ring-blue-400/30',
    },
  ];

  const quickActions = [
    { icon: BookOpen, label: lang === 'ar' ? 'القرآن الكريم' : 'Quran', action: () => navigate('/quran'), gradient: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-400/30' },
    { icon: Hand, label: lang === 'ar' ? 'الحفظ اليدوي' : 'Manual Memorization', action: () => navigate('/manual-memorization'), gradient: 'from-lime-500 to-green-600', ring: 'ring-lime-400/30' },
    { icon: Save, label: lang === 'ar' ? 'سجّل وراجع' : 'Record & Review', action: () => navigate('/record-review'), gradient: 'from-red-500 to-rose-600', ring: 'ring-red-400/30' },
    { icon: Mic, label: lang === 'ar' ? 'تصحيح التلاوة' : 'Recitation', action: () => navigate('/recitation'), gradient: 'from-rose-500 to-pink-600', ring: 'ring-rose-400/30' },
    { icon: HelpCircle, label: t('quiz'), action: () => navigate('/quiz'), gradient: 'from-blue-500 to-indigo-600', ring: 'ring-blue-400/30' },
    { icon: GraduationCap, label: lang === 'ar' ? 'التجويد' : 'Tajweed', action: () => navigate('/tajweed'), gradient: 'from-amber-500 to-orange-600', ring: 'ring-amber-400/30' },
    { icon: Bot, label: lang === 'ar' ? 'الشيخ AI' : 'AI Tutor', action: () => navigate('/ai-tutor'), gradient: 'from-violet-500 to-purple-600', ring: 'ring-violet-400/30' },
    { icon: BookCheck, label: lang === 'ar' ? 'الورد اليومي' : 'Daily Wird', action: () => navigate('/daily-wird'), gradient: 'from-cyan-500 to-sky-600', ring: 'ring-cyan-400/30' },
    { icon: Trophy, label: lang === 'ar' ? 'الإنجازات' : 'Badges', action: () => navigate('/badges'), gradient: 'from-yellow-500 to-amber-600', ring: 'ring-yellow-400/30' },
    { icon: BarChart3, label: lang === 'ar' ? 'التقدم' : 'Progress', action: () => navigate('/progress'), gradient: 'from-fuchsia-500 to-pink-600', ring: 'ring-fuchsia-400/30' },
    { icon: Baby, label: lang === 'ar' ? 'وضع الأطفال' : 'Kids Mode', action: () => navigate('/kids'), gradient: 'from-pink-500 to-rose-600', ring: 'ring-pink-400/30' },
    { icon: Users, label: lang === 'ar' ? 'المجتمع' : 'Community', action: () => navigate('/community'), gradient: 'from-teal-500 to-emerald-600', ring: 'ring-teal-400/30' },
    { icon: HomeIcon, label: lang === 'ar' ? 'العائلة' : 'Family', action: () => navigate('/family'), gradient: 'from-orange-500 to-red-600', ring: 'ring-orange-400/30' },
    { icon: Settings, label: lang === 'ar' ? 'الإعدادات' : 'Settings', action: () => navigate('/settings'), gradient: 'from-slate-500 to-slate-700', ring: 'ring-slate-400/30' },
  ];

  const recentSurahs = surahs.filter(s => [1, 36, 55, 67, 112, 114].includes(s.id));

  return (
    <div className="pb-28 px-4 pt-4 md:pt-8 max-w-lg mx-auto space-y-5 md:space-y-8">
      <IslamicHeader />
      <StatsCards />

      {/* Highlighted: Manual Memorization — silent, paper-style review (no mic / no recording) */}
      <button
        onClick={() => navigate('/manual-memorization')}
        className="group relative w-full text-start overflow-hidden rounded-2xl border-2 border-lime-500/40 bg-gradient-to-br from-lime-500/15 via-card to-emerald-500/10 p-4 shadow-card hover:shadow-islamic transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] animate-fade-in"
      >
        <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-700 dark:text-lime-300 text-[10px] font-bold">
          {lang === 'ar' ? '📵 بدون ميكروفون' : '📵 No mic needed'}
        </span>
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-lime-500 to-emerald-600 flex items-center justify-center text-white shadow-lg ring-4 ring-lime-400/30 group-hover:scale-110 transition-transform duration-300">
            <Hand className="w-7 h-7 drop-shadow" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground font-arabic text-base leading-tight">
              {lang === 'ar' ? '✋ الحفظ اليدوي' : '✋ Manual Memorization'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug font-arabic">
              {lang === 'ar'
                ? 'ورقة فاضية — احفظ مع نفسك، واضغط لكشف كل آية للتحقق. بدون استماع ولا تسجيل.'
                : 'Blank page — recite from memory, tap to reveal each verse. No listening or recording.'}
            </p>
          </div>
        </div>
      </button>

      {/* Highlighted: Record & Review — record your recitation and replay against text */}
      <button
        onClick={() => navigate('/record-review')}
        className="group relative w-full text-start overflow-hidden rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-500/15 via-card to-rose-500/10 p-4 shadow-card hover:shadow-islamic transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] animate-fade-in"
      >
        <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-red-500/20 text-red-700 dark:text-red-300 text-[10px] font-bold">
          {lang === 'ar' ? '🎙️ تسجيل ذاتي' : '🎙️ Self record'}
        </span>
        <div className="flex items-center gap-3">
          <div className="shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center text-white shadow-lg ring-4 ring-red-400/30 group-hover:scale-110 transition-transform duration-300">
            <Save className="w-7 h-7 drop-shadow" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground font-arabic text-base leading-tight">
              {lang === 'ar' ? '🎤 سجّل تسميعك وراجعه بنفسك' : '🎤 Record & Review Yourself'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 leading-snug font-arabic">
              {lang === 'ar'
                ? 'سجّل صوتك بضغطة زر، ثم أعد تشغيله وقارنه بالنص المكتوب أمامك.'
                : 'Tap to record your voice, then replay and compare against the verses.'}
            </p>
          </div>
        </div>
      </button>

      {/* Recitation Modes — surfaced from /recitation for instant access */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground font-arabic text-sm md:text-base">
            {lang === 'ar' ? '🎤 أوضاع التسميع' : '🎤 Recitation Modes'}
          </h2>
          <button
            onClick={() => navigate('/recitation')}
            className="text-xs text-primary font-medium hover:underline"
          >
            {lang === 'ar' ? 'عرض الكل →' : 'See all →'}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {recitationModes.map(({ id, icon: Icon, labelAr, labelEn, descAr, descEn, gradient, ring }, idx) => (
            <button
              key={id}
              onClick={() => navigate(`/recitation?mode=${id}`)}
              style={{ animationDelay: `${idx * 50}ms` }}
              className={`group relative bg-card border border-border/50 rounded-2xl p-3 text-start shadow-card hover:shadow-islamic transition-all duration-300 hover:-translate-y-1 active:scale-95 hover:border-primary/30 animate-fade-in overflow-hidden ${
                id === 'live-listen' ? 'col-span-2' : ''
              }`}
            >
              {/* Glow on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />

              <div className="relative flex items-center gap-3">
                <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-md ring-4 ${ring} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-6 h-6 drop-shadow" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground font-arabic text-sm leading-tight">
                    {lang === 'ar' ? labelAr : labelEn}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-snug">
                    {lang === 'ar' ? descAr : descEn}
                  </p>
                </div>
              </div>

              {id === 'live-listen' && (
                <span className="absolute top-2 end-2 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-bold">
                  {lang === 'ar' ? '⭐ موصى به' : '⭐ Recommended'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-semibold text-foreground font-arabic text-sm md:text-base mb-3">
          {lang === 'ar' ? '⚡ الخدمات' : '⚡ Services'}
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
          {quickActions.map(({ icon: Icon, label, action, gradient, ring }, idx) => (
            <button
              key={label}
              onClick={action}
              style={{ animationDelay: `${idx * 50}ms` }}
              className={`group relative bg-card border border-border/50 rounded-2xl p-3 md:p-4 flex flex-col items-center gap-2.5 shadow-card hover:shadow-islamic transition-all duration-300 hover:-translate-y-1 active:scale-95 hover:border-primary/30 animate-fade-in overflow-hidden`}
            >
              {/* Glow background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

              <div className={`relative w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg ring-4 ${ring} group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                <Icon className="w-7 h-7 md:w-8 md:h-8 drop-shadow" strokeWidth={2.2} />
                {/* Pulse ring on hover */}
                <span className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-40 group-hover:animate-ping`} />
              </div>
              <span className="relative text-[11px] md:text-xs font-semibold text-foreground text-center leading-tight line-clamp-2">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Popular Surahs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground font-arabic text-sm md:text-base">{t('popularSurahs')}</h2>
          <button onClick={() => navigate('/quran')} className="text-xs text-primary font-medium hover:underline">{t('allSurahs')} →</button>
        </div>
        <div className="space-y-2">
          {recentSurahs.map(surah => (
            <SurahCard key={surah.id} surah={surah} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
