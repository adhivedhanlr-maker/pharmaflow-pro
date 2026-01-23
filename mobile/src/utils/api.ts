import { Platform } from 'react-native';

// Use the Render backend URL
const API_BASE = 'https://pharmaflow-pro-backend.onrender.com';

export const apiCall = async (endpoint: string, options: any = {}) => {
    const url = `${API_BASE}${endpoint}`;

    // Add authentication token if available (could use SecureStore or AsyncStorage)
    // For now, let's keep it simple
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'API request failed');
        }

        return await response.json();
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
};

export const login = async (username: string, password: string) => {
    return apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
};

export const getProducts = async () => {
    return apiCall('/inventory/products');
};

export const getStock = async () => {
    return apiCall('/stock/batches');
};
