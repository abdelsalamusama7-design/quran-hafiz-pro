import { useState } from 'react';
import { Download, Loader2, Layers, BookOpen, X } from 'lucide-react';
import { surahs } from '@/data/surahs';
import { reciters } from '@/contexts/AudioContext';
import { downloadSurah, isSurahDownloaded, type DownloadProgress } from '@/lib/offlineDownloads';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

type Mode = 'juz' | 'surah';

interface BulkProgress {
  totalSurahs: number;
  completedSurahs: number;
  currentSurahId: number | null;
  currentSurahName: string;
  currentVerseProgress: number;
  currentVerseTotal: number;
  cancelRequested: boolean;
}

const BulkDownload = ({ onComplete }: { onComplete?: () => void }) => {
  const { lang } = useLanguage();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>('juz');
  const [selectedJuz, setSelectedJuz] = useState<number>(30);
  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [reciterId, setReciterId] = useState<string>('ar.alafasy');
  const [progress, setProgress] = useState<BulkProgress | null>(null);
  const cancelRef = { current: false };

  const reciter = reciters.find(r => r.id === reciterId) || reciters[0];

  // Surahs in selected juz (filter by overlap)
  const surahsInJuz = surahs.filter(s => s.juz.includes(selectedJuz));

  const handleStart = async () => {
    const targets = mode === 'juz' ? surahsInJuz : surahs.filter(s => s.id === selectedSurah);
    if (targets.length === 0) return;

    cancelRef.current = false;
    setProgress({
      totalSurahs: targets.length,
      completedSurahs: 0,
      currentSurahId: null,
      currentSurahName: '',
      currentVerseProgress: 0,
      currentVerseTotal: 1,
      cancelRequested: false,
    });

    let completed = 0;
    let skipped = 0;
    let failed = 0;

    for (const s of targets) {
      if (cancelRef.current) break;

      // Skip already-downloaded
      if (isSurahDownloaded(s.id, reciterId)) {
        skipped += 1;
        completed += 1;
        setProgress(p => p && { ...p, completedSurahs: completed });
        continue;
      }

      setProgress(p => p && {
        ...p,
        currentSurahId: s.id,
        currentSurahName: lang === 'ar' ? s.name : s.nameEn,
        currentVerseProgress: 0,
        currentVerseTotal: s.versesCount,
      });

      const result = await downloadSurah(s.id, reciter.folder, reciter.id, (vp: DownloadProgress) => {
        setProgress(p => p && {
          ...p,
          currentVerseProgress: vp.current,
          currentVerseTotal: vp.total,
        });
      });

      if (!result.success) failed += 1;
      completed += 1;
      setProgress(p => p && { ...p, completedSurahs: completed });
    }

    const wasCancelled = cancelRef.current;
    setProgress(null);
    onComplete?.();

    if (wasCancelled) {
      toast({
        title: lang === 'ar' ? '⏹️ تم الإيقاف' : '⏹️ Stopped',
        description: lang === 'ar' ? `حُمّلت ${completed - skipped} سورة قبل الإيقاف` : `Downloaded ${completed - skipped} before stop`,
      });
    } else {
      toast({
        title: lang === 'ar' ? '✅ اكتمل التنزيل' : '✅ Bulk download complete',
        description: lang === 'ar'
          ? `${targets.length - skipped - failed} جديدة • ${skipped} موجودة مسبقاً${failed ? ` • ${failed} فشلت` : ''}`
          : `${targets.length - skipped - failed} new • ${skipped} existed${failed ? ` • ${failed} failed` : ''}`,
      });
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setProgress(p => p && { ...p, cancelRequested: true });
  };

  // === Active progress view ===
  if (progress) {
    const overall = (progress.completedSurahs / progress.totalSurahs) * 100;
    const verse = progress.currentVerseTotal > 0
      ? (progress.currentVerseProgress / progress.currentVerseTotal) * 100
      : 0;

    return (
      <div className="bg-gradient-to-br from-primary to-emerald-600 text-primary-foreground rounded-2xl p-4 shadow-lg space-y-3 animate-scale-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            <span className="font-bold text-sm">
              {lang === 'ar' ? 'تنزيل مجمّع جارٍ...' : 'Bulk download...'}
            </span>
          </div>
          <button
            onClick={handleCancel}
            disabled={progress.cancelRequested}
            className="bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded-lg px-2 py-1 text-xs font-bold flex items-center gap-1 disabled:opacity-50"
          >
            <X size={12} />
            {lang === 'ar' ? 'إيقاف' : 'Stop'}
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs opacity-90">
            <span>
              {lang === 'ar' ? `السورة الحالية: ${progress.currentSurahName || '...'}` : `Current: ${progress.currentSurahName || '...'}`}
            </span>
            <span>{progress.currentVerseProgress}/{progress.currentVerseTotal}</span>
          </div>
          <div className="w-full bg-primary-foreground/20 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary-foreground h-full transition-all" style={{ width: `${verse}%` }} />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs font-bold">
            <span>{lang === 'ar' ? 'الإجمالي' : 'Overall'}</span>
            <span>{progress.completedSurahs}/{progress.totalSurahs}</span>
          </div>
          <div className="w-full bg-primary-foreground/20 rounded-full h-2 overflow-hidden">
            <div className="bg-yellow-300 h-full transition-all" style={{ width: `${overall}%` }} />
          </div>
        </div>
      </div>
    );
  }

  // === Idle config view ===
  return (
    <div className="bg-card rounded-2xl p-4 shadow-islamic space-y-3 border-2 border-primary/20">
      <div className="flex items-center gap-2">
        <div className="bg-primary/10 text-primary rounded-lg p-2">
          <Layers size={18} />
        </div>
        <div className="flex-1">
          <p className="font-bold text-foreground text-sm">
            {lang === 'ar' ? '⚡ تنزيل سريع مجمّع' : '⚡ Quick Bulk Download'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {lang === 'ar' ? 'جزء كامل أو سورة بضغطة واحدة' : 'Full juz or surah in one tap'}
          </p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setMode('juz')}
          className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mode === 'juz' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
          }`}
        >
          <Layers size={14} />
          {lang === 'ar' ? 'جزء' : 'Juz'}
        </button>
        <button
          onClick={() => setMode('surah')}
          className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
            mode === 'surah' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'
          }`}
        >
          <BookOpen size={14} />
          {lang === 'ar' ? 'سورة' : 'Surah'}
        </button>
      </div>

      {/* Reciter */}
      <div>
        <label className="text-[11px] text-muted-foreground mb-1.5 block">
          {lang === 'ar' ? 'القارئ' : 'Reciter'}
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {reciters.map(r => (
            <button
              key={r.id}
              onClick={() => setReciterId(r.id)}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                reciterId === r.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Selector */}
      {mode === 'juz' ? (
        <div>
          <label className="text-[11px] text-muted-foreground mb-1.5 block">
            {lang === 'ar' ? `الجزء (1-30) — ${surahsInJuz.length} سورة` : `Juz (1-30) — ${surahsInJuz.length} surahs`}
          </label>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 30 }, (_, i) => i + 1).map(j => (
              <button
                key={j}
                onClick={() => setSelectedJuz(j)}
                className={`py-1.5 rounded-md text-[11px] font-bold transition-all ${
                  selectedJuz === j ? 'bg-primary text-primary-foreground scale-110 shadow-md' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {j}
              </button>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {surahsInJuz.slice(0, 8).map(s => (
              <span key={s.id} className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-arabic">
                {s.name}
              </span>
            ))}
            {surahsInJuz.length > 8 && (
              <span className="text-[10px] text-muted-foreground">+{surahsInJuz.length - 8}</span>
            )}
          </div>
        </div>
      ) : (
        <div>
          <label className="text-[11px] text-muted-foreground mb-1.5 block">
            {lang === 'ar' ? 'اختر السورة' : 'Select Surah'}
          </label>
          <select
            value={selectedSurah}
            onChange={e => setSelectedSurah(Number(e.target.value))}
            className="w-full bg-muted text-foreground rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary font-arabic"
          >
            {surahs.map(s => (
              <option key={s.id} value={s.id}>
                {s.id}. {lang === 'ar' ? s.name : s.nameEn} ({s.versesCount} {lang === 'ar' ? 'آية' : 'verses'})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Action button */}
      <button
        onClick={handleStart}
        className="w-full py-3 bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition-all"
      >
        <Download size={16} />
        {mode === 'juz'
          ? (lang === 'ar' ? `تنزيل الجزء ${selectedJuz} كاملاً (${surahsInJuz.length} سورة)` : `Download Juz ${selectedJuz} (${surahsInJuz.length})`)
          : (lang === 'ar' ? `تنزيل سورة ${surahs.find(s => s.id === selectedSurah)?.name}` : `Download ${surahs.find(s => s.id === selectedSurah)?.nameEn}`)}
      </button>

      <p className="text-[10px] text-muted-foreground text-center">
        {lang === 'ar' ? '💡 يتخطى السور المنزّلة مسبقاً تلقائياً' : '💡 Skips already-downloaded surahs'}
      </p>
    </div>
  );
};

export default BulkDownload;
