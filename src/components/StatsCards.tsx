import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { Flame, Target, BookCheck } from 'lucide-react';

const StatsCards = () => {
  const { t } = useLanguage();
  const { streak, totalMemorized } = useMemorization();

  const stats = [
    { icon: Flame, label: t('streak'), value: streak, color: 'text-orange-500' },
    { icon: Target, label: t('todayGoal'), value: '5', color: 'text-primary' },
    { icon: BookCheck, label: t('totalMemorized'), value: totalMemorized, color: 'text-gold' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className="bg-card rounded-xl p-4 text-center shadow-islamic animate-scale-in"
        >
          <Icon className={`mx-auto mb-2 ${color}`} size={22} />
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
