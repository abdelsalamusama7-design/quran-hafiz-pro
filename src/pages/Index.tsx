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
    { icon: BookOpen, label: lang === 'ar' ? 'القرآن الكريم' : 'Quran', action: () => navigate('/quran'), color: 'bg-primary text-primary-foreground' },
    { icon: Mic, label: lang === 'ar' ? 'تصحيح التلاوة' : 'Recitation', action: () => navigate('/recitation'), color: 'bg-secondary text-secondary-foreground' },
    { icon: HelpCircle, label: t('quiz'), action: () => navigate('/quiz'), color: 'bg-accent text-accent-foreground' },
    { icon: GraduationCap, label: lang === 'ar' ? 'التجويد' : 'Tajweed', action: () => navigate('/tajweed'), color: 'bg-primary text-primary-foreground' },
    { icon: Bot, label: lang === 'ar' ? 'الشيخ AI' : 'AI Tutor', action: () => navigate('/ai-tutor'), color: 'bg-accent text-accent-foreground' },
    { icon: BookCheck, label: lang === 'ar' ? 'الورد اليومي' : 'Daily Wird', action: () => navigate('/daily-wird'), color: 'bg-secondary text-secondary-foreground' },
    { icon: Trophy, label: lang === 'ar' ? 'الإنجازات' : 'Badges', action: () => navigate('/badges'), color: 'bg-primary text-primary-foreground' },
    { icon: BarChart3, label: lang === 'ar' ? 'التقدم' : 'Progress', action: () => navigate('/progress'), color: 'bg-accent text-accent-foreground' },
    { icon: Baby, label: lang === 'ar' ? 'وضع الأطفال' : 'Kids Mode', action: () => navigate('/kids'), color: 'bg-secondary text-secondary-foreground' },
    { icon: Users, label: lang === 'ar' ? 'المجتمع' : 'Community', action: () => navigate('/community'), color: 'bg-primary text-primary-foreground' },
    { icon: Settings, label: lang === 'ar' ? 'الإعدادات' : 'Settings', action: () => navigate('/settings'), color: 'bg-accent text-accent-foreground' },
  ];

  const recentSurahs = surahs.filter(s => [1, 36, 55, 67, 112, 114].includes(s.id));

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-6">
      <IslamicHeader />
      <StatsCards />

      <div className="grid grid-cols-3 gap-3">
        {quickActions.map(({ icon: Icon, label, action, color }) => (
          <button
            key={label}
            onClick={action}
            className={`${color} rounded-xl p-4 flex flex-col items-center gap-2 shadow-islamic hover:opacity-90 transition-opacity active:scale-95`}
          >
            <Icon size={20} />
            <span className="text-[10px] font-medium text-center leading-tight">{label}</span>
          </button>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-foreground font-arabic">{t('popularSurahs')}</h2>
          <button onClick={() => navigate('/quran')} className="text-xs text-primary font-medium">{t('allSurahs')} →</button>
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
