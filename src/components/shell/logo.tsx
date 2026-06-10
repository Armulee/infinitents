import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.2_300)] text-white shadow-[0_2px_8px_-2px_color-mix(in_oklch,var(--color-primary)_60%,transparent)]",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4">
        <path
          d="M4 12c0-2.5 1.6-4.5 3.8-4.5 3.4 0 5 9 8.4 9 2.2 0 3.8-2 3.8-4.5S18.4 7.5 16.2 7.5c-3.4 0-5 9-8.4 9C5.6 16.5 4 14.5 4 12Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("text-[15px] font-semibold tracking-tight", className)}>
      Infinitents
    </span>
  );
}
