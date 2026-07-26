"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Floating bottom pill nav (Phantom): Board / Agents / Activity. */
export function PillNav({ projectSlug }: { projectSlug: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectSlug}`;
  const items = [
    { label: "Board", href: base },
    { label: "Agents", href: `${base}/agents` },
    { label: "Activity", href: `${base}/activity` },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full bg-[rgba(236,233,216,.42)] p-[5px] backdrop-blur-md">
        {items.map((item) => {
          const active =
            item.href === base
              ? pathname === base || pathname.startsWith(`${base}/tickets`)
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full px-6 py-[11px] text-base leading-none text-[#1b1c14] transition-colors",
                active ? "bg-[#fffef7] px-7 text-[#14150f]" : "hover:bg-[rgba(255,254,247,.35)]"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
