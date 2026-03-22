import * as React from "react";
import { Input as HeroInput } from "@heroui/react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-xl border border-[#D1D1D6] bg-[#F5F5F7] px-4 py-2 text-sm text-[#1D1D1F] placeholder:text-[#86868B]",
                    "focus:outline-none focus:ring-2 focus:ring-[#0071E3]/30 focus:border-[#0071E3] focus:bg-white",
                    "transition-all duration-200",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
