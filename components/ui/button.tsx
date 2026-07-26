import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/*
 * Phantom buttons: default/secondary are rounded pills in Archivo;
 * outline/ghost/destructive are square mono uppercase controls.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-line-strong disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: "rounded-full bg-[#f4f2e4] text-[#14150f] hover:bg-white",
        secondary:
          "rounded-full bg-[rgba(236,233,216,.1)] text-bone hover:bg-[rgba(236,233,216,.18)]",
        outline:
          "micro rounded-none border-line-strong bg-transparent text-bone hover:border-bone hover:bg-[rgba(236,233,216,.08)]",
        ghost: "micro rounded-none bg-transparent text-mute hover:text-bone",
        destructive:
          "micro rounded-none border-[rgba(226,114,74,.55)] bg-transparent text-alarm hover:border-alarm hover:bg-[rgba(226,114,74,.12)]",
      },
      size: {
        default: "h-11 px-6 text-base",
        sm: "h-9 px-4 text-sm",
        lg: "h-13 px-8 text-[17px]",
        icon: "h-11 w-11 px-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
