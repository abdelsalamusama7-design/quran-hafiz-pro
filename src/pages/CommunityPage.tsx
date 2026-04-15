import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Trophy, Users, Swords, Plus, ArrowRight, Crown, Medal, Award, LogOut } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

type TabType = 'leaderboard' | 'circles' | 'challenges';

interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  total_points: number;
  verses_memorized: number;
  streak_days: number;
}

interface Circle {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  max_members: number;
  member_count?: number;
}

interface Challenge {
  id: string;
  title: string;
  description: string | null;
  target_verses: number;
  start_date: string;
  end_date: string;
  created_by: string;
  participant_count?: number;
  my_progress?: number;
  joined?: boolean;
}

const CommunityPage = () => {
  const { lang } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabType>('leaderboard');
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateCircle, setShowCreateCircle] = useState(false);
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [newCircle, setNewCircle] = useState({ name: '', description: '' });
  const [newChallenge, setNewChallenge] = useState({ title: '', description: '', target_verses: 10 });

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate('/auth');
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate('/auth');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) loadData();
  }, [user, tab]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('community-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        if (tab === 'leaderboard') loadLeaderboard();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenge_participants' }, () => {
        if (tab === 'challenges') loadChallenges();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, tab]);

  const loadData = async () => {
    setLoading(true);
    if (tab === 'leaderboard') await loadLeaderboard();
    else if (tab === 'circles') await loadCircles();
    else await loadChallenges();
    setLoading(false);
  };

  const loadLeaderboard = async () => {
    const { data } = await supabase.from('profiles').select('*').order('total_points', { ascending: false }).limit(50);
    if (data) setProfiles(data);
  };

  const loadCircles = async () => {
    const { data: circlesData } = await supabase.from('memorization_circles').select('*').order('created_at', { ascending: false });
    if (circlesData) {
      const withCounts = await Promise.all(circlesData.map(async (c) => {
        const { count } = await supabase.from('circle_members').select('*', { count: 'exact', head: true }).eq('circle_id', c.id);
        return { ...c, member_count: count ?? 0 };
      }));
      setCircles(withCounts);
    }
  };

  const loadChallenges = async () => {
    const { data: challengesData } = await supabase.from('challenges').select('*').order('created_at', { ascending: false });
    if (challengesData && user) {
      const withDetails = await Promise.all(challengesData.map(async (ch) => {
        const { count } = await supabase.from('challenge_participants').select('*', { count: 'exact', head: true }).eq('challenge_id', ch.id);
        const { data: myPart } = await supabase.from('challenge_participants').select('progress').eq('challenge_id', ch.id).eq('user_id', user.id).maybeSingle();
        return { ...ch, participant_count: count ?? 0, my_progress: myPart?.progress, joined: !!myPart };
      }));
      setChallenges(withDetails);
    }
  };

  const createCircle = async () => {
    if (!user || !newCircle.name) return;
    const { error } = await supabase.from('memorization_circles').insert({ name: newCircle.name, description: newCircle.description || null, created_by: user.id });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewCircle({ name: '', description: '' });
    setShowCreateCircle(false);
    loadCircles();
    toast({ title: lang === 'ar' ? 'تم إنشاء الحلقة' : 'Circle created!' });
  };

  const joinCircle = async (circleId: string) => {
    if (!user) return;
    const { error } = await supabase.from('circle_members').insert({ circle_id: circleId, user_id: user.id });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    loadCircles();
    toast({ title: lang === 'ar' ? 'تم الانضمام' : 'Joined!' });
  };

  const createChallenge = async () => {
    if (!user || !newChallenge.title) return;
    const { error } = await supabase.from('challenges').insert({
      title: newChallenge.title, description: newChallenge.description || null,
      target_verses: newChallenge.target_verses, created_by: user.id,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewChallenge({ title: '', description: '', target_verses: 10 });
    setShowCreateChallenge(false);
    loadChallenges();
    toast({ title: lang === 'ar' ? 'تم إنشاء التحدي' : 'Challenge created!' });
  };

  const joinChallenge = async (challengeId: string) => {
    if (!user) return;
    const { error } = await supabase.from('challenge_participants').insert({ challenge_id: challengeId, user_id: user.id });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    loadChallenges();
    toast({ title: lang === 'ar' ? 'تم الانضمام للتحدي' : 'Joined challenge!' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const tabs = [
    { key: 'leaderboard' as TabType, icon: Trophy, label: lang === 'ar' ? 'المتصدرين' : 'Leaderboard' },
    { key: 'circles' as TabType, icon: Users, label: lang === 'ar' ? 'الحلقات' : 'Circles' },
    { key: 'challenges' as TabType, icon: Swords, label: lang === 'ar' ? 'التحديات' : 'Challenges' },
  ];

  const getRankIcon = (i: number) => {
    if (i === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (i === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (i === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="text-xs font-bold text-muted-foreground w-5 text-center">{i + 1}</span>;
  };

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground font-arabic">
          {lang === 'ar' ? '🕌 مجتمع الحفاظ' : '🕌 Community'}
        </h1>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="w-4 h-4" />
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
              tab === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</div>
      ) : (
        <>
          {/* Leaderboard */}
          {tab === 'leaderboard' && (
            <div className="space-y-2">
              {profiles.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  {lang === 'ar' ? 'لا يوجد مستخدمين بعد' : 'No users yet'}
                </p>
              ) : profiles.map((p, i) => (
                <Card key={p.id} className={`${i < 3 ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardContent className="flex items-center gap-3 p-3">
                    {getRankIcon(i)}
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                      {p.display_name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.verses_memorized} {lang === 'ar' ? 'آية' : 'verses'} · {p.streak_days} 🔥
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-primary text-sm">{p.total_points}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'نقطة' : 'pts'}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Circles */}
          {tab === 'circles' && (
            <div className="space-y-3">
              <Button size="sm" onClick={() => setShowCreateCircle(!showCreateCircle)} className="w-full">
                <Plus className="w-4 h-4" />
                {lang === 'ar' ? 'إنشاء حلقة جديدة' : 'Create Circle'}
              </Button>

              {showCreateCircle && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Input placeholder={lang === 'ar' ? 'اسم الحلقة' : 'Circle name'} value={newCircle.name} onChange={(e) => setNewCircle({ ...newCircle, name: e.target.value })} />
                    <Input placeholder={lang === 'ar' ? 'وصف (اختياري)' : 'Description (optional)'} value={newCircle.description} onChange={(e) => setNewCircle({ ...newCircle, description: e.target.value })} />
                    <Button size="sm" onClick={createCircle} className="w-full">{lang === 'ar' ? 'إنشاء' : 'Create'}</Button>
                  </CardContent>
                </Card>
              )}

              {circles.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  {lang === 'ar' ? 'لا توجد حلقات بعد. أنشئ أول حلقة!' : 'No circles yet. Create one!'}
                </p>
              ) : circles.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      {c.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {c.description && <p className="text-xs text-muted-foreground mb-2">{c.description}</p>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {c.member_count}/{c.max_members} {lang === 'ar' ? 'عضو' : 'members'}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => joinCircle(c.id)}>
                        <ArrowRight className="w-3 h-3" />
                        {lang === 'ar' ? 'انضمام' : 'Join'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Challenges */}
          {tab === 'challenges' && (
            <div className="space-y-3">
              <Button size="sm" onClick={() => setShowCreateChallenge(!showCreateChallenge)} className="w-full">
                <Plus className="w-4 h-4" />
                {lang === 'ar' ? 'إنشاء تحدي جديد' : 'Create Challenge'}
              </Button>

              {showCreateChallenge && (
                <Card>
                  <CardContent className="p-4 space-y-3">
                    <Input placeholder={lang === 'ar' ? 'عنوان التحدي' : 'Challenge title'} value={newChallenge.title} onChange={(e) => setNewChallenge({ ...newChallenge, title: e.target.value })} />
                    <Input placeholder={lang === 'ar' ? 'وصف (اختياري)' : 'Description'} value={newChallenge.description} onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })} />
                    <Input type="number" placeholder={lang === 'ar' ? 'عدد الآيات المستهدفة' : 'Target verses'} value={newChallenge.target_verses} onChange={(e) => setNewChallenge({ ...newChallenge, target_verses: Number(e.target.value) })} />
                    <Button size="sm" onClick={createChallenge} className="w-full">{lang === 'ar' ? 'إنشاء' : 'Create'}</Button>
                  </CardContent>
                </Card>
              )}

              {challenges.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">
                  {lang === 'ar' ? 'لا توجد تحديات بعد' : 'No challenges yet'}
                </p>
              ) : challenges.map((ch) => (
                <Card key={ch.id}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Swords className="w-4 h-4 text-primary" />
                      {ch.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2">
                    {ch.description && <p className="text-xs text-muted-foreground">{ch.description}</p>}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>🎯 {ch.target_verses} {lang === 'ar' ? 'آية' : 'verses'}</span>
                      <span>👥 {ch.participant_count} {lang === 'ar' ? 'مشارك' : 'participants'}</span>
                    </div>
                    {ch.joined ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>{lang === 'ar' ? 'تقدمك' : 'Your progress'}</span>
                          <span>{ch.my_progress ?? 0}/{ch.target_verses}</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ((ch.my_progress ?? 0) / ch.target_verses) * 100)}%` }} />
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => joinChallenge(ch.id)} className="w-full">
                        {lang === 'ar' ? 'انضم للتحدي' : 'Join Challenge'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommunityPage;
