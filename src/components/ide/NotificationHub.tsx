import React, { useState, useEffect } from "react";
import { Bell, CheckCircle2, XCircle, Activity, ExternalLink, Archive } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export function NotificationHub() {
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
    // A proper implementation would have an `is_read` column. 
    // We will just assume anything from the last 5 minutes is "unread" for demo purposes.
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
                        toast.success(`New Task: ${payload.new.title}`, {
                            description: "A new AI operation has started.",
                            icon: <Activity className="w-4 h-4 text-blue-500" />
                        });
                    } else if (payload.eventType === "UPDATE") {
                        if (payload.new.status === "done") {
                            toast.success(`Task Completed: ${payload.new.title}`, {
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
        toast("All notifications marked as read");
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className="relative p-1.5 rounded-md hover:bg-secondary/60 transition-all duration-200 text-muted-foreground hover:text-foreground"
                    title="Notifications"
                    onClick={() => setUnreadCount(0)}
                >
                    <Bell className="h-3.5 w-3.5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-background"></span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-primary" />
                        Notification Hub
                    </h3>
                    {notifications.length > 0 && (
                        <button
                            onClick={markAllRead}
                            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        >
                            <Archive className="w-3 h-3" />
                            Clear All
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="max-h-[350px] overflow-y-auto hide-scrollbar flex flex-col">
                    {isLoading ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <Activity className="w-5 h-5 animate-pulse text-primary/50" />
                            Syncing signals...
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <CheckCircle2 className="w-8 h-8 opacity-20" />
                            <p>You're all caught up!</p>
                            <p className="text-[10px] opacity-70">No new system events found.</p>
                        </div>
                    ) : (
                        notifications.map((notif: any) => (
                            <div key={notif.id} className="flex gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors group cursor-pointer">
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
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                        {notif.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                                        <span className="capitalize">{notif.status} Phase</span>
                                        <span>
                                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-secondary/30 text-center border-t border-border">
                    <a href="/dashboard" className="text-xs text-primary font-medium hover:underline flex items-center justify-center gap-1 group">
                        Open Command Center
                        <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                    </a>
                </div>
            </PopoverContent>
        </Popover>
    );
}

