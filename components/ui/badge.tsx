import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
  variant = "default",
}: {
  className?: string;
  children: React.ReactNode;
  variant?: "default" | "feature" | "bug" | "muted";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        variant === "default" &&
          "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
        variant === "feature" &&
          "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
        variant === "bug" &&
          "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
        variant === "muted" &&
          "bg-zinc-50 text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400",
        className
      )}
    >
      {children}
    </span>
  );
}
