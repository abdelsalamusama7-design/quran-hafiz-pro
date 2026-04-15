import { useLanguage } from '@/contexts/LanguageContext';
import { useMemorization } from '@/hooks/useMemorization';
import { Flame, Target, BookCheck } from 'lucide-react';

const StatsCards = () => {
  const { t } = useLanguage();
  const { streak, totalMemorized } = useMemorization();

  const stats = [
    { icon: Flame, label: t('streak'), value: streak, color: 'text-destructive' },
    { icon: Target, label: t('todayGoal'), value: '5', color: 'text-primary' },
    { icon: BookCheck, label: t('totalMemorized'), value: totalMemorized, color: 'text-accent' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-4">
      {stats.map(({ icon: Icon, label, value, color }) => (
        <div
          key={label}
          className="bg-card rounded-2xl p-3 md:p-5 text-center shadow-card animate-scale-in border border-border/50"
        >
          <div className={`w-9 h-9 md:w-11 md:h-11 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2 ${color}`}>
            <Icon className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-foreground">{value}</p>
          <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
};

export default StatsCards;
