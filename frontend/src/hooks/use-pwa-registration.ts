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
                await registration.update();

                const activateUpdate = (worker: ServiceWorker | null) => {
                    if (worker && worker.state === "installed" && navigator.serviceWorker.controller) {
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
            window.location.reload();
        };

        void register();
        navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
        };
    }, []);
}
