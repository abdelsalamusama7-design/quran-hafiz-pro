import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  showHome?: boolean;
}

const PageHeader = ({ title, showHome = true }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { dir } = useLanguage();
  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;

  return (
    <div className="flex items-center justify-between mb-4">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <BackIcon size={18} />
        <span className="text-sm font-medium">{dir === 'rtl' ? 'رجوع' : 'Back'}</span>
      </button>
      <h1 className="text-base font-bold text-foreground font-arabic">{title}</h1>
      {showHome ? (
        <button
          onClick={() => navigate('/')}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home size={18} />
        </button>
      ) : (
        <div className="w-[18px]" />
      )}
    </div>
  );
};

export default PageHeader;
