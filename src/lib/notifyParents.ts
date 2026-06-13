import { supabase } from '@/integrations/supabase/client';

interface SessionNotifyParams {
  activityType: string;
  surahNumber?: number | null;
  versesCount?: number | null;
  durationMinutes?: number | null;
  pointsEarned?: number | null;
}

const activityLabelAr: Record<string, string> = {
  live_recitation: 'تسميع مباشر',
  memorization: 'حفظ',
  quiz: 'اختبار',
  recitation: 'تلاوة',
  review: 'مراجعة',
};

async function getContext() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // family the user is a child member of
  const { data: memberRow } = await supabase
    .from('family_members')
    .select('family_id, display_name')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!memberRow) return null;

  const { data: fam } = await supabase
    .from('family_groups')
    .select('id, parent_id')
    .eq('id', memberRow.family_id)
    .maybeSingle();
  if (!fam) return null;

  // Don't notify yourself if you are the parent
  if (fam.parent_id === user.id) return null;

  return {
    userId: user.id,
    familyId: fam.id,
    parentId: fam.parent_id,
    childName: memberRow.display_name || 'الطفل',
  };
}

export const notifyParentOfSession = async (params: SessionNotifyParams) => {
  try {
    const ctx = await getContext();
    if (!ctx) return;
    const label = activityLabelAr[params.activityType] || params.activityType;
    const parts: string[] = [];
    if (params.versesCount) parts.push(`${params.versesCount} آية`);
    if (params.durationMinutes) parts.push(`${params.durationMinutes} دقيقة`);
    if (params.pointsEarned) parts.push(`${params.pointsEarned} نقطة`);
    const message = `${ctx.childName} أكمل جلسة ${label}${parts.length ? ' · ' + parts.join(' · ') : ''}`;
    await supabase.from('parent_notifications').insert({
      parent_user_id: ctx.parentId,
      family_id: ctx.familyId,
      child_user_id: ctx.userId,
      child_name: ctx.childName,
      type: 'session_completed',
      title: '🎉 جلسة مكتملة',
      message,
      metadata: params as any,
    });
  } catch (e) {
    console.error('notifyParentOfSession error:', e);
  }
};

export const notifyParentOfGoal = async (goal: { id: string; title: string; reward?: string | null }) => {
  try {
    const ctx = await getContext();
    if (!ctx) return;
    const message = `${ctx.childName} أنجز هدف: ${goal.title}${goal.reward ? ` 🎁 ${goal.reward}` : ''}`;
    await supabase.from('parent_notifications').insert({
      parent_user_id: ctx.parentId,
      family_id: ctx.familyId,
      child_user_id: ctx.userId,
      child_name: ctx.childName,
      type: 'goal_completed',
      title: '🏆 هدف منجز',
      message,
      metadata: { goalId: goal.id, title: goal.title, reward: goal.reward ?? null },
    });
  } catch (e) {
    console.error('notifyParentOfGoal error:', e);
  }
};