import { cn } from "@/lib/utils";

/** Phantom badges: outlined mono pills, colour = signal only. */
export function Badge({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "feature" | "bug" | "muted" | "merged";
}) {
  return (
    <span
      className={cn(
        "micro inline-flex items-center rounded-full border px-2.5 py-[3px]",
        variant === "default" && "border-line-strong text-bone",
        variant === "feature" && "border-[rgba(198,214,138,.5)] text-olive",
        variant === "bug" && "border-[rgba(240,180,92,.5)] text-amber",
        variant === "muted" && "border-line text-mute",
        variant === "merged" && "border-line-strong text-bone",
        className
      )}
    >
      {children}
    </span>
  );
}
