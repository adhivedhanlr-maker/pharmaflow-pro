"use client";

import { useGPSSync } from "@/hooks/use-gps-sync";
import { usePWARegistration } from "@/hooks/use-pwa-registration";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function GlobalHooks() {
    usePWARegistration();
    useGPSSync();
    usePushNotifications();
    return null;
}
