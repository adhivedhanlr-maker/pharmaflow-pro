"use client";

import { useState, useEffect } from 'react';

export interface PasswordStrength {
    score: number;
    level: 'weak' | 'medium' | 'strong';
    feedback: string[];
}

export function usePasswordStrength(password: string): PasswordStrength {
    const [strength, setStrength] = useState<PasswordStrength>({
        score: 0,
        level: 'weak',
        feedback: []
    });

    useEffect(() => {
        const feedback: string[] = [];
        let score = 0;

        if (password.length >= 8) {
            score++;
        } else if (password.length > 0) {
            feedback.push('At least 8 characters');
        }

        if (/[A-Z]/.test(password)) {
            score++;
        } else if (password.length > 0) {
            feedback.push('One uppercase letter');
        }

        if (/[a-z]/.test(password)) {
            score++;
        } else if (password.length > 0) {
            feedback.push('One lowercase letter');
        }

        if (/[0-9]/.test(password)) {
            score++;
        } else if (password.length > 0) {
            feedback.push('One number');
        }

        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            score++;
        } else if (password.length > 0) {
            feedback.push('One special character');
        }

        let level: 'weak' | 'medium' | 'strong' = 'weak';
        if (score >= 5) level = 'strong';
        else if (score >= 3) level = 'medium';

        setStrength({ score, level, feedback });
    }, [password]);

    return strength;
}
