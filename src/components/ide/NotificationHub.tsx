import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, XCircle, Activity, ExternalLink, Archive } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface NotificationHubProps {
    onOpenDashboard: () => void;
}

export function NotificationHub({ onOpenDashboard }: NotificationHubProps) {
    const [unreadCount, setUnreadCount] = useState(0);
    const queryClient = useQueryClient();

    // Fetch recent tasks as notifications
    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("ai_tasks")
                .select(`
                    id,
                    title,
                    status,
                    created_at
                `)
                .order("created_at", { ascending: false })
                .limit(10);

            if (error) throw error;
            return data;
        },
    });

    // Count unread based on some local storage or just random mock for now
    useEffect(() => {
        if (!notifications.length) return;
        const recentUnread = notifications.filter((n: any) => {
            const timeDiff = new Date().getTime() - new Date(n.created_at).getTime();
            return timeDiff < 5 * 60 * 1000; // 5 minutes
        });
        setUnreadCount(recentUnread.length);
    }, [notifications]);

    // Realtime subscription
    useEffect(() => {
        const channel = supabase
            .channel("notifications_channel")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ai_tasks" },
                (payload) => {
                    // Show a toast for new or updated tasks
                    if (payload.eventType === "INSERT") {
                        toast.success(`مهمة جديدة: ${payload.new.title}`, {
                            description: "بدأت عملية ذكاء اصطناعي جديدة.",
                            icon: <Activity className="w-4 h-4 text-blue-500" />
                        });
                    } else if (payload.eventType === "UPDATE") {
                        if (payload.new.status === "done") {
                            toast.success(`اكتملت المهمة: ${payload.new.title}`, {
                                icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            });
                        }
                    }

                    // Trigger refetch
                    queryClient.invalidateQueries({ queryKey: ["notifications"] });
                    queryClient.invalidateQueries({ queryKey: ["ai_tasks"] }); // For the dashboard as well
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const markAllRead = () => {
        setUnreadCount(0);
        toast("تم تحديد جميع الإشعارات كمقروءة");
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="relative p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
                    title="الإشعارات"
                    aria-label="فتح الإشعارات"
                    onClick={() => setUnreadCount(0)}
                >
                    <Bell className="h-3.5 w-3.5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-background"></span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl" dir="rtl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20 flex-row-reverse">
                    <h3 className="font-semibold text-sm flex items-center gap-2 flex-row-reverse">
                        <Bell className="w-4 h-4 text-primary" />
                        مركز الإشعارات
                    </h3>
                    {notifications.length > 0 && (
                        <button
                            type="button"
                            onClick={markAllRead}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 flex-row-reverse"
                        >
                            <Archive className="w-3 h-3" />
                            مسح الكل
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="max-h-[350px] overflow-y-auto hide-scrollbar flex flex-col">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 font-cairo">
                            <Activity className="w-5 h-5 animate-pulse text-primary/50" />
                            جاري مزامنة الإشارات...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2 font-cairo">
                            <CheckCircle2 className="w-8 h-8 opacity-20" />
                            <p>لا توجد إشعارات جديدة!</p>
                            <p className="text-[10px] opacity-70">لم يتم العثور على أحداث نظام جديدة.</p>
                        </div>
                    ) : (
                        notifications.map((notif: any) => (
                            <div key={notif.id} className="flex gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors group cursor-pointer flex-row-reverse">
                                <div className="mt-0.5">
                                    {notif.status === "done" ? (
                                        <div className="p-1.5 rounded-full bg-ide-success/10 text-ide-success">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                        </div>
                                    ) : notif.status === "failed" ? (
                                        <div className="p-1.5 rounded-full bg-destructive/10 text-destructive">
                                            <XCircle className="w-3.5 h-3.5" />
                                        </div>
                                    ) : (
                                        <div className="p-1.5 rounded-full bg-ide-warning/10 text-ide-warning">
                                            <Activity className="w-3.5 h-3.5 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                        {notif.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between flex-row-reverse" dir="ltr">
                                        <span className="capitalize ml-2">مرحلة {notif.status === 'done' ? 'الاكتمال' : notif.status === 'todo' ? 'البدء' : 'التنفيذ'}</span>
                                        <span>
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ar })}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-secondary/30 text-center border-t border-border">
                    <button
                        type="button"
                        onClick={onOpenDashboard}
                        className="w-full text-xs text-primary font-medium hover:underline flex items-center justify-center gap-1 group flex-row-reverse"
                    >
                        فتح مركز القيادة
                        <ExternalLink className="w-3 h-3 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 transition-transform rtl:rotate-180" />
                    </button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
