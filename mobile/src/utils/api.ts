import { Platform } from 'react-native';

const API_BASE = 'https://pharmaflow-pro-backend.onrender.com';
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
    authToken = token;
};

export const apiCall = async (endpoint: string, options: any = {}) => {
    const url = `${API_BASE}${endpoint}`;

    const headers: any = {
        'Content-Type': 'application/json',
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        throw error;
    }
};

export const login = async (username: string, password: string) => {
    const response = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
    if (response.token) {
        setAuthToken(response.token);
    }
    return response;
};

export const getProducts = async () => {
    return apiCall('/inventory/products');
};

export const getCustomers = async () => {
    const response = await apiCall('/parties/customers');
    return response.data || response;
};

export const recordVisit = async (visitData: any) => {
    return apiCall('/visits/check-in', {
        method: 'POST',
        body: JSON.stringify(visitData),
    });
};

export const createOrder = async (orderData: any) => {
    return apiCall('/sales/invoices', {
        method: 'POST',
        body: JSON.stringify(orderData),
    });
};

export const createCustomer = async (customerData: any) => {
    return apiCall('/parties/customers', {
        method: 'POST',
        body: JSON.stringify(customerData),
    });
};

export const createRequirement = async (orderData: any) => {
    return apiCall('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
    });
};
