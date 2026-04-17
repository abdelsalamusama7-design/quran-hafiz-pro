import { useLanguage } from '@/contexts/LanguageContext';
import IslamicHeader from '@/components/IslamicHeader';
import StatsCards from '@/components/StatsCards';
import SurahCard from '@/components/SurahCard';
import { surahs } from '@/data/surahs';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, GraduationCap, HelpCircle, Trophy, BookCheck, Bot, BarChart3, Settings, Baby, Users, Home as HomeIcon } from 'lucide-react';

const HomePage = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const quickActions = [
    { icon: BookOpen, label: lang === 'ar' ? 'القرآن الكريم' : 'Quran', action: () => navigate('/quran'), gradient: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-400/30' },
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
