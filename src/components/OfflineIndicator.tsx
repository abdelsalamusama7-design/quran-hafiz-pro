import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const OfflineIndicator = () => {
  const { lang } = useLanguage();
  const [online, setOnline] = useState<boolean>(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 2500);
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (online && !showRestored) return null;

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium animate-fade-in ${
        online
          ? 'bg-primary text-primary-foreground'
          : 'bg-destructive text-destructive-foreground'
      }`}
      role="status"
    >
      {online ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
      <span>
        {online
          ? lang === 'ar'
            ? 'عاد الاتصال بالإنترنت'
            : 'Back online'
          : lang === 'ar'
          ? 'أنت غير متصل — يعمل التطبيق في وضع عدم الاتصال'
          : "You're offline — app running in offline mode"}
      </span>
    </div>
  );
};

export default OfflineIndicator;
