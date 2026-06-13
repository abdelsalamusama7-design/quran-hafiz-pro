import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  BookOpen,
  Compass,
  Loader2,
  X,
  Mic,
  Brain,
  Sparkles,
  Users,
  Trophy,
  Settings as SettingsIcon,
  Headphones,
  GraduationCap,
  Download,
  Award,
  Sun,
  FileText,
  Heart,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';

// ---------------- Arabic normalization ----------------
const normalizeAr = (s: string) =>
  s
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // diacritics + tatweel
    .replace(/[إأآا]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .trim();

// ---------------- Services registry ----------------
interface ServiceItem {
  key: string;
  labelAr: string;
  labelEn: string;
  descAr: string;
  descEn: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  keywordsAr: string[];
  keywordsEn: string[];
}

const SERVICES: ServiceItem[] = [
  { key: 'quran', labelAr: 'القرآن الكريم', labelEn: 'Quran', descAr: 'تصفح المصحف الكامل', descEn: 'Browse full mushaf', path: '/quran', icon: BookOpen, keywordsAr: ['قرآن','مصحف','سور','تلاوة'], keywordsEn: ['quran','mushaf','surahs'] },
  { key: 'recitation', labelAr: 'التسميع المباشر', labelEn: 'Live Recitation', descAr: 'تسميع صوتي مع تقييم فوري', descEn: 'Voice recitation with feedback', path: '/recitation', icon: Mic, keywordsAr: ['تسميع','صوت','ميكروفون','مباشر'], keywordsEn: ['recite','live','mic','voice'] },
  { key: 'manual', labelAr: 'الحفظ اليدوي', labelEn: 'Manual Memorization', descAr: 'احفظ بنفسك مع كشف الآيات', descEn: 'Memorize at your pace', path: '/manual-memorization', icon: FileText, keywordsAr: ['حفظ','يدوي','ورقة','مذاكرة'], keywordsEn: ['memorize','manual'] },
  { key: 'record', labelAr: 'سجّل تسميعك', labelEn: 'Record & Review', descAr: 'سجّل صوتك وراجعه بنفسك', descEn: 'Record yourself and review', path: '/record-review', icon: Headphones, keywordsAr: ['تسجيل','صوت','مراجعه','تسميع'], keywordsEn: ['record','review','self'] },
  { key: 'quiz', labelAr: 'الاختبارات', labelEn: 'Quiz', descAr: 'اختبر حفظك بأسئلة متنوعة', descEn: 'Test your memorization', path: '/quiz', icon: Brain, keywordsAr: ['اختبار','اسئله','كويز','تحدي'], keywordsEn: ['quiz','test','exam'] },
  { key: 'tajweed', labelAr: 'التجويد', labelEn: 'Tajweed', descAr: 'تعلم وتدرب على أحكام التجويد', descEn: 'Learn tajweed rules', path: '/tajweed', icon: Sparkles, keywordsAr: ['تجويد','احكام','مخارج'], keywordsEn: ['tajweed','rules'] },
  { key: 'ai', labelAr: 'المعلم الذكي', labelEn: 'AI Tutor', descAr: 'مدرس قرآن بالذكاء الاصطناعي', descEn: 'AI Quran tutor', path: '/ai-tutor', icon: Sparkles, keywordsAr: ['ذكاء','مساعد','معلم','شيخ'], keywordsEn: ['ai','tutor','assistant','sheikh'] },
  { key: 'wird', labelAr: 'الورد اليومي', labelEn: 'Daily Wird', descAr: 'وردك اليومي من القرآن', descEn: 'Your daily portion', path: '/daily-wird', icon: Sun, keywordsAr: ['ورد','يومي','جدول'], keywordsEn: ['wird','daily','plan'] },
  { key: 'progress', labelAr: 'تقدمي', labelEn: 'Progress', descAr: 'تابع إحصائياتك ومستواك', descEn: 'Track your stats', path: '/progress', icon: Trophy, keywordsAr: ['تقدم','احصاء','نقاط','مستوى'], keywordsEn: ['progress','stats','level'] },
  { key: 'badges', labelAr: 'الشارات', labelEn: 'Badges', descAr: 'إنجازاتك وشاراتك', descEn: 'Your achievements', path: '/badges', icon: Award, keywordsAr: ['شارات','انجازات','جوائز'], keywordsEn: ['badges','achievements'] },
  { key: 'community', labelAr: 'المجتمع', labelEn: 'Community', descAr: 'حلقات وتحديات وليدربورد', descEn: 'Circles & challenges', path: '/community', icon: Users, keywordsAr: ['مجتمع','حلقات','تحديات','متصدرين'], keywordsEn: ['community','circles','challenges','leaderboard'] },
  { key: 'family', labelAr: 'العائلة', labelEn: 'Family', descAr: 'متابعة أبنائك وأهدافهم', descEn: 'Family & parental tools', path: '/family', icon: Heart, keywordsAr: ['عائله','اطفال','والدين','اهداف'], keywordsEn: ['family','parents','kids','goals'] },
  { key: 'kids', labelAr: 'وضع الأطفال', labelEn: 'Kids Mode', descAr: 'تجربة بسيطة للأطفال', descEn: 'Kids-friendly mode', path: '/kids', icon: GraduationCap, keywordsAr: ['اطفال','صغار','تعليم'], keywordsEn: ['kids','children'] },
  { key: 'downloads', labelAr: 'التحميلات', labelEn: 'Downloads', descAr: 'حمّل السور للاستماع بدون نت', descEn: 'Offline downloads', path: '/downloads', icon: Download, keywordsAr: ['تحميل','اوفلاين','بدون نت'], keywordsEn: ['download','offline'] },
  { key: 'settings', labelAr: 'الإعدادات', labelEn: 'Settings', descAr: 'إعدادات الحساب والتطبيق', descEn: 'App settings', path: '/settings', icon: SettingsIcon, keywordsAr: ['اعدادات','حساب','لغه'], keywordsEn: ['settings','account','language'] },
];

// ---------------- Verse search types ----------------
interface VerseHit {
  number: number;
  text: string;
  surahName: string;
  surahId: number;
  numberInSurah: number;
}

const SearchPage = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [verses, setVerses] = useState<VerseHit[]>([]);
  const [loadingVerses, setLoadingVerses] = useState(false);
  const [verseError, setVerseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    // Load recents
  }, []);

  // Recent searches in localStorage
  const [recents, setRecents] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('hafiz_recent_searches') || '[]');
    } catch {
      return [];
    }
  });

  const pushRecent = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recents.filter(r => r !== t)].slice(0, 6);
    setRecents(next);
    localStorage.setItem('hafiz_recent_searches', JSON.stringify(next));
  };

  // ---- Surah suggestions ----
  const surahHits = useMemo(() => {
    const nq = normalizeAr(q);
    if (!nq) return [];
    return surahs
      .filter(s => {
        const arN = normalizeAr(s.name);
        const enN = s.nameEn.toLowerCase();
        const trN = s.nameTranslation.toLowerCase();
        return (
          arN.includes(nq) ||
          enN.includes(nq) ||
          trN.includes(nq) ||
          String(s.id) === nq
        );
      })
      .slice(0, 8);
  }, [q]);

  // ---- Service suggestions ----
  const serviceHits = useMemo(() => {
    const nq = normalizeAr(q);
    if (!nq) return [];
    return SERVICES.filter(s => {
      const fields = [
        s.labelAr,
        s.labelEn.toLowerCase(),
        s.descAr,
        s.descEn.toLowerCase(),
        ...s.keywordsAr,
        ...s.keywordsEn.map(k => k.toLowerCase()),
      ];
      return fields.some(f => normalizeAr(f).includes(nq));
    }).slice(0, 6);
  }, [q]);

  // ---- Verse search (debounced, only Arabic queries length >= 2) ----
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setVerses([]);
      setLoadingVerses(false);
      setVerseError(null);
      return;
    }
    // Only search Arabic verses for Arabic-looking queries
    const isArabic = /[\u0600-\u06FF]/.test(term);
    if (!isArabic) {
      setVerses([]);
      setLoadingVerses(false);
      return;
    }

    let cancelled = false;
    setLoadingVerses(true);
    setVerseError(null);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.alquran.cloud/v1/search/${encodeURIComponent(term)}/all/quran-uthmani`,
          { signal: ctrl.signal }
        );
        const json = await res.json();
        if (cancelled) return;
        const matches = json?.data?.matches || [];
        const hits: VerseHit[] = matches.slice(0, 20).map((m: any) => ({
          number: m.number,
          text: m.text,
          surahName: m.surah?.name || '',
          surahId: m.surah?.number || 0,
          numberInSurah: m.numberInSurah,
        }));
        setVerses(hits);
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setVerseError(lang === 'ar' ? 'تعذّر البحث في الآيات' : 'Verse search failed');
          setVerses([]);
        }
      } finally {
        if (!cancelled) setLoadingVerses(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      ctrl.abort();
      clearTimeout(timer);
    };
  }, [q, lang]);

  const goSurah = (id: number) => {
    pushRecent(q);
    navigate(`/surah/${id}`);
  };

  const goService = (path: string) => {
    pushRecent(q);
    navigate(path);
  };

  const highlight = (text: string, term: string) => {
    if (!term.trim()) return text;
    const nTerm = normalizeAr(term);
    if (!nTerm) return text;
    // Build a simple match using normalized text indices
    const nText = normalizeAr(text);
    const idx = nText.indexOf(nTerm);
    if (idx === -1) return text;
    // Approximate map back — same indices usually align since normalization is char-for-char
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + term.length);
    const after = text.slice(idx + term.length);
    return (
      <>
        {before}
        <mark className="bg-primary/30 text-foreground rounded px-0.5">{match}</mark>
        {after}
      </>
    );
  };

  const hasQuery = q.trim().length > 0;
  const noResults =
    hasQuery &&
    !loadingVerses &&
    surahHits.length === 0 &&
    serviceHits.length === 0 &&
    verses.length === 0;

  return (
    <div className="pb-28 px-4 pt-4 max-w-2xl mx-auto space-y-4">
      <PageHeader title={lang === 'ar' ? '🔍 البحث الشامل' : '🔍 Search'} />

      {/* Search input */}
      <div className="relative">
        <SearchIcon className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            lang === 'ar'
              ? 'ابحث في السور، الآيات، أو الخدمات...'
              : 'Search surahs, verses, or services...'
          }
          className="ps-9 pe-9 h-12 text-base"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute top-1/2 -translate-y-1/2 end-2 p-1 rounded-md hover:bg-muted"
            aria-label="Clear"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Empty state — recents + quick services */}
      {!hasQuery && (
        <div className="space-y-4">
          {recents.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {lang === 'ar' ? 'عمليات بحث سابقة' : 'Recent searches'}
              </p>
              <div className="flex flex-wrap gap-2">
                {recents.map((r) => (
                  <Badge
                    key={r}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/20"
                    onClick={() => setQ(r)}
                  >
                    {r}
                  </Badge>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs"
                  onClick={() => {
                    setRecents([]);
                    localStorage.removeItem('hafiz_recent_searches');
                  }}
                >
                  {lang === 'ar' ? 'مسح' : 'Clear'}
                </Button>
              </div>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {lang === 'ar' ? 'وصول سريع' : 'Quick access'}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {SERVICES.slice(0, 8).map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.key}
                    onClick={() => navigate(s.path)}
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <Icon className="w-5 h-5 text-primary" />
                    <span className="text-[11px] text-center leading-tight">
                      {lang === 'ar' ? s.labelAr : s.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {hasQuery && (
        <div className="space-y-4">
          {/* Services section */}
          {serviceHits.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Compass className="w-4 h-4 text-accent" />
                <h2 className="text-xs font-semibold text-muted-foreground">
                  {lang === 'ar' ? 'الخدمات' : 'Services'}
                  <span className="ms-1 text-[10px]">({serviceHits.length})</span>
                </h2>
              </div>
              <div className="space-y-2">
                {serviceHits.map((s) => {
                  const Icon = s.icon;
                  return (
                    <Card
                      key={s.key}
                      className="cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => goService(s.path)}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {lang === 'ar' ? s.labelAr : s.labelEn}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lang === 'ar' ? s.descAr : s.descEn}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Surahs section */}
          {surahHits.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-semibold text-muted-foreground">
                  {lang === 'ar' ? 'السور' : 'Surahs'}
                  <span className="ms-1 text-[10px]">({surahHits.length})</span>
                </h2>
              </div>
              <div className="space-y-2">
                {surahHits.map((s) => (
                  <Card
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => goSurah(s.id)}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-sm font-bold text-accent shrink-0">
                        {s.id}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-base truncate" style={{ fontFamily: 'Amiri, serif' }}>
                          {s.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {s.nameEn} · {s.nameTranslation} · {s.versesCount}{' '}
                          {lang === 'ar' ? 'آية' : 'verses'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {s.revelationType === 'meccan'
                          ? lang === 'ar' ? 'مكية' : 'Meccan'
                          : lang === 'ar' ? 'مدنية' : 'Medinan'}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Verses section */}
          <section>
            <div className="flex items-center gap-2 mb-2">
              <SearchIcon className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-semibold text-muted-foreground">
                {lang === 'ar' ? 'الآيات' : 'Verses'}
                {verses.length > 0 && (
                  <span className="ms-1 text-[10px]">({verses.length})</span>
                )}
              </h2>
              {loadingVerses && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>

            {verseError && (
              <p className="text-xs text-destructive">{verseError}</p>
            )}

            {!loadingVerses && !verseError && verses.length === 0 && /[\u0600-\u06FF]/.test(q) && q.trim().length >= 2 && (
              <p className="text-xs text-muted-foreground">
                {lang === 'ar' ? 'لا توجد آيات مطابقة' : 'No matching verses'}
              </p>
            )}

            {!loadingVerses && !verseError && !/[\u0600-\u06FF]/.test(q) && q.trim().length >= 2 && (
              <p className="text-xs text-muted-foreground">
                {lang === 'ar'
                  ? 'اكتب بالعربية للبحث في الآيات'
                  : 'Type in Arabic to search verses'}
              </p>
            )}

            <div className="space-y-2">
              {verses.map((v) => (
                <Card
                  key={v.number}
                  className="cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={() => goSurah(v.surahId)}
                >
                  <CardContent className="p-3 space-y-1">
                    <p
                      dir="rtl"
                      className="text-base leading-loose"
                      style={{ fontFamily: 'Amiri, "Scheherazade New", serif' }}
                    >
                      {highlight(v.text, q)}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-muted-foreground">
                        {v.surahName} · {lang === 'ar' ? 'آية' : 'Verse'} {v.numberInSurah}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {v.surahId}:{v.numberInSurah}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {noResults && (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;