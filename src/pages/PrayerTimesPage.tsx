import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, MapPin, Bell, BellOff, Play, Pause, Volume2, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Timings {
  Fajr: string; Sunrise: string; Dhuhr: string; Asr: string; Maghrib: string; Isha: string;
}

const PRAYER_ORDER: (keyof Timings)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const NAMES_AR: Record<string, string> = {
  Fajr: 'الفجر', Sunrise: 'الشروق', Dhuhr: 'الظهر', Asr: 'العصر', Maghrib: 'المغرب', Isha: 'العشاء',
};
const NAMES_EN: Record<string, string> = {
  Fajr: 'Fajr', Sunrise: 'Sunrise', Dhuhr: 'Dhuhr', Asr: 'Asr', Maghrib: 'Maghrib', Isha: 'Isha',
};
const ICONS: Record<string, string> = {
  Fajr: '🌄', Sunrise: '🌅', Dhuhr: '☀️', Asr: '🌤️', Maghrib: '🌇', Isha: '🌙',
};

// A few common Adhan recitations (public CDNs)
const ADHANS = [
  { id: 'makkah', nameAr: 'أذان مكة المكرمة', nameEn: 'Makkah Adhan', url: 'https://server8.mp3quran.net/_TEMP_/Adhan_Makkah.mp3' },
  { id: 'madinah', nameAr: 'أذان المدينة المنورة', nameEn: 'Madinah Adhan', url: 'https://server8.mp3quran.net/_TEMP_/Adhan_Madinah.mp3' },
  { id: 'fajr', nameAr: 'أذان الفجر', nameEn: 'Fajr Adhan', url: 'https://www.islamcan.com/audio/adhan/azan2.mp3' },
  { id: 'classic', nameAr: 'أذان كلاسيكي', nameEn: 'Classic Adhan', url: 'https://www.islamcan.com/audio/adhan/azan1.mp3' },
];

const parseHM = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + (m || 0);
};

const PrayerTimesPage = () => {
  const navigate = useNavigate();
  const { lang, dir } = useLanguage();
  const BackArrow = dir === 'rtl' ? ArrowRight : ArrowLeft;

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [city, setCity] = useState<string>('');
  const [timings, setTimings] = useState<Timings | null>(null);
  const [date, setDate] = useState<string>('');
  const [hijri, setHijri] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

  const [adhanIdx, setAdhanIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [notify, setNotify] = useState<boolean>(() => localStorage.getItem('adhan_notify') === '1');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  // tick clock
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // get location
  useEffect(() => {
    if (!navigator.geolocation) {
      // fallback Mecca
      setCoords({ lat: 21.3891, lon: 39.8579 });
      setCity('Makkah');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => { setCoords({ lat: 30.0444, lon: 31.2357 }); setCity('Cairo'); },
      { timeout: 8000 }
    );
  }, []);

  // fetch prayer times
  useEffect(() => {
    if (!coords) return;
    setLoading(true);
    fetch(`https://api.aladhan.com/v1/timings?latitude=${coords.lat}&longitude=${coords.lon}&method=5`)
      .then(r => r.json())
      .then(data => {
        if (data.data?.timings) {
          const t = data.data.timings;
          setTimings({
            Fajr: t.Fajr, Sunrise: t.Sunrise, Dhuhr: t.Dhuhr,
            Asr: t.Asr, Maghrib: t.Maghrib, Isha: t.Isha,
          });
          setDate(data.data.date?.readable || '');
          setHijri(`${data.data.date?.hijri?.day} ${data.data.date?.hijri?.month?.ar} ${data.data.date?.hijri?.year}هـ`);
          if (!city && data.data.meta?.timezone) setCity(data.data.meta.timezone.split('/').pop() || '');
        }
      })
      .catch(() => setError(lang === 'ar' ? 'فشل تحميل المواقيت' : 'Failed to load times'))
      .finally(() => setLoading(false));
  }, [coords]);

  const nowMin = now.getHours() * 60 + now.getMinutes();

  const { nextPrayer, nextMin, remaining } = useMemo(() => {
    if (!timings) return { nextPrayer: '', nextMin: 0, remaining: '' };
    const list = PRAYER_ORDER.filter(p => p !== 'Sunrise').map(p => ({ name: p, min: parseHM(timings[p]) }));
    const next = list.find(p => p.min > nowMin) || list[0];
    let diff = next.min - nowMin;
    if (diff <= 0) diff += 24 * 60;
    const h = Math.floor(diff / 60), m = diff % 60;
    return { nextPrayer: next.name, nextMin: next.min, remaining: `${h}س ${m}د` };
  }, [timings, nowMin]);

  // adhan trigger
  useEffect(() => {
    if (!notify || !timings) return;
    for (const p of PRAYER_ORDER) {
      if (p === 'Sunrise') continue;
      const m = parseHM(timings[p]);
      const key = `${date}-${p}`;
      if (m === nowMin && !notifiedRef.current.has(key)) {
        notifiedRef.current.add(key);
        playAdhan();
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`حان الآن وقت صلاة ${NAMES_AR[p]}`, { body: timings[p] });
        }
      }
    }
  }, [nowMin, notify, timings, date]);

  const playAdhan = () => {
    if (!audioRef.current) return;
    audioRef.current.src = ADHANS[adhanIdx].url;
    audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };
  const stopAdhan = () => { audioRef.current?.pause(); setPlaying(false); };

  const toggleNotify = async () => {
    if (!notify && 'Notification' in window && Notification.permission !== 'granted') {
      await Notification.requestPermission();
    }
    const next = !notify;
    setNotify(next);
    localStorage.setItem('adhan_notify', next ? '1' : '0');
  };

  return (
    <div className="pb-28 pt-4 max-w-2xl mx-auto px-4">
      <audio ref={audioRef} onEnded={() => setPlaying(false)} preload="none" />

      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-muted-foreground text-sm">
          <BackArrow size={18} /> {lang === 'ar' ? 'رجوع' : 'Back'}
        </button>
        <button onClick={toggleNotify} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${notify ? 'bg-[hsl(var(--emerald))] text-[hsl(var(--cream))] border-[hsl(var(--emerald))]' : 'bg-card border-border text-muted-foreground'}`}>
          {notify ? <Bell size={14} /> : <BellOff size={14} />}
          {lang === 'ar' ? (notify ? 'الأذان مفعّل' : 'تفعيل الأذان') : (notify ? 'Adhan On' : 'Enable Adhan')}
        </button>
      </div>

      {/* Hero — next prayer */}
      <div className="rounded-3xl p-6 mb-5 text-center shadow-islamic border-2 border-[hsl(var(--gold)/0.35)] bg-gradient-to-br from-[hsl(var(--emerald))] to-[hsl(154_65%_24%)] text-[hsl(var(--cream))]">
        <p className="text-[10px] tracking-widest opacity-70 mb-1 flex items-center justify-center gap-1">
          <MapPin size={11} /> {city || '...'}
        </p>
        <p className="text-xs opacity-80">{hijri || date}</p>
        <div className="my-4">
          <p className="text-[11px] opacity-80 mb-1">{lang === 'ar' ? 'الصلاة القادمة' : 'Next Prayer'}</p>
          <p className="text-3xl font-bold" style={{ fontFamily: 'Amiri, serif' }}>
            {ICONS[nextPrayer]} {lang === 'ar' ? NAMES_AR[nextPrayer] : NAMES_EN[nextPrayer]}
          </p>
          <p className="text-sm mt-1 opacity-90 tabular-nums">
            {timings && timings[nextPrayer as keyof Timings]} — {lang === 'ar' ? 'بعد' : 'in'} {remaining}
          </p>
        </div>
        <p className="text-xs opacity-70 tabular-nums">
          🕐 {now.toLocaleTimeString(lang === 'ar' ? 'ar-EG' : 'en-US')}
        </p>
      </div>

      {/* Prayer grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="text-center text-destructive py-8">
          {error}
          <button onClick={() => location.reload()} className="block mx-auto mt-2 text-primary"><RefreshCw size={14} className="inline" /> {lang === 'ar' ? 'إعادة' : 'Retry'}</button>
        </div>
      ) : timings && (
        <div className="grid grid-cols-2 gap-3">
          {PRAYER_ORDER.map(p => {
            const isNext = p === nextPrayer;
            const passed = parseHM(timings[p]) <= nowMin && !isNext;
            return (
              <div
                key={p}
                className={`rounded-2xl p-4 border-2 transition-all ${
                  isNext
                    ? 'border-[hsl(var(--gold))] bg-[hsl(var(--gold)/0.1)] shadow-islamic'
                    : passed
                      ? 'border-border bg-muted/40 opacity-60'
                      : 'border-border bg-card'
                }`}
              >
                <div className="text-2xl mb-1">{ICONS[p]}</div>
                <p className="text-sm font-bold text-foreground" style={{ fontFamily: 'Amiri, serif' }}>
                  {lang === 'ar' ? NAMES_AR[p] : NAMES_EN[p]}
                </p>
                <p className="text-lg font-bold text-[hsl(var(--emerald))] tabular-nums mt-0.5">{timings[p]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Adhan player */}
      <section className="mt-6 rounded-2xl border-2 border-[hsl(var(--gold)/0.3)] bg-card p-4">
        <h3 className="text-base font-bold text-[hsl(var(--emerald))] flex items-center gap-2 mb-3" style={{ fontFamily: 'Amiri, serif' }}>
          <Volume2 size={18} className="text-[hsl(var(--gold))]" />
          {lang === 'ar' ? 'مشغّل الأذان' : 'Adhan Player'}
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {ADHANS.map((a, i) => (
            <button
              key={a.id}
              onClick={() => { setAdhanIdx(i); if (playing) stopAdhan(); }}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                adhanIdx === i ? 'bg-[hsl(var(--emerald))] text-[hsl(var(--cream))] border-[hsl(var(--emerald))]' : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              {lang === 'ar' ? a.nameAr : a.nameEn}
            </button>
          ))}
        </div>
        <button
          onClick={playing ? stopAdhan : playAdhan}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(46_65%_45%)] text-[hsl(var(--emerald))] font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
        >
          {playing ? <><Pause size={18} /> {lang === 'ar' ? 'إيقاف' : 'Stop'}</> : <><Play size={18} /> {lang === 'ar' ? 'تشغيل الأذان' : 'Play Adhan'}</>}
        </button>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          {lang === 'ar'
            ? 'فعّل الإشعارات أعلاه ليُرفع الأذان تلقائيًا عند دخول الوقت.'
            : 'Enable notifications above to auto-play Adhan at prayer time.'}
        </p>
      </section>
    </div>
  );
};

export default PrayerTimesPage;