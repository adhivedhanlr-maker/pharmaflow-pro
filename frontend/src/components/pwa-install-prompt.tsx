"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);

            // Check if recently dismissed (e.g., last 24 hours)
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            if (dismissed) {
                const dismissedTime = parseInt(dismissed);
                const oneDay = 24 * 60 * 60 * 1000;
                if (Date.now() - dismissedTime < oneDay) {
                    return; // Don't show if dismissed recently
                }
            }

            // Show prompt
            setShowInstallPrompt(true);
            setIsVisible(true);

            // Auto-hide after 10 seconds (User requested "some seconds")
            const timer = setTimeout(() => {
                setIsVisible(false);
                // We keep showInstallPrompt true but hide via CSS transition or state to allow
                // it to be closed gracefully, but here we just hide it.
                // Technically, if we hide it, we should probably treat it as a "soft dismiss" 
                // or just let it reappear next session.

                // Let's set a "soft dismiss" so it doesn't pop up again immediately on navigation
                // but doesn't block it for a full day if they refresh.
                // Actually, user said "let it disappear", suggesting just visual hiding.
            }, 10000);

            return () => clearTimeout(timer);
        };

        window.addEventListener('beforeinstallprompt', handler);

        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstallPrompt(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        setDeferredPrompt(null);
        setIsVisible(false);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // If not triggered or hidden, don't render or render hidden
    if (!showInstallPrompt) return null;

    return (
        <div
            className={`fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-white border border-slate-200 rounded-lg shadow-2xl p-4 transition-all duration-500 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}
        >
            <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-100"
            >
                <X className="h-4 w-4 text-slate-500" />
            </button>

            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <Download className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-1">
                        Install PharmaFlow Pro
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                        Install our app for faster access and offline support
                    </p>
                    <div className="flex gap-2">
                        <Button onClick={handleInstall} size="sm" className="flex-1">
                            Install
                        </Button>
                        <Button onClick={handleDismiss} size="sm" variant="outline">
                            Not now
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
