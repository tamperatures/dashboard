'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

// ── Types ──
type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    variant: ToastVariant;
    duration: number;
}

interface ToastContextType {
    toast: (message: string, variant?: ToastVariant, duration?: number) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

// ── Config ──
const VARIANT_CONFIG = {
    success: {
        icon: CheckCircle2,
        bg: 'bg-emerald-50 border-emerald-200',
        iconColor: 'text-emerald-500',
        textColor: 'text-emerald-800',
        progressColor: 'bg-emerald-400',
    },
    error: {
        icon: AlertCircle,
        bg: 'bg-red-50 border-red-200',
        iconColor: 'text-red-500',
        textColor: 'text-red-800',
        progressColor: 'bg-red-400',
    },
    info: {
        icon: Info,
        bg: 'bg-blue-50 border-blue-200',
        iconColor: 'text-blue-500',
        textColor: 'text-blue-800',
        progressColor: 'bg-blue-400',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-amber-50 border-amber-200',
        iconColor: 'text-amber-500',
        textColor: 'text-amber-800',
        progressColor: 'bg-amber-400',
    },
};

// ── Context ──
const ToastContext = createContext<ToastContextType | null>(null);

export function useToast(): ToastContextType {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

// ── Single Toast Item ──
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
    const config = VARIANT_CONFIG[toast.variant];
    const Icon = config.icon;
    const [exiting, setExiting] = React.useState(false);

    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setExiting(true);
            setTimeout(() => onRemove(toast.id), 300);
        }, toast.duration);
        return () => clearTimeout(timeout);
    }, [toast.id, toast.duration, onRemove]);

    return (
        <div
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg shadow-black/5 backdrop-blur-sm transition-all duration-300 max-w-[380px] w-full ${config.bg} ${exiting ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'
                }`}
            style={{
                animation: exiting ? undefined : 'toast-in 0.3s ease-out',
            }}
        >
            <Icon className={`h-5 w-5 ${config.iconColor} shrink-0 mt-0.5`} />
            <p className={`text-[13px] font-medium ${config.textColor} flex-1 leading-relaxed`}>
                {toast.message}
            </p>
            <button
                onClick={() => {
                    setExiting(true);
                    setTimeout(() => onRemove(toast.id), 300);
                }}
                className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-black/5 transition-colors shrink-0"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

// ── Provider ──
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, variant: ToastVariant = 'info', duration: number = 3000) => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        setToasts((prev) => [...prev, { id, message, variant, duration }]);
    }, []);

    const contextValue = React.useMemo<ToastContextType>(
        () => ({
            toast: addToast,
            success: (msg) => addToast(msg, 'success'),
            error: (msg) => addToast(msg, 'error', 4000),
            info: (msg) => addToast(msg, 'info'),
            warning: (msg) => addToast(msg, 'warning', 4000),
        }),
        [addToast]
    );

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[9998] flex flex-col gap-2 pointer-events-auto">
                {toasts.map((t) => (
                    <ToastItem key={t.id} toast={t} onRemove={removeToast} />
                ))}
            </div>
            {/* Animation keyframes */}
            <style jsx global>{`
                @keyframes toast-in {
                    from {
                        opacity: 0;
                        transform: translateX(100%) scale(0.95);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0) scale(1);
                    }
                }
            `}</style>
        </ToastContext.Provider>
    );
}
