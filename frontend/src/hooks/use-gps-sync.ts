"use client";

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/auth-context';

const SYNC_INTERVAL = 30 * 1000; // 30 seconds
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export function useGPSSync() {
    const { user, token } = useAuth();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Only start sync if user is a SALES_REP AND is ON DUTY
        if (!token || user?.role !== 'SALES_REP' || !user?.isOnDuty) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const syncLocation = () => {
            if (!navigator.geolocation) return;

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    try {
                        await fetch(`${API_BASE}/visits/sync-location`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify({ latitude, longitude })
                        });
                        console.log("GPS Location Synced:", { latitude, longitude });
                    } catch (error) {
                        console.error("GPS Sync Failed:", error);
                    }
                },
                (error) => {
                    console.error("GPS Access Error:", error.message);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        };

        // Initial sync
        syncLocation();

        // Interval sync
        intervalRef.current = setInterval(syncLocation, SYNC_INTERVAL);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [user?.role, user?.isOnDuty, token]);
}
