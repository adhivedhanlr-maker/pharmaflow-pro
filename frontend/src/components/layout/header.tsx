"use client";

import { useEffect, useState } from "react";
import { Bell, User, Info, AlertTriangle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Notification {
    id: string;
    type: string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function Header() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await fetch(`${API_BASE}/alerts`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: Notification) => !n.isRead).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await fetch(`${API_BASE}/alerts/${id}/read`, { method: "PATCH" });
            fetchNotifications();
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "EXPIRY": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case "LOW_STOCK": return <XCircle className="h-4 w-4 text-red-500" />;
            default: return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    return (
        <header className="h-16 border-b bg-background flex items-center justify-between px-8 sticky top-0 z-10">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">System Overview</h2>
            </div>
            <div className="flex items-center gap-6">
                <Popover>
                    <PopoverTrigger asChild>
                        <div className="relative cursor-pointer hover:bg-muted p-2 rounded-full transition-colors">
                            <Bell className="h-5 w-5 text-slate-600" />
                            {unreadCount > 0 && (
                                <Badge className="absolute -top-0.5 -right-0.5 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-red-600 animate-pulse border-2 border-background">
                                    {unreadCount}
                                </Badge>
                            )}
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0 mr-4 shadow-xl border-slate-200" align="end">
                        <div className="p-4 border-b bg-slate-50/50">
                            <h3 className="font-semibold text-sm">Notifications</h3>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground text-sm">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((n) => (
                                    <div
                                        key={n.id}
                                        onClick={() => !n.isRead && markAsRead(n.id)}
                                        className={cn(
                                            "p-4 border-b last:border-0 cursor-pointer flex gap-3 transition-colors",
                                            !n.isRead ? "bg-blue-50/30 hover:bg-blue-50/50" : "hover:bg-slate-50"
                                        )}
                                    >
                                        <div className="mt-0.5">{getIcon(n.type)}</div>
                                        <div className="flex-1 space-y-1">
                                            <p className={cn("text-xs leading-relaxed", !n.isRead ? "font-semibold text-slate-900" : "text-slate-600")}>
                                                {n.message}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground font-medium">
                                                {new Date(n.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        {!n.isRead && (
                                            <div className="h-2 w-2 rounded-full bg-blue-600 mt-2 shrink-0" />
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                        {notifications.length > 0 && (
                            <div className="p-3 text-center border-t bg-slate-50/50">
                                <button className="text-[11px] font-semibold text-primary hover:underline">
                                    View All Activity
                                </button>
                            </div>
                        )}
                    </PopoverContent>
                </Popover>

                <div className="flex items-center gap-3 pl-4 border-l h-8">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-semibold text-slate-900">Administrator</p>
                        <p className="text-[10px] text-muted-foreground">PharmaFlow Pro</p>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
                        <User className="h-5 w-5 text-white" />
                    </div>
                </div>
            </div>
        </header>
    );
}

