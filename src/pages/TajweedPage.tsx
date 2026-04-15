import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/PageHeader';
import { useState } from 'react';
import { BookOpen, ChevronDown, Volume2, CheckCircle } from 'lucide-react';
import { useAudio } from '@/contexts/AudioContext';

interface TajweedRule {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  examplesAr: string[];
  examplesEn: string[];
  category: string;
  surahRef?: { surah: number; verse: number };
}

const tajweedRules: TajweedRule[] = [
  {
    id: 'noon_sakinah',
    titleAr: 'النون الساكنة والتنوين',
    titleEn: 'Noon Sakinah & Tanween',
    descAr: 'النون الساكنة هي نون خالية من الحركة، والتنوين هو نون ساكنة زائدة تلحق آخر الاسم.',
    descEn: 'Noon Sakinah is a noon without a vowel. Tanween is an extra noon added to the end of a noun.',
    examplesAr: ['مِنْ بَعْدِ', 'أَنْعَمْتَ', 'عَلِيمٌ حَكِيمٌ'],
    examplesEn: ['Min ba\'di', 'An\'amta', 'Aleemun Hakeem'],
    category: 'noon',
  },
  {
    id: 'idgham',
    titleAr: 'الإدغام',
    titleEn: 'Idgham (Merging)',
    descAr: 'إدخال حرف ساكن في حرف متحرك بعده ليصيرا حرفاً واحداً مشدداً. حروفه: يرملون.',
    descEn: 'Merging a consonant into the following voweled letter. Letters: Ya, Ra, Meem, Lam, Waw, Noon.',
    examplesAr: ['مِنْ يَعْمَلْ', 'مِنْ رَبِّهِمْ', 'مِنْ وَلِيٍّ'],
    examplesEn: ['Min ya\'mal', 'Min rabbihim', 'Min waliyy'],
    category: 'noon',
    surahRef: { surah: 99, verse: 7 },
  },
  {
    id: 'ikhfa',
    titleAr: 'الإخفاء',
    titleEn: 'Ikhfa (Hiding)',
    descAr: 'النطق بالنون الساكنة أو التنوين بحالة بين الإظهار والإدغام مع بقاء الغنة. له 15 حرفاً.',
    descEn: 'Pronouncing noon sakinah/tanween between clarity and merging with nasalization. Has 15 letters.',
    examplesAr: ['أَنْتُمْ', 'مِنْ ذَا', 'مُنْذِرِينَ'],
    examplesEn: ['Antum', 'Min tha', 'Mundhireen'],
    category: 'noon',
  },
  {
    id: 'iqlab',
    titleAr: 'الإقلاب',
    titleEn: 'Iqlab (Conversion)',
    descAr: 'قلب النون الساكنة أو التنوين ميماً مخفاة عند حرف الباء مع الغنة.',
    descEn: 'Converting noon sakinah/tanween to a hidden meem before the letter Ba with nasalization.',
    examplesAr: ['مِنْ بَعْدِ', 'أَنْبِئْهُمْ', 'سَمِيعٌ بَصِيرٌ'],
    examplesEn: ['Min ba\'di', 'Anbi\'hum', 'Samee\'un baseer'],
    category: 'noon',
  },
  {
    id: 'izhar',
    titleAr: 'الإظهار',
    titleEn: 'Izhar (Clarity)',
    descAr: 'إخراج النون الساكنة أو التنوين من مخرجها بوضوح عند حروف الحلق: ء هـ ع ح غ خ.',
    descEn: 'Pronouncing noon sakinah/tanween clearly before throat letters: Hamza, Ha, Ain, Haa, Ghain, Kha.',
    examplesAr: ['مِنْ أَمْرِهِ', 'مِنْ عِلْمٍ', 'يَنْهَوْنَ'],
    examplesEn: ['Min amrihi', 'Min ilm', 'Yanhawna'],
    category: 'noon',
  },
  {
    id: 'madd_tabii',
    titleAr: 'المد الطبيعي',
    titleEn: 'Natural Madd',
    descAr: 'مد بمقدار حركتين عند وجود حرف مد (ا و ي) بدون سبب للزيادة.',
    descEn: 'Extension of 2 beats with a madd letter (Alif, Waw, Ya) without cause for additional extension.',
    examplesAr: ['قَالَ', 'يَقُولُ', 'فِيهِ'],
    examplesEn: ['Qaala', 'Yaqoolu', 'Feehi'],
    category: 'madd',
  },
  {
    id: 'madd_muttasil',
    titleAr: 'المد المتصل',
    titleEn: 'Connected Madd',
    descAr: 'مد واجب 4-5 حركات عندما يأتي حرف المد وبعده همزة في نفس الكلمة.',
    descEn: 'Obligatory extension of 4-5 beats when madd letter is followed by hamza in the same word.',
    examplesAr: ['جَاءَ', 'سُوءَ', 'جِيءَ'],
    examplesEn: ['Jaa\'a', 'Soo\'a', 'Jee\'a'],
    category: 'madd',
  },
  {
    id: 'madd_munfasil',
    titleAr: 'المد المنفصل',
    titleEn: 'Separated Madd',
    descAr: 'مد جائز 2-5 حركات عندما يأتي حرف المد في آخر كلمة والهمزة في أول الكلمة التالية.',
    descEn: 'Permissible extension of 2-5 beats when madd letter ends a word and hamza starts the next.',
    examplesAr: ['يَا أَيُّهَا', 'فِي أَنْفُسِكُمْ', 'قَالُوا آمَنَّا'],
    examplesEn: ['Ya ayyuha', 'Fee anfusikum', 'Qaloo aamanna'],
    category: 'madd',
  },
  {
    id: 'qalqalah',
    titleAr: 'القلقلة',
    titleEn: 'Qalqalah (Echo)',
    descAr: 'اضطراب صوت الحرف عند النطق به ساكناً حتى يُسمع نبرة قوية. حروفها: ق ط ب ج د.',
    descEn: 'A vibration/echo sound when pronouncing certain letters in their sukoon form. Letters: Qaf, Ta, Ba, Jim, Dal.',
    examplesAr: ['يَخْلُقْ', 'أَحَدْ', 'لَهَبْ'],
    examplesEn: ['Yakhluq', 'Ahad', 'Lahab'],
    category: 'other',
  },
  {
    id: 'ghunnah',
    titleAr: 'الغنة',
    titleEn: 'Ghunnah (Nasalization)',
    descAr: 'صوت أغن يخرج من الأنف مقداره حركتان، يكون مع النون والميم المشددتين.',
    descEn: 'A nasal sound lasting 2 beats, occurring with doubled Noon and Meem.',
    examplesAr: ['إِنَّ', 'ثُمَّ', 'مِنَ النَّاسِ'],
    examplesEn: ['Inna', 'Thumma', 'Minan-naas'],
    category: 'other',
  },
];

const categories = [
  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
  { id: 'noon', labelAr: 'أحكام النون', labelEn: 'Noon Rules' },
  { id: 'madd', labelAr: 'أحكام المد', labelEn: 'Madd Rules' },
  { id: 'other', labelAr: 'أخرى', labelEn: 'Other' },
];

const TajweedPage = () => {
  const { lang } = useLanguage();
  const audio = useAudio();
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [completedRules, setCompletedRules] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('hafiz-tajweed-completed');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const filtered = activeCategory === 'all' ? tajweedRules : tajweedRules.filter(r => r.category === activeCategory);

  const toggleComplete = (id: string) => {
    setCompletedRules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem('hafiz-tajweed-completed', JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <PageHeader title={lang === 'ar' ? '📚 دروس التجويد' : '📚 Tajweed Lessons'} />
      <p className="text-sm text-muted-foreground">
        {lang === 'ar' ? `${completedRules.size} / ${tajweedRules.length} مكتمل` : `${completedRules.size} / ${tajweedRules.length} completed`}
      </p>

      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedRules.size / tajweedRules.length) * 100}%` }} />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveCategory(c.id)}
            className={`px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              activeCategory === c.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {lang === 'ar' ? c.labelAr : c.labelEn}
          </button>
        ))}
      </div>

      {/* Rules list */}
      <div className="space-y-3">
        {filtered.map(rule => {
          const isExpanded = expandedRule === rule.id;
          const isCompleted = completedRules.has(rule.id);

          return (
            <div key={rule.id} className={`bg-card rounded-xl shadow-islamic overflow-hidden transition-all ${isCompleted ? 'ring-2 ring-primary/30' : ''}`}>
              <button
                onClick={() => setExpandedRule(isExpanded ? null : rule.id)}
                className="w-full p-4 flex items-center gap-3 text-start"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCompleted ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'}`}>
                  {isCompleted ? <CheckCircle size={18} /> : <BookOpen size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground font-arabic text-sm">{lang === 'ar' ? rule.titleAr : rule.titleEn}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{lang === 'ar' ? rule.descAr.slice(0, 50) + '...' : rule.descEn.slice(0, 50) + '...'}</p>
                </div>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3 animate-fade-in">
                  <p className="text-sm text-foreground leading-relaxed">{lang === 'ar' ? rule.descAr : rule.descEn}</p>

                  <div>
                    <p className="text-[10px] text-muted-foreground mb-2">{lang === 'ar' ? 'أمثلة:' : 'Examples:'}</p>
                    <div className="flex gap-2 flex-wrap">
                      {(lang === 'ar' ? rule.examplesAr : rule.examplesEn).map((ex, i) => (
                        <span key={i} className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm font-quran">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>

                  {rule.surahRef && (
                    <button
                      onClick={() => audio.playVerse(rule.surahRef!.surah, rule.surahRef!.verse)}
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-xs text-foreground hover:bg-muted/80"
                    >
                      <Volume2 size={14} />
                      {lang === 'ar' ? 'استمع للمثال' : 'Listen to example'}
                    </button>
                  )}

                  <button
                    onClick={() => toggleComplete(rule.id)}
                    className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    <CheckCircle size={14} />
                    {isCompleted ? (lang === 'ar' ? 'تم الإتمام ✓' : 'Completed ✓') : (lang === 'ar' ? 'تمييز كمكتمل' : 'Mark as Complete')}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TajweedPage;
