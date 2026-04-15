import { useLanguage } from '@/contexts/LanguageContext';
import IslamicHeader from '@/components/IslamicHeader';
import StatsCards from '@/components/StatsCards';
import SurahCard from '@/components/SurahCard';
import { surahs } from '@/data/surahs';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, GraduationCap, HelpCircle, Trophy, BookCheck, Bot, BarChart3, Settings, Baby, Users } from 'lucide-react';

const HomePage = () => {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const quickActions = [
    { icon: BookOpen, label: lang === 'ar' ? 'القرآن الكريم' : 'Quran', action: () => navigate('/quran'), gradient: 'from-primary to-primary/80' },
    { icon: Mic, label: lang === 'ar' ? 'تصحيح التلاوة' : 'Recitation', action: () => navigate('/recitation'), gradient: 'from-accent to-accent/80' },
    { icon: HelpCircle, label: t('quiz'), action: () => navigate('/quiz'), gradient: 'from-primary to-emerald' },
    { icon: GraduationCap, label: lang === 'ar' ? 'التجويد' : 'Tajweed', action: () => navigate('/tajweed'), gradient: 'from-accent to-gold' },
    { icon: Bot, label: lang === 'ar' ? 'الشيخ AI' : 'AI Tutor', action: () => navigate('/ai-tutor'), gradient: 'from-primary to-primary/80' },
    { icon: BookCheck, label: lang === 'ar' ? 'الورد اليومي' : 'Daily Wird', action: () => navigate('/daily-wird'), gradient: 'from-accent to-accent/80' },
    { icon: Trophy, label: lang === 'ar' ? 'الإنجازات' : 'Badges', action: () => navigate('/badges'), gradient: 'from-primary to-emerald' },
    { icon: BarChart3, label: lang === 'ar' ? 'التقدم' : 'Progress', action: () => navigate('/progress'), gradient: 'from-accent to-gold' },
    { icon: Baby, label: lang === 'ar' ? 'وضع الأطفال' : 'Kids Mode', action: () => navigate('/kids'), gradient: 'from-primary to-primary/80' },
    { icon: Users, label: lang === 'ar' ? 'المجتمع' : 'Community', action: () => navigate('/community'), gradient: 'from-accent to-accent/80' },
    { icon: Settings, label: lang === 'ar' ? 'الإعدادات' : 'Settings', action: () => navigate('/settings'), gradient: 'from-primary to-emerald' },
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
        <div className="grid grid-cols-4 md:grid-cols-4 gap-2 md:gap-3">
          {quickActions.map(({ icon: Icon, label, action, gradient }) => (
            <button
              key={label}
              onClick={action}
              className="group bg-card border border-border/50 rounded-2xl p-3 md:p-4 flex flex-col items-center gap-2 shadow-card hover:shadow-islamic transition-all active:scale-95 hover:border-primary/20"
            >
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <span className="text-[10px] md:text-xs font-medium text-foreground text-center leading-tight line-clamp-2">{label}</span>
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
