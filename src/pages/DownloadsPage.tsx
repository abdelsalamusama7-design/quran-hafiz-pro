import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/PageHeader';
import BulkDownload from '@/components/BulkDownload';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import { Download, Trash2, Check, Loader2, HardDrive, WifiOff, Search, BookmarkCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  downloadSurah,
  removeDownloadedSurah,
  isSurahDownloaded,
  getDownloadedSurahs,
  getTotalDownloadedSize,
  type DownloadProgress,
  type OfflineSurahMeta,
} from '@/lib/offlineDownloads';
import { reciters } from '@/contexts/AudioContext';

const DownloadsPage = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();

  const [reciterId, setReciterId] = useState<string>('ar.alafasy');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'downloaded' | 'short'>('all');
  const [downloads, setDownloads] = useState<OfflineSurahMeta[]>([]);
  const [progressMap, setProgressMap] = useState<Record<number, DownloadProgress>>({});
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());

  const refreshList = useCallback(() => {
    setDownloads(getDownloadedSurahs());
  }, []);

  useEffect(() => {
    refreshList();
    const handler = () => refreshList();
    window.addEventListener('hafiz:surah-downloaded', handler);
    window.addEventListener('hafiz:surah-removed', handler);
    return () => {
      window.removeEventListener('hafiz:surah-downloaded', handler);
      window.removeEventListener('hafiz:surah-removed', handler);
    };
  }, [refreshList]);

  const reciter = reciters.find(r => r.id === reciterId) || reciters[0];

  const handleDownload = async (surahId: number) => {
    if (!navigator.onLine) {
      toast({
        title: lang === 'ar' ? 'لا يوجد اتصال' : 'No connection',
        description: lang === 'ar' ? 'تحتاج اتصال إنترنت للتنزيل' : 'You need internet to download',
        variant: 'destructive',
      });
      return;
    }

    setDownloadingIds(prev => new Set(prev).add(surahId));
    setProgressMap(prev => ({ ...prev, [surahId]: { surahId, current: 0, total: 1, phase: 'text' } }));

    const result = await downloadSurah(surahId, reciter.folder, reciter.id, (p) => {
      setProgressMap(prev => ({ ...prev, [surahId]: p }));
    });

    setDownloadingIds(prev => {
      const next = new Set(prev);
      next.delete(surahId);
      return next;
    });
    setProgressMap(prev => {
      const next = { ...prev };
      delete next[surahId];
      return next;
    });

    if (result.success) {
      toast({
        title: lang === 'ar' ? '✅ تم التنزيل' : '✅ Downloaded',
        description: lang === 'ar'
          ? `${surahs.find(s => s.id === surahId)?.name} متاحة الآن أوفلاين`
          : `${surahs.find(s => s.id === surahId)?.nameEn} is now available offline`,
      });
      refreshList();
    } else {
      toast({
        title: lang === 'ar' ? 'فشل التنزيل' : 'Download failed',
        description: result.error,
        variant: 'destructive',
      });
    }
  };

  const handleRemove = async (surahId: number, reciterIdToRemove: string) => {
    const r = reciters.find(rec => rec.id === reciterIdToRemove) || reciter;
    await removeDownloadedSurah(surahId, r.folder, r.id);
    toast({
      title: lang === 'ar' ? '🗑️ تم الحذف' : '🗑️ Removed',
      description: surahs.find(s => s.id === surahId)?.[lang === 'ar' ? 'name' : 'nameEn'] || '',
    });
    refreshList();
  };

  const filtered = surahs.filter(s => {
    if (filter === 'downloaded' && !isSurahDownloaded(s.id, reciterId)) return false;
    if (filter === 'short' && s.versesCount > 30) return false;
    if (search) {
      const q = search.toLowerCase();
      return s.name.includes(search) || s.nameEn.toLowerCase().includes(q) || String(s.id).includes(q);
    }
    return true;
  });

  const totalSize = getTotalDownloadedSize();

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <PageHeader title={lang === 'ar' ? '⬇️ تنزيلاتي' : '⬇️ My Downloads'} />

      {/* Storage stats */}
      <div className="bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground rounded-2xl p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-primary-foreground/20 rounded-full p-3">
            <HardDrive size={22} />
          </div>
          <div className="flex-1">
            <p className="text-xs opacity-80">{lang === 'ar' ? 'إجمالي التنزيلات' : 'Total Downloads'}</p>
            <p className="text-2xl font-bold">
              {downloads.length} {lang === 'ar' ? 'سورة' : 'Surahs'}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {totalSize > 0 ? `~${totalSize.toFixed(1)} MB` : (lang === 'ar' ? 'لا يوجد تنزيلات بعد' : 'No downloads yet')}
            </p>
          </div>
          {!navigator.onLine && (
            <div className="bg-destructive/30 rounded-full p-2" title={lang === 'ar' ? 'وضع عدم الاتصال' : 'Offline'}>
              <WifiOff size={18} />
            </div>
          )}
        </div>
      </div>

      {/* Bulk Juz/Surah Download */}
      <BulkDownload onComplete={refreshList} />

      {/* Reciter selector */}
      <div className="bg-card rounded-xl p-3 shadow-islamic">
        <label className="text-xs text-muted-foreground mb-2 block">
          {lang === 'ar' ? 'اختر القارئ' : 'Select Reciter'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {reciters.map(r => (
            <button
              key={r.id}
              onClick={() => setReciterId(r.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                reciterId === r.id
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Search + filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute top-3 start-3 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={lang === 'ar' ? 'ابحث عن سورة...' : 'Search surah...'}
            className="w-full bg-card text-foreground rounded-xl py-2.5 ps-9 pe-3 text-sm shadow-islamic outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex gap-2">
          {[
            { id: 'all' as const, labelAr: 'الكل', labelEn: 'All' },
            { id: 'downloaded' as const, labelAr: 'المنزّلة', labelEn: 'Downloaded' },
            { id: 'short' as const, labelAr: 'القصيرة', labelEn: 'Short' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                filter === f.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {lang === 'ar' ? f.labelAr : f.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Surah list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {lang === 'ar' ? 'لا توجد سور مطابقة' : 'No surahs match'}
          </div>
        )}
        {filtered.map(s => {
          const downloaded = isSurahDownloaded(s.id, reciterId);
          const downloading = downloadingIds.has(s.id);
          const progress = progressMap[s.id];
          const percent = progress
            ? Math.round((progress.current / progress.total) * 100)
            : 0;

          return (
            <div
              key={s.id}
              className={`bg-card rounded-xl p-3 shadow-islamic transition-all ${
                downloaded ? 'border-2 border-primary/30' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                  downloaded ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {s.id}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground font-arabic truncate">{s.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {s.nameEn} • {s.versesCount} {lang === 'ar' ? 'آية' : 'verses'}
                  </p>
                </div>
                {downloading ? (
                  <button
                    disabled
                    className="bg-primary/10 text-primary rounded-lg px-3 py-2 flex items-center gap-1.5 min-w-[70px] justify-center"
                  >
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-xs font-bold">{percent}%</span>
                  </button>
                ) : downloaded ? (
                  <div className="flex gap-1.5">
                    <div className="bg-primary/15 text-primary rounded-lg px-2 py-2 flex items-center gap-1">
                      <BookmarkCheck size={14} />
                      <span className="text-[10px] font-bold hidden sm:inline">
                        {lang === 'ar' ? 'محفوظة' : 'Saved'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemove(s.id, reciterId)}
                      className="bg-destructive/10 text-destructive rounded-lg p-2 hover:bg-destructive/20 transition-colors"
                      title={lang === 'ar' ? 'حذف' : 'Remove'}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleDownload(s.id)}
                    className="bg-primary text-primary-foreground rounded-lg px-3 py-2 flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all"
                  >
                    <Download size={14} />
                    <span className="text-xs font-bold hidden sm:inline">
                      {lang === 'ar' ? 'تنزيل' : 'Get'}
                    </span>
                  </button>
                )}
              </div>
              {downloading && progress && (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                    {progress.phase === 'text'
                      ? (lang === 'ar' ? 'جاري تنزيل النص...' : 'Downloading text...')
                      : (lang === 'ar'
                          ? `تنزيل التلاوة: ${progress.current}/${progress.total}`
                          : `Audio: ${progress.current}/${progress.total}`)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Tips */}
      <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground space-y-1">
        <p>💡 {lang === 'ar' ? 'نصائح:' : 'Tips:'}</p>
        <p>• {lang === 'ar' ? 'السور المُنزّلة شغّالة بالكامل بدون إنترنت' : 'Downloaded surahs work fully offline'}</p>
        <p>• {lang === 'ar' ? 'كل قارئ يُحفظ بشكل منفصل' : 'Each reciter is stored separately'}</p>
        <p>• {lang === 'ar' ? 'احذف ما لا تحتاجه لتوفير المساحة' : 'Remove unused downloads to save space'}</p>
      </div>
    </div>
  );
};

export default DownloadsPage;
