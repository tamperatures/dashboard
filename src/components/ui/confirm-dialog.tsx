'use client';

import React from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

const variantConfig = {
    danger: {
        icon: Trash2,
        iconBg: 'bg-red-50',
        iconColor: 'text-red-500',
        buttonBg: 'bg-red-500 hover:bg-red-600',
        ringColor: 'ring-red-100',
    },
    warning: {
        icon: AlertTriangle,
        iconBg: 'bg-amber-50',
        iconColor: 'text-amber-500',
        buttonBg: 'bg-amber-500 hover:bg-amber-600',
        ringColor: 'ring-amber-100',
    },
    info: {
        icon: Info,
        iconBg: 'bg-blue-50',
        iconColor: 'text-blue-500',
        buttonBg: 'bg-blue-500 hover:bg-blue-600',
        ringColor: 'ring-blue-100',
    },
};

export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = '確認操作',
    description = '此操作無法撤銷，確定要繼續嗎？',
    confirmText = '確定',
    cancelText = '取消',
    variant = 'danger',
    loading = false,
}: ConfirmDialogProps) {
    if (!open) return null;

    const config = variantConfig[variant];
    const Icon = config.icon;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Dialog Card */}
            <div className="relative bg-white rounded-2xl shadow-2xl shadow-black/10 border border-slate-200/60 w-full max-w-[380px] mx-4 animate-in zoom-in-95 fade-in duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>

                <div className="p-6 pt-7 text-center">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-full ${config.iconBg} ${config.ringColor} ring-4 flex items-center justify-center mx-auto mb-4`}>
                        <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>

                    {/* Title */}
                    <h3 className="text-[15px] font-bold text-[#1D1D1F] mb-1.5">
                        {title}
                    </h3>

                    {/* Description */}
                    <p className="text-[13px] text-[#86868B] leading-relaxed">
                        {description}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 px-6 pb-6">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 h-10 rounded-xl border border-[#D1D1D6] text-[13px] font-semibold text-[#1D1D1F] bg-white hover:bg-[#F5F5F7] transition-colors disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        disabled={loading}
                        className={`flex-1 h-10 rounded-xl text-[13px] font-semibold text-white ${config.buttonBg} transition-colors disabled:opacity-50 shadow-sm`}
                    >
                        {loading ? '處理中...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Hook for easy usage ──
interface ConfirmState {
    open: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText: string;
    resolve: ((value: boolean) => void) | null;
}

export function useConfirmDialog() {
    const [state, setState] = React.useState<ConfirmState>({
        open: false,
        title: '',
        description: '',
        variant: 'danger',
        confirmText: '確定',
        resolve: null,
    });

    const confirm = React.useCallback(
        (options: {
            title?: string;
            description?: string;
            variant?: 'danger' | 'warning' | 'info';
            confirmText?: string;
        } = {}): Promise<boolean> => {
            return new Promise((resolve) => {
                setState({
                    open: true,
                    title: options.title || '確認操作',
                    description: options.description || '此操作無法撤銷，確定要繼續嗎？',
                    variant: options.variant || 'danger',
                    confirmText: options.confirmText || '確定',
                    resolve,
                });
            });
        },
        []
    );

    const handleClose = React.useCallback(() => {
        state.resolve?.(false);
        setState((prev) => ({ ...prev, open: false, resolve: null }));
    }, [state.resolve]);

    const handleConfirm = React.useCallback(() => {
        state.resolve?.(true);
        setState((prev) => ({ ...prev, open: false, resolve: null }));
    }, [state.resolve]);

    const DialogComponent = React.useMemo(
        () => (
            <ConfirmDialog
                open={state.open}
                onClose={handleClose}
                onConfirm={handleConfirm}
                title={state.title}
                description={state.description}
                variant={state.variant}
                confirmText={state.confirmText}
            />
        ),
        [state.open, state.title, state.description, state.variant, state.confirmText, handleClose, handleConfirm]
    );

    return { confirm, ConfirmDialogComponent: DialogComponent };
}
