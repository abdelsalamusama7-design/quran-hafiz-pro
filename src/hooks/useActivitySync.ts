import { useEffect, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'hafiz_activity_queue_v1';

export interface PendingActivity {
  id: string; // local uuid
  family_id: string;
  child_user_id: string;
  activity_type: string;
  surah_number?: number | null;
  verses_count?: number | null;
  duration_minutes?: number | null;
  points_earned?: number | null;
  notes?: string | null;
  created_at: string;
}

const readQueue = (): PendingActivity[] => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeQueue = (q: PendingActivity[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  } catch {
    // Handle potential quota errors
  }
};

export const queueActivity = (activity: Omit<PendingActivity, 'id' | 'created_at'> & { created_at?: string }) => {
  const item: PendingActivity = {
    id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
    created_at: activity.created_at || new Date().toISOString(),
    ...activity,
  };
  const q = readQueue();
  q.push(item);
  writeQueue(q);
  // Try immediate sync if online
  if (navigator.onLine) {
    void flushActivityQueue();
  }
  // Notify listeners (cross-tab + same-tab)
  try {
    window.dispatchEvent(new CustomEvent('hafiz:activity-queued', { detail: item }));
  } catch {
    // Ignore event dispatch errors
  }
  return item;
};

export const flushActivityQueue = async (): Promise<{ uploaded: number; remaining: number }> => {
  const queue = readQueue();
  if (queue.length === 0) return { uploaded: 0, remaining: 0 };
  if (!navigator.onLine) return { uploaded: 0, remaining: queue.length };

  const remaining: PendingActivity[] = [];
  let uploaded = 0;

  for (const item of queue) {
    try {
      const { error } = await supabase.from('child_activity_logs').insert({
        family_id: item.family_id,
        child_user_id: item.child_user_id,
        activity_type: item.activity_type,
        surah_number: item.surah_number ?? null,
        verses_count: item.verses_count ?? null,
        duration_minutes: item.duration_minutes ?? null,
        points_earned: item.points_earned ?? null,
        notes: item.notes ?? null,
      });
      if (error) {
        // RLS / network error - keep for retry
        remaining.push(item);
      } else {
        uploaded++;
      }
    } catch {
      remaining.push(item);
    }
  }

  writeQueue(remaining);
  if (uploaded > 0) {
    try {
      window.dispatchEvent(new CustomEvent('hafiz:activity-synced', { detail: { uploaded } }));
    } catch {
      // Ignore event dispatch errors
    }
  }
  return { uploaded, remaining: remaining.length };
};

export const getQueueSize = (): number => readQueue().length;

/**
 * Hook: auto-flush queue when:
 *  - app regains online connection
 *  - user logs in
 *  - on mount (if online)
 *  - every 60s while online
 */
export const useActivitySync = () => {
  const [pending, setPending] = useState<number>(getQueueSize());
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(() => {
    setPending(getQueueSize());
  }, []);

  const triggerFlush = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await flushActivityQueue();
    } finally {
      setSyncing(false);
      refreshCount();
    }
  }, [syncing, refreshCount]);

  useEffect(() => {
    // Initial flush
    if (navigator.onLine) {
      void triggerFlush();
    }

    const onOnline = () => {
      void triggerFlush();
    };
    const onQueued = () => refreshCount();
    const onSynced = () => refreshCount();
    const onAuth = () => {
      if (navigator.onLine) void triggerFlush();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('hafiz:activity-queued', onQueued as any);
    window.addEventListener('hafiz:activity-synced', onSynced as any);

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        onAuth();
      }
    });

    // Periodic retry every 60s
    const interval = window.setInterval(() => {
      if (navigator.onLine && getQueueSize() > 0) void triggerFlush();
    }, 60_000);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('hafiz:activity-queued', onQueued as any);
      window.removeEventListener('hafiz:activity-synced', onSynced as any);
      authSub.subscription.unsubscribe();
      window.clearInterval(interval);
    };
  }, [triggerFlush, refreshCount]);

  return { pending, syncing, triggerFlush };
};
