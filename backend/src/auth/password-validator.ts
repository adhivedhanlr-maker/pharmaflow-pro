export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}

export class PasswordValidator {
    private static readonly MIN_LENGTH = 8;
    private static readonly COMMON_PASSWORDS = [
        'password', '12345678', 'qwerty', 'abc123', 'password123',
        'admin', 'letmein', 'welcome', 'monkey', '1234567890'
    ];

    static validate(password: string): PasswordValidationResult {
        const errors: string[] = [];

        // Check minimum length
        if (password.length < this.MIN_LENGTH) {
            errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(password)) {
            errors.push('Password must contain at least one uppercase letter');
        }

        // Check for lowercase letter
        if (!/[a-z]/.test(password)) {
            errors.push('Password must contain at least one lowercase letter');
        }

        // Check for number
        if (!/[0-9]/.test(password)) {
            errors.push('Password must contain at least one number');
        }

        // Check for special character
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
            errors.push('Password must contain at least one special character');
        }

        // Check against common passwords
        if (this.COMMON_PASSWORDS.includes(password.toLowerCase())) {
            errors.push('This password is too common. Please choose a stronger password');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static getStrength(password: string): 'weak' | 'medium' | 'strong' {
        let score = 0;

        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

        if (score <= 2) return 'weak';
        if (score <= 4) return 'medium';
        return 'strong';
    }
}
