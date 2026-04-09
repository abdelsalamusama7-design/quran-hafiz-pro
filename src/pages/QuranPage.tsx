import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import SurahCard from '@/components/SurahCard';
import { Search } from 'lucide-react';
import { useState } from 'react';

type Filter = 'all' | 'popular' | 'short' | 'juz30';

const QuranPage = () => {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const popularIds = [1, 2, 18, 36, 55, 56, 67, 78, 112, 113, 114];
  const shortSurahs = surahs.filter(s => s.versesCount <= 20);
  const juz30 = surahs.filter(s => s.juz.includes(30));

  const getFilteredSurahs = () => {
    let list = surahs;
    switch (filter) {
      case 'popular': list = surahs.filter(s => popularIds.includes(s.id)); break;
      case 'short': list = shortSurahs; break;
      case 'juz30': list = juz30; break;
    }
    if (search) {
      list = list.filter(s =>
        s.name.includes(search) ||
        s.nameEn.toLowerCase().includes(search.toLowerCase()) ||
        s.id.toString() === search
      );
    }
    return list;
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('allSurahs') },
    { key: 'popular', label: t('popularSurahs') },
    { key: 'short', label: t('shortSurahs') },
    { key: 'juz30', label: `${t('juz')} 30` },
  ];

  return (
    <div className="pb-20 px-4 pt-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-4 font-arabic">{t('quran')}</h1>

      <div className="relative mb-3">
        <Search className="absolute top-1/2 -translate-y-1/2 start-3 text-muted-foreground" size={18} />
        <input
          type="text"
          placeholder={t('search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-border rounded-xl py-3 ps-10 pe-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {getFilteredSurahs().map(surah => (
          <SurahCard key={surah.id} surah={surah} />
        ))}
      </div>
    </div>
  );
};

export default QuranPage;
