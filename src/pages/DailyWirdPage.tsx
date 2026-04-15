import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/PageHeader';
import { useState, useEffect } from 'react';
import { Sun, Moon, Star, CheckCircle, RotateCcw } from 'lucide-react';

interface Dhikr {
  id: string;
  textAr: string;
  textEn: string;
  count: number;
  category: 'morning' | 'evening' | 'general';
}

const adhkar: Dhikr[] = [
  { id: '1', textAr: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', textEn: 'SubhanAllahi wa bihamdihi', count: 33, category: 'general' },
  { id: '2', textAr: 'لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', textEn: 'La ilaha illallahu wahdahu la sharika lah', count: 10, category: 'morning' },
  { id: '3', textAr: 'أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ', textEn: 'Astaghfirullaha wa atubu ilayh', count: 100, category: 'general' },
  { id: '4', textAr: 'اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ', textEn: 'Allahumma salli wa sallim ala nabiyyina Muhammad', count: 10, category: 'general' },
  { id: '5', textAr: 'سُبْحَانَ اللَّهِ', textEn: 'SubhanAllah', count: 33, category: 'general' },
  { id: '6', textAr: 'الْحَمْدُ لِلَّهِ', textEn: 'Alhamdulillah', count: 33, category: 'general' },
  { id: '7', textAr: 'اللَّهُ أَكْبَرُ', textEn: 'Allahu Akbar', count: 34, category: 'general' },
  { id: '8', textAr: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ', textEn: 'Bismillahilladhi la yadurru ma\'asmihi shay\'un fil-ardi wa la fis-sama', count: 3, category: 'morning' },
  { id: '9', textAr: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', textEn: 'A\'udhu bi kalimatillahit-tammati min sharri ma khalaq', count: 3, category: 'evening' },
  { id: '10', textAr: 'حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ', textEn: 'Hasbiyallahu la ilaha illa huwa alayhi tawakkaltu', count: 7, category: 'morning' },
];

const DailyWirdPage = () => {
  const { lang } = useLanguage();
  const today = new Date().toDateString();

  const [counters, setCounters] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('hafiz-adhkar-' + today);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const [activeTab, setActiveTab] = useState<'general' | 'morning' | 'evening'>('general');

  useEffect(() => {
    localStorage.setItem('hafiz-adhkar-' + today, JSON.stringify(counters));
  }, [counters, today]);

  const increment = (id: string) => {
    setCounters(prev => ({
      ...prev,
      [id]: Math.min((prev[id] || 0) + 1, adhkar.find(d => d.id === id)!.count),
    }));
  };

  const resetAll = () => setCounters({});

  const filtered = adhkar.filter(d => d.category === activeTab);
  const totalDone = adhkar.reduce((sum, d) => sum + (counters[d.id] || 0), 0);
  const totalTarget = adhkar.reduce((sum, d) => sum + d.count, 0);

  const tabs = [
    { id: 'general' as const, icon: Star, labelAr: 'عام', labelEn: 'General' },
    { id: 'morning' as const, icon: Sun, labelAr: 'الصباح', labelEn: 'Morning' },
    { id: 'evening' as const, icon: Moon, labelAr: 'المساء', labelEn: 'Evening' },
  ];

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <PageHeader title={lang === 'ar' ? '📿 الورد اليومي' : '📿 Daily Wird'} />
        <button onClick={resetAll} className="p-2 text-muted-foreground hover:text-foreground">
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Progress */}
      <div className="bg-card rounded-2xl p-5 shadow-islamic">
        <div className="flex items-end justify-between mb-2">
          <span className="text-3xl font-bold text-foreground">{Math.round((totalDone / totalTarget) * 100)}%</span>
          <span className="text-xs text-muted-foreground">{totalDone} / {totalTarget}</span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(totalDone / totalTarget) * 100}%` }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <tab.icon size={14} />
            {lang === 'ar' ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Adhkar list */}
      <div className="space-y-3">
        {filtered.map(dhikr => {
          const current = counters[dhikr.id] || 0;
          const isDone = current >= dhikr.count;

          return (
            <button
              key={dhikr.id}
              onClick={() => !isDone && increment(dhikr.id)}
              disabled={isDone}
              className={`w-full text-start bg-card rounded-xl p-4 shadow-islamic transition-all active:scale-[0.98] ${isDone ? 'opacity-60 ring-2 ring-primary/20' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  isDone ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                }`}>
                  {isDone ? <CheckCircle size={20} /> : `${current}/${dhikr.count}`}
                </div>
                <div className="flex-1">
                  <p className="font-quran text-lg leading-relaxed text-foreground" dir="rtl">{dhikr.textAr}</p>
                  {lang === 'en' && <p className="text-xs text-muted-foreground mt-1">{dhikr.textEn}</p>}
                </div>
              </div>
              {!isDone && (
                <div className="h-1 bg-muted rounded-full overflow-hidden mt-3">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(current / dhikr.count) * 100}%` }} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default DailyWirdPage;
