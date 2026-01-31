"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

interface ShortcutContextType {
    showHints: boolean;
    triggerHints: () => void;
}

const ShortcutContext = createContext<ShortcutContextType | undefined>(undefined);

export const useShortcut = () => {
    const context = useContext(ShortcutContext);
    if (!context) {
        throw new Error('useShortcut must be used within a ShortcutProvider');
    }
    return context;
};

export const ShortcutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [showHints, setShowHints] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const triggerHints = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        setShowHints(true);

        timerRef.current = setTimeout(() => {
            setShowHints(false);
            timerRef.current = null;
        }, 3000); // Hints stay for 3 seconds
    }, []);

    return (
        <ShortcutContext.Provider value={{ showHints, triggerHints }}>
            {children}
        </ShortcutContext.Provider>
    );
};
