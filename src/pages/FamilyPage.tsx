import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, Copy, Target, BookOpen, Award, Trash2, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import ParentNotificationsBell from '@/components/ParentNotificationsBell';
import { notifyParentOfGoal } from '@/lib/notifyParents';

interface FamilyGroup {
  id: string;
  name: string;
  parent_id: string;
  invite_code: string;
}

interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: string;
  display_name: string;
  age: number | null;
}

interface ActivityLog {
  id: string;
  child_user_id: string;
  activity_type: string;
  surah_number: number | null;
  verses_count: number;
  duration_minutes: number;
  points_earned: number;
  created_at: string;
}

interface Goal {
  id: string;
  child_user_id: string;
  title: string;
  description: string | null;
  target_verses: number;
  target_date: string | null;
  completed: boolean;
  reward: string | null;
}

const FamilyPage = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [family, setFamily] = useState<FamilyGroup | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [childAge, setChildAge] = useState('');
  const [goalTitle, setGoalTitle] = useState('');
  const [goalVerses, setGoalVerses] = useState('');
  const [goalReward, setGoalReward] = useState('');
  const [selectedChild, setSelectedChild] = useState<string>('');

  const isParent = family && user && family.parent_id === user.id;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }
    setUser(session.user);
    await loadFamily(session.user.id);
  };

  const loadFamily = async (userId: string) => {
    setLoading(true);
    // Look for family where user is parent or member
    const { data: memberRows } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId)
      .limit(1);

    let familyId: string | null = null;
    if (memberRows && memberRows.length > 0) {
      familyId = memberRows[0].family_id;
    } else {
      const { data: parentFamily } = await supabase
        .from('family_groups')
        .select('id')
        .eq('parent_id', userId)
        .limit(1);
      if (parentFamily && parentFamily.length > 0) familyId = parentFamily[0].id;
    }

    if (familyId) {
      const { data: famData } = await supabase.from('family_groups').select('*').eq('id', familyId).single();
      setFamily(famData);
      const { data: memData } = await supabase.from('family_members').select('*').eq('family_id', familyId);
      setMembers(memData || []);
      const { data: logData } = await supabase.from('child_activity_logs').select('*').eq('family_id', familyId).order('created_at', { ascending: false }).limit(50);
      setLogs(logData || []);
      const { data: goalData } = await supabase.from('parent_goals').select('*').eq('family_id', familyId).order('created_at', { ascending: false });
      setGoals(goalData || []);
    }
    setLoading(false);
  };

  const createFamily = async () => {
    if (!familyName.trim() || !user) return;
    const { data, error } = await supabase
      .from('family_groups')
      .insert({ name: familyName, parent_id: user.id })
      .select()
      .single();
    if (error) {
      toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    // Add parent as member too
    await supabase.from('family_members').insert({
      family_id: data.id,
      user_id: user.id,
      role: 'parent',
      display_name: user.email?.split('@')[0] || 'Parent',
    });
    toast({ title: lang === 'ar' ? 'تم إنشاء العائلة' : 'Family created' });
    setFamilyName('');
    await loadFamily(user.id);
  };

  const joinFamily = async () => {
    if (!joinCode.trim() || !user) return;
    const { data: famData, error: famErr } = await supabase
      .from('family_groups')
      .select('*')
      .eq('invite_code', joinCode.trim())
      .maybeSingle();
    if (famErr || !famData) {
      toast({ title: lang === 'ar' ? 'كود غير صحيح' : 'Invalid code', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.from('family_members').insert({
      family_id: famData.id,
      user_id: user.id,
      role: 'child',
      display_name: user.email?.split('@')[0] || 'Child',
      age: childAge ? parseInt(childAge) : null,
    });
    if (error) {
      toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: lang === 'ar' ? 'تم الانضمام للعائلة' : 'Joined family' });
    setJoinCode('');
    setChildAge('');
    await loadFamily(user.id);
  };

  const copyInviteCode = () => {
    if (!family) return;
    navigator.clipboard.writeText(family.invite_code);
    toast({ title: lang === 'ar' ? 'تم نسخ الكود' : 'Code copied' });
  };

  const createGoal = async () => {
    if (!goalTitle.trim() || !selectedChild || !family || !user) return;
    const { error } = await supabase.from('parent_goals').insert({
      family_id: family.id,
      child_user_id: selectedChild,
      parent_user_id: user.id,
      title: goalTitle,
      target_verses: goalVerses ? parseInt(goalVerses) : 0,
      reward: goalReward || null,
    });
    if (error) {
      toast({ title: lang === 'ar' ? 'خطأ' : 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: lang === 'ar' ? 'تم إضافة الهدف' : 'Goal added' });
    setGoalTitle(''); setGoalVerses(''); setGoalReward('');
    await loadFamily(user.id);
  };

  const completeGoal = async (id: string) => {
    const goal = goals.find(g => g.id === id);
    await supabase.from('parent_goals').update({ completed: true }).eq('id', id);
    if (goal) {
      notifyParentOfGoal({ id: goal.id, title: goal.title, reward: goal.reward });
    }
    if (user) await loadFamily(user.id);
  };

  const deleteGoal = async (id: string) => {
    await supabase.from('parent_goals').delete().eq('id', id);
    if (user) await loadFamily(user.id);
  };

  const getChildStats = (childId: string) => {
    const childLogs = logs.filter(l => l.child_user_id === childId);
    return {
      verses: childLogs.reduce((s, l) => s + l.verses_count, 0),
      minutes: childLogs.reduce((s, l) => s + l.duration_minutes, 0),
      points: childLogs.reduce((s, l) => s + l.points_earned, 0),
      sessions: childLogs.length,
    };
  };

  if (loading) {
    return (
      <div className="pb-28 px-4 pt-4 max-w-2xl mx-auto">
        <PageHeader title={lang === 'ar' ? 'العائلة' : 'Family'} />
        <p className="text-center text-muted-foreground">{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
      </div>
    );
  }

  // No family yet — show create/join
  if (!family) {
    return (
      <div className="pb-28 px-4 pt-4 max-w-2xl mx-auto space-y-4">
        <PageHeader title={lang === 'ar' ? 'النظام العائلي' : 'Family System'} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="w-5 h-5 text-primary" />
              {lang === 'ar' ? 'إنشاء عائلة جديدة (للوالدين)' : 'Create New Family (Parents)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder={lang === 'ar' ? 'اسم العائلة' : 'Family name'} value={familyName} onChange={e => setFamilyName(e.target.value)} />
            <Button onClick={createFamily} className="w-full">{lang === 'ar' ? 'إنشاء العائلة' : 'Create Family'}</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="w-5 h-5 text-accent" />
              {lang === 'ar' ? 'الانضمام لعائلة (للأطفال)' : 'Join Family (Children)'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder={lang === 'ar' ? 'كود الدعوة' : 'Invite code'} value={joinCode} onChange={e => setJoinCode(e.target.value)} />
            <Input placeholder={lang === 'ar' ? 'العمر (اختياري)' : 'Age (optional)'} type="number" value={childAge} onChange={e => setChildAge(e.target.value)} />
            <Button onClick={joinFamily} variant="secondary" className="w-full">{lang === 'ar' ? 'انضمام' : 'Join'}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const children = members.filter(m => m.role === 'child');

  return (
    <div className="pb-28 px-4 pt-4 max-w-3xl mx-auto space-y-4">
      <PageHeader title={family.name} />

      {/* Invite code card */}
      {isParent && (
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{lang === 'ar' ? 'كود دعوة العائلة' : 'Family invite code'}</p>
              <p className="text-2xl font-bold tracking-widest text-primary">{family.invite_code}</p>
            </div>
            <Button onClick={copyInviteCode} size="sm" variant="outline" className="gap-2">
              <Copy className="w-4 h-4" /> {lang === 'ar' ? 'نسخ' : 'Copy'}
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="children" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="children">{lang === 'ar' ? 'الأطفال' : 'Children'}</TabsTrigger>
          <TabsTrigger value="reports">{lang === 'ar' ? 'التقارير' : 'Reports'}</TabsTrigger>
          <TabsTrigger value="goals">{lang === 'ar' ? 'الأهداف' : 'Goals'}</TabsTrigger>
          <TabsTrigger value="activity">{lang === 'ar' ? 'النشاط' : 'Activity'}</TabsTrigger>
        </TabsList>

        {/* Children Dashboard */}
        <TabsContent value="children" className="space-y-3 mt-4">
          {children.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">
              {lang === 'ar' ? 'لا يوجد أطفال في العائلة بعد. شارك كود الدعوة معهم.' : 'No children yet. Share the invite code.'}
            </CardContent></Card>
          ) : children.map(child => {
            const stats = getChildStats(child.user_id);
            const childGoals = goals.filter(g => g.child_user_id === child.user_id);
            const completedGoals = childGoals.filter(g => g.completed).length;
            return (
              <Card key={child.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{child.display_name}{child.age ? ` · ${child.age} ${lang === 'ar' ? 'سنة' : 'yrs'}` : ''}</span>
                    <Badge variant="secondary">{stats.points} {lang === 'ar' ? 'نقطة' : 'pts'}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-muted/50 rounded-lg p-2">
                      <BookOpen className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold">{stats.verses}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'آيات' : 'verses'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <Clock className="w-4 h-4 mx-auto mb-1 text-accent" />
                      <p className="text-lg font-bold">{stats.minutes}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'دقيقة' : 'min'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <Award className="w-4 h-4 mx-auto mb-1 text-primary" />
                      <p className="text-lg font-bold">{completedGoals}/{childGoals.length}</p>
                      <p className="text-[10px] text-muted-foreground">{lang === 'ar' ? 'أهداف' : 'goals'}</p>
                    </div>
                  </div>
                  {childGoals.length > 0 && (
                    <div>
                      <Progress value={childGoals.length ? (completedGoals / childGoals.length) * 100 : 0} className="h-2" />
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports" className="space-y-4 mt-4">
          {children.length === 0 ? (
            <Card><CardContent className="p-6 text-center text-muted-foreground">
              {lang === 'ar' ? 'لا يوجد أطفال لعرض التقارير.' : 'No children to report on.'}
            </CardContent></Card>
          ) : (() => {
            // Build last 7 days dataset
            const days = Array.from({ length: 7 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              return d;
            });
            const weeklyData = days.map(d => {
              const dayStr = d.toISOString().slice(0, 10);
              const dayLogs = logs.filter(l => l.created_at.slice(0, 10) === dayStr);
              const row: any = {
                day: d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en', { weekday: 'short' }),
              };
              children.forEach(c => {
                row[c.display_name] = dayLogs
                  .filter(l => l.child_user_id === c.user_id)
                  .reduce((s, l) => s + l.verses_count, 0);
              });
              return row;
            });

            // Last 4 weeks dataset
            const monthlyData = Array.from({ length: 4 }).map((_, i) => {
              const start = new Date();
              start.setDate(start.getDate() - (7 * (3 - i) + 6));
              const end = new Date();
              end.setDate(end.getDate() - (7 * (3 - i)));
              const weekLogs = logs.filter(l => {
                const ld = new Date(l.created_at);
                return ld >= start && ld <= end;
              });
              return {
                week: `${lang === 'ar' ? 'أسبوع' : 'W'} ${i + 1}`,
                verses: weekLogs.reduce((s, l) => s + l.verses_count, 0),
                minutes: weekLogs.reduce((s, l) => s + l.duration_minutes, 0),
                points: weekLogs.reduce((s, l) => s + l.points_earned, 0),
              };
            });

            const palette = ['hsl(var(--primary))', 'hsl(var(--accent))', '#8b5cf6', '#f59e0b', '#ec4899'];

            return (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: lang === 'ar' ? 'إجمالي الآيات' : 'Total Verses', value: logs.reduce((s, l) => s + l.verses_count, 0), icon: BookOpen },
                    { label: lang === 'ar' ? 'إجمالي الدقائق' : 'Total Minutes', value: logs.reduce((s, l) => s + l.duration_minutes, 0), icon: Clock },
                    { label: lang === 'ar' ? 'إجمالي النقاط' : 'Total Points', value: logs.reduce((s, l) => s + l.points_earned, 0), icon: Award },
                  ].map(({ label, value, icon: Icon }) => (
                    <Card key={label}>
                      <CardContent className="p-3 text-center">
                        <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-[10px] text-muted-foreground">{label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Weekly chart per child */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      {lang === 'ar' ? 'الآيات هذا الأسبوع (لكل طفل)' : 'Verses This Week (per child)'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={weeklyData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {children.map((c, i) => (
                          <Bar key={c.id} dataKey={c.display_name} fill={palette[i % palette.length]} radius={[4, 4, 0, 0]} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Monthly trend */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-accent" />
                      {lang === 'ar' ? 'تقرير شهري (آخر 4 أسابيع)' : 'Monthly Report (Last 4 Weeks)'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="verses" name={lang === 'ar' ? 'آيات' : 'Verses'} stroke="hsl(var(--primary))" strokeWidth={2} />
                        <Line type="monotone" dataKey="minutes" name={lang === 'ar' ? 'دقائق' : 'Minutes'} stroke="hsl(var(--accent))" strokeWidth={2} />
                        <Line type="monotone" dataKey="points" name={lang === 'ar' ? 'نقاط' : 'Points'} stroke="#f59e0b" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Per-child ranking */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{lang === 'ar' ? 'ترتيب الأطفال' : 'Children Ranking'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {[...children]
                      .map(c => ({ ...c, total: getChildStats(c.user_id).points }))
                      .sort((a, b) => b.total - a.total)
                      .map((c, idx) => (
                        <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                            <span className="text-sm font-medium">{c.display_name}</span>
                          </div>
                          <Badge variant="secondary">{c.total} {lang === 'ar' ? 'نقطة' : 'pts'}</Badge>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>

        {/* Goals */}
        <TabsContent value="goals" className="space-y-3 mt-4">
          {isParent && children.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  {lang === 'ar' ? 'إضافة هدف' : 'Add goal'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={selectedChild} onChange={e => setSelectedChild(e.target.value)}>
                  <option value="">{lang === 'ar' ? 'اختر الطفل' : 'Select child'}</option>
                  {children.map(c => <option key={c.id} value={c.user_id}>{c.display_name}</option>)}
                </select>
                <Input placeholder={lang === 'ar' ? 'عنوان الهدف' : 'Goal title'} value={goalTitle} onChange={e => setGoalTitle(e.target.value)} />
                <Input placeholder={lang === 'ar' ? 'عدد الآيات المستهدف' : 'Target verses'} type="number" value={goalVerses} onChange={e => setGoalVerses(e.target.value)} />
                <Input placeholder={lang === 'ar' ? 'المكافأة (اختياري)' : 'Reward (optional)'} value={goalReward} onChange={e => setGoalReward(e.target.value)} />
                <Button onClick={createGoal} className="w-full" size="sm">{lang === 'ar' ? 'إضافة' : 'Add'}</Button>
              </CardContent>
            </Card>
          )}
          {goals.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">{lang === 'ar' ? 'لا توجد أهداف' : 'No goals yet'}</p>
          ) : goals.map(goal => {
            const child = members.find(m => m.user_id === goal.child_user_id);
            return (
              <Card key={goal.id} className={goal.completed ? 'opacity-60' : ''}>
                <CardContent className="p-3 flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {goal.completed && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      <p className="font-semibold text-sm">{goal.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {child?.display_name} · {goal.target_verses} {lang === 'ar' ? 'آية' : 'verses'}
                      {goal.reward && ` · 🎁 ${goal.reward}`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!goal.completed && goal.child_user_id === user?.id && (
                      <Button size="sm" variant="ghost" onClick={() => completeGoal(goal.id)}>
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    {isParent && (
                      <Button size="sm" variant="ghost" onClick={() => deleteGoal(goal.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="space-y-2 mt-4">
          {logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">{lang === 'ar' ? 'لا توجد أنشطة بعد' : 'No activity yet'}</p>
          ) : logs.map(log => {
            const child = members.find(m => m.user_id === log.child_user_id);
            return (
              <Card key={log.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{child?.display_name} · {log.activity_type}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.verses_count} {lang === 'ar' ? 'آية' : 'verses'} · {log.duration_minutes} {lang === 'ar' ? 'دقيقة' : 'min'} · {new Date(log.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge>{log.points_earned} pts</Badge>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FamilyPage;
