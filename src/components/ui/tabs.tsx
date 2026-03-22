'use client';

import * as React from "react";
import { cn } from "@/lib/utils";

/* ──── Context ──── */
interface TabsContextValue {
    activeTab: string;
    setActiveTab: (v: string) => void;
}
const TabsContext = React.createContext<TabsContextValue>({ activeTab: '', setActiveTab: () => { } });

/* ──── Tabs (Root) ──── */
const Tabs = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (v: string) => void }>(
    ({ className, defaultValue, value, onValueChange, children, ...props }, ref) => {
        const [internalTab, setInternalTab] = React.useState(defaultValue || '');
        const activeTab = value ?? internalTab;
        const setActiveTab = (v: string) => { setInternalTab(v); onValueChange?.(v); };
        return (
            <TabsContext.Provider value={{ activeTab, setActiveTab }}>
                <div ref={ref} className={cn("", className)} {...props}>{children}</div>
            </TabsContext.Provider>
        );
    }
);
Tabs.displayName = "Tabs";

/* ──── TabsList ──── */
const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("inline-flex items-center rounded-xl bg-[#F5F5F7] p-1 gap-0.5", className)} {...props} />
    )
);
TabsList.displayName = "TabsList";

/* ──── TabsTrigger ──── */
const TabsTrigger = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string }>(
    ({ className, value, onClick, ...props }, ref) => {
        const { activeTab, setActiveTab } = React.useContext(TabsContext);
        const isActive = activeTab === value;
        return (
            <button
                ref={ref}
                data-state={isActive ? 'active' : 'inactive'}
                onClick={(e) => { if (value) setActiveTab(value); onClick?.(e); }}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                        ? "bg-white text-[#1D1D1F] shadow-sm font-semibold"
                        : "text-[#86868B] hover:text-[#424245]",
                    className
                )}
                {...props}
            />
        );
    }
);
TabsTrigger.displayName = "TabsTrigger";

/* ──── TabsContent ──── */
const TabsContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { value?: string }>(
    ({ className, value, ...props }, ref) => {
        const { activeTab } = React.useContext(TabsContext);
        if (activeTab !== value) return null;
        return <div ref={ref} className={cn("mt-3", className)} {...props} />;
    }
);
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
