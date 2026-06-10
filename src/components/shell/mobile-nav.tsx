"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useProjects } from "@/hooks/use-queries";
import { cn } from "@/lib/utils";
import { MOBILE_NAV, NAV_ITEMS } from "./nav-items";

/** Bottom navigation — mobile per design.md. */
export function MobileNav() {
  const pathname = usePathname();
  const { data: reviewReady } = useProjects(["ready_for_review"]);
  const items = NAV_ITEMS.filter((i) => MOBILE_NAV.includes(i.href));

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-border/70 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = pathname.startsWith(item.href);
          const badge = item.href === "/queue" ? (reviewReady?.length ?? 0) : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-nav-active"
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">
                <item.icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {badge > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9.5px] font-bold text-primary-foreground tnum">
                    {badge > 9 ? "9+" : badge}
                  </span>
                )}
              </span>
              {item.label.split(" ").pop()}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
