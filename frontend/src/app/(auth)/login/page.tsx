"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';

export default function LoginPage() {
    const router = useRouter();
    const { isAuthenticated } = useAuth();

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/');
        }
    }, [isAuthenticated, router]);

    const handleLogin = () => {
        // Assuming neon-js auth client has a login or signIn method
        // If it's a redirect flow:
        auth.login();
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md space-y-8 p-8 bg-white rounded-lg shadow text-center">
                <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
                    Sign in to your account
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Access the PharmaFlow Pro dashboard
                </p>
                <div className="mt-8">
                    <Button onClick={handleLogin} className="w-full">
                        Sign in with Neon Auth
                    </Button>
                </div>
            </div>
        </div>
    );
}
