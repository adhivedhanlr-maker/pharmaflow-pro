import { NeonAuth } from '@neondatabase/neon-js';

const authUrl = process.env.NEXT_PUBLIC_NEON_AUTH_URL;

if (!authUrl) {
    throw new Error('NEXT_PUBLIC_NEON_AUTH_URL is not defined');
}

export const auth = new NeonAuth(authUrl);
