"use client";

import { useEffect } from "react";

export function usePWARegistration() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }

        const register = async () => {
            try {
                const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
                localStorage.setItem("pwa-sw-registered-at", new Date().toISOString());
                localStorage.setItem("pwa-sw-scope", registration.scope);
                await registration.update();

                const activateUpdate = (worker: ServiceWorker | null) => {
                    if (worker && worker.state === "installed" && navigator.serviceWorker.controller) {
                        localStorage.setItem("pwa-sw-waiting-at", new Date().toISOString());
                        worker.postMessage({ type: "SKIP_WAITING" });
                    }
                };

                activateUpdate(registration.waiting);

                registration.addEventListener("updatefound", () => {
                    const installingWorker = registration.installing;
                    if (!installingWorker) {
                        return;
                    }

                    installingWorker.addEventListener("statechange", () => {
                        activateUpdate(registration.waiting || installingWorker);
                    });
                });
            } catch (error) {
                console.error("Failed to register service worker:", error);
            }
        };

        const handleControllerChange = () => {
            localStorage.setItem("pwa-sw-controller-change-at", new Date().toISOString());
            window.location.reload();
        };

        void register();
        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        };
    }, []);
}
