import { useLanguage } from '@/contexts/LanguageContext';

const IslamicHeader = () => {
  const { t } = useLanguage();

  return (
    <div className="gradient-islamic islamic-pattern rounded-2xl p-6 text-primary-foreground shadow-islamic animate-fade-in">
      <p className="text-sm opacity-80 mb-1">{t('welcomeMessage')}</p>
      <h1 className="text-2xl font-bold font-arabic mb-3">{t('appName')}</h1>
      <p className="text-xs opacity-70 font-quran leading-relaxed">
        {t('motivational')}
      </p>
    </div>
  );
};

export default IslamicHeader;
