import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "block min-h-[80px] w-full resize-y rounded-none border-0 border-b border-line-strong bg-transparent px-0 pb-2.5 pt-1 text-[17px] font-light text-bone transition-colors placeholder:text-mute-dim focus-visible:border-olive focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
