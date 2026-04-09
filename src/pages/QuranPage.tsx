import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import SurahCard from '@/components/SurahCard';
import { Search } from 'lucide-react';
import { useState } from 'react';

const QuranPage = () => {
  const { t, lang } = useLanguage();
  const [search, setSearch] = useState('');

  const filtered = surahs.filter(s =>
    s.name.includes(search) ||
    s.nameEn.toLowerCase().includes(search.toLowerCase()) ||
    s.id.toString() === search
  );

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-4 font-arabic">{t('quran')}</h1>

      <div className="relative mb-4">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-3 ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(surah => (
          <SurahCard key={surah.id} surah={surah} />
        ))}
      </div>
    </div>
  );
};

export default QuranPage;
