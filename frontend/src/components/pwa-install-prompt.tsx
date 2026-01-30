"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

export function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);

    useEffect(() => {
        const handler = (e: Event) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later
            setDeferredPrompt(e);
            // Show install prompt
            setShowInstallPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstallPrompt(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        // Clear the deferredPrompt
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
    };

    const handleDismiss = () => {
        setShowInstallPrompt(false);
        // Remember dismissal for 7 days
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    // Check if dismissed recently
    useEffect(() => {
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed);
            const sevenDays = 7 * 24 * 60 * 60 * 1000;
            if (Date.now() - dismissedTime < sevenDays) {
                setShowInstallPrompt(false);
            }
        }
    }, []);

    if (!showInstallPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-white border border-slate-200 rounded-lg shadow-2xl p-4 animate-in slide-in-from-bottom-5">
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
                        <Button
                            onClick={handleInstall}
                            size="sm"
                            className="flex-1"
                        >
                            Install
                        </Button>
                        <Button
                            onClick={handleDismiss}
                            size="sm"
                            variant="outline"
                        >
                            Not now
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
