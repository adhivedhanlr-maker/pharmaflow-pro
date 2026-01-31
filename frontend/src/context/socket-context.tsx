"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-context';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!token) return;

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const newSocket = io(API_BASE, {
            auth: { token },
            transports: ['websocket'],
        });

        newSocket.on('connect', () => {
            setConnected(true);
            console.log('Socket connected');
        });

        newSocket.on('disconnect', () => {
            setConnected(false);
            console.log('Socket disconnected');
        });

        // Global listeners for notifications
        newSocket.on('new-requirement', (data) => {
            if (user?.role === 'ADMIN' || user?.role === 'BILLING_OPERATOR') {
                console.log("New Sales Requirement:", data);
                // Fallback to simple alert if toast is unavailable
                if (typeof window !== 'undefined') {
                    const notification = `New Requirement: ${data.repName} for ${data.customerName} (₹${data.totalAmount})`;
                    console.log(notification);
                }
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, [token, user?.role]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};
