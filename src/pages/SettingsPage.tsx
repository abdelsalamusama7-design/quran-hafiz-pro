import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/PageHeader';
import { useTheme } from '@/hooks/useTheme';
import { useFontSize } from '@/hooks/useFontSize';
import { Globe, Type, Volume2, Sun, Moon } from 'lucide-react';
import { useAudio, reciters } from '@/contexts/AudioContext';

const SettingsPage = () => {
  const { t, lang, setLang } = useLanguage();
  const audio = useAudio();
  const { theme, toggleTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();

  const fontSizes = [
    { key: 'small' as const, label: t('small') },
    { key: 'medium' as const, label: t('medium') },
    { key: 'large' as const, label: t('large') },
    { key: 'extraLarge' as const, label: t('extraLarge') },
  ];

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <PageHeader title={t('settings')} />

      {/* Dark/Light Mode */}
      <div className="bg-card rounded-xl p-4 shadow-islamic">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-primary" />}
            <h2 className="font-semibold text-foreground">{lang === 'ar' ? 'الوضع الداكن' : 'Dark Mode'}</h2>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-7 rounded-full relative transition-colors ${
              theme === 'dark' ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${
              theme === 'dark' ? 'right-1' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

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
        <p className="font-quran text-foreground text-center mt-3" style={{ fontSize: `var(--quran-font-size, 18px)` }}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;
