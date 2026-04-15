import { useLanguage } from '@/contexts/LanguageContext';

const IslamicHeader = () => {
  const { t } = useLanguage();

  return (
    <div className="gradient-islamic islamic-pattern rounded-2xl p-5 md:p-8 text-primary-foreground shadow-islamic animate-fade-in relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/10" />
      <div className="relative z-10">
        <p className="text-xs md:text-sm opacity-80 mb-1 font-arabic">{t('welcomeMessage')}</p>
        <h1 className="text-xl md:text-3xl font-bold font-arabic mb-2">{t('appName')}</h1>
        <p className="text-[11px] md:text-sm opacity-70 font-quran leading-relaxed max-w-sm">
          {t('motivational')}
        </p>
      </div>
    </div>
  );
};

export default IslamicHeader;
