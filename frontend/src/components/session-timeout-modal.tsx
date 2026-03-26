"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useAuth } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Clock, LogOut, RefreshCw } from "lucide-react";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 2 * 60 * 1000;       // show warning 2 min before timeout

export function SessionTimeoutModal() {
    const { logout, token, refreshUser } = useAuth();
    const router = useRouter();
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(120); // seconds
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const clearAllTimers = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
    };

    const doLogout = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);
        logout();
        router.push("/login");
    }, [logout, router]);

    const startCountdown = useCallback(() => {
        setCountdown(120);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current!);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }, []);

    const resetTimer = useCallback(() => {
        clearAllTimers();
        setShowWarning(false);

        if (!token) return;

        warningRef.current = setTimeout(() => {
            setShowWarning(true);
            startCountdown();
            // Hard logout when countdown finishes
            timeoutRef.current = setTimeout(() => {
                doLogout();
            }, WARNING_BEFORE);
        }, INACTIVITY_TIMEOUT - WARNING_BEFORE);
    }, [token, doLogout, startCountdown]);

    // Auto-logout when countdown hits 0
    useEffect(() => {
        if (countdown === 0 && showWarning) {
            doLogout();
        }
    }, [countdown, showWarning, doLogout]);

    const handleStayLoggedIn = async () => {
        clearAllTimers();
        setShowWarning(false);
        await refreshUser();
        resetTimer();
    };

    // Track user activity
    useEffect(() => {
        if (!token) return;

        const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
        const handleActivity = () => {
            if (!showWarning) resetTimer();
        };

        events.forEach(e => document.addEventListener(e, handleActivity, { passive: true }));
        resetTimer();

        return () => {
            events.forEach(e => document.removeEventListener(e, handleActivity));
            clearAllTimers();
        };
    }, [token, resetTimer, showWarning]);

    if (!showWarning) return null;

    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;
    const urgency = countdown <= 30;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
                {/* Header */}
                <div className={`px-6 py-5 ${urgency ? "bg-red-50 border-b border-red-100" : "bg-amber-50 border-b border-amber-100"}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${urgency ? "bg-red-100" : "bg-amber-100"}`}>
                            <Clock className={`h-5 w-5 ${urgency ? "text-red-600" : "text-amber-600"}`} />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-900 text-base">Session Expiring</h2>
                            <p className="text-sm text-slate-500">You&apos;ve been inactive for a while</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 text-center">
                    <p className="text-slate-600 text-sm mb-4">
                        You will be automatically logged out in
                    </p>
                    <div className={`text-5xl font-bold tabular-nums mb-4 ${urgency ? "text-red-600" : "text-slate-800"}`}>
                        {timeStr}
                    </div>
                    <p className="text-xs text-slate-400">
                        Click &quot;Stay Logged In&quot; to continue your session
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 flex flex-col gap-2">
                    <Button
                        className="w-full"
                        onClick={handleStayLoggedIn}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Stay Logged In
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full text-slate-500"
                        onClick={doLogout}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log Out Now
                    </Button>
                </div>
            </div>
        </div>
    );
}
