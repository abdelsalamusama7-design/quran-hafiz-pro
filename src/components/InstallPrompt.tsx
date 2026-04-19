import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPrompt = () => {
  const { lang } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already dismissed
    const wasDismissed = localStorage.getItem('hafiz-install-dismissed');
    if (wasDismissed) {
      const dismissedAt = parseInt(wasDismissed);
      // Show again after 3 days
      if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
        return;
      }
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setDismissed(true);
      return;
    }

    // Check iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isiOS);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDismissed(true);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('hafiz-install-dismissed', Date.now().toString());
  };

  if (dismissed || (!deferredPrompt && !isIOS)) return null;

  return (
    <>
      <div className="fixed bottom-20 inset-x-0 z-40 px-4 animate-fade-in">
        <div className="max-w-lg mx-auto bg-card border border-primary/20 rounded-2xl p-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl gradient-islamic flex items-center justify-center shrink-0">
              <Download className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-foreground text-sm font-arabic">
                {lang === 'ar' ? '📲 حمّل تطبيق حافظ القرآن' : '📲 Install Quran Hafiz App'}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lang === 'ar' 
                  ? 'استمتع بتجربة أفضل مع إشعارات وعمل بدون إنترنت' 
                  : 'Better experience with notifications & offline support'}
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleInstall} className="text-xs h-8 px-4">
                  <Download className="w-3.5 h-3.5" />
                  {lang === 'ar' ? 'تنزيل التطبيق' : 'Install App'}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDismiss} className="text-xs h-8 text-muted-foreground">
                  {lang === 'ar' ? 'لاحقاً' : 'Later'}
                </Button>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 animate-fade-in" onClick={() => setShowIOSGuide(false)}>
          <div className="bg-card rounded-t-3xl p-6 w-full max-w-lg space-y-4 animate-fade-in" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground text-center font-arabic">
              {lang === 'ar' ? 'كيف تنزل التطبيق؟' : 'How to install?'}
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <span className="text-2xl">1️⃣</span>
                <span className="text-sm text-foreground">
                  {lang === 'ar' ? 'اضغط على زر المشاركة ⬆️ في أسفل المتصفح' : 'Tap the Share button ⬆️ at the bottom'}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <span className="text-2xl">2️⃣</span>
                <span className="text-sm text-foreground">
                  {lang === 'ar' ? 'اختر "إضافة إلى الشاشة الرئيسية" ➕' : 'Select "Add to Home Screen" ➕'}
                </span>
              </div>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-xl">
                <span className="text-2xl">3️⃣</span>
                <span className="text-sm text-foreground">
                  {lang === 'ar' ? 'اضغط "إضافة" وسيظهر التطبيق على شاشتك! 🎉' : 'Tap "Add" and the app appears on your screen! 🎉'}
                </span>
              </div>
            </div>
            <Button className="w-full" onClick={() => setShowIOSGuide(false)}>
              {lang === 'ar' ? 'فهمت!' : 'Got it!'}
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPrompt;
