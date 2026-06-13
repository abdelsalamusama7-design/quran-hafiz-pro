import { useEffect, useState } from 'react';
import { Volume2, Mic, Headphones, X, CheckCircle2 } from 'lucide-react';

interface Tip {
  key: string;
  icon: typeof Mic;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
}

const TIPS: Tip[] = [
  {
    key: 'unmute',
    icon: Volume2,
    titleAr: '🔊 ألغِ كتم الجهاز',
    titleEn: '🔊 Unmute device',
    descAr: 'تأكد أن صوت الجهاز ليس مكتومًا حتى تسمع ردود الشيخ AI.',
    descEn: 'Make sure device volume is on so you can hear AI responses.',
  },
  {
    key: 'mic',
    icon: Mic,
    titleAr: '🎙️ اسمح بالميكروفون',
    titleEn: '🎙️ Allow microphone',
    descAr: 'لو طلب المتصفح إذنًا، اضغط «السماح» — بدونه لا يعمل التسميع.',
    descEn: 'If the browser asks for permission, tap "Allow" — required for recognition.',
  },
  {
    key: 'quiet',
    icon: Headphones,
    titleAr: '🤫 ابحث عن مكان هادئ',
    titleEn: '🤫 Find a quiet spot',
    descAr: 'ضوضاء الخلفية تُربك التعرّف على الكلام وتزيد الأخطاء.',
    descEn: 'Background noise confuses recognition and increases errors.',
  },
];

const STORAGE_KEY = 'hafiz_dismissed_pre_session_tips_v1';

const PreSessionChecklist = ({ lang }: { lang: 'ar' | 'en' }) => {
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setDismissed(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const persist = (next: Record<string, boolean>) => {
    setDismissed(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const dismiss = (key: string) => persist({ ...dismissed, [key]: true });
  const resetAll = () => persist({});

  const visible = TIPS.filter(t => !dismissed[t.key]);
  if (visible.length === 0) {
    return (
      <button
        onClick={resetAll}
        className="self-start text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
      >
        <CheckCircle2 size={11} className="text-primary" />
        {lang === 'ar'
          ? 'كل التنبيهات مغلقة — اضغط لإعادتها'
          : 'All tips dismissed — show again'}
      </button>
    );
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {lang === 'ar' ? '✅ قبل أن تبدأ' : '✅ Before you start'}
      </p>
      {visible.map(t => {
        const Icon = t.icon;
        return (
          <div
            key={t.key}
            className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40"
          >
            <div className="w-7 h-7 rounded-md bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
              <Icon size={14} className="text-amber-700 dark:text-amber-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground leading-tight">
                {lang === 'ar' ? t.titleAr : t.titleEn}
              </p>
              <p className="text-[10.5px] text-muted-foreground leading-snug mt-0.5">
                {lang === 'ar' ? t.descAr : t.descEn}
              </p>
            </div>
            <button
              onClick={() => dismiss(t.key)}
              className="w-6 h-6 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-900/40 flex items-center justify-center shrink-0"
              aria-label={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
              title={lang === 'ar' ? 'إغلاق' : 'Dismiss'}
            >
              <X size={12} className="text-amber-700 dark:text-amber-300" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PreSessionChecklist;