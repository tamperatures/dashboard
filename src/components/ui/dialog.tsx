'use client';

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';

/* ──── Context ──── */
interface DialogContextValue {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}
const DialogContext = React.createContext<DialogContextValue>({ open: false, onOpenChange: () => { } });

/* ──── Dialog ──── */
function Dialog({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children: React.ReactNode }) {
    return (
        <DialogContext.Provider value={{ open: open ?? false, onOpenChange: onOpenChange ?? (() => { }) }}>
            {children}
        </DialogContext.Provider>
    );
}

/* ──── DialogTrigger ──── */
function DialogTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
    const { onOpenChange } = React.useContext(DialogContext);
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, { onClick: () => onOpenChange(true) });
    }
    return <button onClick={() => onOpenChange(true)}>{children}</button>;
}

/* ──── DialogContent ──── */
function DialogContent({ className, children }: { className?: string; children: React.ReactNode }) {
    const { open, onOpenChange } = React.useContext(DialogContext);
    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onOpenChange(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={cn(
                            "relative z-50 w-full max-w-lg max-h-[85vh] overflow-y-auto",
                            "bg-white rounded-2xl shadow-2xl shadow-black/10 ring-1 ring-black/[0.04]",
                            className
                        )}
                    >
                        <button
                            onClick={() => onOpenChange(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-[#F5F5F7] text-[#86868B] hover:text-[#1D1D1F] transition-colors z-10"
                        >
                            <X size={16} />
                        </button>
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

/* ──── DialogHeader ──── */
function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("px-6 pt-6 pb-2", className)} {...props} />;
}

/* ──── DialogTitle ──── */
function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return <h2 className={cn("text-lg font-bold text-[#1D1D1F] tracking-tight", className)} {...props} />;
}

/* ──── DialogDescription ──── */
function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return <p className={cn("text-sm text-[#86868B] mt-1", className)} {...props} />;
}

/* ──── DialogFooter ──── */
function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("flex items-center justify-end gap-2 px-6 pb-6 pt-2", className)} {...props} />;
}

/* ──── DialogClose ──── */
function DialogClose({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
    const { onOpenChange } = React.useContext(DialogContext);
    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children as React.ReactElement<any>, { onClick: () => onOpenChange(false) });
    }
    return <button onClick={() => onOpenChange(false)}>{children}</button>;
}

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose };
