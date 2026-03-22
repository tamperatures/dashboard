import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'default', size = 'default', ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold",
                    "transition-all duration-200 active:scale-[0.97]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/30",
                    "disabled:pointer-events-none disabled:opacity-50",
                    // Variants
                    variant === 'default' && "bg-[#0071E3] text-white hover:bg-[#0077ED] shadow-md shadow-[#0071E3]/20",
                    variant === 'destructive' && "bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-500/20",
                    variant === 'outline' && "border border-[#D1D1D6] bg-white text-[#424245] hover:bg-[#F5F5F7] hover:border-[#86868B]",
                    variant === 'secondary' && "bg-[#F5F5F7] text-[#424245] hover:bg-[#E8E8ED]",
                    variant === 'ghost' && "hover:bg-[#F5F5F7] text-[#424245]",
                    variant === 'link' && "text-[#0071E3] underline-offset-4 hover:underline",
                    // Sizes
                    size === 'default' && "h-10 px-5 py-2",
                    size === 'sm' && "h-8 px-3 text-xs",
                    size === 'lg' && "h-12 px-8 text-base",
                    size === 'icon' && "h-9 w-9 p-0",
                    className
                )}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button };
