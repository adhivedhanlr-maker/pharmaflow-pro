"use client";

import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 2 * 60 * 1000; // 2 minutes before timeout

export function useSessionTimeout() {
    const { logout, token } = useAuth();
    const router = useRouter();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningRef = useRef<NodeJS.Timeout | null>(null);

    const resetTimer = useCallback(() => {
        // Clear existing timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);

        // Only set timers if user is logged in
        if (!token) return;

        // Set warning timer
        warningRef.current = setTimeout(() => {
            const shouldContinue = confirm(
                'Your session will expire in 2 minutes due to inactivity. Click OK to continue your session.'
            );
            if (shouldContinue) {
                resetTimer(); // Reset if user wants to continue
            }
        }, INACTIVITY_TIMEOUT - WARNING_TIME);

        // Set logout timer
        timeoutRef.current = setTimeout(() => {
            logout();
            router.push('/login?session=expired');
        }, INACTIVITY_TIMEOUT);
    }, [token, logout, router]);

    useEffect(() => {
        if (!token) return;

        // Activity events to track
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

        // Reset timer on any activity
        const handleActivity = () => resetTimer();

        // Add event listeners
        events.forEach(event => {
            document.addEventListener(event, handleActivity);
        });

        // Initial timer setup
        resetTimer();

        // Cleanup
        return () => {
            events.forEach(event => {
                document.removeEventListener(event, handleActivity);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningRef.current) clearTimeout(warningRef.current);
        };
    }, [token, resetTimer]);
}
