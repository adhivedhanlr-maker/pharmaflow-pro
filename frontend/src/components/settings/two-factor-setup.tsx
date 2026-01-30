"use client";

import { useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Image from 'next/image';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function TwoFactorSetup() {
    const { token, user } = useAuth();
    const [step, setStep] = useState<'initial' | 'setup' | 'verify'>('initial');
    const [qrCode, setQrCode] = useState<string>('');
    const [secret, setSecret] = useState<string>('');
    const [verificationCode, setVerificationCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleGenerate2FA = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/auth/2fa/generate`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (response.ok) {
                setQrCode(data.qrCode);
                setSecret(data.secret);
                setStep('setup');
            } else {
                setError('Failed to generate 2FA secret');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleEnable2FA = async () => {
        if (verificationCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/auth/2fa/enable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ secret, token: verificationCode }),
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('2FA enabled successfully!');
                setStep('initial');
                setVerificationCode('');
                // Refresh page to show enabled state
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setError(data.message || 'Invalid verification code');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE}/auth/2fa/disable`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (data.success) {
                setSuccess('2FA disabled successfully');
                setTimeout(() => window.location.reload(), 2000);
            } else {
                setError('Failed to disable 2FA');
            }
        } catch (err) {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <CardTitle>Two-Factor Authentication</CardTitle>
                </div>
                <CardDescription>
                    Add an extra layer of security to your account
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        <XCircle className="h-4 w-4" />
                        {error}
                    </div>
                )}
                {success && (
                    <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        <CheckCircle2 className="h-4 w-4" />
                        {success}
                    </div>
                )}

                {step === 'initial' && (
                    <div className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Two-factor authentication (2FA) adds an extra layer of security by requiring a code from your authenticator app in addition to your password.
                        </p>
                        <Button onClick={handleGenerate2FA} disabled={loading} className="w-full">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Enable 2FA
                        </Button>
                        {user?.twoFactorEnabled && (
                            <Button variant="destructive" onClick={handleDisable2FA} disabled={loading} className="w-full">
                                Disable 2FA
                            </Button>
                        )}
                    </div>
                )}

                {step === 'setup' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Step 1: Scan QR Code</h4>
                            <p className="text-xs text-slate-600">
                                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                            </p>
                            {qrCode && (
                                <div className="flex justify-center p-4 bg-white border rounded-lg">
                                    <Image src={qrCode} alt="2FA QR Code" width={200} height={200} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Step 2: Enter Verification Code</h4>
                            <p className="text-xs text-slate-600">
                                Enter the 6-digit code from your authenticator app
                            </p>
                            <Input
                                type="text"
                                placeholder="000000"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                className="text-center text-2xl tracking-widest"
                            />
                        </div>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setStep('initial')} className="flex-1">
                                Cancel
                            </Button>
                            <Button onClick={handleEnable2FA} disabled={loading || verificationCode.length !== 6} className="flex-1">
                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Verify & Enable
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
