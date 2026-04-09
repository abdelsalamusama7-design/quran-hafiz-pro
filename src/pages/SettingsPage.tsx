import { useLanguage } from '@/contexts/LanguageContext';
import { Globe, Type, Volume2 } from 'lucide-react';
import { useAudio, reciters } from '@/contexts/AudioContext';
import { useState } from 'react';

const SettingsPage = () => {
  const { t, lang, setLang } = useLanguage();
  const audio = useAudio();
  const [fontSize, setFontSize] = useState<string>('medium');

  const fontSizes = [
    { key: 'small', label: t('small'), value: 'text-lg' },
    { key: 'medium', label: t('medium'), value: 'text-xl' },
    { key: 'large', label: t('large'), value: 'text-2xl' },
    { key: 'extraLarge', label: t('extraLarge'), value: 'text-3xl' },
  ];

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <h1 className="text-2xl font-bold text-foreground mb-6 font-arabic">{t('settings')}</h1>

      {/* Language */}
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <div className="flex items-center gap-3 mb-3">
          <Globe size={20} className="text-primary" />
          <h2 className="font-semibold text-foreground">{t('language')}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setLang('ar')}
            className={`py-3 rounded-lg text-sm font-medium transition-all ${
              lang === 'ar' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('arabic')}
          </button>
          <button
            onClick={() => setLang('en')}
            className={`py-3 rounded-lg text-sm font-medium transition-all ${
              lang === 'en' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {t('english')}
          </button>
        </div>
      </div>

      {/* Default Reciter */}
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <div className="flex items-center gap-3 mb-3">
          <Volume2 size={20} className="text-primary" />
          <h2 className="font-semibold text-foreground">{t('reciter')}</h2>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {reciters.map(r => (
            <button
              key={r.id}
              onClick={() => audio.setReciter(r.id)}
              className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                audio.reciter === r.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {t(r.name)}
            </button>
          ))}
        </div>
      </div>

      {/* Font Size */}
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <div className="flex items-center gap-3 mb-3">
          <Type size={20} className="text-primary" />
          <h2 className="font-semibold text-foreground">{t('fontSize')}</h2>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {fontSizes.map(f => (
            <button
              key={f.key}
              onClick={() => setFontSize(f.key)}
              className={`py-2 rounded-lg text-[10px] font-medium transition-all ${
                fontSize === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
