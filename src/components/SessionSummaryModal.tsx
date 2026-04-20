import { Trophy, Target, Clock, AlertTriangle, Share2, X, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

export interface SessionSummary {
  surahName: string;
  versesCompleted: number;
  averageAccuracy: number;
  durationMinutes: number;
  topMistakes: { word: string; count: number }[];
  pointsEarned: number;
}

interface Props {
  summary: SessionSummary | null;
  onClose: () => void;
}

const SessionSummaryModal = ({ summary, onClose }: Props) => {
  const { lang } = useLanguage();
  const { toast } = useToast();

  if (!summary) return null;

  const accuracyColor =
    summary.averageAccuracy >= 85 ? 'text-green-500' :
    summary.averageAccuracy >= 60 ? 'text-yellow-500' : 'text-destructive';

  const grade =
    summary.averageAccuracy >= 95 ? (lang === 'ar' ? 'ممتاز جداً 🌟' : 'Outstanding 🌟') :
    summary.averageAccuracy >= 85 ? (lang === 'ar' ? 'ممتاز ✨' : 'Excellent ✨') :
    summary.averageAccuracy >= 70 ? (lang === 'ar' ? 'جيد جداً 👏' : 'Very Good 👏') :
    summary.averageAccuracy >= 50 ? (lang === 'ar' ? 'جيد، استمر 💪' : 'Good, keep going 💪') :
    (lang === 'ar' ? 'تحتاج مراجعة 📖' : 'Needs review 📖');

  const shareText = lang === 'ar'
    ? `🕌 أتممت جلسة تسميع في حافظ القرآن!\n\n📖 سورة ${summary.surahName}\n✅ ${summary.versesCompleted} آية\n🎯 دقة ${summary.averageAccuracy}%\n⏱️ ${summary.durationMinutes} دقيقة\n⭐ ${summary.pointsEarned} نقطة\n\n#حافظ_القرآن`
    : `🕌 Completed a recitation session on Quran Hafiz!\n\n📖 Surah ${summary.surahName}\n✅ ${summary.versesCompleted} verses\n🎯 ${summary.averageAccuracy}% accuracy\n⏱️ ${summary.durationMinutes} min\n⭐ ${summary.pointsEarned} pts\n\n#QuranHafiz`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: lang === 'ar' ? 'نتيجة التسميع' : 'Recitation Result',
          text: shareText,
          url: window.location.origin,
        });
        return;
      } catch {
        // user cancelled or share failed → fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      toast({
        title: lang === 'ar' ? '📋 تم النسخ' : '📋 Copied',
        description: lang === 'ar' ? 'النتيجة جاهزة للمشاركة' : 'Ready to share',
      });
    } catch {
      toast({
        title: lang === 'ar' ? 'فشل النسخ' : 'Copy failed',
        variant: 'destructive',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-card rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
      >
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-primary via-emerald-600 to-teal-600 text-primary-foreground p-6 rounded-t-3xl text-center">
          <button
            onClick={onClose}
            aria-label="close"
            className="absolute top-3 end-3 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full mb-2">
            <Trophy size={32} className="text-yellow-300" />
          </div>
          <p className="text-xs opacity-90 mb-1">
            {lang === 'ar' ? 'انتهت جلسة التسميع' : 'Session Complete'}
          </p>
          <h2 className="text-2xl font-bold font-arabic">{grade}</h2>
          <p className="text-sm opacity-90 mt-1 font-arabic">
            {lang === 'ar' ? `سورة ${summary.surahName}` : `Surah ${summary.surahName}`}
          </p>
        </div>

        {/* Stats grid */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              icon={<Target size={18} />}
              label={lang === 'ar' ? 'الدقة' : 'Accuracy'}
              value={`${summary.averageAccuracy}%`}
              valueClassName={accuracyColor}
              bgClassName="bg-primary/5"
            />
            <StatCard
              icon={<Sparkles size={18} className="text-yellow-500" />}
              label={lang === 'ar' ? 'النقاط' : 'Points'}
              value={`+${summary.pointsEarned}`}
              valueClassName="text-yellow-600 dark:text-yellow-400"
              bgClassName="bg-yellow-500/5"
            />
            <StatCard
              icon={<span className="text-lg">📖</span>}
              label={lang === 'ar' ? 'آيات مكتملة' : 'Verses'}
              value={String(summary.versesCompleted)}
              valueClassName="text-primary"
              bgClassName="bg-primary/5"
            />
            <StatCard
              icon={<Clock size={18} />}
              label={lang === 'ar' ? 'المدة' : 'Duration'}
              value={`${summary.durationMinutes} ${lang === 'ar' ? 'د' : 'min'}`}
              valueClassName="text-foreground"
              bgClassName="bg-muted"
            />
          </div>

          {/* Accuracy bar */}
          <div className="bg-muted/50 rounded-xl p-3">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">{lang === 'ar' ? 'مستوى الدقة' : 'Accuracy Level'}</span>
              <span className={`font-bold ${accuracyColor}`}>{summary.averageAccuracy}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  summary.averageAccuracy >= 85 ? 'bg-gradient-to-r from-green-400 to-emerald-500' :
                  summary.averageAccuracy >= 60 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                  'bg-gradient-to-r from-red-400 to-destructive'
                }`}
                style={{ width: `${summary.averageAccuracy}%` }}
              />
            </div>
          </div>

          {/* Top mistakes */}
          {summary.topMistakes.length > 0 && (
            <div className="bg-destructive/5 rounded-xl p-3 border border-destructive/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={14} className="text-destructive" />
                <p className="text-xs font-bold text-foreground">
                  {lang === 'ar' ? 'أكثر الأخطاء تكراراً' : 'Most Common Mistakes'}
                </p>
              </div>
              <div className="space-y-1.5">
                {summary.topMistakes.slice(0, 3).map((m, i) => (
                  <div key={i} className="flex items-center justify-between bg-card rounded-lg px-3 py-1.5">
                    <span className="font-quran text-sm text-foreground" dir="rtl">{m.word}</span>
                    <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">
                      ×{m.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.topMistakes.length === 0 && summary.averageAccuracy >= 85 && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-300 font-arabic">
                {lang === 'ar' ? '🎉 ما شاء الله، تلاوة بدون أخطاء تذكر!' : '🎉 MashaAllah, no notable mistakes!'}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleShare}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-emerald-600 text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:opacity-95 active:scale-95 transition-all"
            >
              <Share2 size={16} />
              {lang === 'ar' ? 'شارك النتيجة' : 'Share Result'}
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 bg-muted text-foreground rounded-xl font-bold text-sm hover:bg-muted/80 active:scale-95 transition-all"
            >
              {lang === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({
  icon, label, value, valueClassName = '', bgClassName = 'bg-muted',
}: {
  icon: React.ReactNode; label: string; value: string; valueClassName?: string; bgClassName?: string;
}) => (
  <div className={`${bgClassName} rounded-xl p-3 text-center`}>
    <div className="flex items-center justify-center mb-1 text-muted-foreground">{icon}</div>
    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
    <p className={`text-xl font-bold ${valueClassName}`}>{value}</p>
  </div>
);

export default SessionSummaryModal;
