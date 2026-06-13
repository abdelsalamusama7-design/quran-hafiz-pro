import { supabase } from '@/integrations/supabase/client';
import { queueActivity } from '@/hooks/useActivitySync';
import { notifyParentOfSession } from '@/lib/notifyParents';

export interface LogActivityParams {
  activityType: 'live_recitation' | 'memorization' | 'quiz' | 'recitation' | 'review' | string;
  surahNumber?: number | null;
  versesCount?: number | null;
  durationMinutes?: number | null;
  pointsEarned?: number | null;
  notes?: string | null;
}

/**
 * Logs an activity to child_activity_logs.
 * - If user is part of a family, inserts directly (or queues if offline)
 * - If user is NOT in a family, silently skips (still works as standalone user)
 * - Always queues offline writes for later sync
 */
export const logActivity = async (params: LogActivityParams): Promise<{ success: boolean; queued: boolean }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, queued: false };

    // Find the family this user belongs to as a child member
    let familyId: string | null = null;
    if (navigator.onLine) {
      const { data: memberRow } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle();
      familyId = memberRow?.family_id || null;
    } else {
      // Try cached family id
      familyId = localStorage.getItem(`hafiz_family_id_${user.id}`);
    }

    if (familyId) {
      // Cache for offline use
      localStorage.setItem(`hafiz_family_id_${user.id}`, familyId);
    } else {
      // Not part of any family - skip
      return { success: false, queued: false };
    }

    const payload = {
      family_id: familyId,
      child_user_id: user.id,
      activity_type: params.activityType,
      surah_number: params.surahNumber ?? null,
      verses_count: params.versesCount ?? null,
      duration_minutes: params.durationMinutes ?? null,
      points_earned: params.pointsEarned ?? null,
      notes: params.notes ?? null,
    };

    if (!navigator.onLine) {
      queueActivity(payload);
      return { success: true, queued: true };
    }

    const { error } = await supabase.from('child_activity_logs').insert(payload);
    if (error) {
      // Queue for retry
      queueActivity(payload);
      return { success: true, queued: true };
    }
    // Fire-and-forget parent notification
    notifyParentOfSession({
      activityType: params.activityType,
      surahNumber: params.surahNumber ?? null,
      versesCount: params.versesCount ?? null,
      durationMinutes: params.durationMinutes ?? null,
      pointsEarned: params.pointsEarned ?? null,
    });
    return { success: true, queued: false };
  } catch (e) {
    console.error('logActivity error:', e);
    return { success: false, queued: false };
  }
};
