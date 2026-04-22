'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

/* ──── Context ──── */
interface SelectContextValue {
    value: string;
    onValueChange: (v: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
    triggerRef: React.RefObject<HTMLDivElement | null>;
    disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextValue>({
    value: '', onValueChange: () => { }, open: false, setOpen: () => { }, triggerRef: { current: null }
});

/* ──── Select (Root) ──── */
const Select = ({ children, value, onValueChange, defaultValue, disabled }: {
    children: React.ReactNode; value?: string; onValueChange?: (v: string) => void; defaultValue?: string; disabled?: boolean;
}) => {
    const [internalValue, setInternalValue] = React.useState(value ?? defaultValue ?? '');
    const [open, setOpen] = React.useState(false);
    const triggerRef = React.useRef<HTMLDivElement>(null);
    const currentValue = value ?? internalValue;
    const handleChange = (v: string) => { setInternalValue(v); onValueChange?.(v); setOpen(false); };

    return (
        <SelectContext.Provider value={{ value: currentValue, onValueChange: handleChange, open, setOpen, triggerRef, disabled }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    );
};

/* ──── SelectTrigger ──── */
const SelectTrigger = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { id?: string }>(
    ({ className, children, ...props }, ref) => {
        const { open, setOpen, triggerRef, disabled } = React.useContext(SelectContext);
        return (
            <div
                ref={(node) => {
                    (triggerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
                    if (typeof ref === 'function') ref(node);
                    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
                }}
                onClick={() => { if (!disabled) setOpen(!open); }}
                className={cn(
                    "flex h-11 w-full items-center justify-between rounded-xl border bg-[#F5F5F7] px-4 py-2 text-sm text-[#1D1D1F] cursor-pointer transition-all duration-200",
                    open ? "border-[#0071E3] ring-2 ring-[#0071E3]/20 bg-white" : "border-[#D1D1D6] hover:border-[#86868B]",
                    disabled && "opacity-50 cursor-not-allowed pointer-events-none border-dashed hover:border-[#D1D1D6]",
                    className
                )}
                {...props}
            >
                {children}
                <svg className={cn("h-4 w-4 text-[#86868B] shrink-0 ml-2 transition-transform duration-200", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>
        );
    }
);
SelectTrigger.displayName = "SelectTrigger";

/* ──── SelectValue ──── */
const SelectValue = ({ placeholder, children }: { placeholder?: string, children?: React.ReactNode }) => {
    const { value } = React.useContext(SelectContext);
    return <span className={cn("truncate", value ? 'text-[#1D1D1F] font-medium' : 'text-[#86868B]')}>{children || value || placeholder || '請選擇...'}</span>;
};

/* ──── SelectContent ──── */
const SelectContent = ({ children, className, align }: { children: React.ReactNode; className?: string; align?: string }) => {
    const { open, setOpen, triggerRef } = React.useContext(SelectContext);
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (
                contentRef.current && !contentRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, setOpen, triggerRef]);

    if (!open) return null;

    return (
        <div
            ref={contentRef}
            className={cn(
                "absolute z-50 mt-1 min-w-[180px] w-full",
                "bg-white rounded-xl border border-[#E8E8ED] shadow-lg shadow-black/8",
                "py-1 overflow-y-auto max-h-60",
                "animate-in fade-in-0 zoom-in-95 duration-150",
                align === 'start' ? 'left-0' : 'right-0',
                className
            )}
        >
            {children}
        </div>
    );
};

/* ──── SelectItem ──── */
const SelectItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value: string }>(
    ({ className, children, value, ...props }, ref) => {
        const ctx = React.useContext(SelectContext);
        const isSelected = ctx.value === value;
        return (
            <div
                ref={ref}
                onClick={() => ctx.onValueChange(value)}
                className={cn(
                    "relative flex items-center px-3 py-2 mx-1 rounded-lg text-sm cursor-pointer transition-colors duration-150",
                    isSelected
                        ? "bg-[#0071E3]/10 text-[#0071E3] font-semibold"
                        : "text-[#1D1D1F] hover:bg-[#F5F5F7]",
                    className
                )}
                {...props}
            >
                {children}
                {isSelected && (
                    <svg className="absolute right-3 h-4 w-4 text-[#0071E3]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                )}
            </div>
        );
    }
);
SelectItem.displayName = "SelectItem";

/* ──── Helper Components ──── */
const SelectGroup = ({ children }: { children: React.ReactNode }) => <>{children}</>;
const SelectLabel = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("text-[10px] font-bold text-[#86868B] uppercase tracking-wider px-3 py-1.5", className)}>{children}</div>
);
const SelectSeparator = () => <div className="h-px bg-[#E8E8ED] my-1 mx-2" />;
const SelectScrollUpButton = () => null;
const SelectScrollDownButton = () => null;

export {
    Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem,
    SelectLabel, SelectSeparator, SelectScrollUpButton, SelectScrollDownButton,
};
