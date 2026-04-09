import { useLanguage } from '@/contexts/LanguageContext';
import { Globe } from 'lucide-react';

const SettingsPage = () => {
  const { t, lang, setLang } = useLanguage();

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6 font-arabic">{t('settings')}</h1>

      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <div className="flex items-center gap-3 mb-3">
          <Globe size={20} className="text-primary" />
          <h2 className="font-semibold text-foreground">{t('language')}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLang('ar')}
            className={`py-3 rounded-lg text-sm font-medium transition-all ${
              lang === 'ar'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('arabic')}
          </button>
          <button
            onClick={() => setLang('en')}
            className={`py-3 rounded-lg text-sm font-medium transition-all ${
              lang === 'en'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('english')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
