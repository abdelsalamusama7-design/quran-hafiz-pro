import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ArrowLeft, BookOpen, ChevronDown } from 'lucide-react';
import { surahs } from '@/data/surahs';
import { useLanguage } from '@/contexts/LanguageContext';

interface Verse { number: number; text: string; }

/**
 * مصحف زاد المفسّر — Quran reading with verse-by-verse Tafsir alongside.
 * Source: alquran.cloud (ar.muyassar تفسير الميسر).
 */
const MushafTafsirPage = () => {
  const navigate = useNavigate();
  const { dir, lang } = useLanguage();
  const [params, setParams] = useSearchParams();
  const surahId = Number(params.get('surah') || 1);
  const surah = useMemo(() => surahs.find(s => s.id === surahId) || surahs[0], [surahId]);

  const [verses, setVerses] = useState<Verse[]>([]);
  const [tafsir, setTafsir] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [openPicker, setOpenPicker] = useState(false);
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    setLoading(true);
    setVerses([]); setTafsir({});
    Promise.all([
      fetch(`https://api.alquran.cloud/v1/surah/${surah.id}`).then(r => r.json()),
      fetch(`https://api.alquran.cloud/v1/surah/${surah.id}/ar.muyassar`).then(r => r.json()),
    ]).then(([ar, tf]) => {
      if (ar.data?.ayahs) setVerses(ar.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
      if (tf.data?.ayahs) {
        const map: Record<number, string> = {};
        tf.data.ayahs.forEach((a: any) => { map[a.numberInSurah] = a.text; });
        setTafsir(map);
      }
    }).finally(() => setLoading(false));
  }, [surah.id]);

  return (
    <div className="pb-28 pt-4 max-w-3xl mx-auto px-3 sm:px-5">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm">
          <BackArrow size={18} />
          {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <div className="relative">
          <button
            onClick={() => setOpenPicker(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-[hsl(var(--gold)/0.3)] text-sm font-bold"
            style={{ fontFamily: 'Amiri, serif' }}
          >
            <BookOpen size={14} className="text-[hsl(var(--gold))]" />
            {surah.name} ({surah.nameEn})
            <ChevronDown size={14} />
          </button>
          {openPicker && (
            <div className="absolute end-0 mt-2 w-64 max-h-80 overflow-y-auto rounded-xl border border-border bg-card shadow-xl z-50">
              {surahs.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setParams({ surah: String(s.id) }); setOpenPicker(false); }}
                  className={`w-full text-start px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between ${s.id === surah.id ? 'bg-primary/10 text-primary font-bold' : ''}`}
                >
                  <span style={{ fontFamily: 'Amiri, serif' }}>{s.id}. {s.name}</span>
                  <span className="text-[10px] text-muted-foreground">{s.versesCount}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mushaf cover header */}
      <div className="rounded-2xl p-5 mb-5 text-center border-2 border-[hsl(var(--gold)/0.4)] bg-[hsl(var(--cream))] shadow-card">
        <p className="text-[11px] tracking-widest text-[hsl(var(--gold))] font-bold mb-1">مصحف زاد المفسّر</p>
        <h1 className="text-3xl font-bold text-[hsl(var(--emerald))]" style={{ fontFamily: 'Amiri, serif' }}>
          سورة {surah.name}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{surah.versesCount} آية — {surah.revelationType === 'meccan' ? 'مكية' : 'مدنية'}</p>
        {surah.id !== 9 && surah.id !== 1 && (
          <p className="font-quran text-2xl mt-4 text-foreground">بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {verses.map(v => (
            <article key={v.number} className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
              {/* Verse text — the مصحف part */}
              <div className="bg-[hsl(var(--cream))] dark:bg-card border-b-2 border-dashed border-[hsl(var(--gold)/0.4)] p-4 md:p-5">
                <div className="flex items-start gap-3" dir="rtl">
                  <span className="shrink-0 w-9 h-9 rounded-full bg-[hsl(var(--emerald))] text-[hsl(var(--cream))] flex items-center justify-center text-sm font-bold border-2 border-[hsl(var(--gold))]">
                    {v.number}
                  </span>
                  <p className="font-quran text-2xl md:text-3xl leading-[2.4] text-foreground flex-1 text-justify">
                    {v.text}
                  </p>
                </div>
              </div>
              {/* Tafsir — حول الآية */}
              <div className="p-4 md:p-5 bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[hsl(var(--gold))]">✦</span>
                  <h3 className="text-xs font-bold text-[hsl(var(--emerald))] tracking-wider" style={{ fontFamily: 'Amiri, serif' }}>
                    التفسير الميسّر
                  </h3>
                </div>
                <p dir="rtl" className="text-[15px] leading-[1.95] text-muted-foreground font-arabic">
                  {tafsir[v.number] || '...'}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Surah nav */}
      <div className="flex items-center justify-between gap-3 mt-6">
        <button
          disabled={surah.id <= 1}
          onClick={() => setParams({ surah: String(surah.id - 1) })}
          className="flex-1 py-2.5 rounded-xl bg-card border border-border text-sm font-bold disabled:opacity-40 hover:border-[hsl(var(--gold)/0.5)]"
        >
          {dir === 'rtl' ? '→' : '←'} السورة السابقة
        </button>
        <button
          disabled={surah.id >= 114}
          onClick={() => setParams({ surah: String(surah.id + 1) })}
          className="flex-1 py-2.5 rounded-xl bg-[hsl(var(--emerald))] text-[hsl(var(--cream))] text-sm font-bold disabled:opacity-40"
        >
          السورة التالية {dir === 'rtl' ? '←' : '→'}
        </button>
      </div>
    </div>
  );
};

export default MushafTafsirPage;