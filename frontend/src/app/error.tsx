"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("App error:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            <div className="text-center space-y-4 max-w-md">
                <h2 className="text-xl font-bold text-slate-900">Something went wrong</h2>
                <p className="text-sm text-slate-500">
                    {error.message || "An unexpected error occurred. Please try again."}
                </p>
                <div className="flex gap-2 justify-center">
                    <Button onClick={reset}>Try Again</Button>
                    <Button variant="outline" onClick={() => window.location.href = "/login"}>
                        Go to Login
                    </Button>
                </div>
            </div>
        </div>
    );
}
