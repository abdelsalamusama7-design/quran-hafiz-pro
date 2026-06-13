import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  child_name: string;
}

interface Props {
  parentUserId: string;
}

const ParentNotificationsBell = ({ parentUserId }: Props) => {
  const { lang } = useLanguage();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from('parent_notifications')
      .select('id, type, title, message, read, created_at, child_name')
      .eq('parent_user_id', parentUserId)
      .order('created_at', { ascending: false })
      .limit(50);
    setItems(data || []);
  };

  useEffect(() => {
    if (!parentUserId) return;
    load();
    const channel = supabase
      .channel(`parent-notifs-${parentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_notifications',
          filter: `parent_user_id=eq.${parentUserId}`,
        },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentUserId]);

  const unreadCount = items.filter((i) => !i.read).length;

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    await supabase
      .from('parent_notifications')
      .update({ read: true })
      .eq('parent_user_id', parentUserId)
      .eq('read', false);
    load();
  };

  const clearAll = async () => {
    await supabase
      .from('parent_notifications')
      .delete()
      .eq('parent_user_id', parentUserId);
    load();
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return lang === 'ar' ? 'الآن' : 'now';
    if (diff < 3600)
      return lang === 'ar'
        ? `منذ ${Math.floor(diff / 60)} د`
        : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)
      return lang === 'ar'
        ? `منذ ${Math.floor(diff / 3600)} س`
        : `${Math.floor(diff / 3600)}h ago`;
    return d.toLocaleDateString(lang === 'ar' ? 'ar' : 'en');
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] flex items-center justify-center rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b">
          <p className="font-semibold text-sm">
            {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
          </p>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={markAllRead} className="h-7 px-2">
                <CheckCheck className="w-4 h-4" />
              </Button>
            )}
            {items.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 px-2">
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              {lang === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}
            </p>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-sm">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {formatTime(n.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {n.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default ParentNotificationsBell;