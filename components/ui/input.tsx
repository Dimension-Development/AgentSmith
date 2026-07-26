import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "block w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 pb-2.5 pt-0 text-xl font-light text-bone transition-colors placeholder:text-mute-dim placeholder:text-[17px] focus-visible:border-olive focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
