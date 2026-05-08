import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, BookOpen, ChevronDown, Loader2, Mic, MicOff,
  Play, Pause, Square, Trash2, Download, Save, ListMusic, Eye, EyeOff,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { surahs } from '@/data/surahs';
import { toast } from 'sonner';

interface Verse { number: number; text: string }
interface Recording {
  id: string;
  surahId: number;
  surahName: string;
  blobUrl: string;
  blob: Blob;
  durationMs: number;
  createdAt: number;
}

const toArabicNum = (n: number) =>
  n.toString().replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]);

const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

const RecordReviewPage = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const [selectedSurah, setSelectedSurah] = useState<number>(1);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSurahPicker, setShowSurahPicker] = useState(false);
  const [showText, setShowText] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPos, setPlayPos] = useState(0);
  const [playDur, setPlayDur] = useState(0);

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentSurah = surahs.find(s => s.id === selectedSurah);
  const ArrowBack = lang === 'ar' ? ArrowRight : ArrowLeft;
  const ArrowFwd = lang === 'ar' ? ArrowLeft : ArrowRight;

  // Load surah text
  useEffect(() => {
    setLoading(true);
    setVerses([]);
    fetch(`https://api.alquran.cloud/v1/surah/${selectedSurah}`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.ayahs) {
          setVerses(data.data.ayahs.map((a: any) => ({ number: a.numberInSurah, text: a.text })));
        }
      })
      .catch(() => toast.error(lang === 'ar' ? 'فشل تحميل السورة' : 'Failed to load surah'))
      .finally(() => setLoading(false));
  }, [selectedSurah, lang]);

  // Cleanup
  useEffect(() => {
    return () => {
      try { mediaRecRef.current?.stop(); } catch {}
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (tickRef.current) window.clearInterval(tickRef.current);
      audioRef.current?.pause();
      recordings.forEach(r => URL.revokeObjectURL(r.blobUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      const mime =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || 'audio/webm' });
        const durationMs = Date.now() - startedAtRef.current;
        const url = URL.createObjectURL(blob);
        const item: Recording = {
          id: crypto.randomUUID(),
          surahId: selectedSurah,
          surahName: currentSurah?.name || '',
          blobUrl: url,
          blob,
          durationMs,
          createdAt: Date.now(),
        };
        setRecordings(prev => [item, ...prev]);
        setActiveId(item.id);
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        toast.success(lang === 'ar' ? '✅ تم حفظ التسجيل' : '✅ Recording saved', {
          description: lang === 'ar' ? `المدة: ${fmt(durationMs)}` : `Duration: ${fmt(durationMs)}`,
        });
      };
      mediaRecRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsed(0);
      rec.start(250);
      setIsRecording(true);
      tickRef.current = window.setInterval(() => {
        setElapsed(Date.now() - startedAtRef.current);
      }, 200);
      toast.success(lang === 'ar' ? '🎙️ بدأ التسجيل' : '🎙️ Recording started');
    } catch (e: any) {
      toast.error(lang === 'ar' ? '❌ تعذر الوصول للميكروفون' : '❌ Microphone access denied');
    }
  };

  const stopRecording = () => {
    try { mediaRecRef.current?.stop(); } catch {}
    setIsRecording(false);
    if (tickRef.current) { window.clearInterval(tickRef.current); tickRef.current = null; }
  };

  const playRecording = (r: Recording) => {
    audioRef.current?.pause();
    const audio = new Audio(r.blobUrl);
    audioRef.current = audio;
    setActiveId(r.id);
    setPlayPos(0);
    setPlayDur(r.durationMs / 1000);
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) setPlayDur(audio.duration);
    };
    audio.ontimeupdate = () => setPlayPos(audio.currentTime);
    audio.onended = () => { setIsPlaying(false); setPlayPos(0); };
    audio.onpause = () => setIsPlaying(false);
    audio.onplay = () => setIsPlaying(true);
    audio.play().catch(() => toast.error(lang === 'ar' ? 'تعذر التشغيل' : 'Playback failed'));
  };

  const togglePlay = () => {
    if (!audioRef.current) {
      const r = recordings.find(x => x.id === activeId) || recordings[0];
      if (r) playRecording(r);
      return;
    }
    if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause();
  };

  const seek = (val: number) => {
    if (audioRef.current) { audioRef.current.currentTime = val; setPlayPos(val); }
  };

  const deleteRecording = (id: string) => {
    const r = recordings.find(x => x.id === id);
    if (r) URL.revokeObjectURL(r.blobUrl);
    if (activeId === id) { audioRef.current?.pause(); audioRef.current = null; setActiveId(null); setIsPlaying(false); }
    setRecordings(prev => prev.filter(x => x.id !== id));
    toast.success(lang === 'ar' ? '🗑️ تم الحذف' : '🗑️ Deleted');
  };

  const downloadRecording = (r: Recording) => {
    const a = document.createElement('a');
    a.href = r.blobUrl;
    const ext = r.blob.type.includes('mp4') ? 'm4a' : 'webm';
    a.download = `tasmee3-${r.surahName}-${new Date(r.createdAt).toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${ext}`;
    a.click();
  };

  const goToSurah = (offset: number) => {
    const next = selectedSurah + offset;
    if (next >= 1 && next <= 114) setSelectedSurah(next);
  };

  const active = recordings.find(r => r.id === activeId) || null;

  return (
    <div className="pb-28 max-w-lg mx-auto min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-xl border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
            aria-label="back"
          >
            <ArrowBack size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-foreground text-base font-arabic flex items-center gap-2">
              <Save size={18} className="text-primary" />
              {lang === 'ar' ? 'سجّل تسميعك وراجعه' : 'Record & Review'}
            </h1>
            <p className="text-[10px] text-muted-foreground font-arabic">
              {lang === 'ar'
                ? 'سجّل صوتك وأعد تشغيله مع النص للمقارنة'
                : 'Record your recitation and replay it next to the text'}
            </p>
          </div>
        </div>

        {/* Surah selector */}
        <div className="flex items-center gap-2">
          <button onClick={() => goToSurah(-1)} disabled={selectedSurah === 1}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30">
            <ArrowBack size={16} />
          </button>
          <button onClick={() => setShowSurahPicker(v => !v)}
            className="flex-1 flex items-center justify-between gap-1 px-3 py-2 rounded-lg bg-primary/10 text-foreground text-sm font-medium border border-primary/20">
            <span className="truncate font-arabic">
              {currentSurah?.name} ({toArabicNum(currentSurah?.versesCount || 0)} {lang === 'ar' ? 'آية' : 'verses'})
            </span>
            <ChevronDown size={14} className={`transition-transform ${showSurahPicker ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => goToSurah(1)} disabled={selectedSurah === 114}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30">
            <ArrowFwd size={16} />
          </button>
        </div>
        {showSurahPicker && (
          <div className="max-h-56 overflow-y-auto border border-border rounded-lg p-1 space-y-0.5 mt-2 bg-card">
            {surahs.map(s => (
              <button key={s.id}
                onClick={() => { setSelectedSurah(s.id); setShowSurahPicker(false); }}
                className={`w-full text-start px-3 py-1.5 rounded text-xs font-arabic flex items-center justify-between ${
                  selectedSurah === s.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                }`}>
                <span>{s.id}. {s.name}</span>
                <span className="opacity-60 text-[10px]">{s.versesCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sticky record bar */}
      <div className="sticky top-[120px] z-20 px-3 pt-3">
        <div className="bg-background/85 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-border/50">
          <button
            onClick={() => isRecording ? stopRecording() : startRecording()}
            className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-3 shadow-md active:scale-[0.98] transition-all ${
              isRecording ? 'bg-destructive text-destructive-foreground animate-pulse' : 'bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground'
            }`}>
            {isRecording ? <Square size={22} /> : <Mic size={22} />}
            <span className="font-arabic">
              {isRecording
                ? (lang === 'ar' ? `إيقاف التسجيل · ${fmt(elapsed)}` : `Stop · ${fmt(elapsed)}`)
                : (lang === 'ar' ? '🔴 ابدأ التسجيل الآن' : '🔴 Start Recording')}
            </span>
          </button>
          <p className="text-[11px] text-center text-muted-foreground mt-1.5 font-arabic">
            {isRecording
              ? (lang === 'ar' ? 'يتم التسجيل... اقرأ بصوت واضح' : 'Recording... recite clearly')
              : (lang === 'ar' ? 'سيتم حفظ التسجيل تلقائياً عند الإيقاف' : 'Will be saved automatically on stop')}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-4 space-y-4">
        {/* Active player */}
        {active && (
          <div className="bg-gradient-to-br from-primary/10 to-emerald-500/5 border border-primary/30 rounded-2xl p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <button onClick={togglePlay}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md active:scale-95">
                {isPlaying ? <Pause size={22} /> : <Play size={22} />}
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-arabic font-bold text-foreground truncate">
                  {lang === 'ar' ? 'تسجيلك:' : 'Your recording:'} {active.surahName}
                </p>
                <input
                  type="range" min={0} max={playDur || 0} step={0.1} value={playPos}
                  onChange={e => seek(parseFloat(e.target.value))}
                  className="w-full mt-1 accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground tabular-nums">
                  <span>{fmt(playPos * 1000)}</span>
                  <span>{fmt((playDur || active.durationMs / 1000) * 1000)}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-center text-muted-foreground mt-2 font-arabic">
              {lang === 'ar' ? '👇 قارن صوتك بالنص بالأسفل' : '👇 Compare your voice with the text below'}
            </p>
          </div>
        )}

        {/* Surah text for comparison */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/30">
            <p className="text-xs font-bold font-arabic flex items-center gap-1.5 text-foreground">
              <BookOpen size={14} className="text-primary" />
              {lang === 'ar' ? 'النص للمقارنة' : 'Reference text'}
            </p>
            <button onClick={() => setShowText(v => !v)}
              className="text-[11px] flex items-center gap-1 px-2 py-1 rounded bg-muted hover:bg-muted/70 font-arabic">
              {showText ? <EyeOff size={12} /> : <Eye size={12} />}
              {showText ? (lang === 'ar' ? 'إخفاء' : 'Hide') : (lang === 'ar' ? 'إظهار' : 'Show')}
            </button>
          </div>
          {showText && (
            <div className="p-4" dir="rtl">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="animate-spin mb-2" size={24} />
                  <p className="text-xs">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
                </div>
              ) : (
                <>
                  {selectedSurah !== 1 && selectedSurah !== 9 && (
                    <p className="font-quran text-2xl text-center text-foreground/90 mb-4 leading-loose">
                      بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
                    </p>
                  )}
                  <p className="font-quran text-xl md:text-2xl text-foreground leading-loose text-justify"
                     style={{ textAlignLast: 'center' }}>
                    {verses.map(v => (
                      <span key={v.number}>
                        {v.text}
                        <span className="inline-flex items-center justify-center w-7 h-7 mx-1 align-middle rounded-full border-2 border-primary/50 text-primary text-[11px] font-bold bg-card">
                          {toArabicNum(v.number)}
                        </span>
                        {' '}
                      </span>
                    ))}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Recordings list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-3 py-2 border-b border-border/60 bg-muted/30 flex items-center gap-2">
            <ListMusic size={14} className="text-primary" />
            <p className="text-xs font-bold font-arabic text-foreground">
              {lang === 'ar' ? `تسجيلاتي (${recordings.length})` : `My recordings (${recordings.length})`}
            </p>
          </div>
          {recordings.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-xs font-arabic">
              {lang === 'ar'
                ? 'لا توجد تسجيلات بعد. اضغط على "ابدأ التسجيل" لتسجيل تسميعك.'
                : 'No recordings yet. Tap "Start Recording" to record your recitation.'}
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {recordings.map(r => (
                <li key={r.id} className={`p-3 flex items-center gap-2 ${activeId === r.id ? 'bg-primary/5' : ''}`}>
                  <button onClick={() => playRecording(r)}
                    className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25">
                    <Play size={16} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-arabic font-bold text-foreground truncate">{r.surahName}</p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {fmt(r.durationMs)} · {new Date(r.createdAt).toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button onClick={() => downloadRecording(r)}
                    className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/70 flex items-center justify-center text-foreground"
                    title={lang === 'ar' ? 'تنزيل' : 'Download'}>
                    <Download size={14} />
                  </button>
                  <button onClick={() => deleteRecording(r.id)}
                    className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive"
                    title={lang === 'ar' ? 'حذف' : 'Delete'}>
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecordReviewPage;