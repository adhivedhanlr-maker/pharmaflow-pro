"use client";

import { useEffect } from "react";
import { useGPSSync } from "@/hooks/use-gps-sync";
import { usePWARegistration } from "@/hooks/use-pwa-registration";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function useTenantTitle() {
    useEffect(() => {
        const host = window.location.host;
        fetch(`${API_BASE}/public/tenant-branding?host=${encodeURIComponent(host)}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.companyName) {
                    document.title = data.companyName;
                }
            })
            .catch(() => {});
    }, []);
}

export function GlobalHooks() {
    usePWARegistration();
    useGPSSync();
    usePushNotifications();
    useTenantTitle();
    return null;
}
