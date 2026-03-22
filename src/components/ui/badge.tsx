import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-bold transition-colors",
                variant === 'default' && "bg-[#0071E3]/10 text-[#0071E3]",
                variant === 'secondary' && "bg-[#F5F5F7] text-[#424245]",
                variant === 'destructive' && "bg-red-100 text-red-700",
                variant === 'outline' && "border border-[#D1D1D6] text-[#86868B]",
                className
            )}
            {...props}
        />
    );
}

export { Badge };
