import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, Bell, BellOff, Play, Pause, SkipForward,
  Volume2, VolumeX, MapPin, Clock, Radio, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

// ---------- Types & constants ----------
interface Timings {
  Fajr: string; Sunrise: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string;
}
const PRAYERS: (keyof Timings)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const NAMES_AR: Record<string, string> = { Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء' };
const NAMES_EN: Record<string, string> = { Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha' };
const ICONS: Record<string, string> = { Fajr: '🌄', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙' };

// Muezzin list — multiple reciters / variants
const MUEZZINS = [
  { id: 'makkah',     ar: 'الحرم المكي',         en: 'Makkah Haram',        url: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
  { id: 'madinah',    ar: 'الحرم المدني',        en: 'Madinah Haram',       url: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
  { id: 'mishary',    ar: 'مشاري راشد العفاسي',  en: 'Mishary Alafasy',     url: 'https://www.islamcan.com/audio/adhan/azan3.mp3' },
  { id: 'naqshbandi', ar: 'حافظ مصطفى الأزهري',  en: 'Mustafa Al-Azhari',   url: 'https://www.islamcan.com/audio/adhan/azan4.mp3' },
  { id: 'qatami',     ar: 'ناصر القطامي',        en: 'Nasser Al-Qatami',    url: 'https://www.islamcan.com/audio/adhan/azan5.mp3' },
  { id: 'menshawi',   ar: 'محمد صديق المنشاوي',  en: 'Mohammad Al-Minshawi',url: 'https://www.islamcan.com/audio/adhan/azan6.mp3' },
  { id: 'fajr',       ar: 'أذان الفجر (الصلاة خير من النوم)', en: 'Fajr Adhan', url: 'https://www.islamcan.com/audio/adhan/azan7.mp3' },
];

const parseHM = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + (m || 0); };
const fmtMin = (mins: number) => {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
};

// ---------- Component ----------
const AdhanPage = () => {
  const navigate = useNavigate();
  const { lang, dir } = useLanguage();
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  // settings (persisted)
  const [muezzinId, setMuezzinId] = useState(() => localStorage.getItem('adhan_muezzin') || 'makkah');
  const [fajrMuezzinId, setFajrMuezzinId] = useState(() => localStorage.getItem('adhan_fajr_muezzin') || 'fajr');
  const [volume, setVolume] = useState(() => Number(localStorage.getItem('adhan_volume') || '0.85'));
  const [notify, setNotify] = useState(() => localStorage.getItem('adhan_notify') === '1');
  const [preMin, setPreMin] = useState(() => Number(localStorage.getItem('adhan_pre_min') || '10'));
  const [bgKeepAlive, setBgKeepAlive] = useState(() => localStorage.getItem('adhan_bg') !== '0');

  // runtime
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [city, setCity] = useState('');
  const [timings, setTimings] = useState<Timings | null>(null);
  const [hijri, setHijri] = useState('');
  const [now, setNow] = useState(new Date());
  const [playing, setPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{ name: string; prayer?: string } | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>(() =>
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<number[]>([]);
  const wakeLockRef = useRef<any>(null);

  const muezzin = useMemo(() => MUEZZINS.find(m => m.id === muezzinId) || MUEZZINS[0], [muezzinId]);
  const fajrMuezzin = useMemo(() => MUEZZINS.find(m => m.id === fajrMuezzinId) || MUEZZINS[6], [fajrMuezzinId]);

  // Persist settings
  useEffect(() => { localStorage.setItem('adhan_muezzin', muezzinId); }, [muezzinId]);
  useEffect(() => { localStorage.setItem('adhan_fajr_muezzin', fajrMuezzinId); }, [fajrMuezzinId]);
  useEffect(() => { localStorage.setItem('adhan_volume', String(volume)); if (audioRef.current) audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { localStorage.setItem('adhan_pre_min', String(preMin)); }, [preMin]);
  useEffect(() => { localStorage.setItem('adhan_bg', bgKeepAlive ? '1' : '0'); }, [bgKeepAlive]);

  // Tick
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Geolocation
  useEffect(() => {
    if (!navigator.geolocation) { setCoords({ lat: 21.3891, lon: 39.8579 }); setCity('Makkah'); return; }
    navigator.geolocation.getCurrentPosition(
      p => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => { setCoords({ lat: 30.0444, lon: 31.2357 }); setCity('Cairo'); },
      { timeout: 8000 }
    );
  }, []);

  // Fetch timings
  useEffect(() => {
    if (!coords) return;
    fetch(`https://api.aladhan.com/v1/timings?latitude=${coords.lat}&longitude=${coords.lon}&method=5`)
      .then(r => r.json())
      .then(d => {
        if (!d.data?.timings) return;
        const t = d.data.timings;
        setTimings({ Fajr: t.Fajr, Sunrise: t.Sunrise, Dhuhr: t.Dhuhr, Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha });
        setHijri(`${d.data.date?.hijri?.day} ${d.data.date?.hijri?.month?.ar} ${d.data.date?.hijri?.year}هـ`);
        if (!city && d.data.meta?.timezone) setCity(d.data.meta.timezone.split('/').pop() || '');
      })
      .catch(() => {});
  }, [coords]);

  // ---------- Precise schedulers ----------
  // Clear & rebuild scheduled timers when timings/settings change
  useEffect(() => {
    timersRef.current.forEach(id => clearTimeout(id));
    timersRef.current = [];
    if (!notify || !timings) return;

    const nowMs = Date.now();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    PRAYERS.forEach(p => {
      const mins = parseHM(timings[p]);
      const target = today.getTime() + mins * 60_000;

      // Pre-prayer reminder
      if (preMin > 0) {
        const preTs = target - preMin * 60_000;
        if (preTs > nowMs) {
          const id = window.setTimeout(() => firePreReminder(p), preTs - nowMs);
          timersRef.current.push(id);
        }
      }
      // On-time Adhan
      if (target > nowMs) {
        const id = window.setTimeout(() => fireAdhan(p), target - nowMs);
        timersRef.current.push(id);
      }
    });

    return () => { timersRef.current.forEach(id => clearTimeout(id)); timersRef.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timings, notify, preMin, muezzinId, fajrMuezzinId]);

  // Re-sync schedulers when tab returns (timeouts drift if suspended)
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        // force re-schedule
        setNow(new Date());
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Background keep-alive: WakeLock + silent loop
  useEffect(() => {
    if (!bgKeepAlive || !notify) return;
    let cancelled = false;
    const acquire = async () => {
      try {
        // @ts-ignore
        if ('wakeLock' in navigator) {
          // @ts-ignore
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch {}
    };
    acquire();
    const onVis = () => { if (document.visibilityState === 'visible' && !cancelled) acquire(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      try { wakeLockRef.current?.release?.(); } catch {}
    };
  }, [bgKeepAlive, notify]);

  // ---------- Actions ----------
  const ensurePermission = async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission;
    if (Notification.permission === 'default') {
      const p = await Notification.requestPermission();
      setPermission(p);
      return p;
    }
    return Notification.permission;
  };

  const toggleNotify = async () => {
    const next = !notify;
    if (next) await ensurePermission();
    setNotify(next);
    localStorage.setItem('adhan_notify', next ? '1' : '0');
  };

  const notify_ = (title: string, body: string) => {
    try {
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/pwa-192x192.png', badge: '/pwa-192x192.png', tag: title });
      }
    } catch {}
  };

  const playUrl = async (url: string, label: string, prayer?: string) => {
    const a = audioRef.current; if (!a) return;
    a.src = url; a.volume = volume; a.loop = false;
    setCurrentTrack({ name: label, prayer });
    try {
      await a.play();
      setPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: lang === 'ar' ? `أذان ${prayer ? NAMES_AR[prayer] : ''}` : `Adhan ${prayer ? NAMES_EN[prayer] : ''}`,
          artist: label,
          album: lang === 'ar' ? 'حافظ القرآن' : 'Quran Hafiz',
          artwork: [{ src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' }],
        });
        navigator.mediaSession.setActionHandler('play', () => a.play());
        navigator.mediaSession.setActionHandler('pause', () => a.pause());
        navigator.mediaSession.setActionHandler('stop', () => stop());
      }
    } catch { setPlaying(false); }
  };

  const fireAdhan = (p: keyof Timings) => {
    const m = p === 'Fajr' ? fajrMuezzin : muezzin;
    notify_(
      lang === 'ar' ? `حان الآن وقت صلاة ${NAMES_AR[p]}` : `It's time for ${NAMES_EN[p]} prayer`,
      lang === 'ar' ? `الصلاة بصوت ${m.ar}` : `Adhan by ${m.en}`
    );
    playUrl(m.url, lang === 'ar' ? m.ar : m.en, p);
  };

  const firePreReminder = (p: keyof Timings) => {
    notify_(
      lang === 'ar' ? `اقتراب وقت صلاة ${NAMES_AR[p]}` : `${NAMES_EN[p]} prayer is approaching`,
      lang === 'ar' ? `يتبقى ${preMin} دقيقة` : `${preMin} minutes remaining`
    );
  };

  const previewMuezzin = () => playUrl(muezzin.url, lang === 'ar' ? muezzin.ar : muezzin.en);
  const previewFajr = () => playUrl(fajrMuezzin.url, lang === 'ar' ? fajrMuezzin.ar : fajrMuezzin.en, 'Fajr');
  const stop = () => { audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0; setPlaying(false); };
  const togglePlay = () => { if (!audioRef.current) return; if (playing) { audioRef.current.pause(); setPlaying(false); } else { audioRef.current.play().then(() => setPlaying(true)).catch(() => {}); } };

  // Next prayer & countdown
  const { nextPrayer, remaining } = useMemo(() => {
    if (!timings) return { nextPrayer: 'Fajr' as keyof Timings, remaining: '--:--:--' };
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const nowSec = now.getSeconds();
    const list = PRAYERS.map(p => ({ name: p, min: parseHM(timings[p]) }));
    const next = list.find(p => p.min > nowMin) || list[0];
    let diff = next.min - nowMin;
    if (diff <= 0) diff += 24 * 60;
    const totalSec = diff * 60 - nowSec;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return {
      nextPrayer: next.name,
      remaining: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`,
    };
  }, [timings, now]);

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  return (
    <div className="pb-32 pt-4 max-w-2xl mx-auto px-4">
      <audio ref={audioRef} onEnded={() => setPlaying(false)} preload="none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <BackArrow size={18} /> {t('رجوع', 'Back')}
        </button>
        <button
          onClick={() => navigate('/prayer-times')}
          className="text-xs font-bold text-[hsl(var(--emerald))] flex items-center gap-1"
        >
          <Clock size={14} /> {t('مواقيت الصلاة', 'Prayer Times')}
        </button>
      </div>

      {/* Hero — next adhan countdown */}
      <div className="rounded-3xl p-6 mb-5 text-center shadow-islamic border-2 border-[hsl(var(--gold)/0.35)] bg-gradient-to-br from-[hsl(var(--emerald))] to-[hsl(154_65%_22%)] text-[hsl(var(--cream))]">
        <p className="text-[10px] tracking-widest opacity-70 mb-1 flex items-center justify-center gap-1">
          <MapPin size={11} /> {city || '...'} • {hijri}
        </p>
        <p className="text-[11px] opacity-80 mt-2">{t('الأذان القادم', 'Next Adhan')}</p>
        <p className="text-3xl font-bold mt-1" style={{ fontFamily: 'Amiri, serif' }}>
          {ICONS[nextPrayer]} {t(NAMES_AR[nextPrayer], NAMES_EN[nextPrayer])}
        </p>
        <p className="text-sm mt-1 opacity-90 tabular-nums">{timings?.[nextPrayer]}</p>
        <p className="text-4xl font-bold mt-3 tabular-nums tracking-wider text-[hsl(var(--gold))]">{remaining}</p>
        <p className="text-[11px] opacity-70 mt-2">
          {notify
            ? t('سيتم رفع الأذان تلقائيًا عند دخول الوقت', 'Adhan will play automatically at prayer time')
            : t('فعّل التنبيهات لرفع الأذان تلقائيًا', 'Enable alerts to auto-play Adhan')}
        </p>
      </div>

      {/* Alerts toggle row */}
      <section className="rounded-2xl border-2 border-[hsl(var(--gold)/0.3)] bg-card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2" style={{ fontFamily: 'Amiri, serif' }}>
              <Bell size={18} className="text-[hsl(var(--gold))]" />
              {t('الإشعارات الوقتية', 'Precise Alerts')}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t('تنبيه دقيق بالثانية عند دخول كل وقت صلاة', 'Second-accurate alert at every prayer time')}
            </p>
          </div>
          <button
            onClick={toggleNotify}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
              notify ? 'bg-[hsl(var(--emerald))] text-[hsl(var(--cream))] border-[hsl(var(--emerald))]' : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            {notify ? <Bell size={14} /> : <BellOff size={14} />}
            {notify ? t('مفعّل', 'On') : t('إيقاف', 'Off')}
          </button>
        </div>

        {/* Permission state */}
        {notify && (
          <div className={`flex items-center gap-2 text-[11px] rounded-lg px-2.5 py-2 mb-3 ${
            permission === 'granted' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
          }`}>
            {permission === 'granted'
              ? <><CheckCircle2 size={14} /> {t('إذن الإشعارات ممنوح', 'Notification permission granted')}</>
              : <><AlertCircle size={14} /> {t('امنح إذن الإشعارات لاستلام التنبيهات', 'Grant notification permission for alerts')}</>}
          </div>
        )}

        {/* Pre-reminder slider */}
        <label className="block text-xs font-bold text-muted-foreground mb-1.5">
          {t('تذكير قبل الأذان', 'Pre-prayer reminder')}:
          <span className="text-[hsl(var(--emerald))] mx-1">{preMin === 0 ? t('بدون', 'Off') : `${preMin} ${t('دقيقة', 'min')}`}</span>
        </label>
        <input
          type="range" min={0} max={30} step={5} value={preMin}
          onChange={e => setPreMin(Number(e.target.value))}
          className="w-full accent-[hsl(var(--emerald))]"
        />

        {/* Background keep-alive */}
        <label className="flex items-center justify-between mt-3 cursor-pointer">
          <div>
            <p className="text-sm font-bold text-foreground">{t('تشغيل في الخلفية', 'Background playback')}</p>
            <p className="text-[11px] text-muted-foreground">
              {t('إبقاء الشاشة نشطة لضمان رفع الأذان', 'Keep screen awake to ensure Adhan plays')}
            </p>
          </div>
          <input
            type="checkbox" checked={bgKeepAlive} onChange={e => setBgKeepAlive(e.target.checked)}
            className="w-5 h-5 accent-[hsl(var(--emerald))]"
          />
        </label>
      </section>

      {/* Muezzin selection */}
      <section className="rounded-2xl border-2 border-[hsl(var(--gold)/0.3)] bg-card p-4 mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
          <Radio size={18} className="text-[hsl(var(--gold))]" />
          {t('اختيار المؤذن', 'Choose Muezzin')}
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          {t('اختر صوت الأذان لباقي الصلوات', 'Pick the Adhan voice for daily prayers')}
        </p>
        <div className="grid gap-2">
          {MUEZZINS.map(m => (
            <button
              key={m.id}
              onClick={() => setMuezzinId(m.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold border-2 text-start transition-all ${
                muezzinId === m.id
                  ? 'bg-[hsl(var(--emerald)/0.08)] border-[hsl(var(--emerald))] text-foreground'
                  : 'bg-muted/40 border-border text-muted-foreground'
              }`}
            >
              <span style={{ fontFamily: 'Amiri, serif' }}>{lang === 'ar' ? m.ar : m.en}</span>
              {muezzinId === m.id && <CheckCircle2 size={16} className="text-[hsl(var(--emerald))]" />}
            </button>
          ))}
        </div>
        <button
          onClick={previewMuezzin}
          className="mt-3 w-full py-2.5 rounded-xl bg-[hsl(var(--emerald))] text-[hsl(var(--cream))] text-sm font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Play size={16} /> {t('استماع تجريبي', 'Preview Adhan')}
        </button>
      </section>

      {/* Fajr-specific muezzin */}
      <section className="rounded-2xl border-2 border-[hsl(var(--gold)/0.3)] bg-card p-4 mb-4">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-1" style={{ fontFamily: 'Amiri, serif' }}>
          🌄 {t('أذان الفجر', 'Fajr Adhan')}
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">
          {t('صوت مخصص للفجر يحتوي على "الصلاة خير من النوم"', 'Dedicated Fajr voice with "As-Salatu Khayrun min an-Nawm"')}
        </p>
        <select
          value={fajrMuezzinId}
          onChange={e => setFajrMuezzinId(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl bg-muted border-2 border-border text-sm font-bold text-foreground"
        >
          {MUEZZINS.map(m => (
            <option key={m.id} value={m.id}>{lang === 'ar' ? m.ar : m.en}</option>
          ))}
        </select>
        <button
          onClick={previewFajr}
          className="mt-3 w-full py-2.5 rounded-xl bg-muted border-2 border-border text-foreground text-sm font-bold flex items-center justify-center gap-2 active:scale-95"
        >
          <Play size={16} /> {t('استماع للفجر', 'Preview Fajr')}
        </button>
      </section>

      {/* Volume */}
      <section className="rounded-2xl border-2 border-[hsl(var(--gold)/0.3)] bg-card p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2" style={{ fontFamily: 'Amiri, serif' }}>
            {volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} className="text-[hsl(var(--gold))]" />}
            {t('مستوى الصوت', 'Volume')}
          </h3>
          <span className="text-xs font-bold text-[hsl(var(--emerald))] tabular-nums">{Math.round(volume * 100)}%</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.05} value={volume}
          onChange={e => setVolume(Number(e.target.value))}
          className="w-full accent-[hsl(var(--emerald))]"
        />
      </section>

      {/* Now playing */}
      {currentTrack && (
        <section className="rounded-2xl border-2 border-[hsl(var(--gold))] bg-gradient-to-br from-[hsl(var(--gold)/0.12)] to-transparent p-4 mb-4">
          <p className="text-[10px] tracking-widest text-[hsl(var(--emerald))] opacity-80 mb-1">
            {t('قيد التشغيل', 'NOW PLAYING')}
          </p>
          <p className="text-base font-bold text-foreground" style={{ fontFamily: 'Amiri, serif' }}>
            {currentTrack.prayer ? `${ICONS[currentTrack.prayer] || ''} ${t(NAMES_AR[currentTrack.prayer], NAMES_EN[currentTrack.prayer])} — ` : ''}
            {currentTrack.name}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={togglePlay}
              className="flex-1 py-2.5 rounded-xl bg-[hsl(var(--emerald))] text-[hsl(var(--cream))] font-bold flex items-center justify-center gap-2"
            >
              {playing ? <><Pause size={16} /> {t('إيقاف مؤقت', 'Pause')}</> : <><Play size={16} /> {t('استئناف', 'Resume')}</>}
            </button>
            <button
              onClick={stop}
              className="px-4 py-2.5 rounded-xl bg-muted border-2 border-border text-foreground font-bold flex items-center gap-2"
            >
              <SkipForward size={16} /> {t('إنهاء', 'Stop')}
            </button>
          </div>
        </section>
      )}

      {/* Today's schedule */}
      {timings && (
        <section className="rounded-2xl border-2 border-border bg-card p-4">
          <h3 className="text-sm font-bold text-muted-foreground mb-2">
            {t('جدول أذان اليوم', "Today's Adhan Schedule")}
          </h3>
          <div className="space-y-1.5">
            {PRAYERS.map(p => {
              const isNext = p === nextPrayer;
              return (
                <div
                  key={p}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                    isNext ? 'bg-[hsl(var(--gold)/0.12)] border border-[hsl(var(--gold))]' : 'bg-muted/40'
                  }`}
                >
                  <span className="text-sm font-bold" style={{ fontFamily: 'Amiri, serif' }}>
                    {ICONS[p]} {t(NAMES_AR[p], NAMES_EN[p])}
                  </span>
                  <span className="text-sm font-bold text-[hsl(var(--emerald))] tabular-nums">{timings[p]}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default AdhanPage;