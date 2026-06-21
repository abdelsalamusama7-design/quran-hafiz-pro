import { useLanguage } from '@/contexts/LanguageContext';
import { Home, BookOpen, BarChart3, Download, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const BottomNav = () => {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const tabs = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/quran', icon: BookOpen, label: t('quran') },
    { path: '/downloads', icon: Download, label: lang === 'ar' ? 'تنزيلاتي' : 'Downloads' },
    { path: '/progress', icon: BarChart3, label: t('progress') },
    { path: '/settings', icon: Settings, label: t('settings') },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto">
        <div className="mx-2 mb-2 bg-card border border-border/50 rounded-2xl shadow-lg [transform:translateZ(0)] [will-change:transform]">
          <div className="flex items-center justify-around h-14 md:h-16">
            {tabs.map(({ path, icon: Icon, label }) => {
              const isActive = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all ${
                    isActive
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className={`transition-all ${isActive ? 'scale-110' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                  {isActive && (
                    <div className="w-1 h-1 bg-primary rounded-full -mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-center py-1 px-4">
          <p className="text-[8px] text-muted-foreground/60 leading-tight">
            تنفيذ وتصميم <span className="font-semibold text-primary/50">insta-tech lab</span> : Eng Abdelsalam Usama : <span dir="ltr">01227080430</span>
          </p>
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
