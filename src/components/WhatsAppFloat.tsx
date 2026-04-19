import { MessageCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const WHATSAPP_NUMBER = '201107157075'; // +20 11 07157075

const WhatsAppFloat = () => {
  const { lang } = useLanguage();

  const message = lang === 'ar'
    ? 'السلام عليكم، عندي استفسار بخصوص تطبيق حافظ القرآن'
    : 'Hello, I have a question about Quran Hafiz app';

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={lang === 'ar' ? 'تواصل عبر واتساب' : 'Contact on WhatsApp'}
      className="fixed bottom-24 end-4 z-40 group"
    >
      <span className="absolute inset-0 rounded-full bg-[hsl(142_70%_45%)] opacity-60 group-hover:opacity-80 animate-ping" />
      <span className="relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-[hsl(142_70%_45%)] to-[hsl(142_75%_35%)] text-white shadow-lg shadow-[hsl(142_70%_45%/0.4)] hover:scale-110 active:scale-95 transition-transform duration-200 border-2 border-white/20">
        <MessageCircle className="w-7 h-7 fill-white" strokeWidth={0} />
      </span>
    </a>
  );
};

export default WhatsAppFloat;
