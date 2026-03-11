"use client";

import { useEffect } from "react";
import { useAuth } from "@/context/auth-context";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}

export function usePushNotifications() {
    const { token, user } = useAuth();

    useEffect(() => {
        const initPush = async () => {
            if (!token || user?.role !== "ADMIN" || !PUBLIC_VAPID_KEY) {
                return;
            }

            if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
                return;
            }

            try {
                const registration = await navigator.serviceWorker.ready;

                let permission = Notification.permission;
                if (permission === "default") {
                    permission = await Notification.requestPermission();
                }

                if (permission !== "granted") {
                    return;
                }

                let subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
                    });
                }

                await fetch(`${API_BASE}/notifications/subscribe`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(subscription),
                });
            } catch (error) {
                console.error("Failed to initialize push notifications:", error);
            }
        };

        void initPush();
    }, [token, user?.role]);
}
