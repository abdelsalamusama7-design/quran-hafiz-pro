import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type Msg = { role: 'user' | 'assistant'; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

const AITutorPage = () => {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = lang === 'ar' ? [
    'ما هو حكم الإدغام بغنة؟',
    'كيف أحفظ سورة البقرة بسرعة؟',
    'اشرح لي أحكام النون الساكنة',
    'ما الفرق بين المد الطبيعي والمد اللازم؟',
  ] : [
    'What is Idgham with Ghunnah?',
    'How to memorize Surah Al-Baqarah quickly?',
    'Explain Noon Sakinah rules',
    'What is the difference between natural and obligatory Madd?',
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: 'assistant', content: assistantSoFar }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) { upsertAssistant(lang === 'ar' ? 'حاول مرة أخرى لاحقاً ⏳' : 'Please try again later ⏳'); setIsLoading(false); return; }
        if (resp.status === 402) { upsertAssistant(lang === 'ar' ? 'يرجى شحن الرصيد 💳' : 'Please add credits 💳'); setIsLoading(false); return; }
        throw new Error('Stream failed');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '' || !line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsertAssistant(content);
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
    } catch (e) {
      console.error(e);
      upsertAssistant(lang === 'ar' ? 'حدث خطأ، حاول مرة أخرى' : 'An error occurred, please try again');
    } finally {
      setIsLoading(false);
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="pb-24 pt-6 max-w-lg mx-auto flex flex-col h-[calc(100vh-6rem)]">
      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold text-foreground font-arabic flex items-center gap-2">
          <Bot size={24} className="text-primary" />
          {lang === 'ar' ? 'الشيخ AI' : 'AI Tutor'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {lang === 'ar' ? 'اسألني عن التجويد، الحفظ، التفسير، أو أي شيء عن القرآن' : 'Ask me about Tajweed, memorization, Tafsir, or anything about Quran'}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3 mt-4">
            <div className="bg-primary/5 rounded-xl p-4 text-center">
              <Sparkles className="mx-auto text-primary mb-2" size={28} />
              <p className="text-sm text-foreground font-arabic font-medium">
                {lang === 'ar' ? 'السلام عليكم! أنا الشيخ AI 🤖\nاسألني أي سؤال عن القرآن والتجويد' : 'Assalamu Alaikum! I\'m your AI Quran Tutor 🤖\nAsk me anything about Quran & Tajweed'}
              </p>
            </div>
            <p className="text-xs text-muted-foreground text-center">{lang === 'ar' ? 'جرّب أحد هذه الأسئلة:' : 'Try one of these:'}</p>
            <div className="grid grid-cols-1 gap-2">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-start p-3 bg-card rounded-xl text-sm text-foreground shadow-islamic hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <Bot size={14} className="text-primary" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
              msg.role === 'user'
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-card text-foreground shadow-islamic rounded-bl-sm'
            }`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:mb-2 [&>ul]:mb-2 [&>ol]:mb-2">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-1">
                <User size={14} className="text-primary-foreground" />
              </div>
            )}
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot size={14} className="text-primary" />
            </div>
            <div className="bg-card rounded-2xl px-4 py-3 shadow-islamic">
              <Loader2 size={16} className="animate-spin text-primary" />
            </div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="px-4 pt-3 border-t border-border bg-background">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder={lang === 'ar' ? 'اكتب سؤالك...' : 'Type your question...'}
            className="flex-1 bg-muted rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className="w-11 h-11 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AITutorPage;
