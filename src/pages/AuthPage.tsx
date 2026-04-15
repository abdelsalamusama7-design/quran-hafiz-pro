import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { BookOpen, Mail, Lock, User } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lang } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate('/community');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({
          title: lang === 'ar' ? 'تم التسجيل بنجاح' : 'Signed up!',
          description: lang === 'ar' ? 'تحقق من بريدك الإلكتروني لتأكيد الحساب' : 'Check your email to confirm your account',
        });
      }
    } catch (error: any) {
      toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { lovable } = await import('@/integrations/lovable/index');
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: result.error.message, variant: 'destructive' });
        return;
      }
      if (result.redirected) return;
      navigate('/community');
    } catch (error: any) {
      toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-arabic">
            {lang === 'ar' ? 'مجتمع الحفاظ' : 'Huffaz Community'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lang === 'ar' ? 'انضم لمجتمع حفاظ القرآن الكريم' : 'Join the Quran memorization community'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <User className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={lang === 'ar' ? 'الاسم' : 'Display Name'}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pr-10"
                required
              />
            </div>
          )}
          <div className="relative">
            <Mail className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pr-10"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="password"
              placeholder={lang === 'ar' ? 'كلمة المرور' : 'Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? '...' : isLogin
              ? (lang === 'ar' ? 'تسجيل الدخول' : 'Login')
              : (lang === 'ar' ? 'إنشاء حساب' : 'Sign Up')}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs"><span className="bg-background px-2 text-muted-foreground">{lang === 'ar' ? 'أو' : 'or'}</span></div>
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          {lang === 'ar' ? 'الدخول بجوجل' : 'Sign in with Google'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? (lang === 'ar' ? 'ليس لديك حساب؟' : "Don't have an account?") : (lang === 'ar' ? 'لديك حساب؟' : 'Have an account?')}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary font-medium mr-1 ml-1">
            {isLogin ? (lang === 'ar' ? 'سجل الآن' : 'Sign Up') : (lang === 'ar' ? 'سجل دخول' : 'Login')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
