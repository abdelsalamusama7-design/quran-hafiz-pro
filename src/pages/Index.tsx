import { useLanguage } from '@/contexts/LanguageContext';
import IslamicHeader from '@/components/IslamicHeader';
import StatsCards from '@/components/StatsCards';
import SurahCard from '@/components/SurahCard';
import { surahs } from '@/data/surahs';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Mic, GraduationCap } from 'lucide-react';

const HomePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const quickActions = [
    { icon: BookOpen, label: t('continueMemorizing'), action: () => navigate('/quran'), color: 'bg-primary text-primary-foreground' },
    { icon: Mic, label: t('tajweed'), action: () => {}, color: 'bg-accent text-accent-foreground' },
    { icon: GraduationCap, label: t('review'), action: () => navigate('/progress'), color: 'bg-secondary text-secondary-foreground' },
  ];

  const recentSurahs = surahs.filter(s => [1, 112, 113, 114, 36, 67].includes(s.id));

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto space-y-6">
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
        <h2 className="font-semibold text-foreground mb-3 font-arabic">{t('surahs')}</h2>
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
