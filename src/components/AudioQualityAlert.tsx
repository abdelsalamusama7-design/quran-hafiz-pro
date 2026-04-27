import { AlertTriangle, MicOff, Volume2, VolumeX, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AudioQuality } from '@/hooks/useAudioQuality';

interface Props {
  quality: AudioQuality;
  level: number;
  onRestart: () => void;
  onDismiss: () => void;
  autoRestartIn?: number | null; // seconds remaining
}

const config: Record<Exclude<AudioQuality, 'idle' | 'good'>, { icon: any; title: string; tip: string; tone: string }> = {
  low: {
    icon: Volume2,
    title: 'صوتك منخفض',
    tip: 'اقترب من الميكروفون وارفع صوتك قليلاً للحصول على تحليل أدق.',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  },
  silent: {
    icon: MicOff,
    title: 'لا نسمع صوتك',
    tip: 'تأكد من أن الميكروفون يعمل وابدأ القراءة بصوت مسموع.',
    tone: 'border-destructive/40 bg-destructive/10 text-destructive',
  },
  noisy: {
    icon: VolumeX,
    title: 'ضجيج في الخلفية',
    tip: 'انتقل إلى مكان أكثر هدوءًا أو أعد التسجيل لتحسين الدقة.',
    tone: 'border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  },
};

const AudioQualityAlert = ({ quality, level, onRestart, onDismiss, autoRestartIn }: Props) => {
  if (quality === 'idle' || quality === 'good') return null;
  const c = config[quality];
  const Icon = c.icon;
  return (
    <div
      role="alert"
      className={`relative rounded-xl border-2 ${c.tone} p-3 sm:p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2`}
    >
      <div className="shrink-0 mt-0.5">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4" />
          <h4 className="font-bold text-sm">{c.title}</h4>
        </div>
        <p className="text-xs sm:text-sm leading-relaxed mb-2">{c.tip}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={onRestart} className="h-8 gap-1.5 text-xs">
            <RotateCcw className="w-3.5 h-3.5" />
            إعادة التسجيل الآن
          </Button>
          {autoRestartIn != null && autoRestartIn > 0 && (
            <span className="text-[11px] opacity-80">
              إعادة تلقائية خلال {autoRestartIn} ث
            </span>
          )}
          <div className="flex items-center gap-1 ms-auto">
            <span className="text-[10px] opacity-70">المستوى</span>
            <div className="w-16 h-1.5 rounded-full bg-foreground/10 overflow-hidden">
              <div
                className="h-full bg-current transition-all"
                style={{ width: `${Math.min(100, Math.round(level * 600))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
        aria-label="إغلاق"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default AudioQualityAlert;
